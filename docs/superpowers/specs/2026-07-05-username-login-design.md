# Username login

Replace email-based login with a username-based one. Supabase Auth still uses email internally; the CRM login UI and the public API surface use a short username (e.g. `budi.s`, `admin`). A new `profiles.username` column maps the username to the linked auth user's email at lookup time.

## Goals

- Users sign in with a short username + password, not an email.
- Username is unique, case-insensitive, and visible to admins via SQL/dashboard.
- Existing seed users (`admin`, `budi`, `citra`, `dimas`) keep working — no manual rotation of credentials.
- The self-healing fix for `auth_user_id IS NULL` (commit `0cef744`) still applies.

## Non-goals

- No password reset / forgot password.
- No self-service signup.
- No UI for editing username. Admins set usernames via SQL or the seed script.
- No username suggestions on conflict during signup.
- Login still resolves through Supabase Auth — we are not moving auth off Supabase.

## Architecture

`POST /api/auth/login` accepts `{ username, password }` and resolves the username to an email through the service-role admin client before calling `supabase.auth.signInWithPassword`.

```
Client (LoginForm)         Server                  Supabase
─────────────────          ──────────              ────────────────
{ username, password } →   validate inputs
                           admin.from('profiles')
                             .ilike('username', u)
                             .select('email, ...')
                             .maybeSingle()
                           → profile.email
                           signInWithPassword(
                             { email: profile.email,
                               password })
                           → auth user
                           getProfileByAuthUserId(
                             user.id, user.email)
                           → profile
                           ← { user, profile }
```

The server never echoes `profile.email` back to the client. Login response shape stays `{ user: {id, email}, profile }` (where `email` is the Supabase auth user email, not the CRM-visible one — actually that has the same value today, but we treat the email field as opaque from now on).

Username → email resolution must be server-side. Email is sensitive and the anon key client doesn't have access to `profiles` pre-login due to RLS.

## Data model

Add to `profiles`:

```sql
alter table profiles
  add column if not exists username text;

create unique index if not exists profiles_username_lower_uidx
  on profiles (lower(username));
```

`username` is nullable at first so existing rows survive the `alter table`. A backfill step (see below) populates every existing row, then we add `not null`.

Validation (enforced in app-level validator on login, and recommended as a `check` constraint in DB):

- length 3–32 characters
- regex `^[a-z0-9][a-z0-9._-]*[a-z0-9]$` (lowercase letters, digits, dot, underscore, dash; must start and end with `[a-z0-9]`)
- comparison is case-insensitive via `lower(username)` index

We do not store the raw username with mixed case; backfill writes lowercased values. Login lookup uses `ilike` against the lowercased form.

## Seed values & backfill

The seeded profiles gain a deterministic `username` derived from `full_name`.

After running the migration against the live database, the backfill produced:

| profile.id | full_name      | username  |
|------------|----------------|-----------|
| sales-1    | Admin Demo     | `admin.d` |
| sales-2    | Budi Santoso   | `budi.s`  |
| sales-3    | Citra Wijaya   | `citra.w` |
| sales-4    | Dimas Pratama  | `dimas.p` |

