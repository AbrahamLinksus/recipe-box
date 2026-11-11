/**
 * Trim, lower-case and collapse inner whitespace to one space.
 * @param {string} raw
 * @returns {string}
 */
export function normaliseTag(raw) {
  return raw.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/**
 * Normalise, drop empty, de-duplicate and sort A-Z.
 * @param {string[]} list
 * @returns {string[]}
 */
export function normaliseTags(list) {
  const tags = list.map(normaliseTag).filter((tag) => tag !== '');
  return [...new Set(tags)].sort();
}
