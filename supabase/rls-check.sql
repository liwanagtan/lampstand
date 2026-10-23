-- Ownership check for supabase/account-sync.sql (Phase 4 gate). Paste into the staging SQL
-- editor after the schema. It creates two throwaway users inside a transaction, tries every
-- cross-account read and write, and rolls everything back. Any failure stops with "RLS FAILED".
begin;

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-8000-0000000000a1', 'rls-a@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b2', 'rls-b@example.test', 'authenticated', 'authenticated');

set local role authenticated;

-- Person A writes a journal entry.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
insert into public.user_records (user_id, kind, record_id, data)
values ('00000000-0000-4000-8000-0000000000a1', 'entry', 'e-a', '{"body":"A private"}');

do $$
begin
  begin
    insert into public.user_records (user_id, kind, record_id)
    values ('00000000-0000-4000-8000-0000000000b2', 'entry', 'planted');
    raise exception 'RLS FAILED: A created a record owned by B';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Person B can neither see nor change A's entry.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

do $$
declare n int;
begin
  select count(*) into n from public.user_records;
  if n <> 0 then raise exception 'RLS FAILED: B read % of A''s records', n; end if;

  update public.user_records set data = '{"body":"changed"}' where record_id = 'e-a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS FAILED: B changed A''s record'; end if;

  delete from public.user_records where record_id = 'e-a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS FAILED: B deleted A''s record'; end if;

  begin
    update public.user_records set user_id = '00000000-0000-4000-8000-0000000000b2';
  exception when insufficient_privilege then null;
  end;

  -- Deleting an account removes only the caller.
  perform public.delete_my_account();
end $$;

reset role;
do $$
begin
  if exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b2') then
    raise exception 'RLS FAILED: delete_my_account left the caller in place';
  end if;
  if not exists (select 1 from public.user_records where record_id = 'e-a' and data->>'body' = 'A private') then
    raise exception 'RLS FAILED: A''s record was changed or removed';
  end if;
end $$;

-- Without signing in there is no access at all.
set local role anon;
do $$
begin
  begin
    perform 1 from public.user_records;
    raise exception 'RLS FAILED: a visitor without an account can read records';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_my_account();
    raise exception 'RLS FAILED: a visitor can call delete_my_account';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'All ownership checks passed' as result;
rollback;
