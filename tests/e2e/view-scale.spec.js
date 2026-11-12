import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from './helpers/seed.js';
import { seedPancakes, PANCAKES_ID } from './helpers/recipes.js';

test.describe('recipe view at base servings', () => {
  test.beforeEach(async ({ page }) => {
    await seedPancakes(page);
  });

  test('opening Pancakes shows everything as stored', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('recipe-row-title').click();
    await expect(page.getByTestId('recipe-title')).toHaveText('Pancakes');
    await expect(page.getByTestId('recipe-serves')).toHaveText('Serves 4');
    await expect(page.getByTestId('ingredient-line')).toHaveText([
      '200 g flour',
      '2 eggs',
      '300 ml milk',
      'a pinch of salt',
    ]);
    await expect(page.getByTestId('step-line')).toHaveText([
      'Whisk flour and salt',
      'Beat in eggs and milk',
      'Rest 10 min',
      'Fry in a hot pan',
    ]);
    await expect(page.getByTestId('recipe-tag')).toHaveText(['breakfast', 'sweet']);
    await expect(page.getByTestId('recipe-tags').getByTestId('recipe-tag')).toHaveCount(2);
    const ordered = await page
      .getByTestId('steps-panel')
      .evaluate((el) => el.querySelector('ol')?.children.length ?? 0);
    expect(ordered).toBe(4);
  });

  test('Edit links to the edit route and back returns to the list', async ({ page }) => {
    await page.goto(`/#/recipe/${PANCAKES_ID}`);
    await expect(page.getByTestId('edit-recipe')).toHaveAttribute(
      'href',
      `#/recipe/${PANCAKES_ID}/edit`,
    );
    await page.getByTestId('back-to-list').click();
    await expect(page.getByTestId('recipe-count')).toHaveText('1 recipe');
  });

  test('unknown id shows Recipe not found with a link back', async ({ page }) => {
    await page.goto('/#/recipe/nope');
    await expect(page.getByTestId('not-found')).toContainText('Recipe not found');
    await page.getByTestId('not-found-back').click();
    await expect(page.getByTestId('recipe-count')).toBeVisible();
  });

  test('columns at 800px and up, one column below, no horizontal overflow', async ({
    page,
    viewport,
  }) => {
    await page.goto(`/#/recipe/${PANCAKES_ID}`);
    const ing = await page.getByTestId('ingredients-panel').boundingBox();
    const steps = await page.getByTestId('steps-panel').boundingBox();
    expect(ing).not.toBeNull();
    expect(steps).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!ing || !steps || !viewport) return;
    if (viewport.width >= 800) expect(steps.x).toBeGreaterThan(ing.x + ing.width - 1);
    else expect(steps.y).toBeGreaterThan(ing.y + ing.height - 1);
    const overflow = await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth >
        globalThis.document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('store turning read-only never leaves an enabled Edit link', async ({ page }) => {
    await page.goto(`/#/recipe/${PANCAKES_ID}`);
    await expect(page.getByTestId('edit-recipe')).toBeEnabled();
    await page.evaluate((key) => {
      globalThis.localStorage.setItem(key, '{oops');
      globalThis.dispatchEvent(new globalThis.StorageEvent('storage', { key }));
    }, STORAGE_KEY);
    await expect(page.getByTestId('banner')).toBeVisible();
    const edit = page.getByTestId('edit-recipe');
    if ((await edit.count()) > 0) await expect(edit).toBeDisabled();
    await expect(page.getByTestId('edit-recipe').and(page.locator('a'))).toHaveCount(0);
  });
});
