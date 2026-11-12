import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RecipeStore } from '../../../web/js/store/recipe-store.js';
import {
  RecipeNotFoundError,
  StoreReadOnlyError,
  PersistenceWriteError,
} from '../../../web/js/store/errors.js';
import { MemoryPersistence } from '../../helpers/memory-persistence.js';
import { PANCAKES, TOMATO_SOUP } from '../../helpers/recipes.fixture.js';

/** @param {any} result */
const make = (result) => {
  const p = new MemoryPersistence(result);
  return { p, store: new RecipeStore(p) };
};

describe('RecipeStore read side', () => {
  it('starts loading with empty list', () => {
    const { store } = make({ kind: 'empty' });
    assert.equal(store.status, 'loading');
    assert.deepEqual(store.list(), []);
  });
  it('init ok -> ready with recipes, get by id', async () => {
    const { store } = make({ kind: 'ok', recipes: [PANCAKES, TOMATO_SOUP] });
    assert.equal(await store.init(), 'ready');
    assert.deepEqual(
      store.list().map((r) => r.id),
      [PANCAKES.id, TOMATO_SOUP.id],
    );
    assert.equal(store.get(PANCAKES.id)?.title, 'Pancakes');
    assert.equal(store.get('nope'), undefined);
    assert.equal(store.statusReason, null);
  });
  it('init empty -> ready, [] and nothing written', async () => {
    const { p, store } = make({ kind: 'empty' });
    assert.equal(await store.init(), 'ready');
    assert.deepEqual(store.list(), []);
    assert.equal(p.saves.length, 0);
  });
  it('init unreadable -> unreadable, [] and reason', async () => {
    const { store } = make({ kind: 'unreadable', reason: 'bad json' });
    assert.equal(await store.init(), 'unreadable');
    assert.deepEqual(store.list(), []);
    assert.equal(store.statusReason, 'bad json');
  });
  it('init unavailable -> unavailable, [] and reason', async () => {
    const { store } = make({ kind: 'unavailable', reason: 'blocked' });
    assert.equal(await store.init(), 'unavailable');
    assert.deepEqual(store.list(), []);
    assert.equal(store.statusReason, 'blocked');
  });
  it('list and recipes are deep-frozen; source objects untouched', async () => {
    const source = structuredClone(PANCAKES);
    const { store } = make({ kind: 'ok', recipes: [source] });
    await store.init();
    const list = /** @type {any} */ (store.list());
    const r = /** @type {any} */ (store.get(PANCAKES.id));
    assert.throws(() => list.push(1), TypeError);
    assert.throws(() => {
      r.title = 'x';
    }, TypeError);
    assert.throws(() => {
      r.ingredients[0].amount.text = 'x';
    }, TypeError);
    assert.throws(() => r.tags.push('x'), TypeError);
    assert.equal(Object.isFrozen(source), false);
  });
  it('subscribe notifies on reload; unsubscribe stops it', async () => {
    const { p, store } = make({ kind: 'ok', recipes: [PANCAKES] });
    await store.init();
    let calls = 0;
    const off = store.subscribe(() => calls++);
    p.result = { kind: 'ok', recipes: [PANCAKES, TOMATO_SOUP] };
    await store.reload();
    assert.equal(calls, 1);
    assert.equal(store.list().length, 2);
    off();
    await store.reload();
    assert.equal(calls, 1);
  });
  it('watch callback triggers reload; unreadable reload goes read-only', async () => {
    const { p, store } = make({ kind: 'ok', recipes: [PANCAKES] });
    await store.init();
    p.result = { kind: 'unreadable', reason: 'corrupt' };
    p.triggerExternalChange();
    await new Promise((r) => setImmediate(r));
    assert.equal(store.status, 'unreadable');
  });
});

describe('store errors', () => {
  it('carry id / status / reason', () => {
    assert.equal(new RecipeNotFoundError('a').id, 'a');
    assert.equal(new StoreReadOnlyError('loading').status, 'loading');
    assert.equal(new PersistenceWriteError('quota').reason, 'quota');
  });
});

describe('RecipeStore reload edge cases', () => {
  it('reload to unreadable keeps list, sets reason, notifies, writes nothing', async () => {
    const { p, store } = make({ kind: 'ok', recipes: [PANCAKES] });
    await store.init();
    let calls = 0;
    store.subscribe(() => calls++);
    p.result = { kind: 'unreadable', reason: 'corrupt' };
    await store.reload();
    assert.deepEqual(store.list(), [PANCAKES]);
    assert.equal(store.statusReason, 'corrupt');
    assert.equal(calls, 1);
    assert.equal(p.saves.length, 0);
  });
  it('reload to empty yields ready [] with no write; init registers one watcher', async () => {
    const { p, store } = make({ kind: 'ok', recipes: [PANCAKES] });
    await store.init();
    assert.equal(p.watchers.size, 1);
    p.result = { kind: 'empty' };
    await store.reload();
    assert.equal(store.status, 'ready');
    assert.deepEqual(store.list(), []);
    assert.equal(p.saves.length, 0);
  });
});
