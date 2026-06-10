-- TableTalk AI initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  website TEXT,
  hours JSONB DEFAULT '{}',
  catering_available BOOLEAN NOT NULL DEFAULT false,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- Menu items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);

-- FAQs
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faqs_restaurant ON faqs(restaurant_id);

-- Leads (catering + callback only)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('catering', 'callback')),
  customer_name TEXT,
  phone TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_restaurant ON leads(restaurant_id);
CREATE INDEX idx_leads_type ON leads(lead_type);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  caller_phone TEXT,
  summary TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN (
    'faq_answered', 'catering_lead', 'callback_requested',
    'order_placed', 'escalated', 'general'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_restaurant ON conversations(restaurant_id);

-- Orders (pickup only for MVP)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT,
  phone TEXT,
  order_size TEXT NOT NULL CHECK (order_size IN ('small', 'large')),
  expected_ready_at TIMESTAMPTZ NOT NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type = 'pickup'),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'ready', 'completed', 'cancelled'
  )),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_expected_ready ON orders(expected_ready_at);
CREATE INDEX idx_orders_status ON orders(status);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  notes TEXT
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Updated_at trigger for restaurants
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Owner policies: full access to own restaurant data
CREATE POLICY "Owners manage own restaurant"
  ON restaurants FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners manage own menu items"
  ON menu_items FOR ALL
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners manage own faqs"
  ON faqs FOR ALL
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners view own leads"
  ON leads FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners update own leads"
  ON leads FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners view own conversations"
  ON conversations FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners view own orders"
  ON orders FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners update own orders"
  ON orders FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners view own order items"
  ON order_items FOR SELECT
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE r.owner_id = auth.uid()
  ));

-- Public read for chat context (anon users can read restaurant info by slug)
CREATE POLICY "Public read restaurants by slug"
  ON restaurants FOR SELECT
  USING (true);

CREATE POLICY "Public read menu items"
  ON menu_items FOR SELECT
  USING (true);

CREATE POLICY "Public read faqs"
  ON faqs FOR SELECT
  USING (true);

-- Service role inserts (chat API uses service role which bypasses RLS).
-- For anon inserts via edge functions in future, add scoped INSERT policies here.
