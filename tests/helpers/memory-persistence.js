/** @typedef {import('../../web/js/store/ports.js').LoadResult} LoadResult */

/** In-memory CollectionPersistence for tests; records saves, lets tests trigger watch. */
export class MemoryPersistence {
  /** @param {LoadResult} [initial] */
  constructor(initial = { kind: 'empty' }) {
    /** @type {LoadResult} */ this.result = initial;
    /** @type {Array<readonly object[]>} */ this.saves = [];
    /** @type {Error | null} */ this.failWith = null;
    /** @type {Set<() => void>} */ this.watchers = new Set();
  }

  async load() {
    return this.result;
  }

  /** @param {readonly object[]} recipes */
  async save(recipes) {
    if (this.failWith) throw this.failWith;
    this.saves.push(recipes);
    this.result = { kind: 'ok', recipes: /** @type {any} */ (recipes) };
  }

  /** @param {() => void} cb */
  watch(cb) {
    this.watchers.add(cb);
    return () => this.watchers.delete(cb);
  }

  async requestDurability() {
    return true;
  }

  /** Simulate another tab changing storage. */
  triggerExternalChange() {
    this.watchers.forEach((cb) => cb());
  }
}
