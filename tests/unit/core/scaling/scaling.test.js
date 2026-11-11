import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatQuarter, roundToQuarter } from '../../../../web/js/core/scaling/fractions.js';
import { formatIngredientLine, scaleAmount } from '../../../../web/js/core/scaling/scaling.js';
import {
  MIN_SERVINGS,
  parseServingsInput,
  stepServings,
} from '../../../../web/js/core/scaling/servings.js';
import { BANANA_BREAD, PANCAKES } from '../../../helpers/recipes.fixture.js';

/** @param {import('../../../../web/js/core/recipe/types.js').Recipe} r @param {number} t */
const lines = (r, t) =>
  r.ingredients.map((i) => {
    const l = formatIngredientLine(i, r.servings, t);
    return l.amount;
  });

describe('fractions', () => {
  it('rounds to quarter', () => {
    assert.equal(roundToQuarter(0.375), 0.5);
    assert.equal(roundToQuarter(0.37499999999), 0.5);
    assert.equal(roundToQuarter(0.125), 0.25);
    assert.equal(roundToQuarter(0), 0);
    assert.equal(roundToQuarter(1.1), 1);
  });
  it('formats quarters', () => {
    assert.equal(formatQuarter(0.25), '¼');
    assert.equal(formatQuarter(1.5), '1½');
    assert.equal(formatQuarter(62.5), '62½');
    assert.equal(formatQuarter(0.75), '¾');
    assert.equal(formatQuarter(3), '3');
    assert.equal(formatQuarter(0), '0');
  });
});

describe('formatIngredientLine (SPEC 7.2)', () => {
  it('Pancakes', () => {
    assert.deepEqual(lines(PANCAKES, 6), ['300 g', '3', '450 ml', 'a pinch']);
    assert.deepEqual(lines(PANCAKES, 3), ['150 g', '1½', '225 ml', 'a pinch']);
    assert.deepEqual(lines(PANCAKES, 1), ['50 g', '½', '75 ml', 'a pinch']);
    assert.deepEqual(lines(PANCAKES, 4), ['200 g', '2', '300 ml', 'a pinch']);
  });
  it('Banana Bread', () => {
    assert.deepEqual(lines(BANANA_BREAD, 2), ['¾', '¼ tsp', '62½ g']);
    assert.deepEqual(lines(BANANA_BREAD, 1), ['½', '¼ tsp', '31¼ g']);
  });
  it('keeps name and empty amount', () => {
    const l = formatIngredientLine(/** @type {any} */ (PANCAKES.ingredients[0]), 4, 6);
    assert.equal(l.name, 'flour');
    const none = { amount: { text: '', value: null }, unit: '', name: 'water' };
    assert.deepEqual(formatIngredientLine(none, 1, 2), { amount: '', name: 'water' });
  });
});

describe('scaleAmount', () => {
  it('as typed when target equals base', () => {
    assert.equal(scaleAmount({ text: '1 1/2', value: 1.5 }, 2, 2), '1 1/2');
  });
  it('scales a unicode fraction', () => {
    assert.equal(scaleAmount({ text: '½', value: 0.5 }, 1, 3), '1½');
  });
  it('typed 0 scales to 0', () => {
    assert.equal(scaleAmount({ text: '0', value: 0 }, 2, 4), '0');
  });
  it('1 1/2 cup line as typed', () => {
    const ing = { amount: { text: '1 1/2', value: 1.5 }, unit: 'cup', name: 'oats' };
    assert.equal(formatIngredientLine(ing, 2, 2).amount, '1 1/2 cup');
  });
});

describe('servings', () => {
  it('parseServingsInput', () => {
    for (const raw of ['0', '', 'abc', '2.5', '-1']) assert.equal(parseServingsInput(raw, 3), 3);
    assert.equal(parseServingsInput(' 6 ', 3), 6);
  });
  it('stepServings', () => {
    assert.equal(MIN_SERVINGS, 1);
    assert.equal(stepServings(1, -1), 1);
    assert.equal(stepServings(3, 1), 4);
  });
});
