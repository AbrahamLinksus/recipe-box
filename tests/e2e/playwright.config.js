import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const PORT = '47399';
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/opt/microsoft/msedge/msedge',
];
// D-08: Edge when installed; else a Chromium already on the machine, only if
// PLAYWRIGHT_BROWSERS_PATH is set and <path>/chromium exists; else Playwright's defaults.
const hasEdge = EDGE_PATHS.some((p) => existsSync(p));
const browsersDir = process.env.PLAYWRIGHT_BROWSERS_PATH;
const local = browsersDir ? resolve(browsersDir, 'chromium') : '';
const browser = hasEdge
  ? { channel: 'msedge' }
  : local && existsSync(local)
    ? { launchOptions: { executablePath: local } }
    : {};
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: '.',
  use: { ...browser, baseURL: BASE },
  webServer: {
    command: 'node server/main.js',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { RECIPE_BOX_PORT: PORT, RECIPE_BOX_NO_OPEN: '1' },
    url: `${BASE}/__recipe-box/health`,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'narrow', use: { viewport: { width: 390, height: 844 } } },
  ],
});
