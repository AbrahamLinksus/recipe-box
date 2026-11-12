import { h } from './dom.js';

/**
 * @typedef {import('../core/recipe/types.js').RecipeDraft} RecipeDraft
 * @typedef {import('../core/recipe/types.js').FieldErrors} FieldErrors
 * @typedef {{ get(): RecipeDraft, set(next: RecipeDraft): void }} DraftAccess
 * @typedef {(next: RecipeDraft, focusTestid: string, index: number) => void} ChangeFn
 */

/**
 * @param {string} testid
 * @param {string | undefined} message
 * @param {string} id referenced by the invalid input's aria-describedby
 * @returns {HTMLElement | null}
 */
export function errorLine(testid, message, id) {
  return message ? h('p', { class: 'err', id, 'data-testid': testid, text: message }) : null;
}

/**
 * @param {string} text
 * @param {string} testid
 * @param {() => void} onclick
 * @param {string} [label] accessible name when the text is a symbol
 * @param {boolean} [disabled]
 * @returns {HTMLElement}
 */
export function smallButton(text, testid, onclick, label, disabled = false) {
  return h('button', {
    disabled,
    type: 'button',
    class: 'btn small',
    'data-testid': testid,
    'aria-label': label,
    onclick,
    text,
  });
}

/**
 * @param {Event} e
 * @returns {string}
 */
export function valueOf(e) {
  return /** @type {HTMLInputElement} */ (e.target).value;
}

/**
 * Focus the index-th (or last, if fewer) element with the test id.
 * @param {HTMLElement} root
 * @param {string} testid
 * @param {number} index
 */
function focusNth(root, testid, index) {
  const all = root.querySelectorAll(`[data-testid="${testid}"]`);
  /** @type {HTMLElement | undefined} */ (
    all[Math.max(0, Math.min(index, all.length - 1))]
  )?.focus();
}

/**
 * A section whose content is rebuilt after row operations. Errors shown at build time are
 * dropped on the first rebuild (row indexes would be stale).
 * @param {HTMLElement} el
 * @param {DraftAccess} draft
 * @param {FieldErrors} errors
 * @param {(errs: FieldErrors, change: ChangeFn) => (Node | null)[]} build
 * @returns {HTMLElement}
 */
export function createSection(el, draft, errors, build) {
  let errs = errors;
  /** @type {ChangeFn} */
  const change = (next, focus, index) => {
    draft.set(next);
    errs = {};
    fill();
    focusNth(el, focus, index);
  };
  function fill() {
    el.replaceChildren(.../** @type {Node[]} */ (build(errs, change).filter(Boolean)));
  }
  fill();
  return el;
}
