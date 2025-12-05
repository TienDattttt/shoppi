-- Chat Rooms Table
-- Stores chat conversations between customers and partners

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_unread_count INTEGER DEFAULT 0,
  partner_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique chat room per customer-partner pair
  UNIQUE(customer_id, partner_id)
);

-- Indexes for performance
CREATE INDEX idx_chat_rooms_customer_id ON chat_rooms(customer_id);
CREATE INDEX idx_chat_rooms_partner_id ON chat_rooms(partner_id);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);
CREATE INDEX idx_chat_rooms_status ON chat_rooms(status);

-- RLS Policies
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own chat rooms
CREATE POLICY "Customers can view their chat rooms" ON chat_rooms
  FOR SELECT USING (customer_id = auth.uid());

-- Partners can only see their own chat rooms  
CREATE POLICY "Partners can view their chat rooms" ON chat_rooms
  FOR SELECT USING (partner_id = auth.uid());

-- Users can create chat rooms where they are customer or partner
CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR partner_id = auth.uid());

-- Users can update chat rooms where they are customer or partner
CREATE POLICY "Users can update their chat rooms" ON chat_rooms
  FOR UPDATE USING (customer_id = auth.uid() OR partner_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_rooms_updated_at();
