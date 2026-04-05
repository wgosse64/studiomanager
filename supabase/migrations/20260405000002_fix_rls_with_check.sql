-- FOR ALL policies need WITH CHECK for INSERT/UPDATE to work.
-- Drop and recreate the staff management policies with explicit WITH CHECK.

-- RESOURCES
DROP POLICY IF EXISTS "Staff can manage resources" ON resources;
CREATE POLICY "Staff can manage resources"
  ON resources FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- STUDIOS
DROP POLICY IF EXISTS "Staff can manage studios" ON studios;
CREATE POLICY "Staff can manage studios"
  ON studios FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- STUDIO FEATURES
DROP POLICY IF EXISTS "Staff can manage features" ON studio_features;
CREATE POLICY "Staff can manage features"
  ON studio_features FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- ENGINEERS
DROP POLICY IF EXISTS "Staff can manage engineers" ON engineers;
CREATE POLICY "Staff can manage engineers"
  ON engineers FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- EQUIPMENT
DROP POLICY IF EXISTS "Staff can manage equipment" ON equipment;
CREATE POLICY "Staff can manage equipment"
  ON equipment FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- BOOKING RESOURCES
DROP POLICY IF EXISTS "Staff can manage booking resources" ON booking_resources;
CREATE POLICY "Staff can manage booking resources"
  ON booking_resources FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- INVOICES
DROP POLICY IF EXISTS "Staff can manage invoices" ON invoices;
CREATE POLICY "Staff can manage invoices"
  ON invoices FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- INVOICE LINE ITEMS
DROP POLICY IF EXISTS "Staff can manage line items" ON invoice_line_items;
CREATE POLICY "Staff can manage line items"
  ON invoice_line_items FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- PAYMENTS
DROP POLICY IF EXISTS "Staff can manage payments" ON payments;
CREATE POLICY "Staff can manage payments"
  ON payments FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- FILES
DROP POLICY IF EXISTS "Staff can manage files" ON files;
CREATE POLICY "Staff can manage files"
  ON files FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));

-- MESSAGES
DROP POLICY IF EXISTS "Staff can manage messages" ON messages;
CREATE POLICY "Staff can manage messages"
  ON messages FOR ALL
  USING (get_user_role() IN ('admin', 'staff'))
  WITH CHECK (get_user_role() IN ('admin', 'staff'));
