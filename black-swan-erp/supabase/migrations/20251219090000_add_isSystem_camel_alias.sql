-- Ensure camelCase alias column exists for legacy queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coa_accounts'
      AND column_name = 'isSystem'
  ) THEN
    ALTER TABLE public.coa_accounts
      ADD COLUMN "isSystem" boolean GENERATED ALWAYS AS (is_system) STORED;
  END IF;
END $$;
