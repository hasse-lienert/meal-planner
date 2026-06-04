// Injected on cooking.nytimes.com/recipes/* pages
// Reads JSON-LD structured data and posts to the meal planner backend

(function () {
  if (document.getElementById('mp-save-btn')) return // already injected

  // Parse JSON-LD from the page
  function getRecipeData() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent)
        const recipe = Array.isArray(data)
          ? data.find(d => d['@type'] === 'Recipe')
          : data['@type'] === 'Recipe' ? data : null
        if (recipe) return recipe
      } catch (e) {}
    }
    return null
  }

  function parseMinutes(duration) {
    if (!duration) return null
    // ISO 8601 duration e.g. PT1H30M or PT45M
    const hours = duration.match(/(\d+)H/)
    const mins = duration.match(/(\d+)M/)
    return (hours ? parseInt(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1]) : 0)
  }

  function buildPayload(recipe) {
    const ingredients = (recipe.recipeIngredient || []).map(i => i.trim())
    const cuisine = Array.isArray(recipe.recipeCuisine)
      ? recipe.recipeCuisine[0]
      : recipe.recipeCuisine || null
    return {
      nyt_url: window.location.href.split('?')[0],
      title: recipe.name || document.title,
      image_url: Array.isArray(recipe.image) ? recipe.image[0]?.url || recipe.image[0] : recipe.image?.url || recipe.image || null,
      description: recipe.description || null,
      ingredients,
      cuisine,
      cook_time_minutes: parseMinutes(recipe.totalTime || recipe.cookTime),
      yield: Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield || null,
      raw_json: recipe,
    }
  }

  // Inject the save button
  function injectButton() {
    const btn = document.createElement('button')
    btn.id = 'mp-save-btn'
    btn.innerText = '🍳 Save to Meal Planner'
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      background: #f97316;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      transition: background 0.15s;
    `
    btn.addEventListener('mouseenter', () => btn.style.background = '#ea6d0a')
    btn.addEventListener('mouseleave', () => btn.style.background = '#f97316')

    btn.addEventListener('click', async () => {
      btn.innerText = 'Saving…'
      btn.disabled = true

      const recipeData = getRecipeData()
      if (!recipeData) {
        btn.innerText = '⚠️ No recipe data found'
        setTimeout(() => { btn.innerText = '🍳 Save to Meal Planner'; btn.disabled = false }, 2000)
        return
      }

      const payload = buildPayload(recipeData)

      chrome.storage.sync.get(['mpUrl', 'mpSecret'], async ({ mpUrl, mpSecret }) => {
        if (!mpUrl || !mpSecret) {
          btn.innerText = '⚙️ Configure extension first'
          setTimeout(() => { btn.innerText = '🍳 Save to Meal Planner'; btn.disabled = false }, 2500)
          return
        }

        try {
          const res = await fetch(`${mpUrl}/api/recipes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-extension-secret': mpSecret,
            },
            body: JSON.stringify(payload),
          })

          if (res.ok) {
            btn.innerText = '✓ Saved!'
            btn.style.background = '#16a34a'
            setTimeout(() => {
              btn.innerText = '🍳 Save to Meal Planner'
              btn.style.background = '#f97316'
              btn.disabled = false
            }, 2000)
          } else {
            btn.innerText = '⚠️ Error saving'
            setTimeout(() => { btn.innerText = '🍳 Save to Meal Planner'; btn.disabled = false }, 2000)
          }
        } catch (e) {
          btn.innerText = '⚠️ Could not connect'
          setTimeout(() => { btn.innerText = '🍳 Save to Meal Planner'; btn.disabled = false }, 2000)
        }
      })
    })

    document.body.appendChild(btn)
  }

  injectButton()
})()
