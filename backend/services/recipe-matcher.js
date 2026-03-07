/**
 * Match detected ingredients to Indigenous recipes dataset.
 * Returns recipes you can make, sorted by ingredient overlap.
 *
 * Merged: bidirectional synonym expansion (teammate) + buildDetectedSet export (ours)
 */
const path = require('path');
const fs   = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'data', 'indigenous-recipes.json');
let _recipes = null;

function loadRecipes() {
  if (_recipes) return _recipes;
  try {
    _recipes = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (_) {
    _recipes = [];
  }
  return _recipes;
}

// ── Synonym map (bidirectional expansion) ─────────────────────────────────────
const SYNONYMS = {
  maize: ['corn'], corn: ['maize', 'cornmeal', 'tortilla', 'taco'],
  pumpkin: ['squash'], squash: ['pumpkin'],
  beef: ['meat', 'venison', 'game', 'bison', 'steak'],
  meat: ['beef', 'venison', 'game', 'bison', 'steak', 'chicken', 'pork', 'sausage'],
  game: ['meat', 'beef'], venison: ['meat', 'beef'], bison: ['meat', 'beef'],
  broth: ['soup'], soup: ['broth'], cornmeal: ['corn', 'flour'],
  lard: ['oil', 'fat'], fat: ['oil'], oil: ['fat', 'lard'],
  tortilla: ['taco', 'quesadilla', 'burrito'],
  taco: ['tortilla', 'quesadilla', 'burrito'],
  quesadilla: ['tortilla', 'taco', 'cheese'],
  burrito: ['tortilla', 'taco', 'bean'],
  lettuce: ['salad'], salad: ['lettuce', 'spinach', 'kale'],
  bread: ['toast', 'dough', 'biscuit'], toast: ['bread'],
  fish: ['salmon', 'tuna', 'seafood'], salmon: ['fish'], tuna: ['fish'],
  berry: ['blueberry', 'blackberry', 'raspberry', 'strawberry', 'cherry'],
  cream: ['milk', 'sour-cream'], cranberry: ['cherry', 'raspberry'],
};

function normalize(s) {
  return String(s == null ? '' : s).toLowerCase().trim().replace(/\s+/g, '-').replace(/_/g, '-');
}

/**
 * Expand a single ingredient name using bidirectional synonym lookup.
 * e.g. 'salmon' → ['salmon', 'fish'] (forward) + any keys that list 'salmon' as a value
 */
function expandIngredient(name) {
  const n   = normalize(name);
  const out = new Set([n]);
  // Forward lookup
  if (SYNONYMS[n]) SYNONYMS[n].forEach(x => out.add(normalize(x)));
  // Reverse lookup
  for (const [key, vals] of Object.entries(SYNONYMS)) {
    if (vals.some(v => normalize(v) === n)) out.add(normalize(key));
  }
  return [...out];
}

/**
 * Build an expanded Set from a list of detected ingredient names or objects.
 * @param {Array<string|{label:string}>} detected
 * @returns {Set<string>}
 */
function buildDetectedSet(detected) {
  const set = new Set();
  if (!Array.isArray(detected)) return set;
  for (const item of detected) {
    const name = typeof item === 'string' ? item : (item && item.label);
    if (name) expandIngredient(name).forEach(x => set.add(x));
  }
  return set;
}

/**
 * Match detected ingredients to the Indigenous recipes dataset.
 * @param {Array<string|{label:string}>} detected
 * @param {{ minScore?: number, maxResults?: number }} opts
 * @returns {{ recipe: object, score: number, matchedIngredients: string[] }[]}
 */
function matchRecipes(detected, opts = {}) {
  const minScore   = opts.minScore   ?? 0.15;
  const maxResults = opts.maxResults ?? 16;

  const expanded = buildDetectedSet(detected);
  if (expanded.size === 0) return [];

  const list   = loadRecipes();
  const scored = list.map(recipe => {
    const ings    = (recipe.ingredients || []).map(normalize);
    const matched = ings.filter(x => expanded.has(x));
    const score   = ings.length ? matched.length / ings.length : 0;
    return { recipe, score, matchedIngredients: matched };
  });

  return scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

module.exports = { loadRecipes, matchRecipes, buildDetectedSet };
