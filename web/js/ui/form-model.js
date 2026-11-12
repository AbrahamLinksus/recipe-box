import { normaliseTag } from '../core/recipe/tags.js';

/**
 * @typedef {import('../core/recipe/types.js').Recipe} Recipe
 * @typedef {import('../core/recipe/types.js').RecipeDraft} RecipeDraft
 * @typedef {import('../core/recipe/types.js').IngredientDraft} IngredientDraft
 */

/** @returns {IngredientDraft} */
const emptyIngredient = () => ({ amount: '', unit: '', name: '' });

/**
 * Remove item i; an emptied list gets one empty row.
 * @template T
 * @param {T[]} list
 * @param {number} i
 * @param {() => T} blank
 * @returns {T[]}
 */
function removeRow(list, i, blank) {
  const rest = list.filter((_, index) => index !== i);
  return rest.length === 0 ? [blank()] : rest;
}

/** @returns {RecipeDraft} */
export function emptyDraft() {
  return { title: '', servings: '', ingredients: [emptyIngredient()], steps: [''], tags: [] };
}

/**
 * @param {Recipe} r
 * @returns {RecipeDraft}
 */
export function draftFromRecipe(r) {
  return {
    title: r.title,
    servings: String(r.servings),
    ingredients: r.ingredients.map((x) => ({ amount: x.amount.text, unit: x.unit, name: x.name })),
    steps: [...r.steps],
    tags: [...r.tags],
  };
}

/**
 * @param {RecipeDraft} d
 * @returns {RecipeDraft}
 */
export function addIngredientRow(d) {
  return { ...d, ingredients: [...d.ingredients, emptyIngredient()] };
}

/**
 * @param {RecipeDraft} d
 * @param {number} i
 * @returns {RecipeDraft}
 */
export function removeIngredientRow(d, i) {
  return { ...d, ingredients: removeRow(d.ingredients, i, emptyIngredient) };
}

/**
 * @param {RecipeDraft} d
 * @param {number} i
 * @param {'amount'|'unit'|'name'} field
 * @param {string} value
 * @returns {RecipeDraft}
 */
export function setIngredientField(d, i, field, value) {
  const ingredients = d.ingredients.map((row, index) =>
    index === i ? { ...row, [field]: value } : { ...row },
  );
  return { ...d, ingredients };
}

/**
 * @param {RecipeDraft} d
 * @returns {RecipeDraft}
 */
export function addStepRow(d) {
  return { ...d, steps: [...d.steps, ''] };
}

/**
 * @param {RecipeDraft} d
 * @param {number} i
 * @returns {RecipeDraft}
 */
export function removeStepRow(d, i) {
  return { ...d, steps: removeRow(d.steps, i, () => '') };
}

/**
 * @param {RecipeDraft} d
 * @param {number} i
 * @param {-1 | 1} dir
 * @returns {RecipeDraft}
 */
export function moveStep(d, i, dir) {
  const j = i + dir;
  const inRange = (/** @type {number} */ n) => n >= 0 && n < d.steps.length;
  if (!inRange(i) || !inRange(j)) return { ...d, steps: [...d.steps] };
  const steps = d.steps.map((s, index) => {
    if (index === i) return d.steps[j] ?? s;
    return index === j ? (d.steps[i] ?? s) : s;
  });
  return { ...d, steps };
}

/**
 * @param {RecipeDraft} d
 * @param {number} i
 * @param {string} text
 * @returns {RecipeDraft}
 */
export function setStep(d, i, text) {
  return { ...d, steps: d.steps.map((s, index) => (index === i ? text : s)) };
}

/**
 * Adds normaliseTag(raw) if non-empty and not present.
 * @param {RecipeDraft} d
 * @param {string} raw
 * @returns {RecipeDraft}
 */
export function addTag(d, raw) {
  const tag = normaliseTag(raw);
  const tags = tag === '' || d.tags.includes(tag) ? [...d.tags] : [...d.tags, tag];
  return { ...d, tags };
}

/**
 * @param {RecipeDraft} d
 * @param {string} tag
 * @returns {RecipeDraft}
 */
export function removeTag(d, tag) {
  return { ...d, tags: d.tags.filter((t) => t !== tag) };
}

/**
 * @param {RecipeDraft} d
 * @returns {string}
 */
function fingerprint(d) {
  return JSON.stringify({
    title: d.title.trim(),
    servings: d.servings.trim(),
    ingredients: d.ingredients.map((x) => [x.amount.trim(), x.unit.trim(), x.name.trim()]),
    steps: d.steps.map((s) => s.trim()),
    tags: d.tags.map((t) => t.trim()),
  });
}

/**
 * Deep-equal of the two drafts after trimming, negated.
 * @param {RecipeDraft} initial
 * @param {RecipeDraft} current
 * @returns {boolean}
 */
export function isDirty(initial, current) {
  return fingerprint(initial) !== fingerprint(current);
}
