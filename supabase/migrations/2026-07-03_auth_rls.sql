-- ProspectFlow CRM: Auth wiring + hardened RLS
-- Apply AFTER supabase/schema.sql.
-- Requires Supabase Auth users to be created via dashboard or admin API
-- (their email must match the existing seeded profiles.email for the backfill to succeed).

-- 1. Extend profiles with an auth.users link
alter table profiles
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists avatar_url text;

create index if not exists profiles_auth_user_id_idx on profiles(auth_user_id);

-- 2. Helper functions (security definer so they're safe to call from RLS expressions)
create or replace function public.current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where auth_user_id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'Admin' from profiles where auth_user_id = auth.uid()),
    false
  );
$$;

create or replace function public.sales_self() returns text
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_user_id = auth.uid();
$$;

-- 3. Drop the demo-open policies from schema.sql
drop policy if exists "profiles demo read" on profiles;
drop policy if exists "profiles demo write" on profiles;
drop policy if exists "prospects admin sales read" on prospects;
drop policy if exists "prospects admin sales write" on prospects;
drop policy if exists "communications read" on communications;
drop policy if exists "communications write" on communications;
drop policy if exists "follow ups read" on follow_ups;
drop policy if exists "follow ups write" on follow_ups;
drop policy if exists "audits read" on audits;
drop policy if exists "audits write" on audits;
drop policy if exists "templates read" on message_templates;
drop policy if exists "templates write" on message_templates;
drop policy if exists "attachments read" on attachments;
drop policy if exists "attachments write" on attachments;

-- 4. Scoped policies

-- profiles: self + admin
create policy "profiles self read" on profiles
  for select using (auth_user_id = auth.uid() or is_admin());

create policy "profiles self update" on profiles
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "profiles admin write" on profiles
  for all using (is_admin()) with check (is_admin());

-- prospects: admin all; sales sees assigned or unassigned
create policy "prospects scoped read" on prospects
  for select using (
    is_admin()
    or assigned_to = sales_self()
    or assigned_to is null
  );

create policy "prospects admin all" on prospects
  for all using (is_admin()) with check (is_admin());

create policy "prospects sales update assigned" on prospects
  for update using (assigned_to = sales_self())
  with check (assigned_to = sales_self());

create policy "prospects sales insert" on prospects
  for insert with check (
    is_admin() or assigned_to = sales_self() or assigned_to is null
  );

-- communications: scoped to prospects the user can see
create policy "communications scoped read" on communications
  for select using (
    is_admin()
    or sales_id = sales_self()
    or sales_id is null
    or exists (
      select 1 from prospects p
      where p.id = communications.prospect_id
        and (p.assigned_to = sales_self() or p.assigned_to is null)
    )
  );

create policy "communications scoped write" on communications
  for insert with check (
    is_admin()
    or sales_id = sales_self()
    or sales_id is null
  );

create policy "communications admin all" on communications
  for all using (is_admin()) with check (is_admin());

-- follow_ups: same scope as communications
create policy "follow_ups scoped read" on follow_ups
  for select using (
    is_admin()
    or sales_id = sales_self()
    or sales_id is null
    or exists (
      select 1 from prospects p
      where p.id = follow_ups.prospect_id
        and (p.assigned_to = sales_self() or p.assigned_to is null)
    )
  );

create policy "follow_ups scoped write" on follow_ups
  for insert with check (
    is_admin()
    or sales_id = sales_self()
    or sales_id is null
  );

create policy "follow_ups admin all" on follow_ups
  for all using (is_admin()) with check (is_admin());

-- audits: same scoping as prospects
create policy "audits scoped read" on audits
  for select using (
    is_admin()
    or exists (
      select 1 from prospects p
      where p.id = audits.prospect_id
        and (p.assigned_to = sales_self() or p.assigned_to is null)
    )
  );

create policy "audits scoped write" on audits
  for all using (
    is_admin()
    or exists (
      select 1 from prospects p
      where p.id = audits.prospect_id
        and (p.assigned_to = sales_self() or p.assigned_to is null)
    )
  ) with check (
    is_admin()
    or exists (
      select 1 from prospects p
      where p.id = audits.prospect_id
        and (p.assigned_to = sales_self() or p.assigned_to is null)
    )
  );

-- templates: shared read, admin write
create policy "templates all read" on message_templates
  for select using (auth.role() = 'authenticated');

create policy "templates admin write" on message_templates
  for all using (is_admin()) with check (is_admin());

-- attachments: scoped to prospects
create policy "attachments scoped read" on attachments
  for select using (
    is_admin()
    or exists (
      select 1 from prospects p
      where p.id = attachments.prospect_id
        and (p.assigned_to = sales_self() or p.assigned_to is null)
    )
  );

create policy "attachments scoped write" on attachments
  for insert with check (
    is_admin()
    or exists (
      select 1 from prospects p
      where p.id = attachments.prospect_id
        and (p.assigned_to = sales_self() or p.assigned_to is null)
    )
  );

create policy "attachments admin all" on attachments
  for all using (is_admin()) with check (is_admin());

-- 5. Backfill profiles.auth_user_id from auth.users by email
update profiles p
set auth_user_id = u.id
from auth.users u
where p.auth_user_id is null
  and lower(u.email) = lower(p.email);