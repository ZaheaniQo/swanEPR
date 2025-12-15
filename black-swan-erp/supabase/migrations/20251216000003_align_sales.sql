-- Module: Sales (Contracts)
-- Table: contracts
-- Gap: currency field used in ContractBuilder is missing in DB

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
