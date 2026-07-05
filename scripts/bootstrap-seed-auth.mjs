import { createClient } from '@supabase/supabase-js'

const NoopRealtimeTransport = class { }

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
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (error) throw error
    if (!data.user) throw new Error(`User update returned no user for ${email}`)
    return data.user
  }

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
    realtime: { transport: NoopRealtimeTransport },
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
