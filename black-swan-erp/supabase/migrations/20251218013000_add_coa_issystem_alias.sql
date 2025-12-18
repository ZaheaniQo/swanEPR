-- Add alias column for legacy camelCase access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coa_accounts'
      AND column_name = 'issystem'
  ) THEN
    ALTER TABLE public.coa_accounts
      ADD COLUMN isSystem boolean GENERATED ALWAYS AS (is_system) STORED;
  END IF;
END $$;
