import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8088',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
});
