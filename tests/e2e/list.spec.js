import { test, expect } from '@playwright/test';
import { seedRaw } from './helpers/seed.js';

test('empty state with no stored data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('empty-state')).toContainText('No recipes yet');
  await expect(page.getByTestId('add-first-recipe')).toHaveText('Add your first recipe');
  await expect(page.getByTestId('add-recipe')).toBeEnabled();
  await expect(page.getByTestId('banner')).toBeHidden();
});

test('unknown route shows Page not found with a link back', async ({ page }) => {
  await page.goto('/#/nope');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'All recipes' }).click();
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth >
      globalThis.document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('Add recipe button is keyboard-focusable', async ({ page }) => {
  await page.goto('/');
  const add = page.getByTestId('add-recipe');
  await expect(add).toBeVisible();
  await add.focus();
  await expect(add).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('add-first-recipe')).toBeFocused();
});

const NOW = '2026-01-01T00:00:00.000Z';

/** @param {string} id @param {string} title @param {string[]} tags @param {boolean} favourite */
function recipe(id, title, tags, favourite) {
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

/** @param {import('@playwright/test').Page} page @param {object[]} recipes */
async function seedRecipes(page, recipes) {
  await seedRaw(page, JSON.stringify({ version: 1, recipes }));
}

test('seeded list is A-Z with tags, stars, count and links', async ({ page }) => {
  await seedRecipes(page, [
    recipe('r-pancakes', 'Pancakes', ['breakfast', 'sweet'], false),
    recipe('r-soup', 'Tomato Soup', ['lunch', 'vegetarian'], false),
    recipe('r-banana', 'Banana Bread', ['breakfast', 'baking'], true),
  ]);
  await page.goto('/');
  await expect(page.getByTestId('recipe-count')).toHaveText('3 recipes');
  const rows = page.getByTestId('recipe-row');
  await expect(page.getByTestId('recipe-row-title')).toHaveText([
    'Banana Bread',
    'Pancakes',
    'Tomato Soup',
  ]);
  await expect(rows.nth(0)).toContainText('baking');
  await expect(rows.nth(0)).toContainText('breakfast');
  await expect(page.getByTestId('recipe-row-star')).toHaveText(['★', '☆', '☆']);
  await expect(page.getByTestId('recipe-row-title').nth(1)).toHaveAttribute(
    'href',
    '#/recipe/r-pancakes',
  );
});

test('count reads "1 recipe" for a single recipe', async ({ page }) => {
  await seedRecipes(page, [recipe('r-1', 'Pancakes', ['sweet'], false)]);
  await page.goto('/');
  await expect(page.getByTestId('recipe-count')).toHaveText('1 recipe');
});

test('rows re-render on store change; results region is separate from header', async ({ page }) => {
  await seedRecipes(page, [recipe('r-1', 'Pancakes', ['sweet'], false)]);
  await page.goto('/');
  await expect(page.getByTestId('recipe-count')).toHaveText('1 recipe');
  const add = page.getByTestId('add-recipe');
  await add.focus();
  await page.evaluate(
    ({ key, value }) => {
      globalThis.localStorage.setItem(key, value);
      globalThis.dispatchEvent(new globalThis.StorageEvent('storage', { key }));
    },
    {
      key: 'recipe-box:collection',
      value: JSON.stringify({
        version: 1,
        recipes: [
          recipe('r-2', 'Zucchini Bake', ['dinner'], true),
          recipe('r-1', 'Pancakes', ['sweet'], false),
        ],
      }),
    },
  );
  await expect(page.getByTestId('recipe-count')).toHaveText('2 recipes');
  await expect(page.getByTestId('recipe-row-title')).toHaveText(['Pancakes', 'Zucchini Bake']);
  await expect(page.getByTestId('recipe-row-star')).toHaveText(['☆', '★']);
  await expect(add).toBeFocused();
  const separate = await page.evaluate(() => {
    const doc = globalThis.document;
    const results = doc.querySelector('.results');
    const addButton = doc.querySelector('[data-testid="add-recipe"]');
    return results !== null && addButton !== null && !results.contains(addButton);
  });
  expect(separate).toBe(true);
});
