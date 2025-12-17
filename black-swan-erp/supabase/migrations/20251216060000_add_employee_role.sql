-- Add EMPLOYEE role to align with app Role enum and wire to user_roles
INSERT INTO roles (name, description)
VALUES ('EMPLOYEE', 'Standard employee')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Backfill user_roles for profiles marked as EMPLOYEE
INSERT INTO user_roles (user_id, role_id)
SELECT p.id AS user_id, r.id AS role_id
FROM profiles p
JOIN roles r ON r.name = 'EMPLOYEE'
WHERE p.role = 'EMPLOYEE'
ON CONFLICT DO NOTHING;

-- Optional alignment: set employees.system_role to EMPLOYEE when empty
UPDATE employees SET system_role = 'EMPLOYEE'
WHERE (system_role IS NULL OR system_role = '');
