-- Module: Settings
-- Table: settings
-- Gap: country field used in Settings form is missing in DB

ALTER TABLE settings ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'SA';
