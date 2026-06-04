'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { WeeklyPlan, Recipe } from '@/lib/types'

export default function ThisWeekPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [cookedId, setCookedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plan')
      .then(r => r.json())
      .then(d => { setPlan(d.plan); setLoading(false) })
  }, [])

  async function removeMeal(mealId: string) {
    await fetch('/api/plan', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal_id: mealId }),
    })
    setPlan(p => p ? { ...p, meals: p.meals.filter(m => m.id !== mealId) } : p)
  }

  async function logCooked(recipeId: string) {
    await fetch('/api/cook-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipeId }),
    })
    setCookedId(recipeId)
    setTimeout(() => setCookedId(null), 3000)
  }

  if (loading) return <div className="text-stone-400 text-sm">Loading…</div>

  const weekLabel = plan
    ? new Date(plan.week_start + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">This Week</h1>
          <p className="text-stone-400 text-sm mt-0.5">Week of {weekLabel}</p>
        </div>
        <Link
          href="/library"
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add meal
        </Link>
      </div>

      {plan?.meals.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">🥄</p>
          <p className="font-medium">No meals planned yet</p>
          <p className="text-sm mt-1">Head to the Library to add some</p>
        </div>
      )}

      <div className="space-y-3">
        {plan?.meals.map(meal => (
          <div key={meal.id} className="bg-white rounded-xl border border-stone-200 p-4 flex gap-4">
            {meal.recipe?.image_url && (
              <img
                src={meal.recipe.image_url}
                alt={meal.recipe.title}
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {meal.planned_day && (
                    <span className="text-xs font-medium text-orange-500 uppercase tracking-wide">
                      {meal.planned_day}
                    </span>
                  )}
                  <h2 className="font-medium text-stone-800 leading-snug">{meal.recipe?.title}</h2>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {[meal.recipe?.cuisine, meal.recipe?.cook_time_minutes ? `${meal.recipe.cook_time_minutes} min` : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => meal.recipe && logCooked(meal.recipe.id)}
                    className="text-xs px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                  >
                    {cookedId === meal.recipe?.id ? '✓ Logged!' : '✓ Cooked'}
                  </button>
                  <button
                    onClick={() => removeMeal(meal.id)}
                    className="text-xs px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-500 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shopping list */}
      {plan && plan.meals.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Shopping list</h2>
          {plan.meals.map(meal => (
            <div key={meal.id} className="mb-6">
              <h3 className="text-sm font-medium text-stone-500 mb-2">{meal.recipe?.title}</h3>
              <ul className="space-y-1.5">
                {meal.recipe?.ingredients?.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                    <input type="checkbox" className="mt-0.5 accent-orange-500" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
