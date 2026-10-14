import { test, expect } from '@playwright/test';
import { submitSignIn } from './helpers';

test.describe('Invite Trainer E2E Flow', () => {
  test('Super Admin can open invite modal and send invitation', async ({ page }) => {
    // 1. Log in as Super Admin
    await page.goto('/login');
    await submitSignIn(page, 'admin@club.de', 'Password123!');

    // Wait for login redirection to complete
    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);

    // 2. Navigate to the team page
    await page.goto('/trainers');
    await expect(page.getByRole('heading', { level: 1, name: 'Team' })).toBeVisible();

    // 3. Click the invite button
    const inviteBtn = page.getByRole('button', { name: /invite trainer/i });
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    // 4. Verify the invite dialog appears
    const dialog = page.getByRole('dialog', { name: 'Invite a trainer' });
    await expect(dialog).toBeVisible();

    // 5. Fill out the form with a timestamped email to keep test runs idempotent
    const testEmail = `e2etest_${Date.now()}@club.de`;
    await dialog.getByLabel('Email').fill(testEmail);

    // 6. Submit invitation form
    await dialog.getByRole('button', { name: 'Send invite' }).click();

    // 7. Verify invitation success feedback and that the person is on the team
    await expect(page.getByRole('dialog', { name: 'Invitation sent' })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(
      page.locator(`[data-testid="team-member"][data-email="${testEmail}"]`),
    ).toBeVisible();
  });
});
