import { test, expect } from '@playwright/test';
import { seedRaw, STORAGE_KEY } from './helpers/seed.js';
import { seedCollection, SPEC_RECIPES } from './helpers/collection.js';

test('unreadable stored value: banner, Add disabled, value untouched', async ({ page }) => {
  await seedRaw(page, '{oops');
  await page.goto('/');
  await expect(page.getByTestId('banner')).toHaveText(
    'Your saved recipes could not be read, so Recipe Box will not change them. Nothing has been deleted.',
  );
  await expect(page.getByTestId('add-recipe')).toBeDisabled();
  await expect(page.getByTestId('add-first-recipe')).toBeDisabled();
  const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(stored).toBe('{oops');
});

test('unhandled rejection shows the generic banner', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    void Promise.reject(new Error('boom'));
  });
  await expect(page.getByTestId('banner')).toHaveText(
    'Something went wrong. Reload the page to continue.',
  );
});

test('window error shows the generic banner', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    globalThis.reportError(new Error('listener failed'));
  });
  await expect(page.getByTestId('banner')).toHaveText(
    'Something went wrong. Reload the page to continue.',
  );
});

/** @param {import('@playwright/test').Page} page @param {string} value */
const writeRaw = (page, value) =>
  page.evaluate(({ key, v }) => globalThis.localStorage.setItem(key, v), {
    key: STORAGE_KEY,
    v: value,
  });
/** @param {import('@playwright/test').Page} page */
const readRaw = (page) =>
  page.evaluate((/** @type {string} */ key) => localStorage.getItem(key), STORAGE_KEY);

test('cross-tab corrupt write on the list: rows stay, controls disabled, then recover', async ({
  page,
  context,
}) => {
  await seedCollection(page);
  await page.goto('/');
  await expect(page.getByTestId('recipe-count')).toHaveText('3 recipes');
  const other = await context.newPage();
  await other.goto('/');
  await writeRaw(other, '{oops');
  await expect(page.getByTestId('banner')).toBeVisible();
  await expect(page.getByTestId('recipe-count')).toHaveText('3 recipes');
  await expect(page.getByTestId('add-recipe')).toBeDisabled();
  await expect(page.getByTestId('favourite-toggle')).toHaveCount(3);
  for (const star of await page.getByTestId('favourite-toggle').all()) {
    await expect(star).toBeDisabled();
  }
  await page.getByTestId('search-input').fill('b');
  await expect(page.getByTestId('recipe-row-title')).toHaveText(['Banana Bread']);
  expect(await readRaw(page)).toBe('{oops');
  await page.getByTestId('search-input').fill('');
  await expect(page.getByTestId('recipe-row-title')).toHaveCount(3);
  await writeRaw(other, JSON.stringify({ version: 1, recipes: SPEC_RECIPES }));
  await expect(page.getByTestId('banner')).toBeHidden();
  await expect(page.getByTestId('add-recipe')).toBeEnabled();
  await expect(page.getByTestId('favourite-toggle')).toHaveCount(3);
  for (const star of await page.getByTestId('favourite-toggle').all()) {
    await expect(star).toBeEnabled();
  }
});

test('cross-tab corrupt write on the view: star disabled then enabled', async ({
  page,
  context,
}) => {
  await seedCollection(page);
  await page.goto('/#/recipe/r-pancakes');
  await expect(page.getByTestId('favourite-toggle')).toBeEnabled();
  const other = await context.newPage();
  await other.goto('/');
  await writeRaw(other, '{oops');
  await expect(page.getByTestId('favourite-toggle')).toBeDisabled();
  await writeRaw(other, JSON.stringify({ version: 1, recipes: SPEC_RECIPES }));
  await expect(page.getByTestId('favourite-toggle')).toBeEnabled();
});
