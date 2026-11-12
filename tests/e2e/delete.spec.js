import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from './helpers/seed.js';
import { seedCollection, SPEC_RECIPES } from './helpers/collection.js';

const SOUP = '/#/recipe/r-soup';
const shot = (/** @type {string} */ name) =>
  `.results/T-19/${name}-${test.info().project.name}.png`;

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} raw
 */
async function writeFromOtherTab(page, raw) {
  await page.evaluate(
    ({ key, value }) => {
      globalThis.localStorage.setItem(key, value);
      globalThis.dispatchEvent(new globalThis.StorageEvent('storage', { key }));
    },
    { key: STORAGE_KEY, value: raw },
  );
}

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
  await expect(page.getByTestId('recipe-title')).toHaveText('Tomato Soup');
});
