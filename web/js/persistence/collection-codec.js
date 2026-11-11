export const STORAGE_KEY = 'recipe-box:collection';
export const SCHEMA_VERSION = 1;

/**
 * @param {readonly import('../core/recipe/types.js').Recipe[]} recipes
 * @returns {string}
 */
export function encodeCollection(recipes) {
  return JSON.stringify({ version: SCHEMA_VERSION, recipes });
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isStoredIngredient(value) {
  if (!isObject(value) || !isObject(value.amount)) return false;
  const { text, value: amountValue } = value.amount;
  const validValue =
    amountValue === null || (typeof amountValue === 'number' && Number.isFinite(amountValue));
  return (
    typeof text === 'string' &&
    validValue &&
    typeof value.unit === 'string' &&
    typeof value.name === 'string'
  );
}

/**
 * @param {unknown} list
 * @param {(item: unknown) => boolean} isItem
 * @param {number} min
 * @returns {boolean}
 */
function isListOf(list, isItem, min) {
  if (!Array.isArray(list) || list.length < min) return false;
  for (let i = 0; i < list.length; i += 1) if (!isItem(list[i])) return false;
  return true;
}

/** @param {unknown} value */
const isString = (value) => typeof value === 'string';

/**
 * @param {Record<string, unknown>} r
 * @returns {boolean}
 */
function hasStoredFields(r) {
  return (
    typeof r.id === 'string' &&
    r.id !== '' &&
    typeof r.title === 'string' &&
    typeof r.favourite === 'boolean' &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  );
}

/**
 * @param {Record<string, unknown>} r
 * @returns {boolean}
 */
function hasStoredContent(r) {
  return (
    Number.isSafeInteger(r.servings) &&
    /** @type {number} */ (r.servings) >= 1 &&
    isListOf(r.ingredients, isStoredIngredient, 1) &&
    isListOf(r.steps, isString, 1) &&
    isListOf(r.tags, isString, 0)
  );
}

/**
 * Lenient stored-shape check (§10.1 / §6.3 types only). Deliberately independent of the
 * write-side validator: no trimming, tag normal form or locale rules, so a later rule change
 * or a different browser can never make already-stored v1 data unreadable.
 * @param {unknown} value
 * @returns {boolean}
 */
function isStoredRecipe(value) {
  return isObject(value) && hasStoredFields(value) && hasStoredContent(value);
}

/**
 * @param {string | null} raw
 * @returns {import('../store/ports.js').LoadResult}
 */
export function decodeCollection(raw) {
  if (raw === null) return { kind: 'empty' };
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'unreadable', reason: 'not JSON' };
  }
  const version = isObject(parsed) ? parsed.version : undefined;
  if (!isObject(parsed) || version !== SCHEMA_VERSION) {
    return { kind: 'unreadable', reason: `unknown version ${String(version)}` };
  }
  const recipes = parsed.recipes;
  if (!Array.isArray(recipes)) return { kind: 'unreadable', reason: 'recipes is not a list' };
  const bad = recipes.findIndex((r) => !isStoredRecipe(r));
  if (bad >= 0) return { kind: 'unreadable', reason: `invalid recipe at index ${bad}` };
  return recipes.length === 0
    ? { kind: 'empty' }
    : { kind: 'ok', recipes: /** @type {import('../core/recipe/types.js').Recipe[]} */ (recipes) };
}
