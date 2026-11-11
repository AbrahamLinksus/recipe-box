import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UNICODE_FRACTIONS, parseAmount } from '../../../../web/js/core/recipe/amount.js';

describe('parseAmount', () => {
  const parsed = [
    ['2', 2],
    ['300', 300],
    ['0.5', 0.5],
    ['.5', 0.5],
    ['1.25', 1.25],
    ['½', 0.5],
    ['1½', 1.5],
    ['1 ½', 1.5],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
    ['0', 0],
    ['2¾', 2.75],
    ['1  ½', 1.5],
    ['1	1/2', 1.5],
  ];
  for (const [text, value] of parsed) {
    it(`"${text}" -> ${value}`, () => {
      assert.deepEqual(parseAmount(String(text)), { text, value });
    });
  }
  for (const text of ['a pinch', '2-3', '1/0', '0,5', '-2', '1.']) {
    it(`"${text}" -> null, text kept`, () => {
      assert.deepEqual(parseAmount(text), { text, value: null });
    });
  }
  it('empty and whitespace -> empty text, null', () => {
    assert.deepEqual(parseAmount(''), { text: '', value: null });
    assert.deepEqual(parseAmount('  '), { text: '', value: null });
  });
  it('trims the kept text', () => {
    assert.deepEqual(parseAmount(' 2 '), { text: '2', value: 2 });
  });
  it('overlong digit string -> null, not Infinity', () => {
    const text = '9'.repeat(400);
    assert.deepEqual(parseAmount(text), { text, value: null });
  });
  it('overlong slash numerator -> null, not Infinity', () => {
    const text = `${'9'.repeat(400)}/2`;
    assert.deepEqual(parseAmount(text), { text, value: null });
  });
});

describe('UNICODE_FRACTIONS', () => {
  it('mutation attempt -> throws (frozen)', () => {
    assert.ok(Object.isFrozen(UNICODE_FRACTIONS));
    assert.throws(() => {
      /** @type {Record<string, number>} */ (UNICODE_FRACTIONS)['½'] = 9;
    }, TypeError);
  });
});
