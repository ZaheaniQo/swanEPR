-- Add tenant scoping and requester name to approvals
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS requester_name TEXT;

-- Backfill existing rows to keep queries working (assume requester_id = tenant for single-tenant dev)
UPDATE approvals SET tenant_id = requester_id WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_approvals_tenant_id ON approvals(tenant_id);
