import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from './helpers/seed.js';

/** @param {import('@playwright/test').Page} page */
async function fillPancakes(page) {
  await page.getByTestId('title-input').fill('Pancakes');
  await page.getByTestId('servings-input').fill('4');
  const rows = [
    ['200', 'g', 'flour'],
    ['2', '', 'eggs'],
    ['300', 'ml', 'milk'],
    ['', '', 'a pinch of salt'],
  ];
  for (const [i, [amount, unit, name]] of rows.entries()) {
    if (i > 0) await page.getByTestId('add-ingredient').click();
    const row = page.getByTestId('ingredient-row').nth(i);
    await row.getByTestId('ingredient-amount-input').fill(amount ?? '');
    await row.getByTestId('ingredient-unit-input').fill(unit ?? '');
    await row.getByTestId('ingredient-name-input').fill(name ?? '');
  }
  const steps = [
    'Whisk flour and salt',
    'Beat in eggs and milk',
    'Rest 10 min',
    'Fry in a hot pan',
  ];
  for (const [i, text] of steps.entries()) {
    if (i > 0) await page.getByTestId('add-step').click();
    await page.getByTestId('step-input').nth(i).fill(text);
  }
  const tag = page.getByTestId('tag-input');
  await tag.fill('Breakfast');
  await tag.press('Enter');
  await tag.fill('sweet ,');
}

test('form shows its fields and help texts', async ({ page }) => {
  await page.goto('/#/new');
  await expect(page.getByRole('heading', { name: 'Add recipe' })).toBeVisible();
  await expect(page.getByTestId('title-input')).toBeVisible();
  await expect(page.getByTestId('servings-input')).toBeVisible();
  await expect(page.getByText('Leave empty for "a pinch", "to taste"')).toBeVisible();
  await expect(page.getByText('Tags are saved in lower case.')).toBeVisible();
  await page.getByTestId('add-step').click();
  await page.getByTestId('step-input').nth(0).fill('first');
  await page.getByTestId('step-input').nth(1).fill('second');
  await page.getByTestId('step-down').first().click();
  await expect(page.getByTestId('step-input').first()).toHaveValue('second');
  await page.getByTestId('remove-step').first().click();
  await expect(page.getByTestId('step-row')).toHaveCount(1);
  const noOverflow = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth <=
      globalThis.document.documentElement.clientWidth,
  );
  expect(noOverflow).toBe(true);
});

test('F-1: add Pancakes, view, list, survives reload', async ({ page }) => {
  await page.goto('/#/new');
  await fillPancakes(page);
  await expect(page.getByTestId('tag-chip')).toHaveCount(2);
  await page.screenshot({
    path: `.results/T-13/form-filled-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByTestId('save-recipe').click();
  await expect(page.getByTestId('recipe-title')).toHaveText('Pancakes');
  await expect(page.getByTestId('recipe-serves')).toHaveText('Serves 4');
  await expect(page.getByTestId('recipe-tag')).toHaveText(['breakfast', 'sweet']);
  await page.getByTestId('back-to-list').click();
  await expect(page.getByTestId('recipe-row-title')).toHaveText('Pancakes');
  await page.reload();
  await expect(page.getByTestId('recipe-row-title')).toHaveText('Pancakes');
  await page.getByTestId('recipe-row-title').click();
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
});

test('F-1: empty title is rejected with focus and aria-invalid', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByTestId('save-recipe').click();
  await expect(page.getByTestId('error-title')).toHaveText('Title is required');
  await expect(page.getByTestId('title-input')).toBeFocused();
  await expect(page.getByTestId('title-input')).toHaveAttribute('aria-invalid', 'true');
  await page.screenshot({
    path: `.results/T-13/form-errors-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate((k) => globalThis.localStorage.getItem(k), STORAGE_KEY)).toBeNull();
});

test('F-1: Toast with no ingredients is rejected', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByTestId('title-input').fill('Toast');
  await page.getByTestId('servings-input').fill('1');
  await page.getByTestId('step-input').first().fill('Toast the bread');
  await page.getByTestId('save-recipe').click();
  await expect(page.getByTestId('error-ingredients')).toHaveText('Add at least one ingredient');
  await expect(page.getByTestId('ingredient-name-input')).toBeFocused();
  await expect(page.getByTestId('ingredient-name-input')).toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate((k) => globalThis.localStorage.getItem(k), STORAGE_KEY)).toBeNull();
});

