import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  activeSeasonIds,
  apiSignIn,
  createTestSeason,
  deleteTestSeason,
  profileIdByEmail,
  publishTestSeason,
  restoreActiveSeasons,
  sessionIdByDate,
  setAssignments,
  signIn,
} from './helpers';

// Creates an active, published throwaway season, so it runs after the parallel specs (see the
// project split in playwright.config.ts).

test.describe('Gaps page (real data, throwaway season)', () => {
  test('lists the gaps of the next 14 days, opens a session, and drops a gap once it is staffed', async ({
    page,
    browser,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const before = await activeSeasonIds(request, headToken);
    const season = await createTestSeason(request, headToken, { startOffset: 1, active: true });
    await publishTestSeason(request, headToken, season);

    try {
      const sessionId = await sessionIdByDate(
        request,
        headToken,
        season.id,
        season.sessionDates[0],
      );

      await signIn(page, ACCOUNTS.head);
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .first()
        .getByRole('link', { name: 'Gaps' })
        .click();
      await expect(page.getByRole('heading', { level: 1, name: 'Gaps' })).toBeVisible();
      await expect(page.getByText('Next 14 days', { exact: true })).toBeVisible();
      await expect(page.getByText(/short of trainers or 14\/18 coaches/i)).toBeVisible();
      // no sample gaps from the old placeholder
      await expect(page.getByText('Youth U16 Athletics')).toHaveCount(0);

      // An unstaffed session has a gap on both tracks
      const rows = page.locator(`[data-testid="gap-row"][data-session-id="${sessionId}"]`);
      await expect(rows).toHaveCount(2);
      await expect(rows.filter({ hasText: /trainers? needed/ })).toHaveCount(1);
      await expect(rows.filter({ hasText: /14\/18 coach needed/ })).toHaveCount(1);
      await expect(rows.first()).toHaveAttribute('data-session-date', season.sessionDates[0]);
      await expect(page.getByRole('heading', { name: 'Recently filled' })).toBeVisible();

      // A trainer sees the same gaps, and nothing to act on yet
      const context = await browser.newContext();
      const trainerPage = await context.newPage();
      await signIn(trainerPage, ACCOUNTS.trainer);
      await trainerPage.goto('/substitutions');
      await expect(
        trainerPage.locator(`[data-testid="gap-row"][data-session-id="${sessionId}"]`),
      ).toHaveCount(2);
      await expect(trainerPage.getByRole('button', { name: /volunteer|assign/i })).toHaveCount(0);
      await context.close();

      // A row opens its session
      await rows.first().click();
      await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}$`));

      // Staff the session on both tracks: its gaps leave the page
      const trainerId = await profileIdByEmail(request, headToken, ACCOUNTS.trainer);
      const headId = await profileIdByEmail(request, headToken, ACCOUNTS.head);
      const adminId = await profileIdByEmail(request, headToken, ACCOUNTS.admin);
      const juniorId = await profileIdByEmail(request, headToken, ACCOUNTS.junior);
      await setAssignments(request, headToken, sessionId, [
        { profile_id: trainerId, track: 'regular', session_role: 'primary' },
        { profile_id: headId, track: 'regular', session_role: 'assistant_coach' },
        { profile_id: adminId, track: 'regular', session_role: 'assistant_coach' },
        { profile_id: juniorId, track: 'junior_coach', session_role: 'primary' },
      ]);
      await page.goto('/substitutions');
      await expect(page.getByRole('heading', { name: 'Coverage gaps' })).toBeVisible();
      await expect(
        page.locator(`[data-testid="gap-row"][data-session-id="${sessionId}"]`),
      ).toHaveCount(0);
    } finally {
      await deleteTestSeason(request, headToken, season.id);
      await restoreActiveSeasons(request, headToken, before);
    }
  });
});
