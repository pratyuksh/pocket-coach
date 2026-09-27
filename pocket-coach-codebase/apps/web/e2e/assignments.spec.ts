import { test, expect } from '@playwright/test';

test.describe('Session Assignment & Personal Schedule E2E Flow', () => {
  test('Super Admin can access assignment modals and view personal schedule', async ({ page }) => {
    // 1. Log in as Super Admin
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin@club.de');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page).toHaveURL(/\/(trainers|dashboard|sessions|$)/);

    // 2. Navigate to training sessions schedule
    await page.goto('/sessions');
    await expect(page.getByRole('heading', { name: /training sessions schedule/i })).toBeVisible();

    // 3. Verify Tab Switcher (All Schedule | My Sessions)
    const allScheduleTab = page.getByRole('button', { name: /all schedule/i });
    const mySessionsTab = page.getByRole('button', { name: /my sessions/i });
    await expect(allScheduleTab).toBeVisible();
    await expect(mySessionsTab).toBeVisible();

    // 4. Verify Bulk Assign button for Head-Trainer/Admin
    const bulkAssignBtn = page.getByRole('button', { name: /bulk assign/i });
    await expect(bulkAssignBtn).toBeVisible();
    await bulkAssignBtn.click();

    // 5. Verify Bulk Assign Modal renders with Batch Assignment Preview
    await expect(
      page.getByRole('heading', { name: /bulk assign trainer to season/i }),
    ).toBeVisible();
    await expect(page.getByText(/batch assignment preview/i)).toBeVisible();

    // Close Bulk Assign modal
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(
      page.getByRole('heading', { name: /bulk assign trainer to season/i }),
    ).not.toBeVisible();

    // 6. Verify single session Assign button opens SessionAssigneeModal
    const assignBtn = page.getByRole('button', { name: /^assign$/i }).first();
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await expect(
        page.getByRole('heading', { name: /assign trainers to session/i }),
      ).toBeVisible();
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(
        page.getByRole('heading', { name: /assign trainers to session/i }),
      ).not.toBeVisible();
    }

    // 7. Switch to "My Sessions" tab
    await mySessionsTab.click();
    // Verify view toggles to personal assigned sessions (either list or "No Sessions Assigned" empty state)
    const mySessionsHeading = page.getByRole('heading', {
      name: /(your assigned sessions|no sessions assigned)/i,
    });
    await expect(mySessionsHeading).toBeVisible();
  });
});
