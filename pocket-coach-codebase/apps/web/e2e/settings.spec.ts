import { test, expect } from '@playwright/test';

test.describe('Profile Settings & Calendar Feed E2E Flow', () => {
  test('should allow user to update profile settings and regenerate calendar feed token', async ({
    page,
  }) => {
    // 1. Log in as Trainer
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('trainer1@club.de');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);

    // 2. Navigate to Settings page
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /trainer profile & settings/i })).toBeVisible();

    // 3. Verify Live Calendar Feed section exists
    await expect(page.getByRole('heading', { name: /live calendar feed sync/i })).toBeVisible();
    const feedInput = page.locator('#calendar-feed-url');
    await expect(feedInput).toBeVisible();

    const initialFeedUrl = await feedInput.inputValue();
    expect(initialFeedUrl).toContain('/functions/v1/calendar-feed?token=');

    // 4. Click Regenerate Link button
    const regenBtn = page.getByRole('button', { name: /regenerate link/i });
    await expect(regenBtn).toBeVisible();
    await regenBtn.click();

    // 5. Verify success toast and URL token update
    await expect(page.getByText(/calendar subscription token regenerated/i)).toBeVisible();
    const updatedFeedUrl = await feedInput.inputValue();
    expect(updatedFeedUrl).not.toEqual(initialFeedUrl);
    expect(updatedFeedUrl).toContain('/functions/v1/calendar-feed?token=');
  });
});
