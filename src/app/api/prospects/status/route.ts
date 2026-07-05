import { NextResponse } from 'next/server'
import { setProspectStatus } from '@/lib/data/queries'
import { guardMutation } from '@/lib/auth/api-guard'
import { PROSPECT_STATUSES, type ProspectStatus } from '@/lib/types'

export async function POST(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response
  try {
    const body = await request.json()
    if (!body?.id || !PROSPECT_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid prospect id or status' }, { status: 400 })
    }
    const prospect = await setProspectStatus(body.id, body.status as ProspectStatus)
    if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    return NextResponse.json({ prospect })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}