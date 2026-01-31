import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 1280, height: 720 }
  },
  webServer: {
    command: 'pnpm dev -- --host 127.0.0.1 --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }
    }
  ]
});
