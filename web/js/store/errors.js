/** Thrown when a recipe id is not in the store. */
export class RecipeNotFoundError extends Error {
  /** @param {string} id */
  constructor(id) {
    super(`Recipe not found: ${id}`);
    this.name = 'RecipeNotFoundError';
    this.id = id;
  }
}

/** Thrown when a write is attempted while the store is not ready. */
export class StoreReadOnlyError extends Error {
  /** @param {'unreadable' | 'unavailable' | 'loading'} status */
  constructor(status) {
    super(`Store is read-only (${status})`);
    this.name = 'StoreReadOnlyError';
    this.status = status;
  }
}

/** Thrown by persistence.save when the write fails. */
export class PersistenceWriteError extends Error {
  /**
   * @param {'quota' | 'unavailable' | 'io'} reason
   * @param {string} [message]
   */
  constructor(reason, message) {
    super(message ?? `Could not save (${reason})`);
    this.name = 'PersistenceWriteError';
    this.reason = reason;
  }
}
