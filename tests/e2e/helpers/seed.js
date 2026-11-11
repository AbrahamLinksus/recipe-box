export const STORAGE_KEY = 'recipe-box:collection';

/**
 * Writes a raw value to localStorage before the first page load of this test.
 * A sessionStorage marker stops reloads from re-seeding.
 * @param {import('@playwright/test').Page} page
 * @param {string} raw exact string to store
 */
export async function seedRaw(page, raw) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem(key, value);
      }
    },
    { key: STORAGE_KEY, value: raw },
  );
}
