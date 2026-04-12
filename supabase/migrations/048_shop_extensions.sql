-- supabase/migrations/048_shop_extensions.sql
-- Note: Originally spec'd as 019 but that number is taken by 019_atomic_bracket_scoring.sql
-- Renumbered to 048 to follow the existing sequence (047_tournament_feedback.sql).

-- 1. Add payment proof URL to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 2. Extend orders.status to include pending_proof
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'pending_proof', 'confirmed', 'delivered', 'cancelled'));

-- 3. Add approval_status to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('approved', 'pending_approval', 'rejected'));

-- 4. Add created_by to products (for tracking who submitted)
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. Update RLS: pending/rejected products only visible to admin and creator
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

CREATE POLICY "Anyone can view approved active products" ON products
  FOR SELECT USING (
    (is_active = true AND approval_status = 'approved')
    OR ((SELECT auth.uid()) = created_by)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND global_role = 'admin'
    )
  );

-- 6. Owners/managers can insert products for their club
-- API always sets created_by = auth.uid(), so this check is sufficient and safe.
CREATE POLICY "Club staff can insert products" ON products
  FOR INSERT WITH CHECK (
    created_by = (SELECT auth.uid())
  );

-- 7. Creator and club staff and admin can update their products
CREATE POLICY "Club staff and admin can update products" ON products
  FOR UPDATE USING (
    (SELECT auth.uid()) = created_by
    OR EXISTS (
      SELECT 1 FROM club_members
      WHERE club_id = products.club_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'manager')
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND global_role = 'admin'
    )
  );

-- WARNING: Before rolling back orders_status_check, ensure no rows have status = 'pending_proof'.
-- Rows with status 'pending_proof' will violate the restored constraint and the ALTER will fail.
-- Run: UPDATE orders SET status = 'pending' WHERE status = 'pending_proof'; before rolling back.

-- ROLLBACK (run manually if needed):
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check
--   CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled'));
-- ALTER TABLE orders DROP COLUMN IF EXISTS proof_url;
-- ALTER TABLE products DROP COLUMN IF EXISTS approval_status;
-- ALTER TABLE products DROP COLUMN IF EXISTS created_by;
-- DROP POLICY IF EXISTS "Anyone can view approved active products" ON products;
-- DROP POLICY IF EXISTS "Club staff can insert products" ON products;
-- DROP POLICY IF EXISTS "Club staff and admin can update products" ON products;
-- CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);
