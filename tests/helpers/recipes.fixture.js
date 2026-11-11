// SPEC section 5 sample recipes.
/** @typedef {import('../../web/js/core/recipe/types.js').Recipe} Recipe */

/**
 * Deep-freeze so a test that mutates a shared fixture fails instead of leaking.
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * @param {string} text
 * @param {number | null} value
 * @param {string} unit
 * @param {string} name
 */
const ing = (text, value, unit, name) => ({ amount: { text, value }, unit, name });
const stamp = '2026-01-01T00:00:00.000Z';

/** @type {Recipe} */
export const PANCAKES = deepFreeze({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Pancakes',
  servings: 4,
  ingredients: [
    ing('200', 200, 'g', 'flour'),
    ing('2', 2, '', 'eggs'),
    ing('300', 300, 'ml', 'milk'),
    ing('a pinch', null, '', 'of salt'),
  ],
  steps: ['Whisk flour and salt', 'Beat in eggs and milk', 'Rest 10 min', 'Fry in a hot pan'],
  tags: ['breakfast', 'sweet'],
  favourite: false,
  createdAt: stamp,
  updatedAt: stamp,
});

/** @type {Recipe} */
export const TOMATO_SOUP = deepFreeze({
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Tomato Soup',
  servings: 2,
  ingredients: [
    ing('4', 4, '', 'tomatoes'),
    ing('1', 1, '', 'onion'),
    ing('500', 500, 'ml', 'stock'),
  ],
  steps: ['Chop and fry the onion', 'Add tomatoes and stock', 'Simmer and blend'],
  tags: ['lunch', 'vegetarian'],
  favourite: false,
  createdAt: stamp,
  updatedAt: stamp,
});

/** @type {Recipe} */
export const BANANA_BREAD = deepFreeze({
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Banana Bread',
  servings: 8,
  ingredients: [
    ing('3', 3, '', 'bananas'),
    ing('1', 1, 'tsp', 'baking soda'),
    ing('250', 250, 'g', 'flour'),
  ],
  steps: ['Mash the bananas', 'Mix in the dry ingredients', 'Bake for 50 min'],
  tags: ['baking', 'breakfast'],
  favourite: false,
  createdAt: stamp,
  updatedAt: stamp,
});

export const ALL_RECIPES = deepFreeze([PANCAKES, TOMATO_SOUP, BANANA_BREAD]);
