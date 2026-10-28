import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  activeAssigneeIds,
  activeSeasonIds,
  apiSignIn,
  createTestSeason,
  createTrainer,
  deleteTestSeason,
  profileIdByEmail,
  sessionIdByDate,
  publishTestSeason,
  restoreActiveSeasons,
  selectByText,
  setAssignments,
  setSessionRequirements,
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
    // The Sessions screen shows the active season only, so this season is made the active one
    const before = await activeSeasonIds(request, headToken);
    // Far in the future: people are only offered for an open slot when they have no other session
    // at that time, and a developer's own season (with trainers assigned all year) must not
    // get in the way
    const season = await createTestSeason(request, headToken, { active: true, startOffset: 400 });
    await publishTestSeason(request, headToken, season);
    const extraEmail = `e2e.extra.${Date.now()}@club.de`;
    const extraId = await createTrainer(request, extraEmail, uniqueName('E2E Extra'));

    try {
      const trainerId = await profileIdByEmail(request, headToken, ACCOUNTS.trainer);
      const juniorId = await profileIdByEmail(request, headToken, ACCOUNTS.junior);
      const headId = await profileIdByEmail(request, headToken, ACCOUNTS.head);
      const adminId = await profileIdByEmail(request, headToken, ACCOUNTS.admin);

      // 1. Head-trainer clicks the open slots of the first session to assign a regular trainer
      // and a 14/18 coach
      const date = season.sessionDates[0];
      const firstSessionId = await sessionIdByDate(request, headToken, season.id, date);
      await signIn(page, ACCOUNTS.head);
      await page.goto(`/sessions/${firstSessionId}`);

      const regular = page.getByTestId('track-regular');
      const junior = page.getByTestId('track-junior');
      const dialog = page.getByRole('dialog');
      // there is no separate Assign button
      await expect(page.getByRole('button', { name: /^assign trainers/i })).toHaveCount(0);

      await regular
        .getByRole('button', { name: /open slot/i })
        .first()
        .click();
      await expect(dialog.getByRole('heading', { name: /assign a trainer/i })).toBeVisible();
      // the list holds trainers, not 14/18 coaches
      await expect(dialog.getByRole('button', { name: /Lukas Junior/ })).toHaveCount(0);
      await dialog.getByRole('button', { name: /Max Trainer/ }).click();
      await expect(dialog).not.toBeVisible();
      await expect(regular).toContainText('Max Trainer');

      await junior
        .getByRole('button', { name: /open slot/i })
        .first()
        .click();
      await expect(dialog.getByRole('heading', { name: /assign a 14\/18 coach/i })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /Max Trainer/ })).toHaveCount(0);
      await dialog.getByRole('button', { name: /Lukas Junior/ }).click();
      await expect(dialog).not.toBeVisible();
      await expect(junior).toContainText('Lukas Junior');

      // 2. The trainer sees the session with a "You" tag, and the home shows the personal counts
      const trainerContext = await browser.newContext();
      const trainerPage = await trainerContext.newPage();
      await signIn(trainerPage, ACCOUNTS.trainer);
      await trainerPage.goto(`/sessions/${firstSessionId}`);
      await expect(trainerPage.getByTestId('track-regular')).toContainText('You');
      // no assigning or removing for a trainer, and open slots are not clickable
      await expect(trainerPage.getByRole('button', { name: /open slot|remove/i })).toHaveCount(0);
      // The values depend on the active season; the session itself is not asserted on the home
      // (it lists only the next few)
      await trainerPage.goto('/dashboard');
      await expect(trainerPage.getByTestId('stat-completed')).toHaveText(/^\d+$/);
      await expect(trainerPage.getByTestId('stat-trainer')).toHaveText(/^\d+$/);
      await expect(trainerPage.getByTestId('stat-assistant')).toHaveText(/^\d+$/);
      await trainerContext.close();

      // 3. Filling the track leaves no open slot, so nobody can be added beyond what the session
      // requires; a person can be removed again
      await regular
        .getByRole('button', { name: /open slot/i })
        .first()
        .click();
      await dialog.getByRole('button', { name: /Head Trainer/ }).click();
      await expect(regular).toContainText('Head Trainer');
      await regular
        .getByRole('button', { name: /open slot/i })
        .first()
        .click();
      await dialog.getByRole('button', { name: /Super Admin/ }).click();
      await expect(regular).toContainText('Super Admin');
      await expect(regular.getByTestId('slot-open')).toHaveCount(0);
      expect((await activeAssigneeIds(request, headToken, firstSessionId)).sort()).toEqual(
        [trainerId, headId, adminId, juniorId].sort(),
      );

      await page.getByRole('button', { name: 'Remove Super Admin' }).click();
      await expect(regular.getByTestId('slot-open')).toHaveCount(1);
      await expect(regular).not.toContainText('Super Admin');
      expect((await activeAssigneeIds(request, headToken, firstSessionId)).sort()).toEqual(
        [trainerId, headId, juniorId].sort(),
      );

      // 4. Bulk assign adds the Head-trainer to one weekday and keeps the existing assignees
      const firstWeekday = new Date(`${date}T12:00:00`).getDay();
      const bulkWeekday = firstWeekday === 2 ? 5 : 2; // a weekday other than the first session's
      await page.goto('/sessions');
      await page.getByRole('button', { name: /bulk assign/i }).click();
      await selectByText(dialog.getByLabel('Target trainer'), 'Head Trainer');
      await selectByText(dialog.getByLabel('Weekday'), bulkWeekday === 2 ? 'Tuesdays' : 'Fridays');
      await expect(dialog).toContainText('1 Sessions');
      await dialog.getByRole('button', { name: /execute bulk assign/i }).click();
      await expect(dialog).not.toBeVisible();

      const [bulkSessionId] = await sessionIdsByWeekday(request, headToken, season.id, bulkWeekday);
      expect(await activeAssigneeIds(request, headToken, bulkSessionId)).toEqual([headId]);
      // The first session keeps the people assigned before
      expect((await activeAssigneeIds(request, headToken, firstSessionId)).sort()).toEqual(
        [trainerId, headId, juniorId].sort(),
      );

      // 5. Bulk assign never goes beyond what a session requires: this session needs two
      // trainers and already has two, so nobody is added (the global maximum is three)
      const wednesdayIds = await sessionIdsByWeekday(request, headToken, season.id, 3);
      for (const id of wednesdayIds) {
        await setSessionRequirements(request, headToken, id, { required_regular: 2 });
        await setAssignments(request, headToken, id, [
          { profile_id: trainerId, track: 'regular', session_role: 'primary' },
          { profile_id: extraId, track: 'regular', session_role: 'assistant_coach' },
        ]);
      }
      await page.goto('/sessions');
      await page.getByRole('button', { name: /bulk assign/i }).click();
      await selectByText(dialog.getByLabel('Target trainer'), 'Head Trainer');
      await selectByText(dialog.getByLabel('Weekday'), 'Wednesdays');
      await expect(dialog).toContainText('0 Sessions');
      await dialog.getByRole('button', { name: /execute bulk assign/i }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.getByRole('alert')).toContainText(/nobody was added/i);
      for (const id of wednesdayIds) {
        expect((await activeAssigneeIds(request, headToken, id)).sort()).toEqual(
          [trainerId, extraId].sort(),
        );
      }
    } finally {
      await deleteTestSeason(request, headToken, season.id);
      await restoreActiveSeasons(request, headToken, before);
    }
  });
});
