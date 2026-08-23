-- ==============================================================================
-- Supabase Setup for Doc Generator (Daily Report & Request)
-- ==============================================================================

-- 1. Create doc_generator_projects table
CREATE TABLE IF NOT EXISTS doc_generator_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  owner text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default project
INSERT INTO doc_generator_projects (name, owner) 
VALUES ('ปรับปรุงสำนักงานศูนย์บริการรถยนต์โตโยต้า บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด', 'บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด');


-- 2. Create doc_generator_presets table (Support Named Presets)
CREATE TABLE IF NOT EXISTS doc_generator_presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL, -- 'company', 'report_preset', 'request_preset'
  name text, -- e.g. 'ทีมโครงสร้าง', NULL for company
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(type, name) -- Ensure preset names are unique per type
);


-- 3. Create doc_generator_documents table (for History)
CREATE TABLE IF NOT EXISTS doc_generator_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type text NOT NULL, -- 'report', 'request'
  date text NOT NULL,
  project_name text NOT NULL,
  document_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: The frontend uses public access (anon key without row level security restrictions for now).
-- If you have RLS enabled, ensure there are policies allowing select, insert, update, delete for these tables.
