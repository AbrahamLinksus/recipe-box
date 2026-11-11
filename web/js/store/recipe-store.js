/**
 * @typedef {import('../core/recipe/types.js').Recipe} Recipe
 * @typedef {import('./ports.js').CollectionPersistence} CollectionPersistence
 * @typedef {'loading' | 'ready' | 'unreadable' | 'unavailable'} StoreStatus
 */

/**
 * Deep-freeze a value in place.
 * @template T
 * @param {T} value
 * @returns {T}
 */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Copy then freeze, so objects owned by the persistence layer are never frozen.
 * @param {Recipe[]} recipes
 * @returns {readonly Recipe[]}
 */
const freezeCopy = (recipes) => deepFreeze(structuredClone(recipes));

export class RecipeStore {
  /** @type {StoreStatus} */ #status = 'loading';
  /** @type {string | null} */ #reason = null;
  /** @type {readonly Recipe[]} */ #recipes = Object.freeze([]);
  /** @type {Set<() => void>} */ #listeners = new Set();
  #persistence;
  // Used by the write side (T-05); eslint-disable until then.
  // eslint-disable-next-line no-unused-private-class-members
  #newId;
  // eslint-disable-next-line no-unused-private-class-members
  #now;

  /**
   * @param {CollectionPersistence} persistence
   * @param {{ newId?: () => string, now?: () => string }} [deps]
   */
  constructor(persistence, deps = {}) {
    this.#persistence = persistence;
    this.#newId = deps.newId ?? (() => crypto.randomUUID());
    this.#now = deps.now ?? (() => new Date().toISOString());
  }

  /**
   * Loads once, sets status, starts watch().
   * @returns {Promise<StoreStatus>}
   */
  async init() {
    await this.#load();
    this.#persistence.watch(() => {
      void this.reload();
    });
    return this.#status;
  }

  /** Re-load after another tab changed storage; notifies. */
  async reload() {
    await this.#load();
    this.#notify();
  }

  /** @returns {StoreStatus} */
  get status() {
    return this.#status;
  }

  /** @returns {string | null} */
  get statusReason() {
    return this.#reason;
  }

  /** @returns {readonly Recipe[]} frozen snapshot, insertion order */
  list() {
    return this.#recipes;
  }

  /**
   * @param {string} id
   * @returns {Recipe | undefined}
   */
  get(id) {
    return this.#recipes.find((r) => r.id === id);
  }

  /**
   * @param {() => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async #load() {
    const result = await this.#persistence.load();
    this.#reason = 'reason' in result ? result.reason : null;
    if (result.kind === 'ok') {
      this.#status = 'ready';
      this.#recipes = freezeCopy(result.recipes);
    } else if (result.kind === 'empty') {
      this.#status = 'ready';
      this.#recipes = Object.freeze([]);
    } else {
      this.#status = result.kind;
      this.#recipes = Object.freeze([]);
    }
  }

  #notify() {
    this.#listeners.forEach((listener) => listener());
  }
}
