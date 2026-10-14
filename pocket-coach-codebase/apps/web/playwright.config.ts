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

const SEASON_SPECS = /(assignments|assignment-flow|roles-flow|publishing|hall-details)\.spec\.ts/;

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Fail the whole run instead of hanging the CI job indefinitely
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    // Fixed locale and time zone so selectors (English text) and date logic do not depend on the
    // machine; the German default arriving in Sub-Phase 1.4d must not break these tests.
    locale: 'en-US',
    timezoneId: 'Europe/Zurich',
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
      // Everything that does not create seasons runs first, in parallel
      name: 'chromium',
      testIgnore: SEASON_SPECS,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Specs that create and delete their own seasons or halls run afterwards, so they never
      // overlap with the parallel specs. Each uses uniquely named, inactive data and selects it
      // explicitly, which also keeps them safe against a developer's existing local data.
      name: 'chromium-seasons',
      testMatch: SEASON_SPECS,
      dependencies: ['chromium'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
