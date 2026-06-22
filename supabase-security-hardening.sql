-- Security hardening for the QR lawncare lead capture form.
-- Run this after the original table + enum SQL.

-- Keep public visitors limited to inserting new leads only.
grant usage on schema public to anon, authenticated;
revoke all on public.lawncare_leads from anon;
grant insert on public.lawncare_leads to anon;
grant select, update, delete on public.lawncare_leads to authenticated;

alter table public.lawncare_leads enable row level security;

-- Replace the public insert policy with a stricter version.
drop policy if exists "Anyone can submit lawncare quote request" on public.lawncare_leads;

create policy "Anyone can submit lawncare quote request"
on public.lawncare_leads
for insert
to anon
with check (
  status = 'new'
  and sms_consent is true
  and quoted_price_cents is null
  and quote_notes is null
  and next_follow_up_at is null
  and internal_notes is null
);

-- Add database-level validation so malicious browser edits cannot bypass client validation.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lawncare_leads_contact_lengths') then
    alter table public.lawncare_leads
    add constraint lawncare_leads_contact_lengths check (
      char_length(first_name) between 1 and 40
      and (last_name is null or char_length(last_name) <= 40)
      and char_length(phone) between 7 and 24
      and (email is null or char_length(email) <= 254)
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lawncare_leads_phone_digits') then
    alter table public.lawncare_leads
    add constraint lawncare_leads_phone_digits check (
      length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lawncare_leads_email_format') then
    alter table public.lawncare_leads
    add constraint lawncare_leads_email_format check (
      email is null
      or email ~* '^[A-Z0-9._%+''-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lawncare_leads_address_lengths') then
    alter table public.lawncare_leads
    add constraint lawncare_leads_address_lengths check (
      char_length(street_address) between 1 and 120
      and char_length(city) between 1 and 60
      and (zip_code is null or zip_code ~ '^\d{5}(-\d{4})?$')
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lawncare_leads_text_lengths') then
    alter table public.lawncare_leads
    add constraint lawncare_leads_text_lengths check (
      (best_time_to_contact is null or char_length(best_time_to_contact) <= 80)
      and (gate_or_pet_notes is null or char_length(gate_or_pet_notes) <= 500)
      and (additional_notes is null or char_length(additional_notes) <= 500)
      and (campaign is null or char_length(campaign) <= 80)
      and (flyer_route is null or char_length(flyer_route) <= 80)
      and (neighborhood is null or char_length(neighborhood) <= 80)
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lawncare_leads_no_html_brackets') then
    alter table public.lawncare_leads
    add constraint lawncare_leads_no_html_brackets check (
      first_name !~ '[<>]'
      and (last_name is null or last_name !~ '[<>]')
      and phone !~ '[<>]'
      and (email is null or email !~ '[<>]')
      and street_address !~ '[<>]'
      and city !~ '[<>]'
      and (best_time_to_contact is null or best_time_to_contact !~ '[<>]')
      and (gate_or_pet_notes is null or gate_or_pet_notes !~ '[<>]')
      and (additional_notes is null or additional_notes !~ '[<>]')
      and (campaign is null or campaign !~ '[<>]')
      and (flyer_route is null or flyer_route !~ '[<>]')
      and (neighborhood is null or neighborhood !~ '[<>]')
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lawncare_leads_services_allowlist') then
    alter table public.lawncare_leads
    add constraint lawncare_leads_services_allowlist check (
      cardinality(services_requested) between 1 and 10
      and services_requested <@ array[
        'mow_weedeat_edge_blow',
        'one_time_cut',
        'weekly_service',
        'biweekly_service',
        'monthly_service',
        'overgrown_cleanup',
        'mulch',
        'planting',
        'sod',
        'other'
      ]::text[]
    );
  end if;
end $$;

-- Confirm RLS is enabled.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('lawncare_leads', 'lawncare_lead_events');
