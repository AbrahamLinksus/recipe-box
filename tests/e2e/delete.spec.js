import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from './helpers/seed.js';
import { seedCollection, SPEC_RECIPES } from './helpers/collection.js';

const SOUP = '/#/recipe/r-soup';
const shot = (/** @type {string} */ name) =>
  `.results/T-19/${name}-${test.info().project.name}.png`;

/**
 * Writes the stored collection from a real second page of the same browser context, so this
 * page gets a genuine cross-tab `storage` event.
 * @param {import('@playwright/test').Page} page
 * @param {string} raw
 */
async function writeFromOtherTab(page, raw) {
  const other = await page.context().newPage();
  await other.goto('/');
  await other.evaluate(({ key, value }) => globalThis.localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: raw,
  });
  await other.close();
}

/** @param {import('@playwright/test').Page} page */
const storedValue = (page) =>
  page.evaluate((key) => globalThis.localStorage.getItem(key), STORAGE_KEY);

test.beforeEach(async ({ page }) => {
  await seedCollection(page, SPEC_RECIPES);
  await page.goto(SOUP);
});

test('Delete opens the dialog with focus on Cancel', async ({ page }) => {
  await page.getByTestId('delete-recipe').click();
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await expect(page.getByTestId('confirm-message')).toHaveText(
    "Delete 'Tomato Soup'? Are you sure?",
  );
  await expect(page.getByTestId('confirm-cancel')).toHaveText('Cancel');
  await expect(page.getByTestId('confirm-ok')).toHaveText('Delete');
  await expect(page.getByTestId('confirm-cancel')).toBeFocused();
  await page.screenshot({ path: shot('dialog') });
});

test('Cancel and Esc keep the recipe on the view', async ({ page }) => {
  await page.getByTestId('delete-recipe').click();
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
  await page.getByTestId('delete-recipe').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
});

test('Delete removes it, survives reload, Back does not reopen it', async ({ page }) => {
  await page.goto('/#/');
  await page.getByTestId('recipe-row-title').filter({ hasText: 'Tomato Soup' }).click();
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
  await page.getByTestId('delete-recipe').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('recipe-row')).toHaveText([/Banana Bread/, /Pancakes/]);
  await page.reload();
  await expect(page.getByTestId('recipe-row')).toHaveText([/Banana Bread/, /Pancakes/]);
  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByTestId('recipe-row')).toHaveText([/Banana Bread/, /Pancakes/]);
  await expect(page.getByTestId('not-found')).toHaveCount(0);
  await expect(page.getByTestId('recipe-title')).toHaveCount(0);
});

test('Delete follows the store status live', async ({ page }) => {
  await expect(page.getByTestId('delete-recipe')).toBeEnabled();
  await writeFromOtherTab(page, '{oops');
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
  await expect(page.getByTestId('delete-recipe')).toBeDisabled();
  await writeFromOtherTab(page, JSON.stringify({ version: 1, recipes: SPEC_RECIPES }));
  await expect(page.getByTestId('delete-recipe')).toBeEnabled();
});

test('a rejected remove shows the banner and stays on the view', async ({ page }) => {
  await page.evaluate(() => {
    globalThis.Storage.prototype.setItem = () => {
      throw new globalThis.DOMException('full', 'QuotaExceededError');
    };
  });
  await page.getByTestId('delete-recipe').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('banner')).toContainText('Could not save');
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
  await page.reload();
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
});

test('data turning unreadable while the dialog is open: confirm changes nothing', async ({
  page,
}) => {
  await page.getByTestId('delete-recipe').click();
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await writeFromOtherTab(page, '{oops');
  await expect(page.getByTestId('delete-recipe')).toBeDisabled();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
  await expect(page).toHaveURL(/#\/recipe\/r-soup$/);
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
  await expect(page.getByTestId('banner')).toBeVisible();
  await expect(page.getByTestId('banner')).not.toContainText('Could not save');
  expect(await storedValue(page)).toBe('{oops');
});
