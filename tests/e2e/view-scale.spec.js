import { test, expect } from '@playwright/test';
import { STORAGE_KEY, seedRaw } from './helpers/seed.js';
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

/** @param {string} text @param {number} value @param {string} unit @param {string} name */
const ingredient = (text, value, unit, name) => ({ amount: { text, value }, unit, name });
const BANANA_ID = '22222222-2222-4222-8222-222222222222';
const BANANA = {
  id: BANANA_ID,
  title: 'Banana Bread',
  servings: 8,
  ingredients: [
    ingredient('3', 3, '', 'bananas'),
    ingredient('1', 1, 'tsp', 'baking soda'),
    ingredient('250', 250, 'g', 'flour'),
  ],
  steps: ['Mix', 'Bake'],
  tags: [],
  favourite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test.describe('servings control', () => {
  /** @param {import('@playwright/test').Page} page @param {number} n */
  const setServings = async (page, n) => {
    await page.getByTestId('servings-input').fill(String(n));
  };
  /** @param {import('@playwright/test').Page} page */
  const lines = (page) => page.getByTestId('ingredient-line');

  test.beforeEach(async ({ page }) => {
    await seedPancakes(page);
    await page.goto(`/#/recipe/${PANCAKES_ID}`);
  });

  test('Pancakes 4 -> 6, 3 and 1 via the input', async ({ page }) => {
    await setServings(page, 6);
    await expect(lines(page)).toHaveText([
      '300 g flour',
      '3 eggs',
      '450 ml milk',
      'a pinch of salt',
    ]);
    await setServings(page, 3);
    await expect(lines(page)).toHaveText([
      '150 g flour',
      '1½ eggs',
      '225 ml milk',
      'a pinch of salt',
    ]);
    await setServings(page, 1);
    await expect(lines(page)).toHaveText(['50 g flour', '½ eggs', '75 ml milk', 'a pinch of salt']);
  });

  test('buttons step, minus is disabled at 1, invalid text keeps the value', async ({ page }) => {
    const input = page.getByTestId('servings-input');
    await page.getByTestId('servings-inc').click();
    await expect(input).toHaveValue('5');
    await expect(lines(page).first()).toHaveText('250 g flour');
    await setServings(page, 1);
    await expect(page.getByTestId('servings-dec')).toBeDisabled();
    await page.getByTestId('servings-inc').click();
    await expect(input).toHaveValue('2');
    await expect(page.getByTestId('servings-dec')).toBeEnabled();
    for (const bad of ['0', '', 'abc']) {
      await input.fill(bad);
      await expect(lines(page).first()).toHaveText('100 g flour');
    }
    await input.blur();
    await expect(input).toHaveValue('2');
  });

  test('Reset and the note appear only while scaled; nothing is stored', async ({ page }) => {
    await expect(page.getByTestId('servings-reset')).toHaveCount(0);
    await expect(page.getByTestId('servings-input')).toHaveValue('4');
    const before = await page.evaluate((k) => globalThis.localStorage.getItem(k), STORAGE_KEY);
    await setServings(page, 3);
    await expect(page.getByTestId('servings-reset')).toHaveText('Reset (4)');
    await expect(
      page.getByText('Recipe saved for 4 servings; scaling is not saved.'),
    ).toBeVisible();
    await page.getByTestId('servings-reset').click();
    await expect(page.getByTestId('servings-reset')).toHaveCount(0);
    await expect(page.getByText('scaling is not saved')).toHaveCount(0);
    await setServings(page, 3);
    await page.reload();
    await expect(page.getByTestId('servings-input')).toHaveValue('4');
    await expect(lines(page).first()).toHaveText('200 g flour');
    const after = await page.evaluate((k) => globalThis.localStorage.getItem(k), STORAGE_KEY);
    expect(after).toBe(before);
  });

  test('a store notification keeps the scaled servings', async ({ page }, info) => {
    await setServings(page, 3);
    await page.getByTestId('favourite-toggle').click();
    await expect(page.getByTestId('favourite-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('servings-input')).toHaveValue('3');
    await expect(lines(page)).toHaveText([
      '150 g flour',
      '1½ eggs',
      '225 ml milk',
      'a pinch of salt',
    ]);
    await page.screenshot({
      path: `.results/T-17/pancakes-3-${info.project.name}.png`,
      fullPage: true,
    });
  });
});

test.describe('servings control: store notifications and blur', () => {
  test.beforeEach(async ({ page }) => {
    await seedPancakes(page);
    await page.goto(`/#/recipe/${PANCAKES_ID}`);
  });

  test('cross-tab storage event while scaled keeps 3 servings', async ({ page, context }) => {
    await page.getByTestId('servings-input').fill('3');
    const other = await context.newPage();
    await other.goto('/');
    const raw = await page.evaluate((k) => globalThis.localStorage.getItem(k), STORAGE_KEY);
    expect(raw).not.toBeNull();
    const data = JSON.parse(String(raw));
    data.recipes[0].favourite = true;
    await other.evaluate(({ k, v }) => globalThis.localStorage.setItem(k, v), {
      k: STORAGE_KEY,
      v: JSON.stringify(data),
    });
    await expect(page.getByTestId('favourite-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('servings-input')).toHaveValue('3');
    await expect(page.getByTestId('ingredient-line')).toHaveText([
      '150 g flour',
      '1½ eggs',
      '225 ml milk',
      'a pinch of salt',
    ]);
    await expect(page.getByTestId('servings-reset')).toHaveText('Reset (4)');
  });

  test('blur after invalid text restores the kept value in the input', async ({ page }) => {
    const input = page.getByTestId('servings-input');
    await input.fill('3');
    await input.fill('abc');
    await expect(input).toHaveValue('abc');
    await input.blur();
    await expect(input).toHaveValue('3');
    await input.fill('');
    await input.blur();
    await expect(input).toHaveValue('3');
    await expect(page.getByTestId('ingredient-line').first()).toHaveText('150 g flour');
  });

  test('minus steps down to 1 and stops; Reset returns to base', async ({ page }) => {
    const dec = page.getByTestId('servings-dec');
    for (let i = 0; i < 3; i++) await dec.click();
    await expect(page.getByTestId('servings-input')).toHaveValue('1');
    await expect(dec).toBeDisabled();
    await page.getByTestId('servings-reset').click();
    await expect(page.getByTestId('servings-input')).toHaveValue('4');
    await expect(page.getByTestId('ingredient-line').first()).toHaveText('200 g flour');
  });

  test('reopening the recipe shows base servings', async ({ page }) => {
    await page.getByTestId('servings-input').fill('3');
    await page.getByTestId('back-to-list').click();
    await page.getByTestId('recipe-row-title').click();
    await expect(page.getByTestId('servings-input')).toHaveValue('4');
    await expect(page.getByTestId('servings-reset')).toHaveCount(0);
  });
});

test.describe('Banana Bread scaling', () => {
  test('8 -> 2 and 8 -> 1', async ({ page }) => {
    await seedRaw(page, JSON.stringify({ version: 1, recipes: [BANANA] }));
    await page.goto(`/#/recipe/${BANANA_ID}`);
    const input = page.getByTestId('servings-input');
    await input.fill('2');
    await expect(page.getByTestId('ingredient-line')).toHaveText([
      '¾ bananas',
      '¼ tsp baking soda',
      '62½ g flour',
    ]);
    await input.fill('1');
    await expect(page.getByTestId('ingredient-line')).toHaveText([
      '½ bananas',
      '¼ tsp baking soda',
      '31¼ g flour',
    ]);
  });
});
