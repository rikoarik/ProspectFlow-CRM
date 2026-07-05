import { NextResponse } from 'next/server'
import { bulkSetStatus } from '@/lib/data/queries'
import { guardMutation } from '@/lib/auth/api-guard'
import { PROSPECT_STATUSES, type ProspectStatus } from '@/lib/types'

export async function POST(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response
  try {
    const body = await request.json()
    if (!Array.isArray(body?.ids) || !body.ids.length || !PROSPECT_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid ids or status' }, { status: 400 })
    }
    const prospects = await bulkSetStatus(body.ids, body.status as ProspectStatus)
    return NextResponse.json({ prospects })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}