test('Cancel with changes asks to discard; Keep editing keeps, Discard leaves', async ({
  page,
}) => {
  await page.goto('/#/new');
  await page.getByTestId('cancel-edit').click();
  await expect(page.getByTestId('empty-state')).toBeVisible();

  await page.getByTestId('add-first-recipe').click();
  await page.getByTestId('title-input').fill('Draft');
  await page.getByTestId('cancel-edit').click();
  await expect(page.getByTestId('confirm-message')).toHaveText('Discard changes?');
  await page.screenshot({ path: `.results/T-13/discard-${test.info().project.name}.png` });
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('title-input')).toHaveValue('Draft');
  await expect(page).toHaveURL(/#\/new$/);

  await page.getByTestId('cancel-edit').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('tag chips: Enter and comma add, ✕ removes, lower-cased and de-duplicated', async ({
  page,
}) => {
  await page.goto('/#/new');
  const tag = page.getByTestId('tag-input');
  await tag.fill('Soup');
  await tag.press('Enter');
  await tag.pressSequentially('quick,');
  await expect(page.getByTestId('tag-chip')).toHaveCount(2);
  await tag.fill('SOUP');
  await tag.press('Enter');
  await expect(page.getByTestId('tag-chip')).toHaveCount(2);
  await expect(tag).toHaveValue('');
  await page.getByTestId('remove-tag').first().click();
  await expect(page.getByTestId('tag-chip')).toHaveCount(1);
  await expect(page.getByTestId('tag-chip')).toContainText('quick');
});

test('ingredient and step rows: add, remove, move up/down', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByTestId('add-ingredient').click();
  await expect(page.getByTestId('ingredient-row')).toHaveCount(2);
  await page.getByTestId('ingredient-name-input').nth(1).fill('second');
  await page.getByTestId('remove-ingredient').first().click();
  await expect(page.getByTestId('ingredient-row')).toHaveCount(1);
  await expect(page.getByTestId('ingredient-name-input')).toHaveValue('second');

  await page.getByTestId('add-step').click();
  await page.getByTestId('add-step').click();
  for (const [i, t] of ['a', 'b', 'c'].entries()) {
    await page.getByTestId('step-input').nth(i).fill(t);
  }
  await page.getByTestId('step-up').nth(2).click();
  expect(
    await page
      .getByTestId('step-input')
      .evaluateAll((els) => els.map((e) => /** @type {HTMLInputElement} */ (e).value)),
  ).toEqual(['a', 'c', 'b']);
});

test('inputs have accessible names and errors are linked', async ({ page }) => {
  await page.goto('/#/new');
  await expect(page.getByLabel('Title')).toBeVisible();
  await expect(page.getByLabel('Servings')).toBeVisible();
  await expect(page.getByLabel('Tags')).toBeVisible();
  await page.getByTestId('save-recipe').click();
  const title = page.getByLabel('Title');
  await expect(title).toHaveAttribute('aria-describedby', 'error-title');
  await expect(page.locator('#error-title')).toHaveText('Title is required');
});

test('step up on the first row is disabled and focus stays put', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByTestId('add-step').click();
  await expect(page.getByTestId('step-up').first()).toBeDisabled();
  await expect(page.getByTestId('step-down').last()).toBeDisabled();
  await page.getByTestId('step-input').first().focus();
  await page.getByTestId('step-down').first().click();
  await expect(page.getByTestId('step-input').nth(1)).toBeFocused();
});

test('Save is disabled while saving and saves only once', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByTestId('title-input').fill('Once');
  await page.getByTestId('servings-input').fill('1');
  await page.getByTestId('ingredient-name-input').fill('x');
  await page.getByTestId('step-input').first().fill('y');
  await page.evaluate(() => {
    const w = /** @type {typeof globalThis & { __sawDisabled?: boolean }} */ (globalThis);
    const btn = /** @type {HTMLButtonElement} */ (
      w.document.querySelector('[data-testid="save-recipe"]')
    );
    w.__sawDisabled = false;
    new globalThis.MutationObserver(() => {
      if (btn.disabled) w.__sawDisabled = true;
    }).observe(btn, { attributes: true, attributeFilter: ['disabled'] });
  });
  const save = page.getByTestId('save-recipe');
  await save.dblclick();
  await expect(page.getByTestId('recipe-title')).toHaveText('Once');
  expect(
    await page.evaluate(
      () =>
        /** @type {typeof globalThis & { __sawDisabled?: boolean }} */ (globalThis).__sawDisabled,
    ),
  ).toBe(true);
  const count = await page.evaluate((k) => {
    const data = JSON.parse(globalThis.localStorage.getItem(k) ?? 'null');
    return (data.recipes ?? data).length;
  }, STORAGE_KEY);
  expect(count).toBe(1);
});

test('navigating away via hash change with changes asks to discard', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByTestId('title-input').fill('Draft');
  await page.evaluate(() => {
    globalThis.location.hash = '#/';
  });
  await expect(page.getByTestId('confirm-message')).toHaveText('Discard changes?');
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('title-input')).toHaveValue('Draft');
  await expect(page).toHaveURL(/#\/new$/);
  await page.evaluate(() => {
    globalThis.location.hash = '#/';
  });
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('empty-state')).toBeVisible();
});
