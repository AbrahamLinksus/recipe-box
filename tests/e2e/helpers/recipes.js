import { seedRaw } from './seed.js';

const STAMP = '2026-01-01T00:00:00.000Z';
/**
 * @param {string} text
 * @param {number | null} value
 * @param {string} unit
 * @param {string} name
 */
const ing = (text, value, unit, name) => ({ amount: { text, value }, unit, name });

export const PANCAKES_ID = '11111111-1111-4111-8111-111111111111';

const PANCAKES = {
  id: PANCAKES_ID,
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
  createdAt: STAMP,
  updatedAt: STAMP,
};

/**
 * Seeds the SPEC section 5 Pancakes recipe before the first page load.
 * @param {import('@playwright/test').Page} page
 */
export async function seedPancakes(page) {
  await seedRaw(page, JSON.stringify({ version: 1, recipes: [PANCAKES] }));
}
