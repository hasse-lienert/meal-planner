import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

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

  const { pantry } = await req.json()
  const db = getSupabase()

  // Build lean taste profile from saved library
  const { data: recipes } = await db
    .from('recipes')
    .select('title, cuisine, ingredients')

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

  const prompt = `You are a meal planning assistant helping pick weeknight dinners from NYT Cooking.

Taste profile (based on their saved recipes):
- Cuisines they enjoy: ${cuisines.join(', ') || 'varied'}
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

  try {
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const suggestions = JSON.parse(cleaned)
    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ error: 'Failed to parse suggestions', raw: text }, { status: 500 })
  }
}
