const PROPERTY_ATTRS = new Set(['value', 'checked', 'disabled', 'selected']);

const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction']);

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} true for attributes that could run script
 */
function isUnsafe(key, value) {
  const k = key.toLowerCase();
  if (k.startsWith('on') && typeof value !== 'function') return true;
  if (!URL_ATTRS.has(k)) return false;
  const url = String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0020]/g, '')
    .toLowerCase();
  return url.startsWith('javascript:') || url.startsWith('data:');
}

/**
 * @param {HTMLElement} el
 * @param {string} key
 * @param {unknown} value
 */
function applyAttr(el, key, value) {
  if (value === null || value === undefined || value === false || isUnsafe(key, value)) return;
  if (key === 'text') {
    el.textContent = String(value);
  } else if (typeof value === 'function') {
    el.addEventListener(key.slice(2).toLowerCase(), /** @type {EventListener} */ (value));
  } else if (key === 'class') {
    el.className = String(value);
  } else if (PROPERTY_ATTRS.has(key)) {
    Reflect.set(el, key, value);
  } else {
    el.setAttribute(key, value === true ? '' : String(value));
  }
}

/**
 * Builds an element. Text is only ever set through textContent / text nodes, never as HTML.
 * @param {string} tag
 * @param {Record<string, unknown>} [attrs]
 * @param {...(Node|string|null|false)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) applyAttr(el, key, value);
  for (const child of children) {
    if (child !== null && child !== false && child !== undefined) el.append(child);
  }
  return el;
}

/**
 * Removes all children of an element.
 * @param {HTMLElement} el
 */
export function clear(el) {
  el.replaceChildren();
}
