# Real Supabase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ProspectFlow CRM use real Supabase login for the 4 seeded team accounts, keep the existing Supabase-backed CRM data as-is, and remove demo wording from user-facing UI.

**Architecture:** Provisioning is handled by a small idempotent Node script that talks to Supabase Admin using the existing service-role key and links `auth.users.id` to `profiles.auth_user_id`. Runtime auth stays in the existing Next.js + Supabase SSR flow, but login/session/middleware are tightened so only users mapped to a CRM profile are treated as signed in.

**Tech Stack:** Next.js 14 App Router, TypeScript, Node.js ESM scripts, `@supabase/ssr`, `@supabase/supabase-js`, Postgres/Supabase Auth

## Global Constraints

- Jangan reintroduce demo fallback runtime.
- Jangan tambah self-signup flow.
- Jangan tambah force-reset password flow.
- Pertahankan role model `Admin | Sales`.
- Pertahankan seed data sebagai initial operational dataset.
- Jangan commit password sementara ke file mana pun di repo.
- `src/lib/data/queries.ts` tetap menjadi data layer Supabase utama; jangan kembalikan import runtime dari `src/lib/seed/*`.

---

## File Structure

- Create: `scripts/bootstrap-seed-auth.mjs`
  - Idempotent provisioning script for the 4 seeded CRM users.
  - Creates auth users if missing.
  - Links `profiles.auth_user_id`.
  - Accepts one shared temporary password via CLI arg.
- Create: `src/lib/auth/profile.ts`
  - Shared helper for resolving a CRM profile by `auth_user_id`.
  - Used by login route, SSR session resolution, and middleware.
- Modify: `package.json`
  - Add a dedicated bootstrap script command.
- Modify: `src/app/api/auth/login/route.ts`
  - Reject auth-only users that do not have a linked CRM profile.
- Modify: `src/lib/auth/server.ts`
  - Resolve profile through the shared helper and only return a usable session when mapping exists.
- Modify: `src/lib/supabase/middleware.ts`
  - Redirect authenticated-but-unmapped users back to `/login` instead of allowing a broken partial session.
- Modify: `src/components/app-shell.tsx`
  - Remove demo wording from app shell.
- Modify: `src/app/settings/page.tsx`
  - Replace `Demo fallback` copy with production-ready environment wording.
- Modify: `src/app/page.tsx`
  - Remove seeded/demo KPI helper wording.
- Modify: `src/app/pipeline/page.tsx`
  - Remove `demo/Supabase` language.

`src/lib/data/queries.ts` is intentionally **not** modified in this plan; it already reads from Supabase and is part of the proof that runtime data is no longer local-demo-backed.

---

### Task 1: Provision the 4 seeded Supabase Auth users

**Files:**
- Create: `scripts/bootstrap-seed-auth.mjs`
- Modify: `package.json:5-12`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Produces: CLI command `npm run bootstrap-auth -- --password '<shared-password>'`
- Produces: linked rows in `profiles.auth_user_id` for `sales-1`..`sales-4`

- [ ] **Step 1: Add the package script entry**

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "convert-seed": "node scripts/convert-seed.mjs",
    "bootstrap-auth": "node scripts/bootstrap-seed-auth.mjs"
  }
}
```

- [ ] **Step 2: Create the failing smoke check before the script exists**

Run:

```bash
cd "/Users/macbookm2/Documents/ProspectFlow CRM"
curl -sS -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@prospectflow.app","password":"placeholder"}'
```

Expected before implementation:

```json
{"error":"Invalid login credentials"}
```

- [ ] **Step 3: Create `scripts/bootstrap-seed-auth.mjs`**

```js
import { createClient } from '@supabase/supabase-js'

const SEED_USERS = [
  { profileId: 'sales-1', email: 'admin@prospectflow.app' },
  { profileId: 'sales-2', email: 'budi@prospectflow.app' },
  { profileId: 'sales-3', email: 'citra@prospectflow.app' },
  { profileId: 'sales-4', email: 'dimas@prospectflow.app' },
]

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function readPassword() {
  const idx = process.argv.indexOf('--password')
  const value = idx >= 0 ? process.argv[idx + 1] : ''
  if (!value) {
    throw new Error('Usage: npm run bootstrap-auth -- --password "<shared-password>"')
  }
  return value
}

async function listAllUsers(admin) {
  const users = []
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < 200) break
    page += 1
  }
  return users
}

