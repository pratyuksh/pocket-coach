import { test, expect } from '@playwright/test';

test.describe('Invite Trainer E2E Flow', () => {
  test('Super Admin can open invite modal and send invitation', async ({ page }) => {
    // 1. Log in as Super Admin
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin@club.de');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Wait for login redirection to complete
    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);

    // 2. Navigate to trainers roster page
    await page.goto('/trainers');
    await expect(page.getByRole('heading', { name: /club trainer roster/i })).toBeVisible();

    // 3. Click Invite Trainer button
    const inviteBtn = page.getByRole('button', { name: /invite trainer/i });
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    // 4. Verify Invite Modal appears
    await expect(page.getByRole('heading', { name: /invite new trainer/i })).toBeVisible();

    // 5. Fill out the form with a timestamped email to keep test runs idempotent
    const testEmail = `e2etest_${Date.now()}@club.de`;
    await page.getByLabel(/email address/i).fill(testEmail);
    await page.getByLabel(/display name/i).fill('E2E Test Trainer');
    await page.getByLabel(/specialty/i).fill('E2E Testing & QA');

    // 6. Submit invitation form
    await page.getByRole('button', { name: /send invitation/i }).click();

    // 7. Verify invitation success feedback
    await expect(page.getByRole('heading', { name: /invitation sent/i })).toBeVisible({ timeout: 10000 });
  });
});
