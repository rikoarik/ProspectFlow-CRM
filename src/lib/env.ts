// Server-only env accessors. Importing this from a client component will pull
// server-only secrets into the browser bundle — don't.

function read(name: string): string {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export function supabaseUrl() {
  return read('NEXT_PUBLIC_SUPABASE_URL')
}

export function supabaseAnonKey() {
  return read('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export function supabaseServiceRoleKey() {
  return read('SUPABASE_SERVICE_ROLE_KEY')
}

export function openAiBaseUrl() {
  return read('OPENAI_BASE_URL') || 'https://api.openai.com/v1'
}

export function openAiApiKey() {
  return read('OPENAI_API_KEY')
}

export function openAiModel() {
  return read('OPENAI_MODEL') || 'gpt-4o-mini'
}

export function mockupsBucket() {
  return read('SUPABASE_STORAGE_BUCKET_MOCKUPS') || 'mockups'
}

// S3-compatible Storage access. Optional; used by future SDK-based uploads.
// These do NOT replace NEXT_PUBLIC_SUPABASE_URL — the Supabase JS client
// still targets the project API base for Auth/PostgREST/Storage.
export function supabaseS3Endpoint() {
  return read('SUPABASE_S3_ENDPOINT')
}

export function supabaseS3Region() {
  return read('SUPABASE_S3_REGION')
}

// Override base used to resolve Storage object public URLs:
//   {base}/{bucket}/{path}
// (e.g. https://<ref>.supabase.co/storage/v1/object/public)
export function supabaseStoragePublicBaseUrl() {
  return read('SUPABASE_STORAGE_PUBLIC_BASE_URL')
}

export function isStorageS3Configured() {
  return Boolean(
    supabaseS3Endpoint() && supabaseS3Region() && supabaseStoragePublicBaseUrl(),
  )
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey())
}

export function isAuthConfigured() {
  return Boolean(isSupabaseConfigured() && supabaseServiceRoleKey())
}

export function isAiConfigured() {
  return Boolean(openAiApiKey())
}