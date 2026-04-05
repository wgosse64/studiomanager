-- ============================================================
-- Studio Management Platform — Schema v3
-- Polymorphic resource model with unified conflict detection
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- UTILITY TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'staff', 'client')),
  first_name         TEXT NOT NULL DEFAULT '',
  last_name          TEXT NOT NULL DEFAULT '',
  email              TEXT NOT NULL DEFAULT '',
  phone              TEXT,
  company            TEXT,
  avatar_url         TEXT,
  stripe_customer_id TEXT UNIQUE,
  notes              TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- HELPER: get current user's role
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- RESOURCES (polymorphic base)
-- ============================================================

CREATE TABLE resources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('studio', 'engineer', 'equipment')),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STUDIOS (type-specific detail)
-- ============================================================

CREATE TABLE studios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id     UUID NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
  is_soundproofed BOOLEAN NOT NULL DEFAULT false,
  capacity        INT NOT NULL DEFAULT 1,
  hourly_rate     NUMERIC(10,2) NOT NULL DEFAULT 0,
  half_day_rate   NUMERIC(10,2),
  full_day_rate   NUMERIC(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER studios_updated_at
  BEFORE UPDATE ON studios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STUDIO FEATURES
-- ============================================================

CREATE TABLE studio_features (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  description  TEXT,
  UNIQUE (studio_id, feature_name)
);

-- ============================================================
-- ENGINEERS (type-specific detail)
-- ============================================================

CREATE TABLE engineers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  specialties TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate NUMERIC(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER engineers_updated_at
  BEFORE UPDATE ON engineers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- EQUIPMENT (type-specific detail)
-- ============================================================

CREATE TABLE equipment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id       UUID NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
  category          TEXT NOT NULL DEFAULT '',
  serial_number     TEXT NOT NULL DEFAULT '',
  purchase_price    NUMERIC(10,2),
  purchase_date     DATE,
  condition         TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'needs_repair')),
  default_studio_id UUID REFERENCES resources(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES profiles(id),
  booked_by    UUID NOT NULL REFERENCES profiles(id),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'requested'
               CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed')),
  total_amount NUMERIC(10,2),
  notes        TEXT,
  client_notes TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BOOKING RESOURCES (join table — conflict detection lives here)
-- ============================================================

CREATE TABLE booking_resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id),
  time_range  TSTZRANGE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent any single resource from being double-booked
ALTER TABLE booking_resources
ADD CONSTRAINT no_resource_conflicts
EXCLUDE USING GIST (
  resource_id WITH =,
  time_range WITH &&
);

CREATE INDEX idx_booking_resources_time ON booking_resources USING GIST (time_range);
CREATE INDEX idx_booking_resources_resource ON booking_resources (resource_id);
CREATE INDEX idx_booking_resources_booking ON booking_resources (booking_id);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    TEXT NOT NULL UNIQUE,
  client_id         UUID NOT NULL REFERENCES profiles(id),
  created_by        UUID NOT NULL REFERENCES profiles(id),
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
  due_date          DATE,
  subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate          NUMERIC(5,4) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_invoice_id TEXT,
  notes             TEXT,
  internal_notes    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================

CREATE TABLE invoice_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id),
  description TEXT NOT NULL DEFAULT '',
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id               UUID NOT NULL REFERENCES invoices(id),
  amount                   NUMERIC(10,2) NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method           TEXT NOT NULL DEFAULT 'card'
                           CHECK (payment_method IN ('card', 'cash', 'check', 'bank_transfer')),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_refund_id         TEXT,
  paid_at                  TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FILES
-- ============================================================

CREATE TABLE files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  booking_id  UUID REFERENCES bookings(id),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   BIGINT NOT NULL DEFAULT 0,
  file_type   TEXT NOT NULL DEFAULT '',
  label       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  booking_id  UUID REFERENCES bookings(id),
  parent_id   UUID REFERENCES messages(id),
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_messages_client ON messages (client_id);
CREATE INDEX idx_messages_booking ON messages (booking_id);

-- ============================================================
-- BOOKING CANCELLATION CLEANUP
-- When a booking is cancelled, delete its resource reservations
-- to free them up for other bookings
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_cancelled_booking_resources()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    DELETE FROM booking_resources WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION cleanup_cancelled_booking_resources();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT USING (get_user_role() IN ('admin', 'staff'));

CREATE POLICY "Users can update own profile (not role)"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT WITH CHECK (get_user_role() = 'admin');

-- RESOURCES
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active resources"
  ON resources FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage resources"
  ON resources FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- STUDIOS
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view studios"
  ON studios FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage studios"
  ON studios FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- STUDIO FEATURES
ALTER TABLE studio_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view features"
  ON studio_features FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage features"
  ON studio_features FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- ENGINEERS
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view engineers"
  ON engineers FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage engineers"
  ON engineers FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- EQUIPMENT
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view equipment"
  ON equipment FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage equipment"
  ON equipment FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- BOOKINGS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own bookings"
  ON bookings FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Staff can view all bookings"
  ON bookings FOR SELECT USING (get_user_role() IN ('admin', 'staff'));

CREATE POLICY "Authenticated can create bookings"
  ON bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update any booking"
  ON bookings FOR UPDATE USING (get_user_role() IN ('admin', 'staff'));

CREATE POLICY "Clients can cancel own bookings"
  ON bookings FOR UPDATE
  USING (client_id = auth.uid() AND status <> 'cancelled')
  WITH CHECK (status = 'cancelled');

-- BOOKING RESOURCES
ALTER TABLE booking_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage booking resources"
  ON booking_resources FOR ALL USING (get_user_role() IN ('admin', 'staff'));

CREATE POLICY "Clients can view own booking resources"
  ON booking_resources FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_resources.booking_id AND bookings.client_id = auth.uid())
  );

CREATE POLICY "Clients can insert booking resources for own bookings"
  ON booking_resources FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_resources.booking_id AND bookings.client_id = auth.uid())
  );

-- INVOICES
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own invoices"
  ON invoices FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Staff can manage invoices"
  ON invoices FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- INVOICE LINE ITEMS
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own line items"
  ON invoice_line_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.client_id = auth.uid())
  );

CREATE POLICY "Staff can manage line items"
  ON invoice_line_items FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own payments"
  ON payments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id AND invoices.client_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all payments"
  ON payments FOR SELECT USING (get_user_role() IN ('admin', 'staff'));

-- Payments INSERT/UPDATE only via service role (Edge Functions) or staff
CREATE POLICY "Staff can manage payments"
  ON payments FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- FILES
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own files"
  ON files FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Staff can manage files"
  ON files FOR ALL USING (get_user_role() IN ('admin', 'staff'));

CREATE POLICY "Clients can upload files"
  ON files FOR INSERT WITH CHECK (
    client_id = auth.uid() AND uploaded_by = auth.uid()
  );

-- MESSAGES
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own non-internal messages"
  ON messages FOR SELECT USING (
    client_id = auth.uid() AND is_internal = false
  );

CREATE POLICY "Staff can view all messages"
  ON messages FOR SELECT USING (get_user_role() IN ('admin', 'staff'));

CREATE POLICY "Authenticated can send messages"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND sender_id = auth.uid()
  );

CREATE POLICY "Staff can manage messages"
  ON messages FOR ALL USING (get_user_role() IN ('admin', 'staff'));

-- ============================================================
-- STORAGE BUCKETS (run separately in Supabase dashboard or via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('shared-files', 'shared-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