async function ensureAuthUser(admin, email, password) {
  const users = await listAllUsers(admin)
  const existing = users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  if (existing) return existing

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  if (!data.user) throw new Error(`User creation returned no user for ${email}`)
  return data.user
}

async function linkProfile(admin, profileId, userId) {
  const { error } = await admin
    .from('profiles')
    .update({ auth_user_id: userId })
    .eq('id', profileId)
  if (error) throw error
}

async function main() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY')
  const password = readPassword()
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  for (const seedUser of SEED_USERS) {
    const user = await ensureAuthUser(admin, seedUser.email, password)
    await linkProfile(admin, seedUser.profileId, user.id)
    console.log(`linked ${seedUser.profileId} -> ${seedUser.email} -> ${user.id}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 4: Run the provisioning script with one generated shared password**

Run:

```bash
cd "/Users/macbookm2/Documents/ProspectFlow CRM"
TEMP_PASSWORD="$(openssl rand -base64 18 | tr -d '=+/' | cut -c1-20)Aa1!"
printf 'Temporary password: %s\n' "$TEMP_PASSWORD"
npm run bootstrap-auth -- --password "$TEMP_PASSWORD"
```

Expected output pattern:

```text
linked sales-1 -> admin@prospectflow.app -> <uuid>
linked sales-2 -> budi@prospectflow.app -> <uuid>
linked sales-3 -> citra@prospectflow.app -> <uuid>
linked sales-4 -> dimas@prospectflow.app -> <uuid>
```

- [ ] **Step 5: Verify the script populated `auth.users` and linked all 4 profiles**

Run:

```bash
export PGPASSWORD="$(python3 - <<'PY'
from pathlib import Path
for line in Path('.env').read_text().splitlines():
    if line.startswith('DB_PASSWORD='):
        print(line.split('=',1)[1], end='')
        break
PY
)"
DBURL="postgresql://postgres.nczmzhhdybhwcxtlaawf@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
psql "$DBURL" -tAc "select count(*) from auth.users; select id,email,auth_user_id from profiles order by id;"
```

Expected:

```text
4
sales-1|admin@prospectflow.app|<uuid>
sales-2|budi@prospectflow.app|<uuid>
sales-3|citra@prospectflow.app|<uuid>
sales-4|dimas@prospectflow.app|<uuid>
```

- [ ] **Step 6: Commit Task 1**

```bash
git add package.json scripts/bootstrap-seed-auth.mjs
git commit -m "feat: bootstrap seeded Supabase auth users"
```

---

### Task 2: Enforce profile-mapped authentication across login, SSR session, and middleware

**Files:**
- Create: `src/lib/auth/profile.ts`
- Modify: `src/lib/auth/server.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient(): SupabaseClient | null`
- Produces: `getProfileByAuthUserId(supabase, userId): Promise<CrmProfile | null>`
- Produces: `getSession(): Promise<AuthSession | null>` that only represents mapped CRM users
- Produces: login route behavior `403` for auth-only users with no linked `profiles` row

- [ ] **Step 1: Reproduce the current broken auth-only-user behavior with a temporary orphan auth account**

Run:

```bash
cd "/Users/macbookm2/Documents/ProspectFlow CRM"
ORPHAN_PASSWORD="OrphanTestAa1!"
node --input-type=module <<'EOF'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0,2)))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data, error } = await admin.auth.admin.createUser({
  email: 'orphan-auth-test@prospectflow.app',
  password: 'OrphanTestAa1!',
  email_confirm: true,
})
if (error) throw error
console.log(data.user.id)
EOF
curl -sS -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"orphan-auth-test@prospectflow.app","password":"OrphanTestAa1!"}'
```

Expected before implementation: login succeeds incorrectly or returns a payload whose `profile` is `null`.

- [ ] **Step 2: Create `src/lib/auth/profile.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface CrmProfile {
  id: string
  full_name: string
  email: string
  role: 'Admin' | 'Sales'
  avatar_url: string | null
}

export async function getProfileByAuthUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<CrmProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Load CRM profile failed: ${error.message}`)
  }

  return (data as CrmProfile | null) ?? null
}
```

- [ ] **Step 3: Update `src/lib/auth/server.ts` to use the shared helper and return `null` when no CRM profile is linked**

