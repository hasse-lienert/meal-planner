import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

// GET current week's plan
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabase()
  const weekStart = getMonday(new Date())

  let { data: plan } = await db
    .from('weekly_plans')
    .select('*')
    .eq('week_start', weekStart)
    .single()

  if (!plan) {
    const { data: newPlan } = await db
      .from('weekly_plans')
      .insert({ week_start: weekStart })
      .select()
      .single()
    plan = newPlan
  }

  if (!plan) return NextResponse.json({ error: 'Could not get plan' }, { status: 500 })

  const { data: meals } = await db
    .from('plan_meals')
    .select('*, recipe:recipes(*)')
    .eq('plan_id', plan.id)
    .order('sort_order')

  // Fetch cook log entries for this week's recipes so UI can show cooked state on load
  const recipeIds = (meals || []).map((m: any) => m.recipe_id).filter(Boolean)
  let cookedThisWeek: string[] = []
  if (recipeIds.length > 0) {
    const { data: logs } = await db
      .from('cook_log')
      .select('recipe_id')
      .in('recipe_id', recipeIds)
      .gte('cooked_on', weekStart)
    cookedThisWeek = (logs || []).map((l: any) => l.recipe_id)
  }

  return NextResponse.json({ plan: { ...plan, meals: meals || [] }, cookedThisWeek })
}

// POST — add a recipe to this week's plan
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipe_id, planned_day } = await req.json()
  if (!recipe_id) return NextResponse.json({ error: 'recipe_id required' }, { status: 400 })

  const db = getSupabase()
  const weekStart = getMonday(new Date())

  let { data: plan } = await db
    .from('weekly_plans')
    .select('*')
    .eq('week_start', weekStart)
    .single()

  if (!plan) {
    const { data: newPlan } = await db
      .from('weekly_plans')
      .insert({ week_start: weekStart })
      .select()
      .single()
    plan = newPlan
  }

  const { count } = await db
    .from('plan_meals')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', plan!.id)

  const { data, error } = await db
    .from('plan_meals')
    .insert({ plan_id: plan!.id, recipe_id, planned_day, sort_order: count || 0 })
    .select('*, recipe:recipes(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, meal: data })
}

// DELETE — remove a meal from the plan
export async function DELETE(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meal_id } = await req.json()
  if (!meal_id) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })

  const { error } = await getSupabase().from('plan_meals').delete().eq('id', meal_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
