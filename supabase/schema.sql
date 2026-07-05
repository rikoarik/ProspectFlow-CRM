-- ProspectFlow CRM Supabase schema
-- Run this first, then supabase/seed.sql.

create extension if not exists "pgcrypto";

create type user_role as enum ('Admin', 'Sales');
create type priority_level as enum ('A', 'B', 'C');
create type active_confidence_level as enum ('High', 'Medium', 'Low');
create type prospect_status as enum (
  'New',
  'Need Review',
  'Ready to Contact',
  'Contacted',
  'Replied',
  'Interested',
  'Need Follow Up',
  'Proposal Sent',
  'Deal',
  'Rejected',
  'No Response',
  'Archived'
);
create type communication_channel as enum ('WhatsApp', 'Email', 'Phone', 'LinkedIn');
create type communication_direction as enum ('Outbound', 'Inbound');
create type follow_up_status as enum ('Pending', 'Done', 'Rescheduled');
create type audit_status_type as enum ('Not Started', 'Draft', 'Sent', 'Approved');

create table profiles (
  id text primary key,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'Sales',
  created_at timestamptz not null default now()
);

create table prospects (
  id text primary key default gen_random_uuid()::text,
  company_name text not null,
  industry text,
  city text,
  website text,
  email text,
  phone text,
  contact_person text,
  source text,
  priority priority_level not null default 'C',
  active_confidence active_confidence_level not null default 'Medium',
  active_evidence text,
  website_audit_signal text,
  offer_angle text,
  assigned_to text references profiles(id) on delete set null,
  status prospect_status not null default 'New',
  first_channel communication_channel not null default 'WhatsApp',
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table communications (
  id text primary key default gen_random_uuid()::text,
  prospect_id text not null references prospects(id) on delete cascade,
  sales_id text references profiles(id) on delete set null,
  channel communication_channel not null,
  direction communication_direction not null,
  message_summary text not null,
  response_summary text,
  status_after prospect_status not null,
  created_at timestamptz not null default now()
);

create table follow_ups (
  id text primary key default gen_random_uuid()::text,
  prospect_id text not null references prospects(id) on delete cascade,
  sales_id text references profiles(id) on delete set null,
  follow_up_date timestamptz not null,
  reason text not null,
  status follow_up_status not null default 'Pending',
  notes text,
  created_at timestamptz not null default now()
);

create table audits (
  id text primary key default gen_random_uuid()::text,
  prospect_id text not null references prospects(id) on delete cascade,
  problem_summary text,
  mobile_issue boolean not null default false,
  cta_issue boolean not null default false,
  performance_issue boolean not null default false,
  trust_issue boolean not null default false,
  copywriting_issue boolean not null default false,
  recommendation text,
  audit_status audit_status_type not null default 'Not Started',
  audit_file_url text,
  mockup_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table message_templates (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  channel communication_channel not null,
  category text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attachments (
  id text primary key default gen_random_uuid()::text,
  prospect_id text not null references prospects(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

create index prospects_status_idx on prospects(status);
create index prospects_priority_idx on prospects(priority);
create index prospects_assigned_to_idx on prospects(assigned_to);
create index prospects_next_follow_up_at_idx on prospects(next_follow_up_at);
create index communications_prospect_id_idx on communications(prospect_id);
create index follow_ups_date_idx on follow_ups(follow_up_date);
create index audits_prospect_id_idx on audits(prospect_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger prospects_set_updated_at before update on prospects for each row execute function set_updated_at();
create trigger audits_set_updated_at before update on audits for each row execute function set_updated_at();
create trigger message_templates_set_updated_at before update on message_templates for each row execute function set_updated_at();

alter table profiles enable row level security;
alter table prospects enable row level security;
alter table communications enable row level security;
alter table follow_ups enable row level security;
alter table audits enable row level security;
alter table message_templates enable row level security;
alter table attachments enable row level security;

-- Demo-friendly policies. Tighten auth.uid() mapping when Supabase Auth users are connected.
create policy "profiles demo read" on profiles for select using (true);
create policy "profiles demo write" on profiles for all using (true) with check (true);

create policy "prospects admin sales read" on prospects for select using (true);
create policy "prospects admin sales write" on prospects for all using (true) with check (true);

create policy "communications read" on communications for select using (true);
create policy "communications write" on communications for all using (true) with check (true);

create policy "follow ups read" on follow_ups for select using (true);
create policy "follow ups write" on follow_ups for all using (true) with check (true);

create policy "audits read" on audits for select using (true);
create policy "audits write" on audits for all using (true) with check (true);

create policy "templates read" on message_templates for select using (true);
create policy "templates write" on message_templates for all using (true) with check (true);

create policy "attachments read" on attachments for select using (true);
create policy "attachments write" on attachments for all using (true) with check (true);