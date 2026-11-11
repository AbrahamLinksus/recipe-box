import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MESSAGES,
  assertRecipeInput,
  validateDraft,
} from '../../../../web/js/core/recipe/validation.js';
import { ValidationError } from '../../../../web/js/core/recipe/errors.js';
import { ALL_RECIPES, PANCAKES } from '../../../helpers/recipes.fixture.js';

/** @param {string} amount @param {string} unit @param {string} name */
const row = (amount, unit, name) => ({ amount, unit, name });
/** @param {Record<string, unknown>} [over] */
const draft = (over = {}) => ({
  title: 'Toast',
  servings: '1',
  ingredients: [row('2', '', 'slices bread')],
  steps: ['Toast it'],
  tags: [],
  ...over,
});
/** @param {any} d */
const errorsOf = (d) => {
  const result = validateDraft(d);
  assert.equal(result.ok, false);
  return result.errors;
};

describe('validateDraft', () => {
  it('empty title -> Title is required', () => {
    assert.equal(errorsOf(draft({ title: '  ' })).title, 'Title is required');
  });
  for (const servings of ['0', '2.5', '', 'x', '9'.repeat(400), '9007199254740993']) {
    it(`servings "${servings}" -> Servings must be 1 or more`, () => {
      assert.equal(errorsOf(draft({ servings })).servings, 'Servings must be 1 or more');
    });
  }
  it('no ingredients -> Add at least one ingredient', () => {
    assert.equal(errorsOf(draft({ ingredients: [] })).ingredients, 'Add at least one ingredient');
  });
  it('all-empty rows are dropped', () => {
    const errors = errorsOf(draft({ ingredients: [row('', '', '')] }));
    assert.equal(errors.ingredients, MESSAGES.ingredientsMin);
  });
  it('no steps -> Add at least one step', () => {
    assert.equal(errorsOf(draft({ steps: [' ', ''] })).steps, 'Add at least one step');
  });
  it('amount without name -> error at original index', () => {
    const rows = [row('', '', ''), row('1', 'g', ''), row('2', '', 'eggs')];
    const errors = errorsOf(draft({ ingredients: rows }));
    assert.deepEqual(errors.ingredientRows, { 1: 'Enter the ingredient name' });
    assert.equal(errors.ingredients, undefined);
  });
  it('reports all errors at once', () => {
    const errors = errorsOf({ title: '', servings: '0', ingredients: [], steps: [], tags: [] });
    assert.deepEqual(Object.keys(errors).sort(), ['ingredients', 'servings', 'steps', 'title']);
  });
  it('servings " 4 " -> 4', () => {
    const result = validateDraft(draft({ servings: ' 4 ' }));
    assert.equal(result.ok && result.value.servings, 4);
  });
  it('valid draft -> normalised value (SPEC pancakes)', () => {
    const result = validateDraft({
      title: ' Pancakes ',
      servings: '4',
      ingredients: [row('200', 'g', 'flour'), row('', '', ''), row('a pinch', '', 'of salt')],
      steps: ['Whisk', ' ', 'Fry'],
      tags: ['Breakfast', 'sweet '],
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.title, 'Pancakes');
    assert.equal(result.value.servings, 4);
    assert.deepEqual(result.value.ingredients[1], {
      amount: { text: 'a pinch', value: null },
      unit: '',
      name: 'of salt',
    });
    assert.deepEqual(result.value.steps, ['Whisk', 'Fry']);
    assert.deepEqual(result.value.tags, ['breakfast', 'sweet']);
  });
});

describe('assertRecipeInput', () => {
  it('accepts a valid input', () => {
    assert.doesNotThrow(() => assertRecipeInput(PANCAKES));
  });
  it('throws ValidationError with field errors', () => {
    const blank = { amount: { text: '', value: null }, unit: '', name: '' };
    const bad = { title: '', servings: 0, ingredients: [blank], steps: [], tags: [] };
    assert.throws(
      () => assertRecipeInput(bad),
      (err) =>
        err instanceof ValidationError &&
        err.fieldErrors.title === MESSAGES.titleRequired &&
        err.fieldErrors.ingredientRows?.[0] === MESSAGES.ingredientName &&
        err.fieldErrors.steps === MESSAGES.stepsMin,
    );
  });
  it('flags missing ingredients', () => {
    assert.throws(() => assertRecipeInput({ ...PANCAKES, ingredients: [] }), ValidationError);
  });
});

describe('assertRecipeInput structural guard', () => {
  const amt = (/** @type {unknown} */ value) => ({ text: '1', value });
  /** @param {Record<string, unknown>} over */
  const input = (over) =>
    /** @type {import('../../../../web/js/core/recipe/types.js').RecipeInput} */ (
      /** @type {unknown} */ ({ ...PANCAKES, ...over })
    );
  /** @param {Record<string, unknown>} over @param {Record<string, unknown>} expected */
  const rejects = (over, expected) =>
    assert.throws(
      () => assertRecipeInput(input(over)),
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.deepEqual(err.fieldErrors, expected);
        return true;
      },
    );
  const rowErr = { ingredientRows: { 0: MESSAGES.ingredientName } };
  const ingredient = (/** @type {Record<string, unknown>} */ over) => [
    { amount: amt(1), unit: '', name: 'x', ...over },
  ];

  it('every SPEC fixture -> accepted', () => {
    for (const recipe of ALL_RECIPES) assert.doesNotThrow(() => assertRecipeInput(recipe));
  });
  for (const [label, steps] of /** @type {[string, unknown][]} */ ([
    ['blank step', ['ok', '  ']],
    ['empty step', ['']],
    ['non-string step', [42]],
    ['steps not an array', 'Fry'],
  ])) {
    it(`${label} -> stepsMin`, () => rejects({ steps }, { steps: MESSAGES.stepsMin }));
  }
  for (const [label, servings] of /** @type {[string, unknown][]} */ ([
    ['Infinity', Infinity],
    ['above safe integer', 2 ** 53 + 2],
    ['numeric string', '4'],
  ])) {
    it(`servings ${label} -> servingsMin`, () =>
      rejects({ servings }, { servings: MESSAGES.servingsMin }));
  }
  for (const [label, row] of /** @type {[string, Record<string, unknown>][]} */ ([
    ['missing amount', { amount: undefined }],
    ['amount text not a string', { amount: { text: 1, value: 1 } }],
    ['amount value NaN', { amount: amt(NaN) }],
    ['amount value Infinity', { amount: amt(Infinity) }],
    ['amount value a string', { amount: amt('1') }],
    ['amount value undefined', { amount: { text: '1' } }],
    ['unit not a string', { unit: 5 }],
  ])) {
    it(`ingredient ${label} -> ingredientRows error`, () =>
      rejects({ ingredients: ingredient(row) }, rowErr));
  }
  it('ingredient amount value null -> accepted', () => {
    assert.doesNotThrow(() =>
      assertRecipeInput(input({ ingredients: ingredient({ amount: amt(null) }) })),
    );
  });
  for (const [label, tags] of /** @type {[string, unknown][]} */ ([
    ['undefined', undefined],
    ['a string', 'breakfast'],
    ['non-string item', [1]],
    ['upper-case', ['Breakfast']],
    ['duplicates', ['breakfast', 'breakfast']],
    ['unsorted', ['sweet', 'breakfast']],
    ['blank', ['']],
  ])) {
    it(`tags ${label} -> ValidationError`, () => rejects({ tags }, {}));
  }
  it('empty tags -> accepted', () => {
    assert.doesNotThrow(() => assertRecipeInput(input({ tags: [] })));
  });
  it('validateDraft output -> accepted by assertRecipeInput', () => {
    const result = validateDraft(draft({ tags: ['Sweet', 'breakfast ', 'SWEET'] }));
    assert.ok(result.ok);
    assert.doesNotThrow(() => assertRecipeInput(result.value));
  });
});

describe('recipes fixture', () => {
  it('mutating a shared fixture -> throws (deep-frozen)', () => {
    const pancakes = structuredClone(PANCAKES);
    assert.throws(() => {
      PANCAKES.title = 'x';
    }, TypeError);
    const [flour] = PANCAKES.ingredients;
    assert.ok(flour);
    assert.throws(() => {
      flour.amount.value = 1;
    }, TypeError);
    assert.throws(() => /** @type {unknown[]} */ (ALL_RECIPES).push(PANCAKES), TypeError);
    assert.deepEqual(PANCAKES, pancakes);
  });
});
