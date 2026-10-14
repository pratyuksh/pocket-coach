import { test, expect, type Page } from '@playwright/test';
import {
  ACCOUNTS,
  apiSignIn,
  createTestSeason,
  createTrainer,
  deleteTestSeason,
  sessionIdByDate,
  setAssignments,
  signIn,
  uniqueName,
} from './helpers';

const row = (page: Page, email: string) =>
  page.locator(`[data-testid="team-member"][data-email="${email}"]`);

/** Opens a person's profile from the team list and their role dialog from there. */
async function openRoles(page: Page, email: string) {
  await page.goto('/trainers');
  await row(page, email).getByRole('link').click();
  await page.getByRole('button', { name: 'Edit roles' }).click();
  const dialog = page.getByRole('dialog', { name: /^Roles · / });
  await expect(dialog).toBeVisible();
  // wait until the person's current roles have loaded
  await expect(dialog.getByRole('checkbox', { name: '14/18 coach' })).toBeVisible();
  return dialog;
}

/** The role tags in the header of a profile (the heading of the page is the person's name). */
const profileTag = (page: Page, text: string) =>
  page.getByTestId('profile-tags').getByText(text, { exact: true });

test.describe('Role management flow (saves, persists, and is guarded)', () => {
  test('Super-admin saves roles and the label; guarded changes are refused with a readable message', async ({
    page,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const email = `e2e.roles.${Date.now()}@club.de`;
    const name = uniqueName('E2E Roles');
    const userId = await createTrainer(request, email, name);
    const season = await createTestSeason(request, headToken);

    try {
      await signIn(page, ACCOUNTS.admin);
      // 1. Grant Head Trainer: saved, shown on the profile, and still there after a reload
      let dialog = await openRoles(page, email);
      await dialog.getByRole('checkbox', { name: 'Head trainer' }).click();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(profileTag(page, 'Head trainer')).toBeVisible();

      await page.reload();
      await expect(profileTag(page, 'Head trainer')).toBeVisible();

      // 2. The 14/18 label cannot change while the person has an upcoming regular assignment
      const sessionId = await sessionIdByDate(
        request,
        headToken,
        season.id,
        season.sessionDates[0],
      );
      await setAssignments(request, headToken, sessionId, [
        { profile_id: userId, track: 'regular', session_role: 'primary' },
      ]);

      dialog = await openRoles(page, email);
      await dialog.getByRole('checkbox', { name: '14/18 coach' }).click();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText(/upcoming assignments/i);
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(profileTag(page, '14/18 coach')).toHaveCount(0);

      // 3. Once the assignment is gone the same change succeeds and persists
      await setAssignments(request, headToken, sessionId, []);
      dialog = await openRoles(page, email);
      await dialog.getByRole('checkbox', { name: '14/18 coach' }).click();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(profileTag(page, '14/18 coach')).toBeVisible();

      await page.reload();
      await expect(profileTag(page, '14/18 coach')).toBeVisible();
      await expect(profileTag(page, 'Head trainer')).toBeVisible();

      // 4. A Super-admin cannot remove their own Super-admin role
      dialog = await openRoles(page, ACCOUNTS.admin);
      await dialog.getByRole('checkbox', { name: 'Super-admin' }).click();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText(
        /cannot remove your own super-admin role/i,
      );
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(profileTag(page, 'Super-admin')).toBeVisible();
    } finally {
      await deleteTestSeason(request, headToken, season.id);
    }
  });
});
