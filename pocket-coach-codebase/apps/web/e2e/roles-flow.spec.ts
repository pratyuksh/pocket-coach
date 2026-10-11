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

const card = (page: Page, email: string) =>
  page.locator(`[data-testid="trainer-card"][data-email="${email}"]`);

async function openRoles(page: Page, email: string) {
  await card(page, email)
    .getByRole('button', { name: /^roles$/i })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /manage roles/i })).toBeVisible();
  // wait until the person's current roles have loaded
  await expect(dialog.getByRole('checkbox', { name: /14\/18 coach/i })).toBeVisible();
  return dialog;
}

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
      await page.goto('/trainers');
      await expect(card(page, email)).toBeVisible();

      // 1. Grant Head Trainer: saved, shown on the card, and still there after a reload
      let dialog = await openRoles(page, email);
      await dialog.getByText('Head Trainer', { exact: true }).click();
      await dialog.getByRole('button', { name: /save changes/i }).click();
      await expect(dialog).not.toBeVisible();
      await expect(card(page, email).getByText('Head Trainer', { exact: true })).toBeVisible();

      await page.reload();
      await expect(card(page, email).getByText('Head Trainer', { exact: true })).toBeVisible();

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
      await dialog.getByRole('checkbox', { name: /14\/18 coach/i }).click();
      await dialog.getByRole('button', { name: /save changes/i }).click();
      await expect(dialog.getByRole('alert').or(dialog)).toContainText(/upcoming assignments/i);
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /cancel/i }).click();
      await expect(card(page, email).getByText('1418 Coach')).toHaveCount(0);

      // 3. Once the assignment is gone the same change succeeds and persists
      await setAssignments(request, headToken, sessionId, []);
      dialog = await openRoles(page, email);
      await dialog.getByRole('checkbox', { name: /14\/18 coach/i }).click();
      await dialog.getByRole('button', { name: /save changes/i }).click();
      await expect(dialog).not.toBeVisible();
      await expect(card(page, email).getByText('1418 Coach')).toBeVisible();

      await page.reload();
      await expect(card(page, email).getByText('1418 Coach')).toBeVisible();
      await expect(card(page, email).getByText('Head Trainer', { exact: true })).toBeVisible();

      // 4. A Super-admin cannot remove their own Super-admin role
      dialog = await openRoles(page, ACCOUNTS.admin);
      await dialog.getByText('Super Admin', { exact: true }).click();
      await dialog.getByRole('button', { name: /save changes/i }).click();
      await expect(dialog).toContainText(/cannot remove your own super-admin role/i);
      await dialog.getByRole('button', { name: /cancel/i }).click();
      // The role badge (not the person's display name, which is also "Super Admin") is still there
      await expect(
        card(page, ACCOUNTS.admin)
          .locator('span')
          .filter({ hasText: /^Super Admin$/ }),
      ).toBeVisible();
    } finally {
      await deleteTestSeason(request, headToken, season.id);
    }
  });
});
