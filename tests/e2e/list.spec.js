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
  await expect(page.getByTestId('search-input')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('tag-filter')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('favourites-only')).toBeFocused();
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

/** @param {string} message @returns {never} */
function fail(message) {
  throw new Error(message);
}

/** @param {import('@playwright/test').Page} page */
async function seedThree(page) {
  await seedRecipes(page, [
    recipe('r-pancakes', 'Pancakes', ['breakfast', 'sweet'], false),
    recipe('r-soup', 'Tomato Soup', ['lunch', 'vegetarian'], false),
    recipe('r-banana', 'Banana Bread', ['breakfast', 'baking'], true),
  ]);
}

test('search filters as you type and keeps focus and caret', async ({ page }) => {
  await seedThree(page);
  await page.goto('/');
  const search = page.getByTestId('search-input');
  const titles = page.getByTestId('recipe-row-title');
  await search.click();
  await page.keyboard.type('pan');
  await expect(titles).toHaveText(['Pancakes']);
  await expect(page.getByTestId('recipe-count')).toHaveText('1 recipe');
  await expect(search).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X');
  await expect(search).toHaveValue('paXn');
  await expect(search).toBeFocused();
  await expect(page.getByTestId('no-match-state')).toBeVisible();
  await search.fill('b');
  await expect(titles).toHaveText(['Banana Bread']);
});

test('tag filter lists tags A-Z and combines with search and favourites', async ({ page }) => {
  await seedThree(page);
  await page.goto('/');
  const tag = page.getByTestId('tag-filter');
  const titles = page.getByTestId('recipe-row-title');
  await expect(tag.locator('option')).toHaveText([
    'All tags',
    'baking',
    'breakfast',
    'lunch',
    'sweet',
    'vegetarian',
  ]);
  await tag.selectOption('breakfast');
  await expect(titles).toHaveText(['Banana Bread', 'Pancakes']);
  await page.getByTestId('favourites-only').check();
  await expect(titles).toHaveText(['Banana Bread']);
  await page.getByTestId('search-input').fill('pan');
  await expect(page.getByTestId('no-match-state')).toBeVisible();
  await page.getByTestId('search-input').fill('');
  await page.getByTestId('favourites-only').uncheck();
  await tag.selectOption('');
  await expect(titles).toHaveText(['Banana Bread', 'Pancakes', 'Tomato Soup']);
});

test('no-match state; Clear filters resets controls and focuses search', async ({ page }) => {
  await seedThree(page);
  await page.goto('/');
  await page.getByTestId('tag-filter').selectOption('lunch');
  await page.getByTestId('favourites-only').check();
  await page.getByTestId('search-input').fill('xyz');
  await expect(page.getByTestId('no-match-state')).toContainText('No recipes match your search');
  await expect(page.getByTestId('recipe-row')).toHaveCount(0);
  await page.getByTestId('clear-filters').click();
  await expect(page.getByTestId('search-input')).toHaveValue('');
  await expect(page.getByTestId('search-input')).toBeFocused();
  await expect(page.getByTestId('tag-filter')).toHaveValue('');
  await expect(page.getByTestId('favourites-only')).not.toBeChecked();
  await expect(page.getByTestId('recipe-row')).toHaveCount(3);
});

test('filters survive list -> view -> list', async ({ page }) => {
  await seedThree(page);
  await page.goto('/');
  await page.getByTestId('tag-filter').selectOption('breakfast');
  await page.getByTestId('search-input').fill('pan');
  await page.getByTestId('recipe-row-title').click();
  await expect(page.getByTestId('back-to-list')).toBeVisible();
  await page.getByTestId('back-to-list').click();
  await expect(page.getByTestId('search-input')).toHaveValue('pan');
  await expect(page.getByTestId('tag-filter')).toHaveValue('breakfast');
  await expect(page.getByTestId('recipe-row-title')).toHaveText(['Pancakes']);
});

test('filters are a sidebar from 800 px and stacked below', async ({ page }) => {
  await seedThree(page);
  await page.goto('/');
  const filters = (await page.locator('.filters').boundingBox()) ?? fail('no filters box');
  const results = (await page.locator('.results').boundingBox()) ?? fail('no results box');
  const wide = (page.viewportSize()?.width ?? 0) >= 800;
  if (wide) expect(filters.x + filters.width).toBeLessThanOrEqual(results.x);
  else expect(filters.y + filters.height).toBeLessThanOrEqual(results.y);
});
