import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { RecipeStore } from '../../../web/js/store/recipe-store.js';
import { MemoryPersistence } from '../../helpers/memory-persistence.js';
import { PANCAKES, TOMATO_SOUP } from '../../helpers/recipes.fixture.js';

const INPUT = {
  title: PANCAKES.title,
  servings: PANCAKES.servings,
  ingredients: PANCAKES.ingredients,
  steps: PANCAKES.steps,
  tags: PANCAKES.tags,
};
const tick = () => new Promise((r) => setTimeout(r, 5));

/** @param {{ newId?: () => string }} [deps] */
const make = async (deps) => {
  const p = new MemoryPersistence({ kind: 'ok', recipes: [PANCAKES, TOMATO_SOUP] });
  let n = 0;
  const store = new RecipeStore(p, { newId: () => `id-${++n}`, ...deps });
  await store.init();
  return { p, store };
};

/** @type {unknown[]} */
let reported = [];
/** @type {any} */
const g = globalThis;
const original = g.reportError;
beforeEach(() => {
  reported = [];
  g.reportError = (/** @type {unknown} */ e) => reported.push(e);
});
afterEach(() => {
  g.reportError = original;
});

describe('RecipeStore listener isolation', () => {
  it('throwing listener on create -> create resolves, recipe saved once, later listeners called', async () => {
    const { p, store } = await make();
    const boom = new Error('listener boom');
    let later = 0;
    store.subscribe(() => {
      throw boom;
    });
    store.subscribe(() => later++);
    const r = await store.create(INPUT);
    assert.equal(store.list().filter((x) => x.id === r.id).length, 1);
    assert.equal(p.saves.length, 1);
    assert.equal(later, 1);
    assert.deepEqual(reported, [boom]);
  });

  it('throwing listener on watch-triggered reload -> no unhandled rejection, later listeners called', async () => {
    const { p, store } = await make();
    const boom = new Error('listener boom');
    let later = 0;
    store.subscribe(() => {
      throw boom;
    });
    store.subscribe(() => later++);
    /** @type {unknown[]} */
    const unhandled = [];
    const onUnhandled = (/** @type {unknown} */ e) => unhandled.push(e);
    process.on('unhandledRejection', onUnhandled);
    try {
      p.triggerExternalChange();
      await tick();
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    assert.deepEqual(unhandled, []);
    assert.equal(later, 1);
    assert.deepEqual(reported, [boom]);
  });
});

describe('RecipeStore input snapshot', () => {
  it('caller mutates input after create call -> the call-time value is saved', async () => {
    const { p, store } = await make();
    const input = structuredClone(INPUT);
    const pending = store.create(input);
    input.title = '';
    input.steps.length = 0;
    const r = await pending;
    assert.equal(r.title, INPUT.title);
    assert.deepEqual(r.steps, INPUT.steps);
    assert.equal(p.saves.length, 1);
  });

  it('caller mutates input after update call -> the call-time value is saved', async () => {
    const { store } = await make();
    const input = { ...structuredClone(INPUT), title: 'Crepes' };
    const pending = store.update(PANCAKES.id, input);
    input.title = '   ';
    const r = await pending;
    assert.equal(r.title, 'Crepes');
  });
});

describe('RecipeStore id collisions', () => {
  it('newId returns an existing id -> create rejects, nothing saved', async () => {
    const { p, store } = await make({ newId: () => PANCAKES.id });
    const before = store.list();
    await assert.rejects(store.create(INPUT), /duplicate id/);
    assert.equal(p.saves.length, 0);
    assert.equal(store.list(), before);
  });
});

describe('RecipeStore listener error fallback', () => {
  it('reportError missing -> error is rethrown on a fresh microtask, write still resolves', async () => {
    const { store } = await make();
    const boom = new Error('listener boom');
    let later = 0;
    store.subscribe(() => {
      throw boom;
    });
    store.subscribe(() => later++);
    g.reportError = undefined;
    const realQueue = g.queueMicrotask;
    /** @type {Array<() => void>} */
    const queued = [];
    g.queueMicrotask = (/** @type {() => void} */ fn) => queued.push(fn);
    try {
      await store.create(INPUT);
      assert.equal(later, 1);
      const rethrow = queued.find((fn) => {
        try {
          fn();
          return false;
        } catch (e) {
          return e === boom;
        }
      });
      assert.ok(rethrow, 'listener error rethrown from a queued microtask');
    } finally {
      g.queueMicrotask = realQueue;
    }
  });
});

describe('RecipeStore call-time validation edge', () => {
  it('create(undefined) / create(null) -> ValidationError, nothing saved', async () => {
    const { p, store } = await make();
    for (const bad of [undefined, null]) {
      await assert.rejects(store.create(/** @type {any} */ (bad)), { name: 'ValidationError' });
      await assert.rejects(store.update(PANCAKES.id, /** @type {any} */ (bad)), {
        name: 'ValidationError',
      });
    }
    assert.equal(p.saves.length, 0);
  });
});
