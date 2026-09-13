import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation E2E', () => {
  test('should display login form when unauthenticated', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  });

  test('should allow user to log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin@club.de');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // After login, should redirect to dashboard
    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);
  });

  test('should redirect unauthenticated users to login and handle sign-out redirect', async ({ page }) => {
    // 1. Unauthenticated visit to protected route redirects to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // 2. Log in
    await page.getByLabel(/email address/i).fill('admin@club.de');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);

    // 3. Click Sign Out button
    const signOutBtn = page.getByTitle('Sign Out');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // 4. Verify user is immediately redirected back to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible();
  });
});
