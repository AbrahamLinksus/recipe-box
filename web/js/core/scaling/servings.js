export const MIN_SERVINGS = 1;

/**
 * @param {string} raw
 * @param {number} previous
 * @returns {number} whole number >= 1, else previous
 */
export function parseServingsInput(raw, previous) {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return previous;
  const n = Number(text);
  return Number.isSafeInteger(n) && n >= MIN_SERVINGS ? n : previous;
}

/**
 * @param {number} current
 * @param {number} delta
 * @returns {number}
 */
export function stepServings(current, delta) {
  return Math.max(MIN_SERVINGS, current + delta);
}
