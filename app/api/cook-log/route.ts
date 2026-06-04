import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function authed(req: NextRequest) {
  return req.cookies.get('mp_session')?.value === 'authenticated'
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipe_id, cooked_on, notes } = await req.json()
  if (!recipe_id) return NextResponse.json({ error: 'recipe_id required' }, { status: 400 })

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cook_log')
    .insert({ recipe_id, cooked_on: cooked_on || new Date().toISOString().split('T')[0], notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, entry: data })
}
