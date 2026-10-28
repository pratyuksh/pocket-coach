import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  activeSeasonIds,
  apiSignIn,
  createTestSeason,
  createTrainer,
  dayMonth,
  deleteTestSeason,
  profileIdByEmail,
  publishTestSeason,
  restoreActiveSeasons,
  sessionIdByDate,
  setAssignments,
  signIn,
  uniqueName,
} from './helpers';

// These specs create a published throwaway season and so run after the parallel specs (see the
// project split in playwright.config.ts): the Dashboard counts every upcoming published session.

test.describe('Home and Dashboard (real data, throwaway season)', () => {
  test('a trainer sees their next sessions with the people working them, and the season counts', async ({
    page,
    browser,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const season = await createTestSeason(request, headToken, { startOffset: 1 });
    await publishTestSeason(request, headToken, season);

    try {
      const trainerId = await profileIdByEmail(request, headToken, ACCOUNTS.trainer);
      const juniorId = await profileIdByEmail(request, headToken, ACCOUNTS.junior);
      const date = season.sessionDates[0];
      const sessionId = await sessionIdByDate(request, headToken, season.id, date);
      await setAssignments(request, headToken, sessionId, [
        { profile_id: trainerId, track: 'regular', session_role: 'primary' },
        { profile_id: juniorId, track: 'junior_coach', session_role: 'primary' },
      ]);

      await signIn(page, ACCOUNTS.trainer);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

      // The session is listed (as the next one or in the list below it)
      const mySession = page
        .locator('[data-testid="next-session"], [data-testid="upcoming-session"]')
        .filter({ hasText: dayMonth(date) });
      await expect(mySession.first()).toBeVisible();

      // Season counts are shown (the values depend on the active season)
      await expect(page.getByTestId('stat-completed')).toHaveText(/^\d+$/);
      await expect(page.getByTestId('stat-trainer')).toHaveText(/^\d+$/);
      await expect(page.getByTestId('stat-assistant')).toHaveText(/^\d+$/);
      await expect(page.getByTestId('stat-upcoming')).toContainText(/\d+ sessions? still to come/);
      await expect(page.getByRole('link', { name: /view session log/i })).toHaveAttribute(
        'href',
        /\/trainers\/.+/,
      );

      // A 14/18 coach gets the 14/18 and substitute counts instead
      const juniorContext = await browser.newContext();
      const juniorPage = await juniorContext.newPage();
      await signIn(juniorPage, ACCOUNTS.junior);
      await juniorPage.goto('/dashboard');
      await expect(juniorPage.getByTestId('stat-junior')).toHaveText(/^\d+$/);
      await expect(juniorPage.getByText('As substitute')).toHaveCount(0);
      await expect(juniorPage.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
      await expect(juniorPage.getByTestId('stat-trainer')).toHaveCount(0);
      await expect(
        juniorPage
          .locator('[data-testid="next-session"], [data-testid="upcoming-session"]')
          .filter({ hasText: dayMonth(date) })
          .first(),
      ).toBeVisible();
      await juniorContext.close();
    } finally {
      await deleteTestSeason(request, headToken, season.id);
    }
  });

  test('the Dashboard lists the next gaps of the active season and shows the count', async ({
    page,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, headToken);
    // The Dashboard reads the active season only, so this season is made the active one
    const season = await createTestSeason(request, headToken, { startOffset: 1, active: true });
    await publishTestSeason(request, headToken, season);
    const extraId = await createTrainer(
      request,
      `e2e.home.${Date.now()}@club.de`,
      uniqueName('E2E Home'),
    );

    try {
      const date = season.sessionDates[0];
      const sessionId = await sessionIdByDate(request, headToken, season.id, date);

      await signIn(page, ACCOUNTS.head);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
      await expect(page.getByTestId('tile-week')).toHaveText(/^CW \d+$/);
      await expect(page.getByTestId('tile-coverage')).toHaveText(/^\d+%$/);

      // Nothing staffed: every session has two gaps, and only the next five are listed
      const openGaps = Number(await page.getByTestId('tile-gaps').innerText());
      expect(openGaps).toBe(season.sessionDates.length * 2);
      await expect(page.getByTestId('gap-row')).toHaveCount(Math.min(5, openGaps));
      await expect(page.getByRole('link', { name: 'See all gaps →' })).toHaveAttribute(
        'href',
        '/substitutions',
      );
      const rows = page.locator(`[data-testid="gap-row"][data-session-id="${sessionId}"]`);
      await expect(rows).toHaveCount(2);
      await expect(rows.filter({ hasText: /trainers? needed/ })).toHaveCount(1);
      await expect(rows.filter({ hasText: /14\/18 coach needed/ })).toHaveCount(1);
      await expect(rows.first()).toContainText(dayMonth(date));
      await expect(page.getByRole('link', { name: 'Assign' }).first()).toHaveAttribute(
        'href',
        '/sessions',
      );

      // Staff the session on both tracks: its gaps leave the list
      const adminId = await profileIdByEmail(request, headToken, ACCOUNTS.admin);
      const trainerId = await profileIdByEmail(request, headToken, ACCOUNTS.trainer);
      const juniorId = await profileIdByEmail(request, headToken, ACCOUNTS.junior);
      await setAssignments(request, headToken, sessionId, [
        { profile_id: trainerId, track: 'regular', session_role: 'primary' },
        { profile_id: adminId, track: 'regular', session_role: 'assistant_coach' },
        { profile_id: extraId, track: 'regular', session_role: 'assistant_coach' },
        { profile_id: juniorId, track: 'junior_coach', session_role: 'primary' },
      ]);
      await page.reload();
      await expect(page.getByTestId('tile-gaps')).toHaveText(String(openGaps - 2));
      await expect(
        page.locator(`[data-testid="gap-row"][data-session-id="${sessionId}"]`),
      ).toHaveCount(0);
    } finally {
      await deleteTestSeason(request, headToken, season.id);
      await restoreActiveSeasons(request, headToken, before);
    }
  });

  test('trainers see the open gaps they could cover, on their own track', async ({
    page,
    browser,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, headToken);
    const season = await createTestSeason(request, headToken, { startOffset: 1, active: true });
    await publishTestSeason(request, headToken, season);

    try {
      const date = season.sessionDates[0];
      const sessionId = await sessionIdByDate(request, headToken, season.id, date);
      const trainerId = await profileIdByEmail(request, headToken, ACCOUNTS.trainer);

      // Nobody is assigned: a trainer is offered regular gaps, starting with the first session
      await signIn(page, ACCOUNTS.trainer);
      await page.goto('/dashboard');
      const card = page.getByTestId('coverable-gaps');
      await expect(card).toBeVisible();
      await expect(card.getByText('Open gaps you can cover')).toBeVisible();
      const row = card.locator(`[data-session-id="${sessionId}"]`);
      await expect(row).toContainText(/trainers? needed/);
      await expect(row).toContainText(dayMonth(date));
      await expect(card.getByText(/14\/18 coach needed/)).toHaveCount(0);
      await expect(card.getByRole('button')).toHaveCount(0);

      // A 14/18 coach is offered the 14/18 gap of that session instead
      const juniorContext = await browser.newContext();
      const juniorPage = await juniorContext.newPage();
      await signIn(juniorPage, ACCOUNTS.junior);
      await juniorPage.goto('/dashboard');
      const juniorRow = juniorPage.locator(
        `[data-testid="coverable-gaps"] [data-session-id="${sessionId}"]`,
      );
      await expect(juniorRow).toContainText('14/18 coach needed');
      await juniorContext.close();

      // Once the trainer works that session it is no longer offered to them
      await setAssignments(request, headToken, sessionId, [
        { profile_id: trainerId, track: 'regular', session_role: 'primary' },
      ]);
      await page.reload();
      await expect(page.getByTestId('next-session')).toBeVisible();
      await expect(
        page.locator(`[data-testid="coverable-gap"][data-session-id="${sessionId}"]`),
      ).toHaveCount(0);
    } finally {
      await deleteTestSeason(request, headToken, season.id);
      await restoreActiveSeasons(request, headToken, before);
    }
  });

  test('gaps further than 14 days away are not counted in Open gaps, but are in coverage', async ({
    page,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, headToken);
    const season = await createTestSeason(request, headToken, { startOffset: 20, active: true });
    await publishTestSeason(request, headToken, season);

    try {
      await signIn(page, ACCOUNTS.head);
      await page.goto('/dashboard');
      await expect(page.getByTestId('tile-gaps')).toHaveText('0');
      await expect(page.getByText('Next 14 days')).toBeVisible();
      await expect(page.getByText('Every session is fully staffed.')).toBeVisible();
      // Nothing is staffed in that season, so coverage is 0 % of the upcoming slots
      await expect(page.getByTestId('tile-coverage')).toHaveText('0%');
    } finally {
      await deleteTestSeason(request, headToken, season.id);
      await restoreActiveSeasons(request, headToken, before);
    }
  });

  test('gaps of an inactive season are not shown', async ({ page, request }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const season = await createTestSeason(request, headToken, { startOffset: 1 });
    await publishTestSeason(request, headToken, season);

    try {
      const date = season.sessionDates[0];
      const sessionId = await sessionIdByDate(request, headToken, season.id, date);

      await signIn(page, ACCOUNTS.head);
      await page.goto('/dashboard');
      await expect(page.getByTestId('tile-coverage')).toBeVisible();
      await expect(page.locator(`[data-session-id="${sessionId}"]`)).toHaveCount(0);
    } finally {
      await deleteTestSeason(request, headToken, season.id);
    }
  });

  test('the Dashboard has the own next session and recently filled blocks', async ({ page }) => {
    await signIn(page, ACCOUNTS.head);
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'My next session' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recently filled' })).toBeVisible();
    // Substitutions start with Sub-Phase 1.5, so the list is normally empty for now
    await expect(
      page.getByTestId('filled-row').or(page.getByText('Nothing has been filled yet.')).first(),
    ).toBeVisible();
  });

  test('the workload lists the team and a row opens the profile', async ({ page }) => {
    await signIn(page, ACCOUNTS.head);
    await page.goto('/dashboard');

    const row = page.getByTestId('workload-row').filter({ hasText: 'Max Trainer' });
    await expect(row).toBeVisible();
    await row.getByRole('link').click();
    await expect(page).toHaveURL(/\/trainers\/.+/);
    await expect(page.getByRole('heading', { level: 1, name: 'Max Trainer' })).toBeVisible();
  });

  test('Super-admins get the Dashboard too, and a trainer does not', async ({ page, browser }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('tile-coverage')).toBeVisible();

    const context = await browser.newContext();
    const trainerPage = await context.newPage();
    await signIn(trainerPage, ACCOUNTS.trainer);
    await trainerPage.goto('/dashboard');
    await expect(trainerPage.getByTestId('tile-coverage')).toHaveCount(0);
    await expect(trainerPage.getByTestId('workload-row')).toHaveCount(0);
    await context.close();
  });
});

test.describe('Home on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const [label, account] of [
    ['trainer', ACCOUNTS.trainer],
    ['head-trainer', ACCOUNTS.head],
  ] as const) {
    test(`the ${label}'s home fits the screen without sideways scrolling`, async ({ page }) => {
      await signIn(page, account);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByText(/^Loading/)).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
