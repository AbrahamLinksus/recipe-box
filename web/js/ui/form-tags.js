import { h } from './dom.js';
import { addTag, removeTag } from './form-model.js';

/** @typedef {import('./form-widgets.js').DraftAccess} DraftAccess */

export const TAGS_HELP = 'Tags are saved in lower case.';

/**
 * @param {string} tag
 * @param {() => void} onRemove
 * @returns {HTMLElement}
 */
function chip(tag, onRemove) {
  return h(
    'span',
    { class: 'tag', 'data-testid': 'tag-chip' },
    tag,
    ' ',
    h('button', {
      type: 'button',
      class: 'chip-remove',
      'aria-label': `Remove tag ${tag}`,
      'data-testid': 'remove-tag',
      onclick: onRemove,
      text: '✕',
    }),
  );
}

/**
 * Enter commits the typed text as a chip; a comma commits everything before it.
 * @param {HTMLInputElement} input
 * @param {(raw: string) => void} commit
 */
function wireTagInput(input, commit) {
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    commit(input.value);
    input.value = '';
  });
  input.addEventListener('input', () => {
    if (!input.value.includes(',')) return;
    const parts = input.value.split(',');
    input.value = parts.pop() ?? '';
    parts.forEach(commit);
  });
}

/**
 * @param {DraftAccess} draft
 * @returns {HTMLElement}
 */
export function tagsSection(draft) {
  const chips = h('span', { class: 'chips' });
  const input = /** @type {HTMLInputElement} */ (
    h('input', {
      class: 'input tag-input',
      type: 'text',
      placeholder: 'add a tag…',
      id: 'tag-input-field',
      'data-testid': 'tag-input',
    })
  );
  const fillChips = () =>
    chips.replaceChildren(
      ...draft.get().tags.map((tag) =>
        chip(tag, () => {
          draft.set(removeTag(draft.get(), tag));
          fillChips();
          input.focus();
        }),
      ),
    );
  wireTagInput(input, (raw) => {
    draft.set(addTag(draft.get(), raw));
    fillChips();
  });
  fillChips();
  return h(
    'div',
    { class: 'field' },
    h('label', { for: 'tag-input-field', text: 'Tags' }),
    h('div', { class: 'tag-box' }, chips, input),
    h('p', { class: 'help', text: TAGS_HELP }),
  );
}
