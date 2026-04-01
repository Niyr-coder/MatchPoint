-- Migration 018: Atomic order creation with stock decrement
--
-- Solves race condition in POST /api/shop/orders: read-then-write stock
-- check allowed two concurrent requests to both pass before either decrement
-- landed, causing negative stock / overselling.
--
-- Permissions (REVOKE from PUBLIC, GRANT to authenticated) are in migration 020
-- because the Supabase CLI cannot execute multiple top-level statements when
-- the file contains dollar-quoted ($$) function bodies.

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id UUID,
  p_items   JSONB
)
RETURNS TABLE(order_id UUID, items_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items must be a non-empty JSON array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

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

    -- stock = -1 means unlimited: skip decrement
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

    v_total       := v_total + (v_product.price * v_quantity);
    v_items_count := v_items_count + 1;
  END LOOP;

  INSERT INTO public.orders (user_id, total, status)
  VALUES (p_user_id, v_total, 'pending')
  RETURNING id INTO v_order_id;

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

  RETURN QUERY SELECT v_order_id, v_items_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'create_order_atomic failed for user %: % (SQLSTATE %)',
      p_user_id, SQLERRM, SQLSTATE;
    RAISE;
END;
$$
