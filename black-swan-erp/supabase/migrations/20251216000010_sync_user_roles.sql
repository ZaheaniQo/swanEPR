-- Seed application roles and backfill user_roles from profiles

-- 1) Ensure roles exist for app Role enum values
INSERT INTO roles (name, description)
VALUES
  ('SUPER_ADMIN', 'Super Admin'),
  ('CEO', 'Chief Executive Officer'),
  ('MARKETING', 'Marketing'),
  ('WAREHOUSE', 'Warehouse'),
  ('ACCOUNTING', 'Accounting'),
  ('HR', 'Human Resources'),
  ('PRODUCTION_MANAGER', 'Production Manager'),
  ('PARTNER', 'Partner (read-only)')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2) Backfill user_roles from profiles.role where possible
INSERT INTO user_roles (user_id, role_id)
SELECT p.id AS user_id, r.id AS role_id
FROM profiles p
JOIN roles r ON r.name = p.role
ON CONFLICT DO NOTHING;
