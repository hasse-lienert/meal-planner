export interface Recipe {
  id: string
  nyt_url: string
  title: string
  image_url: string | null
  description: string | null
  ingredients: string[]
  cuisine: string | null
  cook_time_minutes: number | null
  yield: string | null
  created_at: string
  last_cooked?: string | null  // joined from cook_log
  cook_count?: number          // joined from cook_log
}

export interface CookLogEntry {
  id: string
  recipe_id: string
  cooked_on: string
  notes: string | null
  created_at: string
}

export interface WeeklyPlan {
  id: string
  week_start: string
  meals: PlanMeal[]
}

export interface PlanMeal {
  id: string
  plan_id: string
  recipe_id: string
  planned_day: string | null
  sort_order: number
  recipe?: Recipe
}
