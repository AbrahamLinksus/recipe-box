import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LocalStoragePersistence } from '../../../web/js/persistence/local-storage-persistence.js';
import {
  STORAGE_KEY,
  decodeCollection,
  encodeCollection,
} from '../../../web/js/persistence/collection-codec.js';
import { FakeStorage, namedError } from '../../helpers/fake-storage.js';
import { PANCAKES, TOMATO_SOUP, BANANA_BREAD, ALL_RECIPES } from '../../helpers/recipes.fixture.js';

/** Storage that records every mutating call. */
class SpyStorage extends FakeStorage {
  constructor() {
    super();
    /** @type {string[]} */ this.writes = [];
  }
  /** @param {string} k @param {string} v */
  setItem(k, v) {
    this.writes.push('set');
    super.setItem(k, v);
  }
  /** @param {string} k */
  removeItem(k) {
    this.writes.push('remove');
    this.map.delete(k);
  }
  clear() {
    this.writes.push('clear');
    this.map.clear();
  }
}

const CORRUPT = [
  '{oops',
  '',
  'null',
  '[]',
  '{"version":2,"recipes":[]}',
  '{"version":1}',
  '{"version":1,"recipes":"x"}',
  JSON.stringify({ version: 1, recipes: [{ ...PANCAKES, servings: 0 }] }),
  '\u0000\uffff garbage',
];

describe('load never mutates stored data', () => {
  for (const raw of CORRUPT) {
    it(`leaves ${JSON.stringify(raw).slice(0, 40)} byte-identical`, async () => {
      const storage = new SpyStorage();
      storage.map.set(STORAGE_KEY, raw);
      storage.map.set('other', 'keep');
      const p = new LocalStoragePersistence({ storage: /** @type {any} */ (storage) });
      await p.load();
      await p.load();
      assert.deepEqual(storage.writes, []);
      assert.equal(storage.map.get(STORAGE_KEY), raw);
      assert.equal(storage.map.get('other'), 'keep');
      assert.equal(storage.map.size, 2);
    });
  }

  it('does not write when storage is unavailable or empty', async () => {
    const storage = new SpyStorage();
    const p = new LocalStoragePersistence({ storage: /** @type {any} */ (storage) });
    await p.load();
    storage.failGet = namedError('SecurityError');
    await p.load();
    assert.deepEqual(storage.writes, []);
    assert.equal(storage.map.size, 0);
  });

  it('decodeCollection of a valid stored value does not modify the input string', () => {
    const raw = encodeCollection(ALL_RECIPES);
    const copy = `${raw}`;
    decodeCollection(raw);
    assert.equal(raw, copy);
  });
});

describe('codec extra cases', () => {
  it('round-trips each fixture individually', () => {
    for (const r of [PANCAKES, TOMATO_SOUP, BANANA_BREAD]) {
      assert.deepEqual(decodeCollection(encodeCollection([r])), { kind: 'ok', recipes: [r] });
    }
  });

  it('round-trips a very large collection and large text values', async () => {
    const big = Array.from({ length: 2000 }, (_, i) => ({
      ...PANCAKES,
      id: `id-${i}`,
      notes: 'x'.repeat(5000),
    }));
    const raw = encodeCollection(big);
    assert.ok(raw.length > 10_000_000);
    const result = /** @type {any} */ (decodeCollection(raw));
    assert.equal(result.kind, 'ok');
    assert.equal(result.recipes.length, 2000);
    assert.deepEqual(result.recipes[1999], big[1999]);

    const storage = new FakeStorage();
    const p = new LocalStoragePersistence({ storage: /** @type {any} */ (storage) });
    await p.save(big);
    assert.equal(/** @type {any} */ (await p.load()).recipes.length, 2000);
  });

  it('quota detected via legacy Firefox name and code 22', async () => {
    const storage = new FakeStorage();
    const p = new LocalStoragePersistence({ storage: /** @type {any} */ (storage) });
    for (const err of [
      namedError('NS_ERROR_DOM_QUOTA_REACHED'),
      Object.assign(new Error('q'), { code: 22 }),
    ]) {
      storage.failSet = err;
      await assert.rejects(p.save([PANCAKES]), (e) => /** @type {any} */ (e).reason === 'quota');
    }
  });

  it('failed save leaves the previous stored value intact', async () => {
    const storage = new FakeStorage();
    const p = new LocalStoragePersistence({ storage: /** @type {any} */ (storage) });
    await p.save([PANCAKES]);
    const before = storage.map.get(STORAGE_KEY);
    storage.failSet = namedError('QuotaExceededError');
    await assert.rejects(p.save(ALL_RECIPES));
    assert.equal(storage.map.get(STORAGE_KEY), before);
  });
});
