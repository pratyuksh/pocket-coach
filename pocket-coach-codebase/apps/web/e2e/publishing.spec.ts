import { test, expect, type Page, type Browser } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill('Password123!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/(trainers|dashboard|sessions|$)/);
}

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Selects a season by (partial) name in the schedule's season dropdown. */
async function selectSeason(page: Page, name: string) {
  const select = page.locator('select').filter({ has: page.locator('option', { hasText: name }) });
  const value = await select.locator('option', { hasText: name }).getAttribute('value');
  await select.selectOption(value as string);
}

async function openTrainerSchedule(browser: Browser, seasonName: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, 'trainer1@club.de');
  await page.goto('/sessions');
  await page.getByRole('button', { name: /all schedule/i }).click();
  await selectSeason(page, seasonName);
  return { page, context };
}

test.describe('Publishing: drafts are hidden from trainers until published', () => {
  test('Head-trainer creates a draft season, publishes it, then unpublishes it', async ({
    page,
    browser,
  }) => {
    const seasonName = `E2E Publish ${Date.now()}`;
    const dialog = page.getByRole('dialog');

    // 1. Head-trainer creates a one-week season without making it the active season
    await signIn(page, 'headtrainer@club.de');
    await page.goto('/sessions');
    await page
      .getByRole('button', { name: /create season/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /create new season/i })).toBeVisible();

    await page.getByPlaceholder('e.g. Season 2026/2027').fill(seasonName);
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill(isoDate(21));
    await dates.nth(1).fill(isoDate(27));
    await page.getByLabel(/set as active season/i).uncheck();

    await page.getByRole('button', { name: /next: configure schedule/i }).click();
    await page.getByRole('button', { name: /next: review & confirm/i }).click();
    await page.getByRole('button', { name: /confirm & generate/i }).click();
    await expect(page.getByRole('heading', { name: /create new season/i })).not.toBeVisible({
      timeout: 15000,
    });

    try {
      // 2. The generated sessions start as drafts and the head-trainer sees them
      await selectSeason(page, seasonName);
      await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /^publish\s+\d+\s+drafts?$/i })).toBeVisible();

      // 3. A trainer sees none of them
      const trainer = await openTrainerSchedule(browser, seasonName);
      await expect(trainer.page.getByText('No Sessions Found')).toBeVisible();

      // 4. The head-trainer publishes the whole range
      await page
        .getByRole('button', { name: /^publish/i })
        .first()
        .click();
      await expect(page.getByRole('heading', { name: /publish sessions/i })).toBeVisible();
      await dialog.getByLabel('From', { exact: true }).fill(isoDate(21));
      await dialog.getByLabel('To', { exact: true }).fill(isoDate(27));
      await dialog.getByRole('button', { name: /publish \d+ drafts?/i }).click();
      await expect(dialog.getByRole('status')).toContainText(/now visible to trainers/i);
      await dialog.getByRole('button', { name: /^close$/i }).click();

      // 5. The trainer now sees the published sessions, without a Draft marker
      await trainer.page.reload();
      await trainer.page.getByRole('button', { name: /all schedule/i }).click();
      await selectSeason(trainer.page, seasonName);
      await expect(trainer.page.getByText('No Sessions Found')).not.toBeVisible();
      await expect(trainer.page.getByText('Draft', { exact: true })).toHaveCount(0);

      // 6. Unpublishing returns the future sessions to draft
      await expect(page.getByText('Draft', { exact: true })).toHaveCount(0);
      await page
        .getByRole('button', { name: /^publish/i })
        .first()
        .click();
      await dialog.getByLabel('From', { exact: true }).fill(isoDate(21));
      await dialog.getByLabel('To', { exact: true }).fill(isoDate(27));
      await dialog.getByRole('button', { name: /^unpublish$/i }).click();
      await expect(dialog.getByRole('status')).toContainText(/back to draft/i);
      await dialog.getByRole('button', { name: /^close$/i }).click();

      await trainer.page.reload();
      await trainer.page.getByRole('button', { name: /all schedule/i }).click();
      await selectSeason(trainer.page, seasonName);
      await expect(trainer.page.getByText('No Sessions Found')).toBeVisible();
      await trainer.context.close();
    } finally {
      // Clean up the throwaway season so other tests and local data are unaffected
      await page.goto('/sessions');
      await selectSeason(page, seasonName).catch(() => {});
      const deleteBtn = page.getByRole('button', { name: /delete season/i }).first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page
          .getByRole('button', { name: /^delete season$/i })
          .last()
          .click();
        await expect(page.getByText(seasonName)).toHaveCount(0, { timeout: 10000 });
      }
    }
  });
});
