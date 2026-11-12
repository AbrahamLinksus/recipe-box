import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../../../web/js/ui/form-model.js';
import { PANCAKES } from '../../helpers/recipes.fixture.js';

/** Deep-freeze so any mutation throws (strict mode).
 * @template T
 * @param {T} v
 * @returns {T} */
function freeze(v) {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
const base = () => freeze(m.draftFromRecipe(PANCAKES));

test('emptyDraft has one empty ingredient row and one empty step row', () => {
  assert.deepEqual(m.emptyDraft(), {
    title: '',
    servings: '',
    ingredients: [{ amount: '', unit: '', name: '' }],
    steps: [''],
    tags: [],
  });
});

test('draftFromRecipe keeps amount texts as typed and servings as a string', () => {
  const d = m.draftFromRecipe(PANCAKES);
  assert.equal(d.servings, '4');
  assert.equal(d.ingredients[3]?.amount, 'a pinch');
  assert.deepEqual(d.ingredients[0], { amount: '200', unit: 'g', name: 'flour' });
  assert.deepEqual(d.tags, ['breakfast', 'sweet']);
});

test('every operation returns a new draft and never mutates its input', () => {
  const d = base();
  const results = [
    m.addIngredientRow(d),
    m.removeIngredientRow(d, 0),
    m.setIngredientField(d, 0, 'name', 'x'),
    m.addStepRow(d),
    m.removeStepRow(d, 0),
    m.moveStep(d, 0, 1),
    m.moveStep(d, 0, -1),
    m.setStep(d, 0, 'x'),
    m.addTag(d, 'new'),
    m.addTag(d, 'breakfast'),
    m.removeTag(d, 'sweet'),
    m.removeTag(d, 'nope'),
  ];
  for (const r of results) {
    assert.notEqual(r, d);
  }
});

test('row removal leaves one empty row when the last is removed', () => {
  let d = m.emptyDraft();
  d = m.setIngredientField(d, 0, 'name', 'salt');
  d = m.setStep(d, 0, 'Stir');
  assert.deepEqual(m.removeIngredientRow(d, 0).ingredients, [{ amount: '', unit: '', name: '' }]);
  assert.deepEqual(m.removeStepRow(d, 0).steps, ['']);
});

test('add and remove rows in the middle', () => {
  const d = base();
  assert.equal(m.addIngredientRow(d).ingredients.length, 5);
  assert.equal(m.addStepRow(d).steps.at(-1), '');
  assert.deepEqual(m.removeStepRow(d, 1).steps, [
    'Whisk flour and salt',
    'Rest 10 min',
    'Fry in a hot pan',
  ]);
});

test('setIngredientField and setStep change only the target', () => {
  const d = base();
  assert.equal(m.setIngredientField(d, 1, 'unit', 'pcs').ingredients[1]?.unit, 'pcs');
  assert.equal(m.setIngredientField(d, 1, 'unit', 'pcs').ingredients[0]?.unit, 'g');
  assert.equal(m.setStep(d, 2, 'Wait').steps[2], 'Wait');
});

test('moveStep swaps neighbours and is a no-op at the ends', () => {
  const d = base();
  assert.deepEqual(m.moveStep(d, 0, 1).steps.slice(0, 2), [d.steps[1], d.steps[0]]);
  assert.deepEqual(m.moveStep(d, 3, -1).steps.slice(2), [d.steps[3], d.steps[2]]);
  assert.deepEqual(m.moveStep(d, 0, -1).steps, d.steps);
  assert.deepEqual(m.moveStep(d, 3, 1).steps, d.steps);
});

test('addTag normalises, ignores empty and duplicates', () => {
  let d = m.emptyDraft();
  d = m.addTag(d, 'Breakfast ');
  assert.deepEqual(d.tags, ['breakfast']);
  assert.deepEqual(m.addTag(d, 'breakfast').tags, ['breakfast']);
  assert.deepEqual(m.addTag(d, '  BREAKFAST').tags, ['breakfast']);
  assert.deepEqual(m.addTag(d, '   ').tags, ['breakfast']);
});

test('removeTag removes the tag', () => {
  assert.deepEqual(m.removeTag(base(), 'sweet').tags, ['breakfast']);
});

test('isDirty is false for untouched and whitespace-only changes', () => {
  const initial = m.draftFromRecipe(PANCAKES);
  assert.equal(m.isDirty(initial, m.draftFromRecipe(PANCAKES)), false);
  let d = m.setIngredientField(initial, 0, 'name', ' flour  ');
  d = m.setStep(d, 0, 'Whisk flour and salt ');
  d = { ...d, title: ' Pancakes ', servings: '4 ' };
  assert.equal(m.isDirty(initial, d), false);
  assert.equal(m.isDirty(m.emptyDraft(), m.emptyDraft()), false);
});

test('isDirty is true after any field change', () => {
  const i = m.draftFromRecipe(PANCAKES);
  const changed = [
    { ...i, title: 'Crepes' },
    { ...i, servings: '5' },
    m.setIngredientField(i, 0, 'amount', '250'),
    m.setIngredientField(i, 0, 'unit', 'kg'),
    m.setIngredientField(i, 0, 'name', 'rye'),
    m.addIngredientRow(i),
    m.removeIngredientRow(i, 0),
    m.setStep(i, 0, 'Other'),
    m.addStepRow(i),
    m.moveStep(i, 0, 1),
    m.addTag(i, 'new'),
    m.removeTag(i, 'sweet'),
  ];
  changed.forEach((d) => assert.equal(m.isDirty(i, d), true));
});

test('emptyDraft returns a fresh object each call', () => {
  const a = m.emptyDraft();
  const b = m.emptyDraft();
  assert.notEqual(a, b);
  assert.notEqual(a.ingredients, b.ingredients);
  assert.notEqual(a.steps, b.steps);
});

test('operations leave the input deep-equal to its snapshot', () => {
  const d = base();
  const snapshot = structuredClone(d);
  const results = [
    m.addIngredientRow(d),
    m.removeIngredientRow(d, 1),
    m.setIngredientField(d, 0, 'name', 'x'),
    m.addStepRow(d),
    m.removeStepRow(d, 1),
    m.moveStep(d, 1, 1),
    m.moveStep(d, 0, -1),
    m.setStep(d, 0, 'x'),
    m.addTag(d, 'new'),
    m.addTag(d, 'breakfast'),
    m.removeTag(d, 'sweet'),
  ];
  for (const r of results) {
    assert.notEqual(r, d);
  }
  assert.deepEqual(d, snapshot);
});

test('moveStep with an out-of-range index is a no-op; single-step list is a no-op', () => {
  const d = base();
  assert.deepEqual(m.moveStep(d, 9, -1).steps, d.steps);
  assert.deepEqual(m.moveStep(m.emptyDraft(), 0, 1).steps, ['']);
});
