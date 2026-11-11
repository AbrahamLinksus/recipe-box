import { parseAmount } from './amount.js';
import { ValidationError } from './errors.js';
import { normaliseTags } from './tags.js';

export const MESSAGES = Object.freeze({
  titleRequired: 'Title is required',
  servingsMin: 'Servings must be 1 or more',
  ingredientsMin: 'Add at least one ingredient',
  stepsMin: 'Add at least one step',
  ingredientName: 'Enter the ingredient name',
});

/**
 * @param {import('./types.js').IngredientDraft[]} rows
 * @param {import('./types.js').FieldErrors} errors
 * @returns {import('./types.js').Ingredient[]}
 */
function collectIngredients(rows, errors) {
  /** @type {import('./types.js').Ingredient[]} */
  const kept = [];
  /** @type {Record<number, string>} */
  const rowErrors = {};
  rows.forEach((row, index) => {
    const amount = row.amount.trim();
    const unit = row.unit.trim();
    const name = row.name.trim();
    if (amount === '' && unit === '' && name === '') return;
    if (name === '') rowErrors[index] = MESSAGES.ingredientName;
    kept.push({ amount: parseAmount(amount), unit, name });
  });
  if (Object.keys(rowErrors).length > 0) errors.ingredientRows = rowErrors;
  if (kept.length === 0) errors.ingredients = MESSAGES.ingredientsMin;
  return kept;
}

/**
 * Servings rule shared by both validators: a safe integer >= 1 (so it survives JSON).
 * @param {unknown} servings
 * @returns {boolean}
 */
function isValidServings(servings) {
  return Number.isSafeInteger(servings) && /** @type {number} */ (servings) >= 1;
}

/**
 * @param {import('./types.js').RecipeDraft} draft
 * @returns {import('./types.js').ValidationResult}
 */
export function validateDraft(draft) {
  /** @type {import('./types.js').FieldErrors} */
  const errors = {};
  const title = draft.title.trim();
  if (title === '') errors.title = MESSAGES.titleRequired;
  const servingsText = draft.servings.trim();
  const servings = /^\d+$/.test(servingsText) ? Number(servingsText) : 0;
  if (!isValidServings(servings)) errors.servings = MESSAGES.servingsMin;
  const ingredients = collectIngredients(draft.ingredients, errors);
  const steps = draft.steps.map((s) => s.trim()).filter((s) => s !== '');
  if (steps.length === 0) errors.steps = MESSAGES.stepsMin;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { title, servings, ingredients, steps, tags: normaliseTags(draft.tags) },
  };
}

/**
 * @param {unknown} text
 * @returns {boolean}
 */
function isNonBlankString(text) {
  return typeof text === 'string' && text.trim() !== '';
}

/**
 * Persisted ingredient shape: non-blank name, string unit, Amount with finite value or null.
 * @param {unknown} row
 * @returns {boolean}
 */
function isValidIngredient(row) {
  const ing = /** @type {Partial<import('./types.js').Ingredient> | null | undefined} */ (row);
  const amount = ing?.amount;
  return (
    isNonBlankString(ing?.name) &&
    typeof ing?.unit === 'string' &&
    typeof amount?.text === 'string' &&
    (amount.value === null || Number.isFinite(amount.value))
  );
}

/**
 * @param {unknown} rows
 * @param {import('./types.js').FieldErrors} errors
 */
function checkIngredientRows(rows, errors) {
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.ingredients = MESSAGES.ingredientsMin;
    return;
  }
  /** @type {Record<number, string>} */
  const rowErrors = {};
  rows.forEach((row, index) => {
    if (!isValidIngredient(row)) rowErrors[index] = MESSAGES.ingredientName;
  });
  if (Object.keys(rowErrors).length > 0) errors.ingredientRows = rowErrors;
}

/**
 * Steps: non-empty array of non-blank strings.
 * @param {unknown} steps
 * @returns {boolean}
 */
function isValidSteps(steps) {
  return Array.isArray(steps) && steps.length > 0 && steps.every(isNonBlankString);
}

/**
 * Tags: array of strings already in normalised form (lower-case, unique, sorted A-Z).
 * @param {unknown} tags
 * @returns {boolean}
 */
function isNormalisedTags(tags) {
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) return false;
  const normalised = normaliseTags(tags);
  return normalised.length === tags.length && normalised.every((tag, i) => tag === tags[i]);
}

/**
 * Structural check of an already-normalised input.
 * Tags have no FieldErrors key, so bad tags alone throw `ValidationError({})`.
 * @param {import('./types.js').RecipeInput} input
 * @throws {ValidationError}
 */
export function assertRecipeInput(input) {
  /** @type {import('./types.js').FieldErrors} */
  const errors = {};
  if (!isNonBlankString(input.title)) errors.title = MESSAGES.titleRequired;
  if (!isValidServings(input.servings)) errors.servings = MESSAGES.servingsMin;
  checkIngredientRows(input.ingredients, errors);
  if (!isValidSteps(input.steps)) errors.steps = MESSAGES.stepsMin;
  if (Object.keys(errors).length > 0 || !isNormalisedTags(input.tags)) {
    throw new ValidationError(errors);
  }
}
