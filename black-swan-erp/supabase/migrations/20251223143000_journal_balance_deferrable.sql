-- Make journal balance trigger deferrable to allow multi-row inserts

do $$
begin
  execute 'drop trigger if exists journal_lines_balance on public.journal_lines';
  execute 'create constraint trigger journal_lines_balance '
    || 'after insert or update or delete on public.journal_lines '
    || 'deferrable initially deferred '
    || 'for each row execute function app.assert_balanced_journal()';
end;
$$;
