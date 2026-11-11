import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFilterState } from '../../../web/js/ui/filter-state.js';

describe('createFilterState', () => {
  it('new -> default filter', () => {
    assert.deepEqual(createFilterState().get(), { query: '', tag: null, favouritesOnly: false });
  });
  it('set -> patches only given keys', () => {
    const s = createFilterState();
    s.set({ query: 'pan' });
    s.set({ tag: 'breakfast' });
    assert.deepEqual(s.get(), { query: 'pan', tag: 'breakfast', favouritesOnly: false });
  });
  it('reset -> restores defaults', () => {
    const s = createFilterState();
    s.set({ query: 'x', favouritesOnly: true });
    s.reset();
    assert.deepEqual(s.get(), { query: '', tag: null, favouritesOnly: false });
  });
  it('get -> returns a copy', () => {
    const s = createFilterState();
    s.get().query = 'mutated';
    assert.equal(s.get().query, '');
  });
});
