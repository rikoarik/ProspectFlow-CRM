import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from './server'
import { isAuthConfigured } from '@/lib/env'

/**
 * Guard a mutation route. When Supabase auth is configured, the request must
 * carry a valid session. When auth isn't configured (demo mode), it passes
 * through so the seed-fallback still works locally.
 */
export async function guardMutation() {
  if (!isAuthConfigured()) {
    return { session: null, response: null as null }
  }
  const session = await getSession()
  if (!session) {
    return {
      session: null as null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { session, response: null as null }
}