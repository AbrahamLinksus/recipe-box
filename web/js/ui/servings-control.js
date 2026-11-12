import { h } from './dom.js';
import { MIN_SERVINGS, parseServingsInput, stepServings } from '../core/scaling/servings.js';

const INPUT = 'servings-input';
const DEC = 'servings-dec';
const INC = 'servings-inc';
const RESET = 'servings-reset';

/**
 * @param {{ getServings: () => number, onChange: (next: number) => void }} options
 * @returns {HTMLInputElement}
 */
function servingsInput({ getServings, onChange }) {
  const field = h('input', {
    type: 'text',
    class: 'servings-input',
    inputmode: 'numeric',
    'aria-label': 'Servings',
    'data-testid': INPUT,
    value: String(getServings()),
  });
  if (!(field instanceof HTMLInputElement)) throw new TypeError('input expected');
  const input = field;
  const settle = () => {
    input.value = String(getServings());
  };
  input.addEventListener('input', () => {
    const next = parseServingsInput(input.value, getServings());
    if (next !== getServings()) onChange(next);
  });
  input.addEventListener('blur', settle);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') settle();
  });
  return input;
}

/**
 * @param {{ label: string, testid: string, text: string, disabled: boolean, onclick: () => void }} o
 * @returns {HTMLElement}
 */
function stepButton({ label, testid, text, disabled, onclick }) {
  return h('button', {
    type: 'button',
    class: 'btn pm',
    'aria-label': label,
    'data-testid': testid,
    disabled,
    onclick,
    text,
  });
}

/**
 * Reset and the note, only while scaled.
 * @param {number} base
 * @param {(next: number) => void} onChange
 * @returns {HTMLElement[]}
 */
function scaledExtras(base, onChange) {
  return [
    h('button', {
      type: 'button',
      class: 'btn',
      'data-testid': RESET,
      onclick: () => onChange(base),
      text: `Reset (${base})`,
    }),
    h('span', { class: 'note', text: `Recipe saved for ${base} servings; scaling is not saved.` }),
  ];
}

/**
 * View-only servings control: - / number / + and, while scaled, Reset and the note.
 * @param {{ base: number, getServings: () => number, onChange: (next: number) => void }} options
 * @returns {HTMLElement}
 */
export function servingsControl({ base, getServings, onChange }) {
  const servings = getServings();
  /** @param {number} delta */
  const step = (delta) => () => onChange(stepServings(getServings(), delta));
  return h(
    'div',
    { class: 'servings' },
    h('strong', { text: 'Servings' }),
    stepButton({
      label: 'Fewer servings',
      testid: DEC,
      text: '\u2212',
      disabled: servings <= MIN_SERVINGS,
      onclick: step(-1),
    }),
    servingsInput({ getServings, onChange }),
    stepButton({
      label: 'More servings',
      testid: INC,
      text: '+',
      disabled: false,
      onclick: step(1),
    }),
    ...(servings === base ? [] : scaledExtras(base, onChange)),
  );
}

/**
 * Focus rules for the servings control: each control keeps focus; a step button that becomes
 * disabled (− at 1) and Reset once it disappears hand focus to the input.
 */
export const SERVINGS_FOCUS = Object.freeze({
  [DEC]: INPUT,
  [INC]: INPUT,
  [RESET]: INPUT,
  [INPUT]: null,
});
