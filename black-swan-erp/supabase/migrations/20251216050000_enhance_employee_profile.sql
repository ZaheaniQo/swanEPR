-- Enhance employees profile: avatar, admin notes, disable flag, audit metadata
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS disabled boolean DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_modified_by uuid;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_modified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_employees_disabled ON employees(disabled);
