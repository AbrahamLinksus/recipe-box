// Usage: node scripts/screenshot.mjs <html-file-or-url> <out.png> [--width N] [--height N]
// Drives the installed Edge via Playwright (no browser download). Full-page screenshot.
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , input, out, ...rest] = process.argv;
if (!input || !out) {
  console.error('usage: screenshot.mjs <html-or-url> <out.png> [--width N] [--height N]');
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? Number(rest[i + 1]) : fallback;
};
const url = /^(https?|file):/.test(input) ? input : pathToFileURL(resolve(input)).href;
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const viewport = { width: opt('width', 1280), height: opt('height', 800) };
  const page = await browser.newPage({ viewport });
  await page.goto(url);
  await page.screenshot({ path: out, fullPage: true });
} finally {
  await browser.close();
}
