import { test, expect } from '@playwright/test';
import { seedCollection, SPEC_RECIPES } from './helpers/collection.js';
import { seedRaw } from './helpers/seed.js';

/** @param {import('@playwright/test').Page} page @param {string} title */
const rowStar = (page, title) =>
  page.getByTestId('recipe-row').filter({ hasText: title }).getByTestId('favourite-toggle');

test('F-4: star Banana Bread, favourites only, survives reload', async ({ page }) => {
  await seedCollection(page);
  await page.goto('/');
  const star = rowStar(page, 'Banana Bread');
  await expect(star).toHaveText('☆');
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await expect(star).toHaveAttribute('aria-label', 'Mark as favourite');
  await star.click();
  await expect(star).toHaveText('★');
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  await expect(star).toHaveAttribute('aria-label', 'Remove from favourites');
  await page.getByTestId('favourites-only').check();
  await expect(page.getByTestId('recipe-row-title')).toHaveText(['Banana Bread']);
  await page.reload();
  await expect(rowStar(page, 'Banana Bread')).toHaveText('★');
});

test('star on the view toggles and shows on the list', async ({ page }) => {
  await seedCollection(page);
  await page.goto('/#/recipe/r-pancakes');
  const star = page.getByTestId('favourite-toggle');
  await expect(star).toHaveAttribute('aria-label', 'Mark as favourite');
  await star.click();
  await expect(star).toHaveAttribute('aria-label', 'Remove from favourites');
  await expect(star).toHaveText('★');
  await star.click();
  await expect(star).toHaveText('☆');
  await star.click();
  await page.getByTestId('back-to-list').click();
  await expect(rowStar(page, 'Pancakes')).toHaveText('★');
});

test('keyboard: toggling keeps focus on the star', async ({ page }) => {
  await seedCollection(page);
  await page.goto('/');
  const star = rowStar(page, 'Banana Bread');
  await star.focus();
  await page.keyboard.press('Enter');
  await expect(star).toHaveText('★');
  await expect(star).toBeFocused();
});

test('corrupt seed: stars and Add buttons disabled', async ({ page }) => {
  await seedRaw(page, '{oops');
  await page.goto('/');
  await expect(page.getByTestId('add-recipe')).toBeDisabled();
  await expect(page.getByTestId('add-first-recipe')).toBeDisabled();
});

test('rejected write shows the Could not save banner and keeps the stored star', async ({
  page,
}) => {
  await seedCollection(page);
  await page.goto('/');
  await page.evaluate(() => {
    globalThis.Storage.prototype.setItem = () => {
      throw new globalThis.DOMException('full', 'QuotaExceededError');
    };
  });
  const star = rowStar(page, 'Banana Bread');
  await star.click();
  await expect(page.getByTestId('banner')).toContainText('Could not save');
  await expect(star).toHaveText('☆');
  expect(SPEC_RECIPES.length).toBe(3);
});
