import { test, expect } from '@playwright/test';

test.describe('Theme Toggle E2E Flow', () => {
  test('should allow user to toggle between dark and light themes on login page', async ({
    page,
  }) => {
    await page.goto('/login');

    // Default theme should be dark
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

    // Click theme toggle button
    const themeToggleBtn = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggleBtn).toBeVisible();
    await themeToggleBtn.click();

    // Theme should now be light
    await expect(htmlElement).toHaveAttribute('data-theme', 'light');

    // Reload page to verify localStorage persistence
    await page.reload();
    await expect(htmlElement).toHaveAttribute('data-theme', 'light');

    // Toggle back to dark
    await themeToggleBtn.click();
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');
  });
});
