import { NextResponse } from 'next/server'
import { getProspect } from '@/lib/data/queries'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const prospect = await getProspect(params.id)
    if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    return NextResponse.json({ prospect })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}