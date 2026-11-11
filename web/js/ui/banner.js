/**
 * @typedef {{ show(kind: 'error' | 'info', message: string): void, clear(): void }} Banner
 */

/**
 * @param {HTMLElement} el the banner region from index.html
 * @returns {Banner}
 */
export function createBanner(el) {
  return {
    show(kind, message) {
      el.dataset.kind = kind;
      el.textContent = message;
      el.hidden = false;
    },
    clear() {
      delete el.dataset.kind;
      el.textContent = '';
      el.hidden = true;
    },
  };
}
