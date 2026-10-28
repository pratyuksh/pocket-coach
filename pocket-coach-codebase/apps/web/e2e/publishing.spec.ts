import { test, expect, type Browser } from '@playwright/test';
import {
  ACCOUNTS,
  activeSeasonIds,
  apiSignIn,
  deleteSeasonByName,
  isoDate,
  restoreActiveSeasons,
  signIn,
  uniqueName,
} from './helpers';

async function openTrainerSchedule(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, ACCOUNTS.trainer);
  await page.goto('/sessions');
  return { page, context };
}

test.describe('Publishing: drafts are hidden from trainers until published', () => {
  test('Head-trainer creates a draft season through the wizard, publishes it, then unpublishes it', async ({
    page,
    browser,
    request,
  }) => {
    const seasonName = uniqueName('E2E Publish');
    const dialog = page.getByRole('dialog');
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, headToken);

    try {
      // 1. Head-trainer creates a one-week season without making it the active season
      await signIn(page, ACCOUNTS.head);
      await page.goto('/settings');
      await page.getByRole('button', { name: /new season/i }).click();
      await expect(page.getByRole('heading', { name: /create new season/i })).toBeVisible();

      await page.getByPlaceholder('e.g. Season 2026/2027').fill(seasonName);
      const dates = page.locator('input[type="date"]');
      await dates.nth(0).fill(isoDate(21));
      await dates.nth(1).fill(isoDate(27));
      // The Sessions screen shows the active season only, so the new season becomes the active one
      await expect(page.getByLabel(/set as active season/i)).toBeChecked();

      await page.getByRole('button', { name: /next: configure schedule/i }).click();
      await page.getByRole('button', { name: /next: review & confirm/i }).click();
      await page.getByRole('button', { name: /confirm & generate/i }).click();
      await expect(page.getByRole('heading', { name: /create new season/i })).not.toBeVisible({
        timeout: 15000,
      });

      // 2. The generated sessions start as drafts and the head-trainer sees them
      await page.goto('/sessions');
      await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /^publish\s+\d+\s+drafts?$/i })).toBeVisible();

      // 3. A trainer sees none of them
      const trainer = await openTrainerSchedule(browser);
      await expect(trainer.page.getByText('This season has no sessions yet.')).toBeVisible();

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
      await dialog.getByRole('button', { name: /^done$/i }).click();

      // 5. The trainer now sees the published sessions, without a Draft marker
      await trainer.page.reload();
      await expect(trainer.page.getByText('This season has no sessions yet.')).not.toBeVisible();
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
      await dialog.getByRole('button', { name: /^done$/i }).click();

      await trainer.page.reload();
      await expect(trainer.page.getByText('This season has no sessions yet.')).toBeVisible();
      await trainer.context.close();
    } finally {
      // Clean up the throwaway season so other tests and local data are unaffected
      await deleteSeasonByName(request, headToken, seasonName);
      await restoreActiveSeasons(request, headToken, before);
    }
  });
});
