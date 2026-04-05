-- Replace uuid_generate_v4() with gen_random_uuid() on all tables

ALTER TABLE resources ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE studios ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE studio_features ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE engineers ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE equipment ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE bookings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE booking_resources ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE invoices ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE invoice_line_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE payments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE files ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE messages ALTER COLUMN id SET DEFAULT gen_random_uuid();
