/** @typedef {import('../recipe/types.js').Recipe} Recipe */
/** @typedef {{ query: string, tag: string | null, favouritesOnly: boolean }} RecipeFilter */

/**
 * @param {Recipe} a
 * @param {Recipe} b
 * @returns {number}
 */
function compareRecipes(a, b) {
  const byTitle = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  if (byTitle !== 0) return byTitle;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * A-Z by title (case-insensitive), ties by createdAt then id. Returns a new array.
 * @param {readonly Recipe[]} recipes
 * @returns {Recipe[]}
 */
export function sortByTitle(recipes) {
  return [...recipes].sort(compareRecipes);
}

/**
 * @param {Recipe} recipe
 * @param {RecipeFilter} filter
 * @param {string} needle lower-cased, trimmed query
 * @returns {boolean}
 */
function matches(recipe, filter, needle) {
  if (filter.favouritesOnly && !recipe.favourite) return false;
  if (filter.tag !== null && !recipe.tags.includes(filter.tag)) return false;
  return recipe.title.toLocaleLowerCase().includes(needle);
}

/**
 * All conditions must match; result is sorted A-Z (new array).
 * @param {readonly Recipe[]} recipes
 * @param {RecipeFilter} filter
 * @returns {Recipe[]}
 */
export function filterRecipes(recipes, filter) {
  const needle = filter.query.trim().toLocaleLowerCase();
  return sortByTitle(recipes.filter((recipe) => matches(recipe, filter, needle)));
}

/**
 * Union of all tags, unique, A-Z.
 * @param {readonly Recipe[]} recipes
 * @returns {string[]}
 */
export function listTags(recipes) {
  return [...new Set(recipes.flatMap((recipe) => recipe.tags))].sort();
}

/**
 * @param {RecipeFilter} filter
 * @returns {boolean}
 */
export function hasActiveFilters(filter) {
  return filter.query.trim() !== '' || filter.tag !== null || filter.favouritesOnly;
}
