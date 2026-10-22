-- Lampstand personal data. Apply in the supplied Supabase project after reviewing
-- the exact SQL in the dashboard SQL editor. No Bible text belongs in this table.
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

create policy "Owners read their records" on public.user_records
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Owners create their records" on public.user_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Owners update their records" on public.user_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners delete their records" on public.user_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);
