import { test, expect } from '@playwright/test';

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