```ts
import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isAuthConfigured } from '@/lib/env'
import { getProfileByAuthUserId, type CrmProfile } from '@/lib/auth/profile'

export interface AuthSession {
  userId: string
  email: string
  profile: CrmProfile
}

export async function getSession(): Promise<AuthSession | null> {
  if (!isAuthConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile) return null

  return {
    userId: user.id,
    email: user.email ?? '',
    profile,
  }
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}
```

- [ ] **Step 4: Update `src/app/api/auth/login/route.ts` to reject auth-only users that are not linked to `profiles`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isAuthConfigured } from '@/lib/env'
import { getProfileByAuthUserId } from '@/lib/auth/profile'

export const runtime = 'nodejs'

interface LoginBody {
  email?: string
  password?: string
}

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: 'Auth belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di .env.local.' },
      { status: 503 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as LoginBody
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client tidak tersedia.' }, { status: 500 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? 'Login gagal. Cek email/password.' },
      { status: 401 },
    )
  }

  const profile = await getProfileByAuthUserId(supabase, data.user.id)
  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'Akun berhasil login, tetapi belum terhubung ke profil CRM.' },
      { status: 403 },
    )
  }

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    profile,
  })
}
```

- [ ] **Step 5: Update `src/lib/supabase/middleware.ts` to redirect unmapped users back to login**

```ts
import 'server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'
import { getProfileByAuthUserId } from '@/lib/auth/profile'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = supabaseUrl()
  const anon = supabaseAnonKey()
  if (!url || !anon) {
    return response
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(items: { name: string; value: string; options: CookieOptions }[]) {
        items.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile) {
    await supabase.auth.signOut()
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'profile-not-linked')
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
```

- [ ] **Step 6: Verify the mapped-user path and the orphan-user path**

Run:

```bash
curl -sS -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@prospectflow.app","password":"'$TEMP_PASSWORD'"}'

curl -sS -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"orphan-auth-test@prospectflow.app","password":"OrphanTestAa1!"}'
```

Expected after implementation:

```json
{"user":{"id":"<uuid>","email":"admin@prospectflow.app"},"profile":{"id":"sales-1","full_name":"Admin","email":"admin@prospectflow.app","role":"Admin","avatar_url":null}}
```

```json
{"error":"Akun berhasil login, tetapi belum terhubung ke profil CRM."}
```

- [ ] **Step 7: Delete the temporary orphan auth user**

Run:

```bash
node --input-type=module <<'EOF'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0,2)))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
const orphan = (data.users ?? []).find((user) => user.email === 'orphan-auth-test@prospectflow.app')
if (orphan) await admin.auth.admin.deleteUser(orphan.id)
EOF
```

Expected: command exits cleanly with no orphan auth test user remaining.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/lib/auth/profile.ts src/lib/auth/server.ts src/app/api/auth/login/route.ts src/lib/supabase/middleware.ts
git commit -m "fix: require linked CRM profile for Supabase auth"
```

---

### Task 3: Remove demo wording from app surfaces while keeping seeded data as operational baseline

**Files:**
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/pipeline/page.tsx`

**Interfaces:**
- Consumes: authenticated runtime app shell and existing page headers/cards
- Produces: user-facing copy with no `demo mode`, `Demo fallback`, `seeded from`, or `demo/Supabase` wording

- [ ] **Step 1: Capture the current runtime wording before changing it**

Run after logging in with the admin seed account:

```bash
curl -sS -c /tmp/pf.cookies -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@prospectflow.app","password":"'$TEMP_PASSWORD'"}' >/tmp/pf-login.json
curl -sS -b /tmp/pf.cookies http://localhost:3000/ | grep -E "seeded|demo mode|Combined Database"
curl -sS -b /tmp/pf.cookies http://localhost:3000/pipeline | grep -E "demo/Supabase"
```

Expected before implementation: the old demo/seed strings appear.

- [ ] **Step 2: Update `src/components/app-shell.tsx` copy**

```tsx
<div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
  <div className="text-sm font-semibold text-emerald-950">War-room mode</div>
  <p className="mt-1 text-xs leading-5 text-emerald-700">
    Kelola prospek, audit, follow-up, dan mockup tim sales dari satu workspace.
  </p>
</div>
```

```tsx
<div className="hidden text-right sm:block">
  <div className="text-sm font-semibold text-slate-950">Belum login</div>
  <div className="text-xs text-slate-500">Masuk untuk melihat pipeline tim.</div>
</div>
```

- [ ] **Step 3: Update `src/app/settings/page.tsx` copy**

```tsx
const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

