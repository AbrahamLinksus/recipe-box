import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LocalStoragePersistence } from '../../../web/js/persistence/local-storage-persistence.js';
import { STORAGE_KEY } from '../../../web/js/persistence/collection-codec.js';
import { PersistenceWriteError } from '../../../web/js/store/errors.js';
import { FakeStorage, namedError } from '../../helpers/fake-storage.js';
import { PANCAKES } from '../../helpers/recipes.fixture.js';

/** @param {any} [extra] */
function make(extra = {}) {
  const storage = new FakeStorage();
  const persistence = new LocalStoragePersistence({
    storage: /** @type {any} */ (storage),
    ...extra,
  });
  return { storage, persistence };
}

/**
 * @param {PersistenceWriteError['reason']} reason
 * @returns {(e: unknown) => boolean}
 */
const writeError = (reason) => (e) => e instanceof PersistenceWriteError && e.reason === reason;

describe('LocalStoragePersistence', () => {
  it('saves then loads', async () => {
    const { persistence } = make();
    assert.deepEqual(await persistence.load(), { kind: 'empty' });
    await persistence.save([PANCAKES]);
    assert.deepEqual(await persistence.load(), { kind: 'ok', recipes: [PANCAKES] });
  });

  it('SecurityError on read is unavailable', async () => {
    const { storage, persistence } = make();
    storage.failGet = namedError('SecurityError');
    assert.equal((await persistence.load()).kind, 'unavailable');
    storage.failGet = 'boom';
    assert.equal((await persistence.load()).kind, 'unavailable');
  });

  it('leaves unreadable data untouched on load', async () => {
    const { storage, persistence } = make();
    storage.map.set(STORAGE_KEY, '{oops');
    assert.equal((await persistence.load()).kind, 'unreadable');
    assert.equal(storage.map.get(STORAGE_KEY), '{oops');
  });

  it('maps write failures', async () => {
    const { storage, persistence } = make();
    storage.failSet = namedError('QuotaExceededError');
    await assert.rejects(persistence.save([PANCAKES]), writeError('quota'));
    storage.failSet = namedError('SecurityError');
    await assert.rejects(persistence.save([PANCAKES]), writeError('unavailable'));
  });

  it('watch fires only for the collection key or null', () => {
    const target = new EventTarget();
    const { persistence } = make({ eventTarget: target });
    let calls = 0;
    const stop = persistence.watch(() => calls++);
    for (const key of [STORAGE_KEY, null, 'other']) {
      target.dispatchEvent(Object.assign(new Event('storage'), { key }));
    }
    assert.equal(calls, 2);
    stop();
    target.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
    assert.equal(calls, 2);
    assert.equal(typeof make().persistence.watch(() => {}), 'function');
  });

  it('requestDurability', async () => {
    assert.equal(await make().persistence.requestDurability(), false);
    /** @param {any} m */
    const dur = (m) => make({ storageManager: m }).persistence.requestDurability();
    assert.equal(await dur({ persisted: async () => true }), true);
    assert.equal(await dur({ persisted: async () => false, persist: async () => true }), true);
    assert.equal(await dur({ persisted: async () => false, persist: async () => false }), false);
    assert.equal(
      await dur({
        persisted: async () => {
          throw new Error('x');
        },
      }),
      false,
    );
  });

  it('stored version 2 (newer tab) -> save rejects unavailable and leaves it untouched', async () => {
    const { storage, persistence } = make();
    const v2 = '{"version":2,"recipes":[]}';
    storage.map.set(STORAGE_KEY, v2);
    await assert.rejects(persistence.save([PANCAKES]), writeError('unavailable'));
    assert.equal(storage.map.get(STORAGE_KEY), v2);
  });

  it('stored value not JSON or version missing -> save rejects and leaves it untouched', async () => {
    for (const raw of ['{oops', '{"recipes":[]}', 'null']) {
      const { storage, persistence } = make();
      storage.map.set(STORAGE_KEY, raw);
      await assert.rejects(persistence.save([PANCAKES]), writeError('unavailable'));
      assert.equal(storage.map.get(STORAGE_KEY), raw);
    }
  });

  it('stored version 1 -> save overwrites it', async () => {
    const { storage, persistence } = make();
    await persistence.save([]);
    await persistence.save([PANCAKES]);
    assert.deepEqual(JSON.parse(/** @type {string} */ (storage.map.get(STORAGE_KEY))), {
      version: 1,
      recipes: [PANCAKES],
    });
  });

  it('read fails during save -> save rejects unavailable', async () => {
    const { storage, persistence } = make();
    storage.failGet = namedError('SecurityError');
    await assert.rejects(persistence.save([PANCAKES]), writeError('unavailable'));
  });
});
