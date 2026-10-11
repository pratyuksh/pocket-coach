import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  apiSignIn,
  activeAssigneeIds,
  createTestSeason,
  createTrainer,
  deleteTestSeason,
  profileIdByEmail,
  publishTestSeason,
  selectByText,
  selectSeason,
  sessionIdsByWeekday,
  signIn,
  uniqueName,
} from './helpers';

test.describe('Assignment flow (real data, throwaway season)', () => {
  test('Head-trainer assigns trainers, a trainer sees the session, limits and bulk assign hold', async ({
    page,
    browser,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const season = await createTestSeason(request, headToken);
    await publishTestSeason(request, headToken, season);
    const extraEmail = `e2e.extra.${Date.now()}@club.de`;
    await createTrainer(request, extraEmail, uniqueName('E2E Extra'));

    try {
      const trainerId = await profileIdByEmail(request, headToken, ACCOUNTS.trainer);
      const juniorId = await profileIdByEmail(request, headToken, ACCOUNTS.junior);
      const headId = await profileIdByEmail(request, headToken, ACCOUNTS.head);

      // 1. Head-trainer assigns a regular trainer and a 14/18 coach to the first session
      await signIn(page, ACCOUNTS.head);
      await page.goto('/sessions');
      await selectSeason(page, season.name);

      // Take the date from the season we created and wait for exactly that card: reading "the
      // first card" can return a card of the previously shown season while the list reloads.
      const date = season.sessionDates[0];
      const card = page
        .locator(`[data-testid="session-card"][data-session-date="${date}"]`)
        .first();
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: /^assign$/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(
        dialog.getByRole('heading', { name: /assign trainers to session/i }),
      ).toBeVisible();
      await selectByText(dialog.getByLabel('Coach 1', { exact: true }), 'Max Trainer');

      await dialog.getByRole('button', { name: /add coach/i }).click();
      await dialog.getByLabel('Role of coach 2').selectOption('junior_coach');
      await selectByText(dialog.getByLabel('Coach 2', { exact: true }), 'Lukas Junior');

      await dialog.getByRole('button', { name: /save assignments/i }).click();
      await expect(dialog).not.toBeVisible();
      await expect(card).toContainText('Max Trainer');
      await expect(card).toContainText('Lukas Junior');

      // 2. The trainer now sees that session in My Sessions, with their stats
      const trainerContext = await browser.newContext();
      const trainerPage = await trainerContext.newPage();
      await signIn(trainerPage, ACCOUNTS.trainer);
      await trainerPage.goto('/sessions');
      await expect(
        trainerPage.getByRole('heading', { name: /your assigned sessions \(\d+\)/i }),
      ).toBeVisible();
      await expect(trainerPage.getByText(date).first()).toBeVisible();
      // Personal stats are not shown on any screen yet (known issue); 1.4d adds them to the home
      // and profile screens, and this test should then assert them.
      await trainerContext.close();

      // 3. A fourth regular trainer is refused with a readable message and nothing is saved
      await card.getByRole('button', { name: /^assign$/i }).click();
      await expect(
        dialog.getByRole('heading', { name: /assign trainers to session/i }),
      ).toBeVisible();
      for (const [row, who] of [
        [3, 'Head Trainer'],
        [4, 'Super Admin'],
        [5, 'E2E Extra'],
      ] as const) {
        await dialog.getByRole('button', { name: /add coach/i }).click();
        await selectByText(dialog.getByLabel(`Coach ${row}`, { exact: true }), who);
      }
      await dialog.getByRole('button', { name: /save assignments/i }).click();
      await expect(dialog).toContainText(/maximum number of trainers/i);
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /cancel/i }).click();

      const firstSessionId = (
        await sessionIdsByWeekday(
          request,
          headToken,
          season.id,
          new Date(`${date}T12:00:00`).getDay(),
        )
      )[0];
      expect((await activeAssigneeIds(request, headToken, firstSessionId)).sort()).toEqual(
        [trainerId, juniorId].sort(),
      );

      // 4. Bulk assign adds the Head-trainer to one weekday and keeps the existing assignees
      const firstWeekday = new Date(`${date}T12:00:00`).getDay();
      const bulkWeekday = firstWeekday === 2 ? 5 : 2; // a weekday other than the first session's
      await page.getByRole('button', { name: /bulk assign/i }).click();
      await selectByText(dialog.getByLabel('Target trainer'), 'Head Trainer');
      await selectByText(dialog.getByLabel('Weekday'), bulkWeekday === 2 ? 'Tuesdays' : 'Fridays');
      await expect(dialog).toContainText('1 Sessions');
      await dialog.getByRole('button', { name: /execute bulk assign/i }).click();
      await expect(dialog).not.toBeVisible();

      const [bulkSessionId] = await sessionIdsByWeekday(request, headToken, season.id, bulkWeekday);
      expect(await activeAssigneeIds(request, headToken, bulkSessionId)).toEqual([headId]);
      // The first session keeps exactly the two trainers assigned in step 1
      expect((await activeAssigneeIds(request, headToken, firstSessionId)).sort()).toEqual(
        [trainerId, juniorId].sort(),
      );
    } finally {
      await deleteTestSeason(request, headToken, season.id);
    }
  });
});
