import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from './helpers/seed.js';
import { seedCollection, SPEC_RECIPES } from './helpers/collection.js';

const ID = 'r-pancakes';
const EDIT = `/#/recipe/${ID}/edit`;
const shot = (/** @type {string} */ name) =>
  `.results/T-18/${name}-${test.info().project.name}.png`;

/** @param {import('@playwright/test').Page} page */
const stored = (page) =>
  page.evaluate((k) => JSON.parse(globalThis.localStorage.getItem(k) ?? 'null'), STORAGE_KEY);

/** @param {import('@playwright/test').Page} page */
async function simulateReadOnly(page) {
  await page.evaluate((key) => {
    globalThis.localStorage.setItem(key, '{oops');
    globalThis.dispatchEvent(new globalThis.StorageEvent('storage', { key }));
  }, STORAGE_KEY);
}

test.beforeEach(async ({ page }) => {
  await seedCollection(page, [
    {
      ...SPEC_RECIPES[0],
      servings: 4,
      ingredients: [{ amount: { text: '1½', value: 1.5 }, unit: 'cup', name: 'flour' }],
    },
    ...SPEC_RECIPES.slice(1),
  ]);
});

test('edit form is pre-filled with every field, amounts as typed', async ({ page }) => {
  await page.goto(EDIT);
  await expect(page.getByRole('heading', { name: 'Edit recipe' })).toBeVisible();
  await expect(page.getByTestId('title-input')).toHaveValue('Pancakes');
  await expect(page.getByTestId('servings-input')).toHaveValue('4');
  await expect(page.getByTestId('ingredient-amount-input')).toHaveValue('1½');
  await expect(page.getByTestId('ingredient-unit-input')).toHaveValue('cup');
  await expect(page.getByTestId('ingredient-name-input')).toHaveValue('flour');
  await expect(page.getByTestId('step-input')).toHaveValue('Cook');
  await expect(page.getByTestId('tag-chip')).toHaveText([/breakfast/, /sweet/]);
  await page.screenshot({ path: shot('edit-form'), fullPage: true });
});

test('unknown id shows the not-found state', async ({ page }) => {
  await page.goto('/#/recipe/nope/edit');
  await expect(page.getByTestId('not-found')).toBeVisible();
  await expect(page.getByTestId('title-input')).toHaveCount(0);
});

test('F-5: serves 4 to 6 plus tag weekend, survives reload, Back skips the form', async ({
  page,
}) => {
  await page.goto(`/#/recipe/${ID}`);
  await page.getByTestId('edit-recipe').click();
  await page.getByTestId('servings-input').fill('6');
  const tag = page.getByTestId('tag-input');
  await tag.fill('weekend');
  await tag.press('Enter');
  await page.getByTestId('save-recipe').click();
  await expect(page.getByTestId('recipe-serves')).toHaveText('Serves 6');
  await expect(page.getByTestId('recipe-tag')).toHaveText(['breakfast', 'sweet', 'weekend']);
  await page.screenshot({ path: shot('after-save'), fullPage: true });
  await page.goBack();
  await expect(page).not.toHaveURL(/edit$/);
  await page.goto('/#/');
  await expect(page.getByTestId('recipe-row').filter({ hasText: 'Pancakes' })).toContainText(
    'weekend',
  );
  await page.reload();
  await expect(page.getByTestId('recipe-row').filter({ hasText: 'Pancakes' })).toContainText(
    'weekend',
  );
  await page.goto(`/#/recipe/${ID}`);
  await expect(page.getByTestId('recipe-serves')).toHaveText('Serves 6');
});

test('Cancel asks to discard; Keep editing keeps, Discard shows the old title', async ({
  page,
}) => {
  await page.goto(EDIT);
  await page.getByTestId('title-input').fill('Changed');
  await page.getByTestId('cancel-edit').click();
  await expect(page.getByTestId('confirm-message')).toHaveText('Discard changes?');
  await page.screenshot({ path: shot('discard') });
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('title-input')).toHaveValue('Changed');
  await page.getByTestId('cancel-edit').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('recipe-title')).toHaveText('Pancakes');
});

test('beforeunload is prevented only while dirty', async ({ page }) => {
  await page.goto(EDIT);
  const prevented = () =>
    page.evaluate(() => {
      const e = new globalThis.Event('beforeunload', { cancelable: true });
      globalThis.dispatchEvent(e);
      return e.defaultPrevented;
    });
  expect(await prevented()).toBe(false);
  await page.getByTestId('title-input').fill('Changed');
  expect(await prevented()).toBe(true);
});

test('empty title is blocked and nothing is stored', async ({ page }) => {
  await page.goto(EDIT);
  await page.getByTestId('title-input').fill('');
  await page.getByTestId('save-recipe').click();
  await expect(page.getByTestId('error-title')).toHaveText('Title is required');
  expect((await stored(page)).recipes[0].title).toBe('Pancakes');
});

test('read-only store: edit form is pre-filled, Save disabled, stored value unchanged', async ({
  page,
}) => {
  await page.goto('/#/');
  await simulateReadOnly(page);
  await expect(page.getByTestId('banner')).toBeVisible();
  await page.evaluate((h) => (globalThis.location.hash = h), `#/recipe/${ID}/edit`);
  await expect(page.getByTestId('title-input')).toHaveValue('Pancakes');
  await expect(page.getByTestId('save-recipe')).toBeDisabled();
  await page.getByTestId('title-input').fill('Typed');
  await expect(page.getByTestId('title-input')).toHaveValue('Typed');
  await page.getByTestId('title-input').press('Enter');
  await expect(page.getByTestId('save-recipe')).toBeDisabled();
  expect(await page.evaluate((k) => globalThis.localStorage.getItem(k), STORAGE_KEY)).toBe('{oops');
  await page.screenshot({ path: shot('read-only') });
});

test('Save follows the store status live on the add form too', async ({ page }) => {
  await page.goto('/#/new');
  await expect(page.getByTestId('save-recipe')).toBeEnabled();
  await simulateReadOnly(page);
  await expect(page.getByTestId('save-recipe')).toBeDisabled();
});

test('write failure shows a reasoned banner, form stays open and dirty', async ({ page }) => {
  await page.goto(EDIT);
  await page.getByTestId('title-input').fill('Changed');
  await page.evaluate(() => {
    globalThis.Storage.prototype.setItem = () => {
      throw new globalThis.DOMException('full', 'QuotaExceededError');
    };
  });
  await page.getByTestId('save-recipe').click();
  await expect(page.getByTestId('banner')).toHaveText(
    'Could not save: browser storage is full. Your last change was not stored.',
  );
  await expect(page.getByTestId('title-input')).toHaveValue('Changed');
  await expect(page.getByTestId('save-recipe')).toBeEnabled();
  expect((await stored(page)).recipes[0].title).toBe('Pancakes');
  await page.getByTestId('cancel-edit').click();
  await expect(page.getByTestId('confirm-message')).toBeVisible();
});

test('recipe deleted in another tab: Save shows a banner and the form stays open', async ({
  page,
}) => {
  await page.goto(EDIT);
  await page.getByTestId('title-input').fill('Changed');
  await page.evaluate((key) => {
    globalThis.localStorage.setItem(key, JSON.stringify({ version: 1, recipes: [] }));
  }, STORAGE_KEY);
  await page.evaluate((key) => {
    globalThis.dispatchEvent(new globalThis.StorageEvent('storage', { key }));
  }, STORAGE_KEY);
  await page.getByTestId('save-recipe').click();
  await expect(page.getByTestId('banner')).toContainText('Could not save');
  await expect(page.getByTestId('title-input')).toHaveValue('Changed');
});
