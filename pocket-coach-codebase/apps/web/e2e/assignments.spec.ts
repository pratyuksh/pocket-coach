import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  apiSignIn,
  createTestSeason,
  deleteTestSeason,
  selectSeason,
  signIn,
} from './helpers';

test.describe('Session Assignment & Personal Schedule E2E Flow', () => {
  test('Super Admin can access assignment modals and view personal schedule', async ({
    page,
    request,
  }) => {
    // Precondition: a season with sessions. Without it the assign controls do not exist, so the
    // test must create one instead of silently skipping those steps.
    const token = await apiSignIn(request, ACCOUNTS.admin);
    const season = await createTestSeason(request, token);

    try {
      await signIn(page, ACCOUNTS.admin);
      await page.goto('/sessions');
      await expect(
        page.getByRole('heading', { name: /training sessions schedule/i }),
      ).toBeVisible();
      await selectSeason(page, season.name);

      // Tab switcher (All Schedule | My Sessions)
      const allScheduleTab = page.getByRole('button', { name: /all schedule/i });
      const mySessionsTab = page.getByRole('button', { name: /my sessions/i });
      await expect(allScheduleTab).toBeVisible();
      await expect(mySessionsTab).toBeVisible();

      // Bulk Assign opens with a batch preview that counts the season's upcoming sessions
      await page.getByRole('button', { name: /bulk assign/i }).click();
      await expect(
        page.getByRole('heading', { name: /bulk assign trainer to season/i }),
      ).toBeVisible();
      await expect(page.getByText(/batch assignment preview/i)).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText(
        `${season.sessionDates.length} Sessions`,
      );
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(
        page.getByRole('heading', { name: /bulk assign trainer to season/i }),
      ).not.toBeVisible();

      // A session card offers Assign, which opens the assignee dialog
      const assignBtn = page.getByRole('button', { name: /^assign$/i }).first();
      await expect(assignBtn).toBeVisible();
      await assignBtn.click();
      await expect(
        page.getByRole('heading', { name: /assign trainers to session/i }),
      ).toBeVisible();
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(
        page.getByRole('heading', { name: /assign trainers to session/i }),
      ).not.toBeVisible();

      // Personal schedule tab (either the list or the "No Sessions Assigned" empty state)
      await mySessionsTab.click();
      await expect(
        page.getByRole('heading', { name: /(your assigned sessions|no sessions assigned)/i }),
      ).toBeVisible();
    } finally {
      await deleteTestSeason(request, token, season.id);
    }
  });

  test('Trainer lands on My Sessions and can switch to the full schedule', async ({ page }) => {
    await signIn(page, ACCOUNTS.trainer);

    // The sessions page defaults to the trainer's own sessions
    await page.goto('/sessions');
    const mySessionsHeading = page.getByRole('heading', {
      name: /(your assigned sessions|no sessions assigned)/i,
    });
    await expect(mySessionsHeading).toBeVisible();
    await expect(page.getByRole('button', { name: /bulk assign/i })).not.toBeVisible();

    // The full schedule (including other trainers' assignments) is one tap away
    await page.getByRole('button', { name: /all schedule/i }).click();
    await expect(mySessionsHeading).not.toBeVisible();
  });
});
