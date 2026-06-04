'use client'

import { useEffect, useState } from 'react'
import type { Recipe } from '@/lib/types'

const RECENT_DAYS = 21 // suppress recipes cooked within 3 weeks

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function LibraryPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [errorId, setErrorId] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    const params = debouncedSearch ? `?ingredient=${encodeURIComponent(debouncedSearch)}` : ''
    fetch(`/api/recipes${params}`)
      .then(r => r.json())
      .then(d => { setRecipes(d.recipes || []); setLoading(false) })
  }, [debouncedSearch])

  async function addToPlan(recipe: Recipe) {
    setAddingId(recipe.id)
    setErrorId(null)
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipe.id }),
    })
    if (res.ok) {
      setAddedIds(s => new Set([...s, recipe.id]))
    } else {
      setErrorId(recipe.id)
    }
    setAddingId(null)
  }

  const recentlyCookedDays = (r: Recipe) => daysSince(r.last_cooked ?? null)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-stone-800">Library</h1>
        <span className="text-stone-400 text-sm">{recipes.length} recipes</span>
      </div>

      {/* Search / ingredient filter */}
      <div className="relative mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by ingredient (e.g. chicken, lemon…)"
          className="w-full px-4 py-2.5 pl-10 rounded-lg border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <span className="absolute left-3 top-2.5 text-stone-400">🔍</span>
      </div>

      {loading && <div className="text-stone-400 text-sm">Loading…</div>}

      {!loading && recipes.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">No recipes yet</p>
          <p className="text-sm mt-1">Save recipes from NYT Cooking using the extension</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {recipes.map(recipe => {
          const days = recentlyCookedDays(recipe)
          const isRecent = days !== null && days < RECENT_DAYS
          const isAdded = addedIds.has(recipe.id)

          return (
            <div
              key={recipe.id}
              className={`bg-white rounded-xl border border-stone-200 p-4 flex gap-3 transition-opacity ${
                isRecent ? 'opacity-50' : ''
              }`}
            >
              {recipe.image_url && (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-stone-800 text-sm leading-snug line-clamp-2">
                  {recipe.title}
                </h2>
                <p className="text-stone-400 text-xs mt-0.5">
                  {[
                    recipe.cuisine,
                    recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min` : null,
                    recipe.cook_count ? `cooked ${recipe.cook_count}×` : null,
                  ].filter(Boolean).join(' · ')}
                </p>
                {isRecent && days !== null && (
                  <p className="text-xs text-amber-500 mt-0.5">Cooked {days}d ago</p>
                )}
                <div className="flex gap-2 mt-2">
                  <a
                    href={recipe.nyt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-stone-400 hover:text-stone-600 underline"
                  >
                    View
                  </a>
                  <button
                    onClick={() => addToPlan(recipe)}
                    disabled={!!addingId || isAdded}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      isAdded
                        ? 'bg-green-50 text-green-600 cursor-default'
                        : errorId === recipe.id
                        ? 'bg-red-50 text-red-600'
                        : 'bg-orange-50 hover:bg-orange-100 text-orange-600'
                    }`}
                  >
                    {isAdded ? '✓ Added' : addingId === recipe.id ? '…' : errorId === recipe.id ? '⚠ Error' : '+ This week'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
