import { test, expect } from '@playwright/test';
import { seedRaw, STORAGE_KEY } from './helpers/seed.js';

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
