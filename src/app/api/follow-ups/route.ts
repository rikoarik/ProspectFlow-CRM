import { NextResponse } from 'next/server'
import { completeFollowUp, rescheduleFollowUp, scheduleFollowUp } from '@/lib/data/queries'
import { guardMutation } from '@/lib/auth/api-guard'

export async function POST(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response
  try {
    const body = await request.json()
    if (!body?.prospect_id || !body?.follow_up_date || !body?.reason) {
      return NextResponse.json({ error: 'Missing follow-up fields' }, { status: 400 })
    }
    const followUp = await scheduleFollowUp(body)
    return NextResponse.json({ followUp })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response
  try {
    const body = await request.json()
    if (!body?.id || !body?.action) {
      return NextResponse.json({ error: 'Missing follow-up id or action' }, { status: 400 })
    }
    if (body.action === 'complete') {
      const followUp = await completeFollowUp(body.id, body.notes ?? '')
      return NextResponse.json({ followUp })
    }
    if (body.action === 'reschedule') {
      if (!body.follow_up_date) return NextResponse.json({ error: 'Missing follow_up_date' }, { status: 400 })
      const followUp = await rescheduleFollowUp(body.id, body.follow_up_date)
      return NextResponse.json({ followUp })
    }
    return NextResponse.json({ error: 'Unsupported follow-up action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}