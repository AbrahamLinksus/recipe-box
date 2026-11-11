import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const PORT = '47399';
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: '.',
  use: { channel: 'msedge', baseURL: BASE },
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
