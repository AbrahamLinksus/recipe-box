import { h } from './dom.js';
import { addIngredientRow, removeIngredientRow, setIngredientField } from './form-model.js';
import { createSection, errorLine, smallButton, valueOf } from './form-widgets.js';

/**
 * @typedef {import('./form-widgets.js').DraftAccess} DraftAccess
 * @typedef {import('./form-widgets.js').ChangeFn} ChangeFn
 * @typedef {import('./form-widgets.js').FieldErrors} FieldErrors
 */

export const INGREDIENT_HELP =
  'Amount: 2, 0.5, ½ or 1½. Leave empty for "a pinch", "to taste" (never scaled).';

/**
 * @param {DraftAccess} draft
 * @param {number} i
 * @param {'amount'|'unit'|'name'} field
 * @param {{ label: string, testid: string, invalid: boolean, describedBy?: string }} opts
 * @returns {HTMLElement}
 */
function cell(draft, i, field, { label, testid, invalid, describedBy }) {
  return h('input', {
    class: `input ${field}`,
    type: 'text',
    'aria-label': label,
    'aria-invalid': invalid ? 'true' : null,
    'aria-describedby': invalid ? describedBy : null,
    'data-testid': testid,
    value: draft.get().ingredients[i]?.[field] ?? '',
    oninput: (/** @type {Event} */ e) =>
      draft.set(setIngredientField(draft.get(), i, field, valueOf(e))),
  });
}

/**
 * @param {DraftAccess} draft
 * @param {FieldErrors} errs
 * @param {ChangeFn} change
 * @param {number} i
 * @returns {HTMLElement}
 */
function ingredientRow(draft, errs, change, i) {
  const rowError = errs.ingredientRows?.[i];
  const nameInvalid = Boolean(rowError) || (Boolean(errs.ingredients) && i === 0);
  return h(
    'div',
    { class: 'ing-row', 'data-testid': 'ingredient-row' },
    cell(draft, i, 'amount', {
      label: 'Amount',
      testid: 'ingredient-amount-input',
      invalid: false,
    }),
    cell(draft, i, 'unit', { label: 'Unit', testid: 'ingredient-unit-input', invalid: false }),
    cell(draft, i, 'name', {
      label: 'Name',
      testid: 'ingredient-name-input',
      invalid: nameInvalid,
      describedBy: rowError ? `error-ingredient-row-${i}` : 'error-ingredients-msg',
    }),
    smallButton(
      '✕',
      'remove-ingredient',
      () => change(removeIngredientRow(draft.get(), i), 'add-ingredient', 0),
      'Remove ingredient',
    ),
    errorLine('error-ingredient-row', rowError, `error-ingredient-row-${i}`),
  );
}

/**
 * @param {DraftAccess} draft
 * @param {FieldErrors} errors
 * @returns {HTMLElement}
 */
export function ingredientsSection(draft, errors) {
  const el = h('section', { class: 'panel ing', 'data-testid': 'ingredients-panel' });
  return createSection(el, draft, errors, (errs, change) => [
    h('h2', { text: 'Ingredients' }),
    errorLine('error-ingredients', errs.ingredients, 'error-ingredients-msg'),
    h(
      'div',
      { class: 'colhead' },
      h('span', { text: 'Amount' }),
      h('span', { text: 'Unit' }),
      h('span', { text: 'Name' }),
    ),
    ...draft.get().ingredients.map((_, i) => ingredientRow(draft, errs, change, i)),
    h('p', { class: 'help', text: INGREDIENT_HELP }),
    smallButton('+ Add ingredient', 'add-ingredient', () => {
      const next = addIngredientRow(draft.get());
      change(next, 'ingredient-amount-input', next.ingredients.length - 1);
    }),
  ]);
}
