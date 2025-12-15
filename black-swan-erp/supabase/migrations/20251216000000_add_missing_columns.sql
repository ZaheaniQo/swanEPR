-- Add missing columns detected during Foundation Phase assessment

-- 1. HR Module: Add nationality to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality TEXT;
