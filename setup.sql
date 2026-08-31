-- 1. Create store_users table
CREATE TABLE IF NOT EXISTS store_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  pin text NOT NULL,
  role text NOT NULL, -- 'แอดมิน', 'ผู้ดูแลสโตร์', 'ผู้ใช้งาน'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default users
INSERT INTO store_users (username, pin, role) VALUES 
('admin', '1234', 'แอดมิน'),
('store', '1111', 'ผู้ดูแลสโตร์'),
('user', '2222', 'ผู้ใช้งาน')
ON CONFLICT (username) DO NOTHING;

-- 2. Create store_pending_moves table
CREATE TABLE IF NOT EXISTS store_pending_moves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  reporter text,
  carrier text,
  remark text,
  items jsonb NOT NULL, -- [{ itemName, quantitySent, quantityReceived }]
  status text DEFAULT 'รอรับ', -- 'รอรับ', 'เสร็จสิ้น'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add require_receive column to store_locations (if not exists)
-- ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS require_receive boolean;
-- UPDATE store_locations SET require_receive = (type = 'ไซต์งาน') WHERE require_receive IS NULL;

-- Note: The frontend uses public access (anon key without row level security restrictions).
-- If you have RLS enabled, ensure there are policies allowing select, insert, update, delete for these tables.
