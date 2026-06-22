-- Optional add-on SQL for the private lawncare manager.
-- Run only if you have not already added these tables.

create extension if not exists pgcrypto;

create table if not exists public.lawncare_quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.lawncare_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suggested_price_cents integer not null,
  min_price_cents integer,
  max_price_cents integer,
  final_price_cents integer,
  frequency text,
  quote_reason text,
  quote_notes text,
  status text not null default 'draft'
);

create table if not exists public.lawncare_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.lawncare_leads(id) on delete set null,
  quote_id uuid references public.lawncare_quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scheduled_date date,
  scheduled_time text,
  customer_name text not null,
  phone text,
  street_address text not null,
  city text,
  zip_code text,
  services text[] not null default '{}',
  job_notes text,
  quoted_price_cents integer,
  final_price_cents integer,
  job_status text not null default 'scheduled',
  payment_status text not null default 'unpaid',
  payment_method text
);

create table if not exists public.lawncare_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  business_name text not null default 'Affordable Residential Lawn Care',
  owner_name text,
  phone text,
  service_areas text[] default array['Fort Walton Beach', 'Shalimar', 'Cinco Bayou', 'Mary Esther', 'Destin'],
  small_base_cents integer not null default 6500,
  medium_base_cents integer not null default 9000,
  large_base_cents integer not null default 13500,
  weekly_discount_percent numeric not null default 10,
  biweekly_discount_percent numeric not null default 5
);

alter table public.lawncare_quotes enable row level security;
alter table public.lawncare_jobs enable row level security;
alter table public.lawncare_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lawncare_quotes' and policyname = 'Authenticated users manage quotes'
  ) then
    create policy "Authenticated users manage quotes"
    on public.lawncare_quotes
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lawncare_jobs' and policyname = 'Authenticated users manage jobs'
  ) then
    create policy "Authenticated users manage jobs"
    on public.lawncare_jobs
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lawncare_settings' and policyname = 'Authenticated users manage settings'
  ) then
    create policy "Authenticated users manage settings"
    on public.lawncare_settings
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;
