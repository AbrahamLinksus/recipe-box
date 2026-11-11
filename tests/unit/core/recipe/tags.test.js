import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseTag, normaliseTags } from '../../../../web/js/core/recipe/tags.js';

describe('tags', () => {
  it('normaliseTag "  Slow   Cook " -> "slow cook"', () => {
    assert.equal(normaliseTag('  Slow   Cook '), 'slow cook');
  });
  it('normaliseTags with blanks and duplicates -> unique, sorted A-Z', () => {
    assert.deepEqual(normaliseTags(['sweet ', 'Breakfast', '', 'SWEET']), ['breakfast', 'sweet']);
  });
});
