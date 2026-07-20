-- Recipes saved from NYT Cooking
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  nyt_url text not null unique,
  title text not null,
  image_url text,
  description text,
  ingredients text[] default '{}',
  cuisine text,
  cook_time_minutes integer,
  yield text,
  raw_json jsonb,
  created_at timestamptz default now()
);

-- Log of when we actually cooked something
create table if not exists cook_log (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  cooked_on date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- Weekly meal plans
create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique, -- always a Monday
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Meals within a plan (up to ~3 per week)
create table if not exists plan_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references weekly_plans(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  planned_day text, -- 'monday', 'tuesday', etc. or null
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Shared kitchen preferences (staples we always have, ingredients to never suggest,
-- max weeknight cook time). Key/value so new preferences don't need a migration.
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_cook_log_recipe_id on cook_log(recipe_id);
create index if not exists idx_cook_log_cooked_on on cook_log(cooked_on desc);
create index if not exists idx_plan_meals_plan_id on plan_meals(plan_id);
create index if not exists idx_recipes_created_at on recipes(created_at desc);
