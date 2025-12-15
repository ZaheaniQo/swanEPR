-- Module: HR
-- Table: employees
-- Gap: contract_type field used in EmployeeForm is missing in DB

ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'Full-time';
