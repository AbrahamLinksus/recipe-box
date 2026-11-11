/** @type {Record<number, string>} */
const GLYPHS = Object.freeze({ 0.25: '¼', 0.5: '½', 0.75: '¾' });

/**
 * Nearest 0.25, exact halfway rounds up; a positive value never returns 0.
 * @param {number} x
 * @returns {number}
 */
export function roundToQuarter(x) {
  let q = Math.floor(x * 4 + 0.5 + 1e-9) / 4;
  if (x > 0 && q === 0) q = 0.25;
  return q;
}

/**
 * Whole part plus a quarter glyph: 0.25 -> '¼', 1.5 -> '1½', 3 -> '3'.
 * @param {number} q a multiple of 0.25
 * @returns {string}
 */
export function formatQuarter(q) {
  const whole = Math.floor(q);
  const glyph = GLYPHS[q - whole] ?? '';
  if (glyph === '') return String(whole);
  return whole === 0 ? glyph : `${whole}${glyph}`;
}
