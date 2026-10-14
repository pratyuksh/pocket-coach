import { test, expect } from '@playwright/test';
import { submitSignIn } from './helpers';

test.describe('Authentication & Navigation E2E', () => {
  test('should display login form when unauthenticated', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toHaveCount(0);
  });

  test('shows a readable error for a wrong password and stays on the login page', async ({
    page,
  }) => {
    await page.goto('/login');
    await submitSignIn(page, 'admin@club.de', 'definitely-wrong');
    await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
    await expect(page).toHaveURL(/\/login/);
  });

  test('switches the sign-in screen between English and German and remembers it', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('radio', { name: 'DE' }).click();
    await expect(page.getByRole('heading', { name: 'Anmelden', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Anmelden', exact: true })).toBeVisible();

    await page.getByRole('radio', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('the old registration address leads to the sign-in screen', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should allow user to log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await submitSignIn(page, 'admin@club.de', 'Password123!');

    // After login, should redirect to dashboard
    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);
  });

  test('should redirect unauthenticated users to login and handle sign-out redirect', async ({
    page,
  }) => {
    // 1. Unauthenticated visit to protected route redirects to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // 2. Log in
    await submitSignIn(page, 'admin@club.de', 'Password123!');

    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);

    // 3. Sign out with the button in the page header
    await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).click();

    // 4. Verify user is immediately redirected back to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  });
});