<SettingCard
  icon={<Database className="h-5 w-5" />}
  title="Supabase database"
  status={hasSupabase ? 'Configured' : 'Not configured'}
  description={
    hasSupabase
      ? 'App membaca data operasional dari Supabase.'
      : 'Isi environment Supabase untuk mengaktifkan data operasional dan login tim.'
  }
/>
```

- [ ] **Step 4: Update `src/app/page.tsx` and `src/app/pipeline/page.tsx` copy**

```tsx
<KpiCard title="Total prospek" value={stats.total} helper="Seluruh prospek aktif di CRM" icon={Target} tone="blue" />
```

```tsx
<PageHeader
  eyebrow="Kanban pipeline"
  title="Drag prospek antar status"
  description="Pindahkan card dari New sampai Deal. Setiap perubahan status tersimpan di CRM."
/>
```

- [ ] **Step 5: Verify the old wording is gone from runtime output**

Run:

```bash
curl -sS -b /tmp/pf.cookies http://localhost:3000/ | grep -E "seeded|demo mode|Combined Database" && exit 1 || echo "dashboard copy clean"
curl -sS -b /tmp/pf.cookies http://localhost:3000/pipeline | grep -E "demo/Supabase" && exit 1 || echo "pipeline copy clean"
curl -sS -b /tmp/pf.cookies http://localhost:3000/settings | grep -E "Demo fallback" && exit 1 || echo "settings copy clean"
```

Expected after implementation:

```text
dashboard copy clean
pipeline copy clean
settings copy clean
```

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/app-shell.tsx src/app/settings/page.tsx src/app/page.tsx src/app/pipeline/page.tsx
git commit -m "chore: remove demo wording from CRM surfaces"
```

---

### Task 4: End-to-end runtime verification and handoff

**Files:**
- No new source files
- Reuse files from Tasks 1-3

**Interfaces:**
- Consumes: provisioned auth users, linked profiles, cleaned UI copy
- Produces: verified login flow and runtime evidence for author/reviewer

- [ ] **Step 1: Start the app cleanly**

Run:

```bash
cd "/Users/macbookm2/Documents/ProspectFlow CRM"
rm -rf .next
npm run dev
```

Expected: Next.js dev server starts on `http://localhost:3000`.

- [ ] **Step 2: Verify the seed admin account can log in and reach the dashboard**

Run:

```bash
curl -sS -c /tmp/pf.cookies -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@prospectflow.app","password":"'$TEMP_PASSWORD'"}'
curl -sS -b /tmp/pf.cookies http://localhost:3000/ | grep -E "Kelola prospek dari riset sampai deal|Total prospek|Audit terkirim"
```

Expected: login returns `user + profile`, and the dashboard HTML includes the expected heading/KPI text.

- [ ] **Step 3: Verify the original asset regression stays fixed**

Run:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/_next/static/chunks/main-app.js
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/_next/static/chunks/app-pages-internals.js
```

Expected:

```text
200
200
```

- [ ] **Step 4: Verify the CRM profile mapping exists in Postgres after the app-level login passes**

Run:

```bash
export PGPASSWORD="$(python3 - <<'PY'
from pathlib import Path
for line in Path('.env').read_text().splitlines():
    if line.startswith('DB_PASSWORD='):
        print(line.split('=',1)[1], end='')
        break
PY
)"
DBURL="postgresql://postgres.nczmzhhdybhwcxtlaawf@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
psql "$DBURL" -tAc "select id,email,auth_user_id from profiles order by id;"
```

Expected: all four seeded `profiles` rows show non-null `auth_user_id` values.

- [ ] **Step 5: Commit any final verification-safe cleanup if needed**

```bash
git status --short
```

Expected: only the planned source-file changes remain. Do not commit `.next/`, temp cookie files, or any generated password file.

---

## Self-Review

- **Spec coverage:**
  - 4 seeded auth users provisioned → Task 1
  - `profiles.auth_user_id` linked → Task 1
  - real Supabase login flow → Task 2
  - runtime Supabase data layer left intact → no `src/lib/data/queries.ts` changes, called out in File Structure + constraints
  - demo wording removed from UI → Task 3
  - end-to-end runtime verification → Task 4
- **Placeholder scan:** no TBD/TODO markers; all file paths, commands, and snippets are concrete.
- **Type consistency:** `CrmProfile`, `AuthSession`, and `getProfileByAuthUserId()` names are consistent across Tasks 2-4.
