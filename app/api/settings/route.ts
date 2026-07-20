import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidSession } from '@/lib/auth'

const KEYS = ['staples', 'avoid', 'max_minutes'] as const

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function authed(req: NextRequest) {
  return isValidSession(req.cookies.get('mp_session')?.value)
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Missing table (migration not run yet) shouldn't break the page — fall back to empty
  const { data } = await getSupabase().from('app_settings').select('key, value')
  const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rows = KEYS.filter(k => k in body).map(k => ({
    key: k,
    value: String(body[k] ?? ''),
    updated_at: new Date().toISOString(),
  }))
  if (rows.length === 0) return NextResponse.json({ ok: true })

  const { error } = await getSupabase().from('app_settings').upsert(rows, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
