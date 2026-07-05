import { NextResponse } from 'next/server'
import { logCommunication } from '@/lib/data/queries'
import { guardMutation } from '@/lib/auth/api-guard'

export async function POST(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response
  try {
    const body = await request.json()
    if (!body?.prospect_id || !body?.channel || !body?.direction || !body?.message_summary || !body?.status_after) {
      return NextResponse.json({ error: 'Missing communication fields' }, { status: 400 })
    }
    const communication = await logCommunication(body)
    return NextResponse.json({ communication })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}