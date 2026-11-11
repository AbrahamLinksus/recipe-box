/** Minimal in-memory Storage fake; set failGet / failSet to make calls throw. */
export class FakeStorage {
  constructor() {
    /** @type {Map<string, string>} */ this.map = new Map();
    /** @type {unknown} */ this.failGet = null;
    /** @type {unknown} */ this.failSet = null;
  }

  /** @param {string} key */
  getItem(key) {
    if (this.failGet) throw this.failGet;
    return this.map.has(key) ? /** @type {string} */ (this.map.get(key)) : null;
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  setItem(key, value) {
    if (this.failSet) throw this.failSet;
    this.map.set(key, value);
  }
}

/**
 * @param {string} name
 * @returns {Error}
 */
export function namedError(name) {
  const e = new Error(name);
  e.name = name;
  return e;
}
