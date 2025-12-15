-- Module: Partners (Suppliers)
-- Table: suppliers
-- Gap: cr_number (Commercial Registration) used in SupplierForm is missing in DB

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS cr_number TEXT;
