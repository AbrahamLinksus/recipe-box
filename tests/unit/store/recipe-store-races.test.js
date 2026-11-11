import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RecipeStore } from '../../../web/js/store/recipe-store.js';
import {
  RecipeNotFoundError,
  StoreReadOnlyError,
  PersistenceWriteError,
} from '../../../web/js/store/errors.js';
import { assertRecipeInput, validateDraft } from '../../../web/js/core/recipe/validation.js';
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

/** @param {any} [result] */
const make = async (result) => {
  const p = new MemoryPersistence(result ?? { kind: 'ok', recipes: [PANCAKES, TOMATO_SOUP] });
  const store = new RecipeStore(p);
  await store.init();
  return { p, store };
};

describe('RecipeStore races', () => {
  it('write during in-flight reload waits and acts on the reloaded state', async () => {
    const { p, store } = await make();
    const realLoad = p.load.bind(p);
    p.load = async () => {
      await tick();
      return realLoad();
    };
    p.result = { kind: 'ok', recipes: [TOMATO_SOUP] };
    const reload = store.reload();
    const write = store.create(INPUT);
    await Promise.all([reload, write]);
    assert.equal(store.list().length, 2);
    assert.equal(store.list()[0]?.id, TOMATO_SOUP.id);
    assert.equal(p.saves.length, 1);
    assert.equal(p.saves[0]?.length, 2);
  });

  it('failed write after a successful one leaves state at the first', async () => {
    const { p, store } = await make({ kind: 'empty' });
    const first = await store.create(INPUT);
    p.failWith = new PersistenceWriteError('quota');
    await assert.rejects(store.create({ ...INPUT, title: 'B' }), PersistenceWriteError);
    await assert.rejects(store.toggleFavourite(first.id), PersistenceWriteError);
    assert.deepEqual(store.list(), [first]);
    assert.equal(p.saves.length, 1);
  });

  it('toggleFavourite on a recipe removed in another tab -> NotFound, no save', async () => {
    const { p, store } = await make();
    p.result = { kind: 'ok', recipes: [TOMATO_SOUP] };
    p.triggerExternalChange();
    await assert.rejects(store.toggleFavourite(PANCAKES.id), RecipeNotFoundError);
    assert.equal(p.saves.length, 0);
    assert.equal(store.get(PANCAKES.id), undefined);
  });

  it('watch-triggered reload yielding unreadable makes later writes read-only', async () => {
    const { p, store } = await make();
    let calls = 0;
    store.subscribe(() => calls++);
    p.result = { kind: 'unreadable', reason: 'bad' };
    p.triggerExternalChange();
    await tick();
    assert.equal(store.status, 'unreadable');
    assert.equal(calls, 1);
    await assert.rejects(store.toggleFavourite(PANCAKES.id), StoreReadOnlyError);
    assert.equal(p.saves.length, 0);
  });

  it('write queued behind a reload that turns unreadable is rejected, not saved', async () => {
    const { p, store } = await make();
    p.result = { kind: 'unreadable', reason: 'bad' };
    const reload = store.reload();
    const write = store.create(INPUT);
    await reload;
    await assert.rejects(write, StoreReadOnlyError);
    assert.equal(p.saves.length, 0);
  });
});

describe('assertRecipeInput accepts all validateDraft output', () => {
  const row = (
    /** @type {string} */ amount,
    /** @type {string} */ unit,
    /** @type {string} */ name,
  ) => ({ amount, unit, name });
  const amounts = [
    '',
    '1',
    ' 2.5 ',
    '.5',
    '1/2',
    '1 1/2',
    '½',
    '2 ¾',
    '1/0',
    'a pinch',
    '9'.repeat(400),
    '１２',
  ];
  const texts = [
    'Soup',
    '  Soup\t',
    '\u00a0Nbsp\u00a0',
    '\u3000Wide\u3000',
    'ü ñ 😀',
    'a\nb',
    '\ufeffBOM',
  ];
  it('across awkward amounts, whitespace and tags', () => {
    for (const amount of amounts) {
      for (const text of texts) {
        const r = validateDraft({
          title: text,
          servings: ' 4 ',
          ingredients: [row(amount, ` g `, text), row('', '', '')],
          steps: [text, '   '],
          tags: [' B ', 'a', 'A', text, '', 'b'],
        });
        if (r.ok) assert.doesNotThrow(() => assertRecipeInput(r.value), `${amount}|${text}`);
      }
    }
  });
});