(`sales-1` got `admin.d` — `Admin Demo`'s initial — because the live seed already had a second name.)

Format: `lower(first_name) + '.' + lower(last_name_initial)`. If a collision occurs (e.g. another Budi Santoso), append a numeric suffix. The original example in this spec (`admin`, `citra.m`) is illustrative; the actual values follow whatever `full_name` rows exist at migration time.

The backfill runs as part of the migration SQL and is idempotent:

```sql
update profiles p
set username = coalesce(
  lower(split_part(full_name, ' ', 1)) || '.' ||
  lower(substring(split_part(full_name, ' ', 2) from 1 for 1)),
  lower(p.id)
)
where username is null
  and full_name is not null;
```

After backfill, promote to `not null`:

```sql
alter table profiles alter column username set not null;
```

## API & response shapes

### `POST /api/auth/login`

Request:

```json
{ "username": "budi.s", "password": "..." }
```

Response (200):

```json
{ "user": { "id": "...", "email": "budi@prospectflow.app" }, "profile": { ... } }
```

Error matrix:

| Condition                                     | HTTP | Message                                                         |
|-----------------------------------------------|------|-----------------------------------------------------------------|
| `username` or `password` missing              | 400  | `Username dan password wajib diisi.`                            |
| Username not in `profiles`                    | 401  | `Username tidak ditemukan.`                                     |
| `profiles.username` exists but auth failed   | 401  | `Password salah.`                                               |
| Auth success, profile self-heals              | 200  | normal payload                                                  |
| Auth success, profile genuinely missing       | 403  | `Akun berhasil login, tetapi belum terhubung ke profil CRM.`    |
| `isAuthConfigured()` false                    | 503  | existing message                                                |

Distinguishing "username not found" from "wrong password" is intentional — this is an internal team CRM, not a public system, and the message gives admins faster triage when seed scripts and auth users drift.

## Server changes

### New helper — `findProfileByUsername`

In `src/lib/auth/server.ts`:

```ts
export interface UsernameLookup {
  profileId: string
  email: string
  full_name: string
  avatar_url: string | null
  role: 'Admin' | 'Sales'
}

export async function findProfileByUsername(
  username: string,
): Promise<UsernameLookup | null> {
  const admin = getSupabaseAdminClient()
  if (!admin) return null
  const normalized = username.trim().toLowerCase()
  if (!normalized) return null
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .ilike('username', normalized)
    .maybeSingle()
  if (error) throw new Error(`Lookup by username failed: ${error.message}`)
  return data as UsernameLookup | null
}
```

`getProfileByAuthUserId` and `getSession` keep their existing signatures — no other call sites change.

### Login route — `src/app/api/auth/login/route.ts`

Replace `email` with `username` in the request body. After validating non-empty, resolve via `findProfileByUsername` and call `signInWithPassword({ email: lookup.email, password })`. Return identically-shaped response.

### `bootstrap-seed-auth.mjs`

Currently it maps a static `[{ profileId, email }]` list. Extend to map to `username` too — when seeding new auth users, allow `--username` overrides; otherwise derive from `full_name` using the same function the SQL backfill uses. The existing `linked sales-1 -> admin@prospectflow.app` outputs stay the same; an extra `username=admin` line is added so operators can see the resolved value.

## UI changes

### `src/components/auth/login-form.tsx`

- Field label: `Email` → `Username`
- `placeholder="kamu@prospectflow.app"` → `placeholder="budi.s"`
- `type="email"` → `type="text"`
- `autoComplete="email"` → `autoComplete="username"`
- `name="email"` → `name="username"`
- State: `const [email, ...]` → `const [username, ...]`
- POST body key: `email` → `username`

No other styling changes. Validation message is server-owned (the form surfaces whatever 4xx message comes back).

## Verification

End-to-end drive once migrations + code changes are in place, with `next dev`:

1. **Happy path.** `POST /api/auth/login { username: "budi.s", password }` → 200 with profile for `sales-2`. Then `GET /` with returned cookie → HTML contains `Budi Santoso` and `Sign out`, no `Belum login`.
2. **Unknown username.** `{ username: "ghost", password: "whatever" }` → 401 `Username tidak ditemukan.`
3. **Known username, wrong password.** `{ username: "budi.s", password: "nope" }` → 401 `Password salah.`
4. **Empty input.** `{ username: "", password: "" }` → 400 `Username dan password wajib diisi.`
5. **Self-healing still works.** Re-run the bug-scenario from the prior fix: NULL `auth_user_id` for `sales-2`, login → 200 with profile, link persists. (Re-uses the fix in commit `0cef744`.)
6. **Orphan gating.** An auth user whose email has no matching `profiles.username` → 403 with existing message.

Cleanup after verification: restore `sales-2.auth_user_id`, delete any test auth users, remove test cookies.

## Files

New:
- `supabase/migrations/2026-07-05_username_login.sql` — column + index + backfill + `not null`
- `docs/superpowers/specs/2026-07-05-username-login-design.md` — this file
- `docs/superpowers/plans/2026-07-05-username-login.md` — implementation plan

Modify:
- `supabase/seed.sql` — add `username` to the `profiles` insert block (and to communications/follow-ups if any reference sales identifiers, which they don't).
- `src/lib/auth/server.ts` — add `findProfileByUsername`.
- `src/app/api/auth/login/route.ts` — username resolution branch.
- `src/components/auth/login-form.tsx` — field/label/state change.
- `scripts/bootstrap-seed-auth.mjs` — surface username in seeding.

## YAGNI

Out of scope, do not implement:
- Edit username from Settings UI.
- Forgot/reset password.
- Self-service signup.
- Username change audit log.
- Rate limiting on `/api/auth/login`.
