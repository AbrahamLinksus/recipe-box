import { assertRecipeInput } from '../core/recipe/validation.js';
import { RecipeNotFoundError, StoreReadOnlyError } from './errors.js';

/**
 * @typedef {import('../core/recipe/types.js').Recipe} Recipe
 * @typedef {import('../core/recipe/types.js').RecipeInput} RecipeInput
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

/**
 * Report a subscriber error without affecting the store: the browser's reportError
 * dispatches it to the global error handler; elsewhere it is rethrown on a fresh microtask.
 * @param {unknown} error
 */
function reportListenerError(error) {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
  } else {
    queueMicrotask(() => {
      throw error;
    });
  }
}

export class RecipeStore {
  /** @type {StoreStatus} */ #status = 'loading';
  /** @type {string | null} */ #reason = null;
  /** @type {readonly Recipe[]} */ #recipes = Object.freeze([]);
  /** @type {Set<() => void>} */ #listeners = new Set();
  /** @type {(() => void) | null} */ #unwatch = null;
  /** Writes and reloads run one at a time on this chain. */
  /** @type {Promise<unknown>} */ #chain = Promise.resolve();
  #persistence;
  #newId;
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
   * Loads, sets status, starts watch() (once, however often this is called).
   * @returns {Promise<StoreStatus>}
   */
  async init() {
    await this.#enqueue(() => this.#load());
    if (this.#unwatch === null) {
      this.#unwatch = this.#persistence.watch(() => {
        void this.reload();
      });
    }
    return this.#status;
  }

  /** Re-load after another tab changed storage; notifies. Serialised with writes. */
  async reload() {
    await this.#enqueue(async () => {
      await this.#load();
      this.#notify();
    });
  }

  /**
   * @param {RecipeInput} input
   * @returns {Promise<Recipe>} favourite false, new id, createdAt = updatedAt = now
   */
  async create(input) {
    const snapshot = this.#snapshotInput(input);
    return this.#write(() => {
      const now = this.#now();
      const id = this.#newId();
      if (this.get(id)) throw new Error(`duplicate id from newId: ${id}`);
      const recipe = this.#build(snapshot, {
        id,
        favourite: false,
        createdAt: now,
        updatedAt: now,
      });
      return { next: [...this.#recipes, recipe], recipe };
    });
  }

  /**
   * Keeps id, favourite and createdAt; sets updatedAt.
   * @param {string} id
   * @param {RecipeInput} input
   * @returns {Promise<Recipe>}
   */
  async update(id, input) {
    const snapshot = this.#snapshotInput(input);
    return this.#write(() => {
      const old = this.#find(id);
      const recipe = this.#build(snapshot, { ...old, updatedAt: this.#now() });
      return { next: this.#recipes.map((r) => (r === old ? recipe : r)), recipe };
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id) {
    await this.#write(() => {
      const old = this.#find(id);
      return { next: this.#recipes.filter((r) => r !== old), recipe: old };
    });
  }

  /**
   * Flips favourite, sets updatedAt.
   * @param {string} id
   * @returns {Promise<Recipe>}
   */
  async toggleFavourite(id) {
    return this.#write(() => {
      const old = this.#find(id);
      const recipe = deepFreeze({ ...old, favourite: !old.favourite, updatedAt: this.#now() });
      return { next: this.#recipes.map((r) => (r === old ? recipe : r)), recipe };
    });
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

  /**
   * @param {() => Promise<T>} task
   * @returns {Promise<T>}
   * @template T
   */
  #enqueue(task) {
    const run = this.#chain.then(task);
    this.#chain = run.catch(() => undefined);
    return run;
  }

  /**
   * Validate the caller's input and take a private copy at call time, so later caller
   * mutation cannot change what is saved. The copy is re-checked in case getters differ.
   * @param {RecipeInput} input
   * @returns {RecipeInput}
   */
  #snapshotInput(input) {
    assertRecipeInput(input);
    const snapshot = structuredClone(input);
    assertRecipeInput(snapshot);
    return snapshot;
  }

  /**
   * (Serialised) guard, build, save, commit, notify.
   * @param {() => { next: readonly Recipe[], recipe: Recipe }} plan builds the next state
   * @returns {Promise<Recipe>}
   */
  async #write(plan) {
    return this.#enqueue(async () => {
      if (this.#status !== 'ready') throw new StoreReadOnlyError(this.#status);
      const { next, recipe } = plan();
      await this.#persistence.save(next);
      this.#recipes = Object.freeze([...next]);
      this.#notify();
      return recipe;
    });
  }

  /**
   * @param {string} id
   * @returns {Recipe}
   */
  #find(id) {
    const found = this.get(id);
    if (!found) throw new RecipeNotFoundError(id);
    return found;
  }

  /**
   * @param {RecipeInput} snapshot a private copy of the caller's input (see #write)
   * @param {Pick<Recipe, 'id' | 'favourite' | 'createdAt' | 'updatedAt'>} meta
   * @returns {Recipe}
   */
  #build(snapshot, meta) {
    const { id, favourite, createdAt, updatedAt } = meta;
    const { title, servings, ingredients, steps, tags } = snapshot;
    return deepFreeze({
      id,
      title,
      servings,
      ingredients,
      steps,
      tags,
      favourite,
      createdAt,
      updatedAt,
    });
  }

  async #load() {
    /** @type {import('./ports.js').LoadResult} */
    let result;
    try {
      result = await this.#persistence.load();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result = { kind: 'unavailable', reason: `load failed: ${reason}` };
    }
    this.#reason = 'reason' in result ? result.reason : null;
    if (result.kind === 'ok') {
      this.#status = 'ready';
      this.#recipes = freezeCopy(result.recipes);
    } else if (result.kind === 'empty') {
      this.#status = 'ready';
      this.#recipes = Object.freeze([]);
    } else {
      // unreadable / unavailable: keep the last loaded recipes (read-only); first load has none.
      this.#status = result.kind;
    }
  }

  /** Calls every listener; a throwing listener is reported and never affects the caller. */
  #notify() {
    this.#listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        reportListenerError(error);
      }
    });
  }
}
