import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RecipeStore } from '../../../web/js/store/recipe-store.js';
import { StoreReadOnlyError } from '../../../web/js/store/errors.js';
import { MemoryPersistence } from '../../helpers/memory-persistence.js';
import { PANCAKES, TOMATO_SOUP } from '../../helpers/recipes.fixture.js';

const INPUT = {
  title: PANCAKES.title,
  servings: PANCAKES.servings,
  ingredients: PANCAKES.ingredients,
  steps: PANCAKES.steps,
  tags: PANCAKES.tags,
};

/** @type {Array<[string, any]>} */
const FAILURES = [
  ['unreadable', { kind: 'unreadable', reason: 'bad json' }],
  ['unavailable', { kind: 'unavailable', reason: 'blocked' }],
  ['rejecting', null],
];

/** @param {MemoryPersistence} p @param {any} failure */
const fail = (p, failure) => {
  if (failure) {
    p.result = failure;
  } else {
    p.load = async () => {
      throw new Error('boom');
    };
  }
};

/** @param {any} result */
const started = async (result) => {
  const p = new MemoryPersistence(result);
  const store = new RecipeStore(p);
  await store.init();
  let calls = 0;
  store.subscribe(() => calls++);
  return { p, store, calls: () => calls };
};

describe('first load failures leave nothing', () => {
  for (const [name, failure] of FAILURES) {
    it(`first load ${name} -> [] and get undefined`, async () => {
      const p = new MemoryPersistence();
      fail(p, failure);
      const store = new RecipeStore(p);
      await store.init();
      assert.deepEqual(store.list(), []);
      assert.equal(store.get(PANCAKES.id), undefined);
      assert.equal(store.status, failure ? failure.kind : 'unavailable');
      assert.match(store.statusReason ?? '', failure ? /./ : /boom/);
    });
  }
});

describe('failed reload keeps the last recipes', () => {
  for (const [name, failure] of FAILURES) {
    it(`${name} reload keeps frozen recipes, notifies once, blocks writes`, async () => {
      const { p, store, calls } = await started({ kind: 'ok', recipes: [PANCAKES, TOMATO_SOUP] });
      const before = store.list();
      fail(p, failure);
      await store.reload();
      assert.equal(store.list(), before);
      assert.ok(Object.isFrozen(store.list()) && Object.isFrozen(store.list()[0]));
      assert.equal(store.get(PANCAKES.id)?.id, PANCAKES.id);
      assert.equal(store.status, failure ? failure.kind : 'unavailable');
      assert.notEqual(store.statusReason, null);
      assert.equal(calls(), 1);
      await assert.rejects(store.create(INPUT), StoreReadOnlyError);
      await assert.rejects(store.update(PANCAKES.id, INPUT), StoreReadOnlyError);
      await assert.rejects(store.remove(PANCAKES.id), StoreReadOnlyError);
      await assert.rejects(store.toggleFavourite(PANCAKES.id), StoreReadOnlyError);
      assert.equal(p.saves.length, 0);
    });
  }
});

describe('recovery and switching', () => {
  it('later ok reload -> ready with fresh data, reason null, notified once', async () => {
    const { p, store, calls } = await started({ kind: 'ok', recipes: [PANCAKES] });
    p.result = { kind: 'unreadable', reason: 'bad' };
    await store.reload();
    p.result = { kind: 'ok', recipes: [TOMATO_SOUP] };
    await store.reload();
    assert.equal(store.status, 'ready');
    assert.equal(store.statusReason, null);
    assert.deepEqual(store.list(), [TOMATO_SOUP]);
    assert.equal(calls(), 2);
  });
  it('later empty reload -> ready with []', async () => {
    const { p, store } = await started({ kind: 'ok', recipes: [PANCAKES] });
    p.result = { kind: 'unavailable', reason: 'x' };
    await store.reload();
    p.result = { kind: 'empty' };
    await store.reload();
    assert.equal(store.status, 'ready');
    assert.deepEqual(store.list(), []);
  });
  it('switching unreadable <-> unavailable notifies each time', async () => {
    const { p, store, calls } = await started({ kind: 'ok', recipes: [PANCAKES] });
    p.result = { kind: 'unreadable', reason: 'a' };
    await store.reload();
    p.result = { kind: 'unavailable', reason: 'b' };
    await store.reload();
    assert.equal(store.status, 'unavailable');
    assert.equal(store.statusReason, 'b');
    assert.equal(calls(), 2);
    assert.equal(store.list().length, 1);
  });
  it('successful write then failing reload keeps the written data', async () => {
    const { p, store } = await started({ kind: 'ok', recipes: [PANCAKES] });
    const created = await store.create(INPUT);
    fail(p, null);
    await store.reload();
    assert.equal(store.get(created.id)?.id, created.id);
    assert.equal(store.list().length, 2);
  });
});
