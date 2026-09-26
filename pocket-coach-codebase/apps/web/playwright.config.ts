import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

let executablePath: string | undefined;
try {
  const systemChromium = execSync('which chromium || which google-chrome', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
  if (systemChromium) {
    executablePath = systemChromium;
  }
} catch {
  // Fall back to default Playwright browser
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: 'pnpm --filter @pocket-coach/web dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
