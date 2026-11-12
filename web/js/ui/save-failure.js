import { PersistenceWriteError, StoreReadOnlyError } from '../store/errors.js';

const REASON_TEXT = {
  quota: 'browser storage is full',
  unavailable: 'browser storage is not available',
  io: 'write failed',
};

/**
 * The banner text for a rejected save (LLD 2.5), shared by the form and the star.
 * @param {unknown} err
 * @returns {string | null} banner text, or null when the status banner already says it
 */
export function saveFailureMessage(err) {
  if (err instanceof StoreReadOnlyError) return null;
  if (err instanceof PersistenceWriteError) {
    const reason = REASON_TEXT[err.reason];
    if (reason) return `Could not save: ${reason}. Your last change was not stored.`;
  }
  return 'Could not save. Your last change was not stored.';
}
