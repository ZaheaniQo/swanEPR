-- Align schema with frontend expectations and app services

-- Approvals: support workflow metadata + payload + timestamps
ALTER TABLE approvals
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS decision_by uuid,
  ADD COLUMN IF NOT EXISTS decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS set_timestamp_approvals ON approvals;
CREATE TRIGGER set_timestamp_approvals
  BEFORE UPDATE ON approvals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Disbursements: link to supplier/contract/project
ALTER TABLE disbursements
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id),
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES contracts(id),
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id);

-- Contracts: signatures
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_signature text,
  ADD COLUMN IF NOT EXISTS ceo_signature text;

-- Leaves: store request reason
ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS reason text;

-- Invoices: link to contract for legacy views
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES contracts(id),
  ADD COLUMN IF NOT EXISTS contract_title text;

-- Audit logs: tenant scoping for RLS
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
