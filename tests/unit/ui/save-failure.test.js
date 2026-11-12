import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saveFailureMessage } from '../../../web/js/ui/save-failure.js';
import {
  PersistenceWriteError,
  RecipeNotFoundError,
  StoreReadOnlyError,
} from '../../../web/js/store/errors.js';

describe('saveFailureMessage', () => {
  it('maps each write-failure reason to its text', () => {
    const text = (/** @type {'quota'|'unavailable'|'io'} */ r) =>
      saveFailureMessage(new PersistenceWriteError(r));
    assert.match(String(text('quota')), /browser storage is full/);
    assert.match(String(text('unavailable')), /browser storage is not available/);
    assert.match(String(text('io')), /write failed/);
  });

  it('returns null for a read-only store (the status banner already says it)', () => {
    assert.equal(saveFailureMessage(new StoreReadOnlyError('unreadable')), null);
  });

  it('falls back to the generic text for other or unknown errors', () => {
    const generic = 'Could not save. Your last change was not stored.';
    assert.equal(saveFailureMessage(new RecipeNotFoundError('x')), generic);
    assert.equal(saveFailureMessage(new Error('boom')), generic);
    assert.equal(saveFailureMessage(undefined), generic);
    assert.equal(
      saveFailureMessage(new PersistenceWriteError(/** @type {any} */ ('weird'))),
      generic,
    );
  });
});
