import { PersistenceWriteError } from '../store/errors.js';
import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  decodeCollection,
  encodeCollection,
} from './collection-codec.js';

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isQuotaError(err) {
  const e = /** @type {{ name?: string, code?: number } | null} */ (err);
  return (
    e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22
  );
}

/**
 * True when a value is stored that this build does not understand: not JSON, or a version
 * other than SCHEMA_VERSION (e.g. written by a newer tab). Such data must never be overwritten.
 * @param {string | null} raw
 * @returns {boolean}
 */
function isForeignData(raw) {
  if (raw === null) return false;
  try {
    const parsed = /** @type {unknown} */ (JSON.parse(raw));
    return (
      typeof parsed !== 'object' ||
      parsed === null ||
      /** @type {{ version?: unknown }} */ (parsed).version !== SCHEMA_VERSION
    );
  } catch {
    return true;
  }
}

/**
 * @typedef {import('../store/ports.js').CollectionPersistence} CollectionPersistence
 */

/** @implements {CollectionPersistence} */
export class LocalStoragePersistence {
  /**
   * @param {{ storage: Storage, storageManager?: StorageManager, eventTarget?: EventTarget }} deps
   */
  constructor({ storage, storageManager, eventTarget }) {
    this.storage = storage;
    this.storageManager = storageManager;
    this.eventTarget = eventTarget;
  }

  /** @returns {Promise<import('../store/ports.js').LoadResult>} */
  async load() {
    try {
      return decodeCollection(this.storage.getItem(STORAGE_KEY));
    } catch (err) {
      return { kind: 'unavailable', reason: err instanceof Error ? err.message : String(err) };
    }
  }

  /** @param {readonly import('../core/recipe/types.js').Recipe[]} recipes */
  async save(recipes) {
    let foreign;
    try {
      foreign = isForeignData(this.storage.getItem(STORAGE_KEY));
    } catch {
      throw new PersistenceWriteError('unavailable');
    }
    if (foreign) throw new PersistenceWriteError('unavailable');
    try {
      this.storage.setItem(STORAGE_KEY, encodeCollection(recipes));
    } catch (err) {
      if (isQuotaError(err)) throw new PersistenceWriteError('quota');
      throw new PersistenceWriteError('unavailable');
    }
  }

  /**
   * @param {() => void} onExternalChange
   * @returns {() => void}
   */
  watch(onExternalChange) {
    const target = this.eventTarget;
    if (!target) return () => {};
    /** @param {Event} event */
    const listener = (event) => {
      const key = /** @type {StorageEvent} */ (event).key;
      if (key === null || key === STORAGE_KEY) onExternalChange();
    };
    target.addEventListener('storage', listener);
    return () => target.removeEventListener('storage', listener);
  }

  /** @returns {Promise<boolean>} */
  async requestDurability() {
    try {
      const manager = this.storageManager;
      if (!manager) return false;
      if (await manager.persisted()) return true;
      return await manager.persist();
    } catch {
      return false;
    }
  }
}
