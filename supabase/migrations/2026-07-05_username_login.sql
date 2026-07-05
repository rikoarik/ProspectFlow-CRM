-- ProspectFlow CRM: username login
-- Apply AFTER supabase/schema.sql and supabase/migrations/2026-07-03_auth_rls.sql.
--
-- Adds profiles.username (unique, case-insensitive) and backfills existing
-- rows from full_name so the login UI can switch from email to username
-- without breaking the seeded sales users.

-- 1. Column is nullable during backfill so the ALTER doesn't fail on rows
--    that already exist with no username yet.
alter table profiles
  add column if not exists username text;

-- 2. Case-insensitive uniqueness. Stored as lowercase; login lookup uses ilike.
create unique index if not exists profiles_username_lower_uidx
  on profiles (lower(username))
  where username is not null;

-- 3. Backfill: derive from full_name as "first.lastinitial" (e.g. "Budi Santoso"
--    -> "budi.s"). Uses a CTE, no DO block, to avoid editor-side permission
--    surprises. Idempotent (only writes rows where username IS NULL).
with computed as (
  select
    id,
    lower(split_part(full_name, ' ', 1))
      || case
           when split_part(full_name, ' ', 2) = '' then ''
           else '.' || lower(substring(split_part(full_name, ' ', 2) from 1 for 1))
         end
      as candidate
  from profiles
  where username is null
    and full_name is not null
)
update profiles p
set username = computed.candidate
from computed
where p.id = computed.id;

-- 4. Now everything has a username; promote to NOT NULL.
alter table profiles alter column username set not null;