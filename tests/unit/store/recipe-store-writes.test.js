import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RecipeStore } from '../../../web/js/store/recipe-store.js';
import {
  RecipeNotFoundError,
  StoreReadOnlyError,
  PersistenceWriteError,
} from '../../../web/js/store/errors.js';
import { ValidationError } from '../../../web/js/core/recipe/errors.js';
import { MemoryPersistence } from '../../helpers/memory-persistence.js';
import { PANCAKES, TOMATO_SOUP } from '../../helpers/recipes.fixture.js';

const INPUT = {
  title: PANCAKES.title,
  servings: PANCAKES.servings,
  ingredients: PANCAKES.ingredients,
  steps: PANCAKES.steps,
  tags: PANCAKES.tags,
};

/** @param {any} result */
const make = async (result = { kind: 'ok', recipes: [PANCAKES, TOMATO_SOUP] }) => {
  const p = new MemoryPersistence(result);
  let n = 0;
  let t = 0;
  const store = new RecipeStore(p, {
    newId: () => `id-${++n}`,
    now: () => `2030-01-01T00:00:0${++t}.000Z`,
  });
  await store.init();
  return { p, store };
};
const fail = (/** @type {MemoryPersistence} */ p) => {
  p.failWith = new PersistenceWriteError('quota');
};

describe('RecipeStore writes', () => {
  it('create: new id, favourite false, createdAt = updatedAt = now, notifies', async () => {
    const { p, store } = await make();
    let calls = 0;
    store.subscribe(() => calls++);
    const r = await store.create(INPUT);
    assert.equal(r.id, 'id-1');
    assert.equal(r.favourite, false);
    assert.equal(r.createdAt, '2030-01-01T00:00:01.000Z');
    assert.equal(r.updatedAt, r.createdAt);
    assert.equal(store.list().length, 3);
    assert.equal(store.get('id-1'), r);
    assert.equal(p.saves.length, 1);
    assert.equal(calls, 1);
    assert.equal(Object.isFrozen(r), true);
  });
  it('update keeps id, favourite, createdAt and sets updatedAt', async () => {
    const { store } = await make();
    await store.toggleFavourite(PANCAKES.id);
    const r = await store.update(PANCAKES.id, { ...INPUT, title: 'Crepes' });
    assert.equal(r.id, PANCAKES.id);
    assert.equal(r.favourite, true);
    assert.equal(r.createdAt, PANCAKES.createdAt);
    assert.equal(r.title, 'Crepes');
    assert.notEqual(r.updatedAt, PANCAKES.updatedAt);
    assert.equal(store.list()[0], r);
  });
  it('remove drops the recipe; toggleFavourite flips and sets updatedAt', async () => {
    const { store } = await make();
    const t = await store.toggleFavourite(TOMATO_SOUP.id);
    assert.equal(t.favourite, !TOMATO_SOUP.favourite);
    assert.notEqual(t.updatedAt, TOMATO_SOUP.updatedAt);
    await store.remove(PANCAKES.id);
    assert.deepEqual(
      store.list().map((x) => x.id),
      [TOMATO_SOUP.id],
    );
  });
  it('unknown id -> RecipeNotFoundError; invalid input -> ValidationError, no save', async () => {
    const { p, store } = await make();
    await assert.rejects(store.update('nope', INPUT), RecipeNotFoundError);
    await assert.rejects(store.remove('nope'), RecipeNotFoundError);
    await assert.rejects(store.toggleFavourite('nope'), RecipeNotFoundError);
    await assert.rejects(store.create({ ...INPUT, title: '' }), ValidationError);
    await assert.rejects(store.update(PANCAKES.id, { ...INPUT, steps: [] }), ValidationError);
    assert.equal(p.saves.length, 0);
  });
});

describe('RecipeStore rollback', () => {
  /** @type {Array<[string, (s: RecipeStore) => Promise<unknown>]>} */
  const writes = [
    ['create', (s) => s.create(INPUT)],
    ['update', (s) => s.update(PANCAKES.id, { ...INPUT, title: 'X' })],
    ['remove', (s) => s.remove(PANCAKES.id)],
    ['toggleFavourite', (s) => s.toggleFavourite(PANCAKES.id)],
  ];
  for (const [name, run] of writes) {
    it(`${name}: rejected save leaves list unchanged, no notify`, async () => {
      const { p, store } = await make();
      const before = store.list();
      let calls = 0;
      store.subscribe(() => calls++);
      fail(p);
      await assert.rejects(run(store), PersistenceWriteError);
      assert.equal(store.list(), before);
      assert.equal(calls, 0);
    });
  }
});

describe('RecipeStore read-only and serialisation', () => {
  for (const kind of /** @type {const} */ (['unreadable', 'unavailable'])) {
    it(`writes reject with StoreReadOnlyError when ${kind}`, async () => {
      const { p, store } = await make({ kind, reason: 'r' });
      await assert.rejects(store.create(INPUT), StoreReadOnlyError);
      await assert.rejects(store.toggleFavourite('a'), StoreReadOnlyError);
      assert.equal(p.saves.length, 0);
    });
  }
  it('concurrent writes are serialised and both persisted in order', async () => {
    const { p, store } = await make({ kind: 'empty' });
    const order = /** @type {string[]} */ ([]);
    const realSave = p.save.bind(p);
    p.save = async (recipes) => {
      await new Promise((r) => setTimeout(r, order.length === 0 ? 20 : 0));
      order.push(`save${recipes.length}`);
      return realSave(recipes);
    };
    await Promise.all([store.create(INPUT), store.create({ ...INPUT, title: 'B' })]);
    assert.deepEqual(order, ['save1', 'save2']);
    assert.deepEqual(
      store.list().map((r) => r.title),
      ['Pancakes', 'B'],
    );
  });
  it('a failed write does not block the next one', async () => {
    const { p, store } = await make({ kind: 'empty' });
    fail(p);
    await assert.rejects(store.create(INPUT), PersistenceWriteError);
    p.failWith = null;
    await store.create(INPUT);
    assert.equal(store.list().length, 1);
  });
  it('reload is on the write chain and notifies', async () => {
    const { p, store } = await make({ kind: 'empty' });
    let calls = 0;
    store.subscribe(() => calls++);
    const w = store.create(INPUT);
    const r = store.reload();
    await Promise.all([w, r]);
    assert.equal(calls, 2);
    assert.equal(store.list().length, 1);
    assert.equal(p.saves.length, 1);
  });
});

describe('RecipeStore init robustness (T-04 m1, m2)', () => {
  it('init twice adds one watcher', async () => {
    const { p, store } = await make();
    await store.init();
    assert.equal(p.watchers.size, 1);
  });
  it('rejecting load -> unavailable with reason, no unhandled rejection', async () => {
    const p = new MemoryPersistence();
    p.load = async () => {
      throw new Error('boom');
    };
    const store = new RecipeStore(p);
    assert.equal(await store.init(), 'unavailable');
    assert.match(store.statusReason ?? '', /boom/);
    p.triggerExternalChange();
    await new Promise((r) => setImmediate(r));
    assert.equal(store.status, 'unavailable');
  });
});
