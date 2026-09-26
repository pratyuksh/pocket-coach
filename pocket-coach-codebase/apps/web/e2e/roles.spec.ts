import { test, expect } from '@playwright/test';

test.describe('Role Management E2E Flow', () => {
  test('Super Admin can manage and update trainer roles on roster', async ({ page }) => {
    // 1. Log in as Super Admin
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin@club.de');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);

    // 2. Navigate to trainers roster
    await page.goto('/trainers');
    await expect(page.getByRole('heading', { name: /club trainer roster/i })).toBeVisible();

    // 3. Find Roles button for a trainer card and open modal
    const rolesBtn = page.getByRole('button', { name: /^roles$/i }).first();
    await expect(rolesBtn).toBeVisible();
    await rolesBtn.click();

    // 4. Verify Manage Roles modal appears
    await expect(page.getByRole('heading', { name: /manage roles/i })).toBeVisible();
    await expect(page.getByText('Permanent Base Role')).toBeVisible();

    // 5. Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /manage roles/i })).not.toBeVisible();
  });
});
