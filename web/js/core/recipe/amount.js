export const UNICODE_FRACTIONS = Object.freeze({
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
});

const DECIMAL = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const UNICODE = new RegExp(`^(?:(\\d+)\\s*)?([${Object.keys(UNICODE_FRACTIONS).join('')}])$`);
const SLASH = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/;

/**
 * @param {string} text
 * @returns {number | null}
 */
function evaluate(text) {
  const value = evaluateRaw(text);
  return Number.isFinite(value) ? value : null;
}

/**
 * @param {string} text
 * @returns {number | null} may be Infinity for overlong digit strings
 */
function evaluateRaw(text) {
  if (DECIMAL.test(text)) return Number(text);
  const uni = UNICODE.exec(text);
  if (uni)
    return (
      Number(uni[1] ?? 0) +
      UNICODE_FRACTIONS[/** @type {keyof typeof UNICODE_FRACTIONS} */ (uni[2])]
    );
  const slash = SLASH.exec(text);
  if (slash) {
    const denominator = Number(slash[3]);
    if (denominator === 0) return null;
    return Number(slash[1] ?? 0) + Number(slash[2]) / denominator;
  }
  return null;
}

/**
 * Parse a typed amount; unparseable text keeps `value: null` (never scaled).
 * @param {string} text
 * @returns {import('./types.js').Amount}
 */
export function parseAmount(text) {
  const trimmed = text.trim();
  return { text: trimmed, value: trimmed === '' ? null : evaluate(trimmed) };
}
