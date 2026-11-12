import { test, expect } from '@playwright/test';
import { seedCollection } from './helpers/collection.js';

const SCREENS = [
  { name: 'list', url: '/#/', ready: 'recipe-count' },
  { name: 'view', url: '/#/recipe/r-pancakes', ready: 'recipe-title' },
  { name: 'add', url: '/#/new', ready: 'recipe-form' },
  { name: 'edit', url: '/#/recipe/r-pancakes/edit', ready: 'recipe-form' },
  { name: 'unknown page', url: '/#/nope', ready: 'not-found' },
  { name: 'unknown recipe', url: '/#/recipe/missing', ready: 'not-found' },
];

const INTERACTIVE = 'button, a[href], input, select, textarea';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedCollection(page);
});

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(screen.url);
      await expect(page.getByTestId(screen.ready)).toBeVisible();
    });

    test('no horizontal scroll at 390 px', async ({ page }) => {
      const widths = await page.evaluate(() => ({
        scroll: globalThis.document.documentElement.scrollWidth,
        client: globalThis.document.documentElement.clientWidth,
      }));
      expect(widths.client).toBe(390);
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    });

    test('buttons, links and inputs are at least 40 px tall', async ({ page }) => {
      const heights = await page.locator(INTERACTIVE).evaluateAll((els) =>
        els
          .filter((el) => el.checkVisibility())
          .map((el) => ({
            id: el.getAttribute('data-testid') ?? el.outerHTML.slice(0, 60),
            h: el.getBoundingClientRect().height,
          })),
      );
      expect(heights.length).toBeGreaterThan(0);
      for (const { id, h } of heights) expect.soft(h, id).toBeGreaterThanOrEqual(40);
    });

    test('one h1 and every control carries a data-testid', async ({ page }) => {
      await expect(page.locator('h1')).toHaveCount(1);
      const missing = await page
        .locator(INTERACTIVE)
        .evaluateAll(
          (els) =>
            els.filter((el) => !el.closest('dialog') && !el.getAttribute('data-testid')).length,
        );
      expect(missing).toBe(0);
    });
  });
}

test('stars have aria-pressed and aria-label on the list and the view', async ({ page }) => {
  for (const url of ['/#/', '/#/recipe/r-pancakes']) {
    await page.goto(url);
    const stars = page.getByTestId('favourite-toggle');
    await expect(stars.first()).toBeVisible();
    for (const star of await stars.all()) {
      await expect(star).toHaveAttribute('aria-pressed', /^(true|false)$/);
      await expect(star).toHaveAttribute('aria-label', /favourite/i);
    }
  }
});

test('the confirm dialog buttons are at least 40 px tall', async ({ page }) => {
  await page.goto('/#/recipe/r-pancakes');
  await page.getByTestId('delete-recipe').click();
  for (const id of ['confirm-ok', 'confirm-cancel']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
  }
  const scroll = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth <=
      globalThis.document.documentElement.clientWidth,
  );
  expect(scroll).toBe(true);
});
