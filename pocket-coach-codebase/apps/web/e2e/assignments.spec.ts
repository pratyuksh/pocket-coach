import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  activeSeasonIds,
  apiSignIn,
  createTestSeason,
  deleteTestSeason,
  publishTestSeason,
  restoreActiveSeasons,
  sessionIdByDate,
  sessionRequirements,
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
    // The Sessions screen shows the active season only, so this season is made the active one
    const before = await activeSeasonIds(request, token);
    const season = await createTestSeason(request, token, { active: true });

    try {
      await signIn(page, ACCOUNTS.admin);
      await page.goto('/sessions');
      await expect(page.getByRole('heading', { level: 1, name: 'Sessions' })).toBeVisible();

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

      // A session opens its detail page; its open slot opens the list of available people
      await page.getByTestId('session-row').first().click();
      await expect(page).toHaveURL(/\/sessions\/.+/);
      await page
        .getByTestId('track-regular')
        .getByRole('button', { name: /open slot/i })
        .first()
        .click();
      await expect(page.getByRole('heading', { name: /assign a trainer/i })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
      await expect(page.getByRole('heading', { name: /assign a trainer/i })).not.toBeVisible();
    } finally {
      await deleteTestSeason(request, token, season.id);
      await restoreActiveSeasons(request, token, before);
    }
  });

  test('Earlier weeks of the season are reachable in the calendar although the chips start at this week', async ({
    page,
    request,
  }) => {
    const token = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, token);
    // A season that started ten days ago: its sessions are all in the past
    const season = await createTestSeason(request, token, { active: true, startOffset: -10 });
    await publishTestSeason(request, token, season);

    try {
      await signIn(page, ACCOUNTS.head);
      await page.goto('/sessions');

      // The chips start at the current week, which has no sessions of this season
      await expect(page.getByText('No sessions this week.')).toBeVisible();
      const calendar = page.getByTestId('session-calendar');
      const pastWeek = calendar.getByRole('button', { name: /^show week \d+$/i });
      if ((await pastWeek.count()) === 0) {
        await calendar.getByRole('button', { name: 'Previous month' }).click();
      }
      await expect(pastWeek.first()).toBeVisible();
      await pastWeek.first().click();

      await expect(page.getByTestId('session-row').first()).toBeVisible();
      await expect(
        page.locator(`[data-testid="session-row"][data-session-date="${season.sessionDates[0]}"]`),
      ).toBeVisible();
    } finally {
      await deleteTestSeason(request, token, season.id);
      await restoreActiveSeasons(request, token, before);
    }
  });

  test('A Head-trainer takes open slots away from one session and adds them back', async ({
    page,
    browser,
    request,
  }) => {
    const token = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, token);
    const season = await createTestSeason(request, token, { active: true });
    await publishTestSeason(request, token, season);

    try {
      const sessionId = await sessionIdByDate(request, token, season.id, season.sessionDates[0]);
      const other = await sessionRequirements(request, token, sessionId);
      await signIn(page, ACCOUNTS.head);
      await page.goto(`/sessions/${sessionId}`);

      const regular = page.getByTestId('track-regular');
      const junior = page.getByTestId('track-junior');
      const regularSection = regular.locator('xpath=ancestor::section');
      await expect(regularSection).toContainText(`0/${other.required_regular}`);
      await expect(regular.getByTestId('slot-open')).toHaveCount(other.required_regular);

      // Remove one trainer slot: this session needs one trainer fewer
      await regular
        .getByRole('button', { name: /remove this slot/i })
        .first()
        .click();
      await expect(page.getByRole('alert')).toContainText(/open slot was removed/i);
      await expect(regular.getByTestId('slot-open')).toHaveCount(other.required_regular - 1);
      await expect(regularSection).toContainText(`0/${other.required_regular - 1}`);
      expect((await sessionRequirements(request, token, sessionId)).required_regular).toBe(
        other.required_regular - 1,
      );

      // Remove the 14/18 slot: the track stays so a slot can be added back
      await junior
        .getByRole('button', { name: /remove this slot/i })
        .first()
        .click();
      await expect(junior.getByTestId('slot-open')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /14\/18 coaches/i })).toBeVisible();
      expect((await sessionRequirements(request, token, sessionId)).required_junior).toBe(0);
      // the session is no longer short of a coach, so the tag only mentions trainers
      await expect(page.getByText(/14\/18 coach needed/)).toHaveCount(0);

      // Saved, not just shown
      await page.reload();
      await expect(page.getByTestId('track-junior').getByTestId('slot-open')).toHaveCount(0);

      // Add them back
      await page.getByRole('button', { name: /add a slot to 14\/18 coaches/i }).click();
      await expect(junior.getByTestId('slot-open')).toHaveCount(1);
      await page.getByRole('button', { name: /add a slot to trainers/i }).click();
      await expect(regular.getByTestId('slot-open')).toHaveCount(other.required_regular);
      expect(await sessionRequirements(request, token, sessionId)).toEqual(other);

      // A trainer cannot change the slots
      const context = await browser.newContext();
      const trainerPage = await context.newPage();
      await signIn(trainerPage, ACCOUNTS.trainer);
      await trainerPage.goto(`/sessions/${sessionId}`);
      await expect(trainerPage.getByTestId('track-regular')).toBeVisible();
      await expect(
        trainerPage.getByRole('button', { name: /remove this slot|add a slot/i }),
      ).toHaveCount(0);
      await context.close();
    } finally {
      await deleteTestSeason(request, token, season.id);
      await restoreActiveSeasons(request, token, before);
    }
  });

  test('The week chips start at the current calendar week, show five weeks and page with arrows', async ({
    page,
    request,
  }) => {
    const token = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, token);
    const season = await createTestSeason(request, token, { active: true });
    await publishTestSeason(request, token, season);

    try {
      await signIn(page, ACCOUNTS.head);
      await page.goto('/sessions');

      const weeks = page.getByRole('group', { name: 'Weeks' });
      const chips = weeks.getByRole('button', { name: /^CW/ });
      await expect(chips).toHaveCount(5);
      const first = await chips.first().getAttribute('data-week');
      const second = await chips.nth(1).getAttribute('data-week');
      expect(Date.parse(`${second}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)).toBe(
        7 * 86_400_000,
      );

      // Nothing before this week: the first chip is the current calendar week
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const iso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      expect(first).toBe(iso);
      await expect(weeks.getByRole('button', { name: 'Previous weeks' })).toBeDisabled();

      // The season has one week of sessions; there is nothing further to page to
      await expect(weeks.getByRole('button', { name: 'Next weeks' })).toBeDisabled();
    } finally {
      await deleteTestSeason(request, token, season.id);
      await restoreActiveSeasons(request, token, before);
    }
  });

  test('A trainer sees the sessions without management actions and can filter to their own', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.trainer);
    await page.goto('/sessions');

    await expect(page.getByRole('heading', { level: 1, name: 'Sessions' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Only mine' })).not.toBeChecked();
    await expect(page.getByRole('button', { name: /bulk assign/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^publish/i })).toHaveCount(0);

    await page.getByRole('checkbox', { name: 'Only mine' }).click();
    await expect(page.getByRole('checkbox', { name: 'Only mine' })).toBeChecked();
  });
});
