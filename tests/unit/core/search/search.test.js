import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterRecipes,
  sortByTitle,
  listTags,
  hasActiveFilters,
} from '../../../../web/js/core/search/search.js';
import { ALL_RECIPES, BANANA_BREAD, PANCAKES } from '../../../helpers/recipes.fixture.js';

/** @type {import('../../../../web/js/core/search/search.js').RecipeFilter} */
const NONE = { query: '', tag: null, favouritesOnly: false };
/** @param {readonly {title: string}[]} list */
const titles = (list) => list.map((r) => r.title);
const starred = ALL_RECIPES.map((r) => (r === BANANA_BREAD ? { ...r, favourite: true } : r));

describe('filterRecipes (LLD 8.2)', () => {
  it('none -> all A-Z', () => {
    assert.deepEqual(titles(filterRecipes(ALL_RECIPES, NONE)), [
      'Banana Bread',
      'Pancakes',
      'Tomato Soup',
    ]);
  });
  it('query b -> Banana Bread', () => {
    assert.deepEqual(titles(filterRecipes(ALL_RECIPES, { ...NONE, query: 'b' })), ['Banana Bread']);
  });
  it('query PAN -> Pancakes', () => {
    assert.deepEqual(titles(filterRecipes(ALL_RECIPES, { ...NONE, query: 'PAN' })), ['Pancakes']);
  });
  it('query is trimmed', () => {
    assert.deepEqual(titles(filterRecipes(ALL_RECIPES, { ...NONE, query: '  pan ' })), [
      'Pancakes',
    ]);
  });
  it('tag breakfast -> Banana Bread, Pancakes', () => {
    assert.deepEqual(titles(filterRecipes(ALL_RECIPES, { ...NONE, tag: 'breakfast' })), [
      'Banana Bread',
      'Pancakes',
    ]);
  });
  it('query xyz -> []', () => {
    assert.deepEqual(filterRecipes(ALL_RECIPES, { ...NONE, query: 'xyz' }), []);
  });
  it('favouritesOnly -> Banana Bread', () => {
    assert.deepEqual(titles(filterRecipes(starred, { ...NONE, favouritesOnly: true })), [
      'Banana Bread',
    ]);
  });
  it('breakfast + pan + favouritesOnly -> []', () => {
    const filter = { query: 'pan', tag: 'breakfast', favouritesOnly: true };
    assert.deepEqual(filterRecipes(starred, filter), []);
  });
  it('returns a new array and does not mutate input', () => {
    const input = [...ALL_RECIPES];
    const out = filterRecipes(input, NONE);
    assert.notEqual(out, input);
    assert.deepEqual(input, [...ALL_RECIPES]);
  });
});

describe('sortByTitle', () => {
  it('is case-insensitive', () => {
    const low = { ...PANCAKES, id: 'a', title: 'apple pie' };
    assert.deepEqual(titles(sortByTitle([PANCAKES, low])), ['apple pie', 'Pancakes']);
  });
  it('ties by createdAt then id', () => {
    const early = { ...PANCAKES, id: 'z', createdAt: '2025-01-01T00:00:00.000Z' };
    const idA = { ...PANCAKES, id: 'a' };
    const idB = { ...PANCAKES, id: 'b' };
    assert.deepEqual(
      sortByTitle([idB, idA, early]).map((r) => r.id),
      ['z', 'a', 'b'],
    );
    assert.deepEqual(
      sortByTitle([idA, early, idB]).map((r) => r.id),
      ['z', 'a', 'b'],
    );
  });
  it('does not mutate input', () => {
    const input = [PANCAKES, BANANA_BREAD];
    sortByTitle(input);
    assert.deepEqual(input, [PANCAKES, BANANA_BREAD]);
  });
});

describe('listTags', () => {
  it('returns unique tags A-Z', () => {
    assert.deepEqual(listTags(ALL_RECIPES), [
      'baking',
      'breakfast',
      'lunch',
      'sweet',
      'vegetarian',
    ]);
  });
  it('empty input -> []', () => {
    assert.deepEqual(listTags([]), []);
  });
});

describe('hasActiveFilters', () => {
  it('false for none and whitespace query', () => {
    assert.equal(hasActiveFilters(NONE), false);
    assert.equal(hasActiveFilters({ ...NONE, query: '   ' }), false);
  });
  it('true for query, tag or favouritesOnly', () => {
    assert.equal(hasActiveFilters({ ...NONE, query: 'a' }), true);
    assert.equal(hasActiveFilters({ ...NONE, tag: 'x' }), true);
    assert.equal(hasActiveFilters({ ...NONE, favouritesOnly: true }), true);
  });
});

describe('extra edge cases', () => {
  it('filterRecipes sorts duplicate titles by createdAt then id', () => {
    const early = { ...PANCAKES, id: 'z', createdAt: '2025-01-01T00:00:00.000Z' };
    const out = filterRecipes([PANCAKES, early], { ...NONE, query: 'pancakes' });
    assert.deepEqual(
      out.map((r) => r.id),
      ['z', PANCAKES.id],
    );
  });
  it('listTags de-duplicates and does not mutate input', () => {
    const dup = { ...PANCAKES, id: 'x', tags: ['sweet', 'breakfast', 'sweet'] };
    const input = [dup, BANANA_BREAD];
    assert.deepEqual(listTags(input), ['baking', 'breakfast', 'sweet']);
    assert.deepEqual(dup.tags, ['sweet', 'breakfast', 'sweet']);
    assert.equal(input.length, 2);
  });
  it('tag filter requires an exact tag match', () => {
    assert.deepEqual(filterRecipes(ALL_RECIPES, { ...NONE, tag: 'break' }), []);
  });
});
