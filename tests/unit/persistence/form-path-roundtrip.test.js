import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, assertRecipeInput } from '../../../web/js/core/recipe/validation.js';
import {
  decodeCollection,
  encodeCollection,
} from '../../../web/js/persistence/collection-codec.js';
import { LocalStoragePersistence } from '../../../web/js/persistence/local-storage-persistence.js';
import { FakeStorage } from '../../helpers/fake-storage.js';

/** @param {string} amount @param {string} unit @param {string} name */
const row = (amount, unit, name) => ({ amount, unit, name });
/** @param {object} over */
const draft = (over) => ({
  title: 'T',
  servings: '2',
  ingredients: [row('1', 'g', 'x')],
  steps: ['s'],
  tags: [],
  ...over,
});

const DRAFTS = {
  plain: draft({}),
  padded: draft({ title: '  Pad  ', servings: ' 3 ', steps: ['  a ', '', ' b'] }),
  mixedTags: draft({ tags: ['Sweet', 'breakfast', 'SWEET', ' İstanbul ', 'ß'] }),
  textAmount: draft({ ingredients: [row('a pinch', '', 'of salt')] }),
  fraction: draft({ ingredients: [row('1/2', 'cup', 'milk'), row('1 1/2', '', 'eggs')] }),
  blankAmount: draft({ ingredients: [row('', '', 'water')] }),
  huge: draft({ ingredients: [row('1e999', '', 'x'), row('-1e999', '', 'y')] }),
  nan: draft({ ingredients: [row('NaN', '', 'x'), row('Infinity', '', 'y')] }),
  decimalComma: draft({ ingredients: [row('1,5', 'l', 'x')] }),
  unicode: draft({ title: 'Crème brûlée 🍮', steps: ['mix\nwell'] }),
  blankRowsDropped: draft({ ingredients: [row('', '', ''), row('2', '', 'z')] }),
};

describe('form/store path output always decodes back as ok', () => {
  for (const [name, d] of Object.entries(DRAFTS)) {
    it(`${name} -> validate, assert, encode, decode is ok and equal`, () => {
      const result = validateDraft(d);
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assertRecipeInput(result.value);
      const stamp = '2026-01-01T00:00:00.000Z';
      const recipe = {
        id: 'abc',
        ...result.value,
        favourite: false,
        createdAt: stamp,
        updatedAt: stamp,
      };
      const decoded = decodeCollection(encodeCollection([recipe]));
      assert.equal(decoded.kind, 'ok');
      if (decoded.kind === 'ok')
        assert.deepEqual(decoded.recipes, [JSON.parse(JSON.stringify(recipe))]);
    });
  }
});

describe('save guard keeps stored value byte-identical when refusing', () => {
  const FOREIGN = [
    '{"version":2,"recipes":[{"x":1}]}',
    '{oops',
    '{"recipes":[]}',
    '[]',
    '"s"',
    'null',
    '',
  ];
  for (const raw of FOREIGN) {
    it(`stored ${JSON.stringify(raw)} -> save rejects, value unchanged`, async () => {
      const storage = new FakeStorage();
      storage.map.set('recipe-box:collection', raw);
      const p = new LocalStoragePersistence({ storage: /** @type {any} */ (storage) });
      await assert.rejects(p.save([]), (/** @type {any} */ e) => e.reason === 'unavailable');
      assert.equal(storage.getItem('recipe-box:collection'), raw);
    });
  }
});
