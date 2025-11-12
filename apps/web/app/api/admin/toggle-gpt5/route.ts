import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

// POST /api/admin/toggle-gpt5
// Body: { userId: string, enabled: boolean }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, enabled } = body
    if (!userId || typeof enabled !== 'boolean') {
      return new NextResponse(JSON.stringify({ error: 'Missing userId or enabled flag' }), { status: 400 })
    }

    const sb = getSupabaseServer()
    const { data, error } = await sb.from('profiles').update({ use_gpt5: enabled }).eq('user_id', userId).select()
    if (error) return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return new NextResponse(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

export const runtime = 'nodejs'
