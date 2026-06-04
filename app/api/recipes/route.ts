import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-extension-secret',
}

// Handle preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, signal: AbortSignal.timeout(10000) }),
      },
    }
  )
}

// POST — called by the Chrome extension to save a recipe
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-extension-secret')
  if (secret !== process.env.EXTENSION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
  }

  const body = await req.json()
  const { nyt_url, title, image_url, description, ingredients, cuisine, cook_time_minutes, yield: recipeYield, raw_json } = body

  if (!nyt_url || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: CORS_HEADERS })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('recipes')
    .upsert(
      { nyt_url, title, image_url, description, ingredients, cuisine, cook_time_minutes, yield: recipeYield, raw_json },
      { onConflict: 'nyt_url' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS })
  }

  return NextResponse.json({ ok: true, recipe: data }, { headers: CORS_HEADERS })
}

// GET — list all recipes with last cooked date, for the web app
export async function GET(req: NextRequest) {
  // Check session cookie for web app requests
  const session = req.cookies.get('mp_session')
  if (session?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const ingredient = searchParams.get('ingredient')?.toLowerCase()

  const supabase = getSupabase()
  let query = supabase
    .from('recipes')
    .select(`
      *,
      cook_log (cooked_on)
    `)
    .order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with last_cooked and cook_count, filter by ingredient if provided
  let recipes = (data || []).map((r: any) => {
    const logs = r.cook_log || []
    const sorted = logs.map((l: any) => l.cooked_on).sort().reverse()
    return {
      ...r,
      cook_log: undefined,
      last_cooked: sorted[0] || null,
      cook_count: logs.length,
    }
  })

  if (ingredient) {
    recipes = recipes.filter((r: any) =>
      r.ingredients?.some((ing: string) => ing.toLowerCase().includes(ingredient))
    )
  }

  return NextResponse.json({ recipes })
}
