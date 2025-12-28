-- Add roles management permission and RLS policies for RBAC tables
DO $$
DECLARE
  v_perm_manage_roles UUID;
  v_role_admin UUID;
BEGIN
  -- Ensure permission exists
  INSERT INTO permissions (code, description)
  VALUES ('admin.roles.manage', 'Manage application roles and assignments')
  ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO v_perm_manage_roles;

  -- Ensure ADMIN role exists and capture id
  INSERT INTO roles (name, description)
  VALUES ('ADMIN', 'System Administrator')
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO v_role_admin;

  -- Grant manage permission to ADMIN
  INSERT INTO role_permissions (role_id, permission_id)
  VALUES (v_role_admin, v_perm_manage_roles)
  ON CONFLICT DO NOTHING;
END $$;

-- RLS policies for roles
DROP POLICY IF EXISTS "Roles select" ON roles;
CREATE POLICY "Roles select" ON roles
FOR SELECT
USING (auth.role() = 'service_role' OR public.has_any_role(array['SUPER_ADMIN','CEO']));

DROP POLICY IF EXISTS "Roles insert" ON roles;
CREATE POLICY "Roles insert" ON roles
FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'admin.roles.manage'));

DROP POLICY IF EXISTS "Roles update" ON roles;
CREATE POLICY "Roles update" ON roles
FOR UPDATE
USING (public.has_permission(auth.uid(), 'admin.roles.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'admin.roles.manage'));

DROP POLICY IF EXISTS "Roles delete" ON roles;
CREATE POLICY "Roles delete" ON roles
FOR DELETE
USING (public.has_permission(auth.uid(), 'admin.roles.manage'));

-- RLS policies for user_roles
DROP POLICY IF EXISTS "User roles select" ON user_roles;
CREATE POLICY "User roles select" ON user_roles
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR auth.uid() = user_id
  OR public.has_any_role(array['SUPER_ADMIN','CEO'])
);

DROP POLICY IF EXISTS "User roles insert" ON user_roles;
CREATE POLICY "User roles insert" ON user_roles
FOR INSERT
WITH CHECK (public.has_any_role(array['SUPER_ADMIN','CEO']));

DROP POLICY IF EXISTS "User roles update" ON user_roles;
CREATE POLICY "User roles update" ON user_roles
FOR UPDATE
USING (public.has_any_role(array['SUPER_ADMIN','CEO']))
WITH CHECK (public.has_any_role(array['SUPER_ADMIN','CEO']));

DROP POLICY IF EXISTS "User roles delete" ON user_roles;
CREATE POLICY "User roles delete" ON user_roles
FOR DELETE
USING (public.has_any_role(array['SUPER_ADMIN','CEO']));
