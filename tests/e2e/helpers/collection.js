import { seedRaw } from './seed.js';

const NOW = '2026-01-01T00:00:00.000Z';

/**
 * @param {string} id
 * @param {string} title
 * @param {string[]} tags
 * @param {boolean} favourite
 */
export function recipe(id, title, tags, favourite) {
  return {
    id,
    title,
    servings: 2,
    ingredients: [{ amount: { text: '1', value: 1 }, unit: '', name: 'thing' }],
    steps: ['Cook'],
    tags,
    favourite,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/** SPEC section 5 recipes: Pancakes, Tomato Soup, Banana Bread (favourite). */
export const SPEC_RECIPES = [
  recipe('r-pancakes', 'Pancakes', ['breakfast', 'sweet'], false),
  recipe('r-soup', 'Tomato Soup', ['lunch', 'vegetarian'], false),
  recipe('r-banana', 'Banana Bread', ['breakfast', 'baking'], false),
];

/**
 * @param {import('@playwright/test').Page} page
 * @param {object[]} [recipes]
 */
export async function seedCollection(page, recipes = SPEC_RECIPES) {
  await seedRaw(page, JSON.stringify({ version: 1, recipes }));
}
