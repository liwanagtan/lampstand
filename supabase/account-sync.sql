-- Lampstand personal data. Apply in the supplied Supabase project after reviewing
-- the exact SQL in the dashboard SQL editor. No Bible text belongs in this table.
-- Safe to run again: every statement replaces what an earlier run created.
create table if not exists public.user_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('profile', 'preferences', 'plan', 'entry', 'mark', 'reading')),
  record_id text not null check (char_length(record_id) between 1 and 180),
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, record_id),
  constraint user_records_data_size check (octet_length(data::text) <= 100000)
);

create index if not exists user_records_updated_idx
  on public.user_records (user_id, updated_at);

alter table public.user_records enable row level security;
revoke all on public.user_records from anon;
grant select, insert, update, delete on public.user_records to authenticated;

drop policy if exists "Owners read their records" on public.user_records;
create policy "Owners read their records" on public.user_records
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Owners create their records" on public.user_records;
create policy "Owners create their records" on public.user_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Owners update their records" on public.user_records;
create policy "Owners update their records" on public.user_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Owners delete their records" on public.user_records;
create policy "Owners delete their records" on public.user_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- The server sets the change time, so a device clock can never hide a change from other devices.
create or replace function public.touch_user_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists user_records_touch on public.user_records;
create trigger user_records_touch
  before insert or update on public.user_records
  for each row execute function public.touch_user_record();

-- Account deletion from Settings: removes the signed-in person's login and, through the
-- foreign key, every synced record. It can only ever delete the caller.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
