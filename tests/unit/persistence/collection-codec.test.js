import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeCollection,
  encodeCollection,
  STORAGE_KEY,
} from '../../../web/js/persistence/collection-codec.js';
import { PANCAKES, ALL_RECIPES } from '../../helpers/recipes.fixture.js';

/** @param {unknown} value */
const stored = (value) => JSON.stringify({ version: 1, recipes: value });

describe('collection codec', () => {
  it('round-trips the fixtures exactly', () => {
    const result = decodeCollection(encodeCollection(ALL_RECIPES));
    assert.deepEqual(result, { kind: 'ok', recipes: ALL_RECIPES });
    const salt = /** @type {any} */ (result).recipes[0].ingredients[3].amount;
    assert.deepEqual(salt, { text: 'a pinch', value: null });
  });

  it('stores version 1 under the documented key', () => {
    assert.equal(STORAGE_KEY, 'recipe-box:collection');
    assert.deepEqual(JSON.parse(encodeCollection([PANCAKES])), { version: 1, recipes: [PANCAKES] });
  });

  it('decodes null and an empty list as empty', () => {
    assert.deepEqual(decodeCollection(null), { kind: 'empty' });
    assert.deepEqual(decodeCollection(encodeCollection([])), { kind: 'empty' });
  });

  it('reports unreadable data', () => {
    const unreadable = (/** @type {string} */ reason) => ({ kind: 'unreadable', reason });
    assert.deepEqual(decodeCollection('{oops'), unreadable('not JSON'));
    assert.deepEqual(
      decodeCollection('{"version":2,"recipes":[]}'),
      unreadable('unknown version 2'),
    );
    assert.deepEqual(decodeCollection('{"recipes":[]}'), unreadable('unknown version undefined'));
    assert.deepEqual(decodeCollection('null'), unreadable('unknown version undefined'));
    assert.equal(decodeCollection('{"version":1}').kind, 'unreadable');
  });

  it('rejects invalid recipes by index', () => {
    assert.deepEqual(decodeCollection(stored([{ ...PANCAKES, servings: 0 }])), {
      kind: 'unreadable',
      reason: 'invalid recipe at index 0',
    });
    assert.equal(
      /** @type {any} */ (decodeCollection(stored([PANCAKES, null]))).reason,
      'invalid recipe at index 1',
    );
    assert.equal(decodeCollection(stored([{ ...PANCAKES, id: '' }])).kind, 'unreadable');
  });

  it('stored tags unsorted, mixed-case or duplicated -> still decodes ok (no write-side normal form)', () => {
    const recipe = { ...PANCAKES, tags: ['Sweet', 'breakfast', 'sweet', ' Brunch '] };
    assert.deepEqual(decodeCollection(stored([recipe])), { kind: 'ok', recipes: [recipe] });
  });

  it('stored text untrimmed or blank -> still decodes ok (no trimming rules)', () => {
    const recipe = {
      ...PANCAKES,
      title: '  Pancakes ',
      steps: [' Whisk ', '   '],
      ingredients: [{ amount: { text: ' 2 ', value: 2 }, unit: ' g', name: ' flour ' }],
    };
    assert.deepEqual(decodeCollection(stored([recipe])), { kind: 'ok', recipes: [recipe] });
  });

  it('stored recipe with a wrong type -> invalid recipe at index', () => {
    const bad = [
      { ...PANCAKES, servings: 1.5 },
      { ...PANCAKES, title: 3 },
      { ...PANCAKES, steps: [] },
      { ...PANCAKES, ingredients: [] },
      { ...PANCAKES, tags: [1] },
      { ...PANCAKES, favourite: 'no' },
      { ...PANCAKES, createdAt: 0 },
      { ...PANCAKES, ingredients: [{ amount: { text: 'x', value: 'x' }, unit: '', name: 'n' }] },
      { ...PANCAKES, ingredients: [{ amount: { text: '1', value: 1 }, name: 'n' }] },
    ];
    for (const recipe of bad) {
      assert.deepEqual(decodeCollection(stored([recipe])), {
        kind: 'unreadable',
        reason: 'invalid recipe at index 0',
      });
    }
  });
});
