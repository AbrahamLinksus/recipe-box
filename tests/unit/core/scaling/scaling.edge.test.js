import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { formatQuarter, roundToQuarter } from '../../../../web/js/core/scaling/fractions.js';
import { formatIngredientLine, scaleAmount } from '../../../../web/js/core/scaling/scaling.js';
import { parseServingsInput, stepServings } from '../../../../web/js/core/scaling/servings.js';

describe('quarter boundaries', () => {
  it('rounds boundary values', () => {
    assert.equal(roundToQuarter(0.125), 0.25);
    assert.equal(roundToQuarter(0.375), 0.5);
    assert.equal(roundToQuarter(0.625), 0.75);
    assert.equal(roundToQuarter(0.875), 1);
    assert.equal(roundToQuarter(2.9999), 3);
    assert.equal(roundToQuarter(0.1), 0.25);
  });
  it('positive tiny value never 0', () => {
    assert.equal(roundToQuarter(0.0001), 0.25);
    assert.equal(formatQuarter(roundToQuarter(0.0001)), '¼');
  });
  it('near-halfway float', () => {
    assert.equal(roundToQuarter(0.1 + 0.2 + 0.075), 0.5);
  });
});

describe('large and null', () => {
  it('very large servings stay finite and exact', () => {
    assert.equal(scaleAmount({ text: '200', value: 200 }, 4, 1000000), '50000000');
    assert.equal(parseServingsInput('99999999999999999999', 3), 3);
    assert.equal(stepServings(1000000, 1), 1000001);
  });
  it('null value keeps text for any target', () => {
    assert.equal(scaleAmount({ text: 'a pinch', value: null }, 4, 9), 'a pinch');
    const l = formatIngredientLine(
      { amount: { text: 'a pinch', value: null }, unit: '', name: 'salt' },
      4,
      9,
    );
    assert.deepEqual(l, { amount: 'a pinch', name: 'salt' });
  });
  it('unit with empty amount has no leading space', () => {
    const l = formatIngredientLine(
      { amount: { text: '', value: null }, unit: 'g', name: 'x' },
      1,
      2,
    );
    assert.equal(l.amount, 'g');
  });
  it('stepServings clamps below minimum', () => {
    assert.equal(stepServings(2, -5), 1);
  });
});

describe('layer rule', () => {
  it('core/scaling imports only core/recipe', () => {
    const dir = 'web/js/core/scaling';
    for (const f of readdirSync(dir)) {
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      for (const m of src.matchAll(/(?:from\s+|import\()\s*['"]([^'"]+)['"]/g)) {
        const spec = m[1] ?? '';
        assert.ok(spec.startsWith('./') || spec.startsWith('../recipe/'), `${f}: ${spec}`);
      }
    }
  });
});
