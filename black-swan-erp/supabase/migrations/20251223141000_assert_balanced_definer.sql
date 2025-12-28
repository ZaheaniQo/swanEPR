-- Make journal balance trigger definer-aware and tolerant of draft/missing status

create or replace function app.assert_balanced_journal() returns trigger
language plpgsql
security definer
set search_path = public, auth, app
set row_security = off
as $$
declare
  v_journal_id uuid;
  v_status text;
begin
  v_journal_id := coalesce(new.journal_id, old.journal_id);
  if v_journal_id is null then
    return coalesce(new, old);
  end if;

  select status into v_status from public.journal_entries where id = v_journal_id;
  if v_status is null or v_status = 'DRAFT' then
    return coalesce(new, old);
  end if;

  perform app.ensure_journal_balanced_entry(v_journal_id);
  return coalesce(new, old);
end;
$$;
