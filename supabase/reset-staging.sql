-- STAGING ONLY. Empties Lampstand's test data so testing can start fresh. Never run in production.
-- Removes every synced record and all usage counts. Tables not created yet are skipped.
do $$
begin
  if to_regclass('public.user_records') is not null then
    delete from public.user_records;
  end if;
  if to_regclass('public.usage_events') is not null then
    delete from public.usage_events;
    delete from public.usage_daily;
    delete from public.usage_active;
    delete from public.usage_devices;
    delete from public.usage_retention;
  end if;
end $$;

-- Also remove the Lampstand sign-ins themselves, so the next Google sign-in creates a brand-new
-- account (the test users stay listed in Google Cloud). Remove the two dashes to include it:
-- delete from auth.users;

select count(*) as sign_ins_left from auth.users;
