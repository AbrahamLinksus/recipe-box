import { h } from './dom.js';
import { errorLine, valueOf } from './form-widgets.js';

/**
 * @param {string} label
 * @param {Record<string, unknown>} attrs
 * @param {string | undefined} error
 * @param {string} errorId
 * @returns {HTMLElement}
 */
function textField(label, attrs, error, errorId) {
  const id = `${errorId}-field`;
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id, text: label }),
    h('input', {
      class: 'input',
      type: 'text',
      id,
      'aria-invalid': error ? 'true' : null,
      'aria-describedby': error ? errorId : null,
      ...attrs,
    }),
    errorLine(errorId, error, errorId),
  );
}

/**
 * Title and servings fields.
 * @param {import('./form-widgets.js').DraftAccess} access
 * @param {import('../core/recipe/types.js').FieldErrors} errors
 * @returns {HTMLElement}
 */
export function topFields(access, errors) {
  const draft = access.get();
  /** @param {'title'|'servings'} key */
  const onInput = (key) => (/** @type {Event} */ e) =>
    access.set({ ...access.get(), [key]: valueOf(e) });
  return h(
    'div',
    { class: 'top' },
    textField(
      'Title',
      { 'data-testid': 'title-input', value: draft.title, oninput: onInput('title') },
      errors.title,
      'error-title',
    ),
    textField(
      'Servings',
      {
        'data-testid': 'servings-input',
        inputmode: 'numeric',
        value: draft.servings,
        oninput: onInput('servings'),
      },
      errors.servings,
      'error-servings',
    ),
  );
}
