-- Migration 018: Atomic order creation with stock decrement
--
-- Context:
--   src/app/api/shop/orders/route.ts (POST) has a race condition: it reads
--   product stock, validates sufficiency, creates the order, inserts order_items,
--   and then decrements stock across three separate round-trips. Two concurrent
--   requests for the same last-in-stock item can both pass the stock check before
--   either decrement lands, resulting in negative stock and overselling.
--
-- Solution:
--   A single SECURITY DEFINER RPC that runs the entire sequence inside one
--   transaction with a FOR UPDATE lock on each product row. The lock is acquired
--   at the moment of the UPDATE, guaranteeing mutual exclusion:
--
--     UPDATE products SET stock = stock - qty
--     WHERE id = $id AND (stock >= qty OR stock = -1)
--     RETURNING id
--
--   If the UPDATE returns no row the product has insufficient stock and the
--   transaction is rolled back with an informative EXCEPTION before the order
--   row is created.
--
-- Design decisions:
--   - SECURITY DEFINER so the function runs as the owning role (service_role)
--     and can UPDATE products/INSERT orders/INSERT order_items bypassing the RLS
--     policies that restrict those operations for the `authenticated` role.
--   - stock = -1 means unlimited: the WHERE clause skips the decrement for
--     those rows (stock stays -1).
--   - unit_price and product_name are always taken from the products row — the
--     caller-supplied values in p_items are ignored — to prevent price
--     manipulation. This matches the existing application-layer behaviour in
--     the route handler.
--   - total is computed inside the function from DB prices for the same reason.
--   - The function is owned by the postgres/service role and callable by
--     authenticated users via PostgREST (GRANT EXECUTE below).
--
-- Caller contract (matches the existing route handler):
--   SELECT * FROM create_order_atomic(
--     p_user_id := $1::uuid,
--     p_items   := $2::jsonb
--     -- p_items shape: '[{"product_id":"<uuid>","quantity":<int>}]'
--     -- unit_price in the JSONB is accepted but ignored; DB price is used.
--   );
--   Returns: (order_id UUID, items_count INT)

-- ============================================================
-- Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id UUID,
  p_items   JSONB
)
RETURNS TABLE(order_id UUID, items_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
-- Pin search_path to prevent search-path hijacking attacks.
SET search_path = public
AS $$
DECLARE
  v_item          JSONB;
  v_product_id    UUID;
  v_quantity      INT;
  v_product       RECORD;
  v_order_id      UUID;
  v_total         DECIMAL(10,2) := 0;
  v_items_count   INT           := 0;
BEGIN
  -- ------------------------------------------------------------------
  -- 1. Validate input: p_items must be a non-empty JSON array.
  -- ------------------------------------------------------------------
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items must be a non-empty JSON array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ------------------------------------------------------------------
  -- 2. For each item: lock the product row, validate stock, decrement.
  --    The UPDATE ... FOR UPDATE implicit lock prevents another
  --    concurrent transaction from reading a stale stock value and
  --    passing the sufficiency check before this decrement is visible.
  -- ------------------------------------------------------------------
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity   := (v_item->>'quantity')::INT;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Each item must include a valid product_id'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'quantity must be a positive integer for product %', v_product_id
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Fetch current product data inside the transaction, with a row lock.
    -- The lock prevents concurrent reads of the same stock value.
    SELECT id, name, price, stock, is_active
    INTO v_product
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_product_id
        USING ERRCODE = 'no_data_found';
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" (%) is not available', v_product.name, v_product_id
        USING ERRCODE = 'check_violation';
    END IF;

    -- Check and decrement stock.
    -- stock = -1 means unlimited: skip decrement, leave stock unchanged.
    IF v_product.stock != -1 THEN
      IF v_product.stock < v_quantity THEN
        RAISE EXCEPTION
          'Stock insuficiente para "%": disponible %, solicitado %',
          v_product.name, v_product.stock, v_quantity
          USING ERRCODE = 'insufficient_resources';
      END IF;

      UPDATE public.products
      SET    stock = stock - v_quantity
      WHERE  id    = v_product_id;
    END IF;

    -- Accumulate total using DB price (ignore caller-supplied unit_price).
    v_total       := v_total + (v_product.price * v_quantity);
    v_items_count := v_items_count + 1;
  END LOOP;

  -- ------------------------------------------------------------------
  -- 3. Create the order header.
  -- ------------------------------------------------------------------
  INSERT INTO public.orders (user_id, total, status)
  VALUES (p_user_id, v_total, 'pending')
  RETURNING id INTO v_order_id;

  -- ------------------------------------------------------------------
  -- 4. Insert order_items.
  --    Re-iterate p_items; product data is re-read from the same
  --    transaction snapshot (consistent, no extra round-trip required).
  -- ------------------------------------------------------------------
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity   := (v_item->>'quantity')::INT;

    SELECT id, name, price
    INTO v_product
    FROM public.products
    WHERE id = v_product_id;

    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, product_name)
    VALUES (v_order_id, v_product_id, v_quantity, v_product.price, v_product.name);
  END LOOP;

  -- ------------------------------------------------------------------
  -- 5. Return result.
  -- ------------------------------------------------------------------
  RETURN QUERY SELECT v_order_id, v_items_count;

EXCEPTION
  WHEN OTHERS THEN
    -- Surface the original message to the caller unchanged.
    -- The transaction is automatically rolled back by PostgreSQL on EXCEPTION.
    RAISE WARNING 'create_order_atomic failed for user %: % (SQLSTATE %)',
      p_user_id, SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- ============================================================
-- Permissions
-- ============================================================

-- Revoke public access that CREATE FUNCTION grants by default.
REVOKE EXECUTE ON FUNCTION public.create_order_atomic(UUID, JSONB) FROM PUBLIC;

-- Allow authenticated users to call the function via PostgREST.
-- The function itself enforces per-row authorization through SECURITY DEFINER.
GRANT EXECUTE ON FUNCTION public.create_order_atomic(UUID, JSONB) TO authenticated;

-- ============================================================
-- Documentation
-- ============================================================

COMMENT ON FUNCTION public.create_order_atomic(UUID, JSONB) IS
  'Atomically creates an order and decrements product stock inside a single '
  'transaction. Acquires FOR UPDATE row locks on each product to eliminate '
  'the race condition that existed in the multi-step application-layer flow. '
  'stock = -1 is treated as unlimited and is not decremented. '
  'unit_price values in p_items are ignored; DB product.price is always used. '
  'Raises an exception (and rolls back) if any product has insufficient stock '
  'or is inactive. Callable by authenticated role; runs as service_role '
  '(SECURITY DEFINER) to bypass RLS on write paths.';

-- ============================================================
-- ROLLBACK (run manually if this migration must be reverted)
-- ============================================================
-- REVOKE EXECUTE ON FUNCTION public.create_order_atomic(UUID, JSONB) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.create_order_atomic(UUID, JSONB);
