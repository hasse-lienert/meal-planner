import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { isValidSession } from '@/lib/auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function authed(req: NextRequest) {
  return isValidSession(req.cookies.get('mp_session')?.value)
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pantry } = await req.json()
  const db = getSupabase()

  // Build lean taste profile from saved library
  const { data: recipes } = await db
    .from('recipes')
    .select('title, cuisine, ingredients, nyt_url')
    .order('created_at', { ascending: false })

  // Recent cook log — last 3 weeks
  const threeWeeksAgo = new Date()
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)
  const { data: recentLogs } = await db
    .from('cook_log')
    .select('recipe_id, cooked_on, recipes(title)')
    .gte('cooked_on', threeWeeksAgo.toISOString().split('T')[0])
    .order('cooked_on', { ascending: false })

  // Summarise taste profile
  const cuisines = [...new Set((recipes || []).map(r => r.cuisine).filter(Boolean))]
  const ingredientCounts: Record<string, number> = {}
  for (const r of recipes || []) {
    for (const ing of r.ingredients || []) {
      const word = ing.toLowerCase().split(/[\s,]+/)[0]
      if (word.length > 3) ingredientCounts[word] = (ingredientCounts[word] || 0) + 1
    }
  }
  const topIngredients = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w)

  const recentTitles = (recentLogs || [])
    .map((l: any) => l.recipes?.title)
    .filter(Boolean)

  // Recipe titles carry the richest taste signal — cuisine tags are often missing from NYT data
  const savedTitles = (recipes || []).map(r => r.title).slice(0, 30)

  const prompt = `You are a meal planning assistant helping pick weeknight dinners from NYT Cooking.

Taste profile (based on their saved recipes):
- Recipes they've saved: ${savedTitles.join('; ') || 'none yet'}
${cuisines.length ? `- Cuisines they enjoy: ${cuisines.join(', ')}` : ''}
- Ingredients they cook with often: ${topIngredients.join(', ') || 'varied'}
- Recently cooked (avoid repeating these): ${recentTitles.join(', ') || 'nothing yet'}
${pantry ? `- Ingredients to use up this week: ${pantry}` : ''}

Suggest 3 weeknight dinner ideas for this week that fit their taste but feel fresh — not too similar to each other or to what they've made recently. ${pantry ? 'Prioritise ideas that use the pantry ingredients.' : ''} Give each idea a short, descriptive dish name (e.g. "Miso-Glazed Salmon", "Spicy Pork Larb", "Roasted Cauliflower with Tahini") — something that works well as a search term on NYT Cooking, not a made-up specific recipe title.

Return ONLY a JSON array with exactly 3 objects, no other text:
[
  {
    "title": "Dish Name",
    "reason": "One sentence why this fits"
  }
]`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let ideas: { title: string; reason: string }[]
  try {
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    ideas = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Failed to parse suggestions', raw: text }, { status: 500 })
  }

  // Search NYT Cooking for each idea and return real recipes, skipping ones already saved
  const savedUrls = new Set((recipes || []).map(r => r.nyt_url))
  const results = await Promise.all(
    ideas.map(async idea => {
      const found = await searchNyt(idea.title)
      const fresh = found.find(f => !savedUrls.has(f.url))
      return fresh
        ? { title: fresh.title, url: fresh.url, reason: idea.reason }
        : { title: idea.title, url: null, reason: idea.reason }
    })
  )

  return NextResponse.json({ suggestions: results })
}

// Scrape NYT Cooking search results — returns recipes in page order
async function searchNyt(query: string): Promise<{ title: string; url: string }[]> {
  try {
    const res = await fetch(
      `https://cooking.nytimes.com/search?q=${encodeURIComponent(query)}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []
    const html = await res.text()
    const seen = new Set<string>()
    const results: { title: string; url: string }[] = []
    for (const m of html.matchAll(/href="(\/recipes\/(\d+)-([a-z0-9-]+))"/g)) {
      if (seen.has(m[2])) continue
      seen.add(m[2])
      const title = m[3].split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
      results.push({ title, url: `https://cooking.nytimes.com${m[1]}` })
    }
    return results
  } catch {
    return []
  }
}
