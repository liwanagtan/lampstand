-- Lampstand usage insights (docs/ACCOUNT-SYNC-ROLLOUT.md, Phase 5). Apply after
-- account-sync.sql. Safe to run again: every statement replaces what an earlier run created.
--
-- Apps may only add events. Nobody can read raw events through the API; maintainers listed in
-- usage_admins read totals through usage_report(). Raw events are removed after 30 days and
-- device codes 90 days after their last event; only daily totals are kept.

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  name text not null check (name in (
    'welcome_started', 'google_chosen', 'guest_chosen', 'welcome_completed',
    'guest_import_started', 'guest_import_completed', 'guest_import_failed',
    'plan_started', 'plan_day_completed', 'reading_resumed', 'chapter_read',
    'sync_failed', 'sync_recovered', 'account_deleted'
  )),
  -- A random code made on the device; never linked to a name, email or account.
  device uuid not null,
  occurred_on date not null check (occurred_on between current_date - 2 and current_date + 1),
  created_at timestamptz not null default now()
);
create index if not exists usage_events_day_idx on public.usage_events (occurred_on, name);

alter table public.usage_events enable row level security;
revoke all on public.usage_events from anon, authenticated;
grant insert (name, device, occurred_on) on public.usage_events to anon, authenticated;
drop policy if exists "Apps add events" on public.usage_events;
create policy "Apps add events" on public.usage_events
  for insert to anon, authenticated
  with check (true);

-- Kept after the raw events are gone.
create table if not exists public.usage_daily (
  day date not null,
  name text not null,
  events integer not null,
  devices integer not null,
  primary key (day, name)
);
create table if not exists public.usage_active (
  day date primary key,
  -- Devices with a reading or plan event that day, and in the 7 days ending that day.
  daily integer not null,
  weekly integer not null
);
create table if not exists public.usage_devices (
  device uuid primary key,
  first_seen date not null,
  last_seen date not null
);
-- Of the devices first seen on cohort_day, how many were active again `after` days later.
create table if not exists public.usage_retention (
  cohort_day date not null,
  after integer not null check (after in (1, 7, 28)),
  cohort integer not null,
  returned integer not null,
  primary key (cohort_day, after)
);
create table if not exists public.usage_admins (
  email text primary key
);
alter table public.usage_daily enable row level security;
alter table public.usage_active enable row level security;
alter table public.usage_devices enable row level security;
alter table public.usage_retention enable row level security;
alter table public.usage_admins enable row level security;
revoke all on public.usage_daily, public.usage_active, public.usage_devices,
  public.usage_retention, public.usage_admins from anon, authenticated;

-- Totals for every finished day still in the raw events, then the 30-day clean-up.
create or replace function public.usage_rollup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  qualifying text[] := array['plan_started', 'plan_day_completed', 'reading_resumed', 'chapter_read'];
begin
  insert into public.usage_daily (day, name, events, devices)
  select occurred_on, name, count(*), count(distinct device)
  from public.usage_events
  where occurred_on < current_date
  group by occurred_on, name
  on conflict (day, name) do update set events = excluded.events, devices = excluded.devices;

  insert into public.usage_devices (device, first_seen, last_seen)
  select device, min(occurred_on), max(occurred_on)
  from public.usage_events
  group by device
  on conflict (device) do update set
    first_seen = least(public.usage_devices.first_seen, excluded.first_seen),
    last_seen = greatest(public.usage_devices.last_seen, excluded.last_seen);

  insert into public.usage_active (day, daily, weekly)
  select d.day,
    (select count(distinct device) from public.usage_events
      where occurred_on = d.day and name = any (qualifying)),
    (select count(distinct device) from public.usage_events
      where occurred_on between d.day - 6 and d.day and name = any (qualifying))
  from (select distinct occurred_on as day from public.usage_events
        where occurred_on < current_date and occurred_on >= current_date - 23) d
  on conflict (day) do update set daily = excluded.daily, weekly = excluded.weekly;

  insert into public.usage_retention (cohort_day, after, cohort, returned)
  select c.first_seen, a.after, count(*),
    count(*) filter (where exists (
      select 1 from public.usage_events e
      where e.device = c.device and e.occurred_on = c.first_seen + a.after
        and e.name = any (qualifying)))
  from public.usage_devices c
  cross join (values (1), (7), (28)) as a(after)
  where c.first_seen + a.after < current_date
    and c.first_seen + a.after >= current_date - 29
  group by c.first_seen, a.after
  on conflict (cohort_day, after) do update set
    cohort = excluded.cohort, returned = excluded.returned;

  delete from public.usage_events where occurred_on < current_date - 30;
  delete from public.usage_devices where last_seen < current_date - 90;
end;
$$;
revoke all on function public.usage_rollup() from public, anon, authenticated;

-- The Insights page. Only for maintainers whose Google email is in usage_admins.
create or replace function public.usage_report(days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.usage_admins where email = (auth.jwt() ->> 'email')
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  perform public.usage_rollup();
  return jsonb_build_object(
    'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day, d.name)
      from public.usage_daily d where d.day >= current_date - days), '[]'::jsonb),
    'active', coalesce((select jsonb_agg(to_jsonb(a) order by a.day)
      from public.usage_active a where a.day >= current_date - days), '[]'::jsonb),
    'retention', coalesce((select jsonb_agg(to_jsonb(r) order by r.cohort_day, r.after)
      from public.usage_retention r where r.cohort_day >= current_date - days - 28), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.usage_report(integer) from public, anon;
grant execute on function public.usage_report(integer) to authenticated;

-- Daily clean-up even when nobody opens the Insights page. Needs the pg_cron extension
-- (Database → Extensions → pg_cron). Skip this block if it is not enabled.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'lampstand-usage-rollup';
    perform cron.schedule('lampstand-usage-rollup', '15 0 * * *', 'select public.usage_rollup()');
  end if;
end $$;

-- Add each maintainer who may open /insights (their Google sign-in email):
-- insert into public.usage_admins (email) values ('you@example.com') on conflict do nothing;
