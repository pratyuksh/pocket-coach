import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

// Locally, prefer a system Chromium/Chrome if present. In CI, always use the Playwright-managed
// Chromium installed by the workflow: GitHub runners ship a google-chrome whose version is not
// pinned to this Playwright release, and mismatches can cause launch/CDP hangs.
let executablePath: string | undefined;
try {
  if (process.env.CI) throw new Error('skip system browser lookup in CI');
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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Fail the whole run instead of hanging the CI job indefinitely
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: process.env.CI
      ? 'pnpm --filter @pocket-coach/web preview --port 5173'
      : 'pnpm --filter @pocket-coach/web dev',
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
