import { h } from './dom.js';
import { addStepRow, moveStep, removeStepRow, setStep } from './form-model.js';
import { createSection, errorLine, smallButton, valueOf } from './form-widgets.js';

/**
 * @typedef {import('./form-widgets.js').DraftAccess} DraftAccess
 * @typedef {import('./form-widgets.js').ChangeFn} ChangeFn
 * @typedef {import('./form-widgets.js').FieldErrors} FieldErrors
 */

/**
 * @param {DraftAccess} draft
 * @param {FieldErrors} errs
 * @param {ChangeFn} change
 * @param {number} i
 * @returns {HTMLElement}
 */
function stepRow(draft, errs, change, i) {
  return h(
    'div',
    { class: 'step-row', 'data-testid': 'step-row' },
    h('span', { class: 'n', text: String(i + 1) }),
    h('input', {
      class: 'input',
      type: 'text',
      'aria-label': `Step ${i + 1}`,
      'aria-invalid': errs.steps && i === 0 ? 'true' : null,
      'aria-describedby': errs.steps && i === 0 ? 'error-steps-msg' : null,
      'data-testid': 'step-input',
      value: draft.get().steps[i] ?? '',
      oninput: (/** @type {Event} */ e) => draft.set(setStep(draft.get(), i, valueOf(e))),
    }),
    smallButton(
      '↑',
      'step-up',
      () => change(moveStep(draft.get(), i, -1), 'step-input', i - 1),
      'Move step up',
      i === 0,
    ),
    smallButton(
      '↓',
      'step-down',
      () => change(moveStep(draft.get(), i, 1), 'step-input', i + 1),
      'Move step down',
      i === draft.get().steps.length - 1,
    ),
    smallButton(
      '✕',
      'remove-step',
      () => change(removeStepRow(draft.get(), i), 'add-step', 0),
      'Remove step',
    ),
  );
}

/**
 * @param {DraftAccess} draft
 * @param {FieldErrors} errors
 * @returns {HTMLElement}
 */
export function stepsSection(draft, errors) {
  const el = h('section', { class: 'panel steps', 'data-testid': 'steps-panel' });
  return createSection(el, draft, errors, (errs, change) => [
    h('h2', { text: 'Steps' }),
    errorLine('error-steps', errs.steps, 'error-steps-msg'),
    ...draft.get().steps.map((_, i) => stepRow(draft, errs, change, i)),
    smallButton('+ Add step', 'add-step', () => {
      const next = addStepRow(draft.get());
      change(next, 'step-input', next.steps.length - 1);
    }),
  ]);
}
