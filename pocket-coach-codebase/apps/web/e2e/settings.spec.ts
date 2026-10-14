import { test, expect } from '@playwright/test';
import { createTrainer, PASSWORD, signIn, submitSignIn } from './helpers';

const sidebar = (page: import('@playwright/test').Page) => page.getByRole('complementary');

test.describe('Settings (in the app shell)', () => {
  test('a trainer sees the Phase 1 navigation and their own settings, but no season or halls', async ({
    page,
  }) => {
    await signIn(page, 'trainer1@club.de');

    const nav = page.getByRole('navigation', { name: 'Main navigation' }).first();
    await expect(nav.getByRole('link')).toHaveText([
      'My sessions',
      'Sessions',
      'Gaps',
      'Team',
      'Settings',
    ]);

    await nav.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByLabel('Display name')).toHaveValue('Max Trainer');
    const main = page.getByRole('main');
    await expect(main.getByText('trainer1@club.de')).toBeVisible();
    await expect(main.getByRole('img', { name: "Can't be changed" })).toBeVisible();
    await expect(main.getByLabel('Email', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: 'Language' }).last()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Season' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Halls' })).toHaveCount(0);
  });

  test('regenerates the calendar link', async ({ page }) => {
    await signIn(page, 'trainer1@club.de');
    await page.goto('/settings');

    const link = page.locator('#calendar-feed-url');
    await expect(link).toBeVisible();
    const initial = await link.innerText();
    expect(initial).toContain('/functions/v1/calendar-feed?token=');

    // Ghost buttons use the same accent as the primary button, as in the design
    const regenerate = page.getByRole('button', { name: 'Regenerate link' });
    await expect(regenerate).toHaveCSS('color', 'rgb(236, 48, 19)');
    await regenerate.click();

    await expect(page.getByRole('alert')).toHaveText(
      'New link created. The old one has stopped working.',
    );
    await expect.poll(() => link.innerText()).not.toEqual(initial);
    expect(await link.innerText()).toContain('/functions/v1/calendar-feed?token=');
  });

  test('saves the display name, which then shows in the sidebar and after a reload', async ({
    page,
    request,
  }) => {
    const email = `e2e.settings.${Date.now()}@club.de`;
    await createTrainer(request, email, 'E2E Settings Before');

    await signIn(page, email);
    await page.goto('/settings');
    await expect(page.getByLabel('Display name')).toHaveValue('E2E Settings Before');
    await page.getByLabel('Display name').fill('E2E Settings After');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText('Profile saved.');
    await expect(sidebar(page).getByText('E2E Settings After')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Display name')).toHaveValue('E2E Settings After');
  });

  test('the language switch applies at once, is saved to the profile and follows the user to another device', async ({
    page,
    browser,
    request,
  }) => {
    const email = `e2e.language.${Date.now()}@club.de`;
    await createTrainer(request, email, 'E2E Language');

    await signIn(page, email);
    await page.goto('/settings');
    await page
      .getByRole('radiogroup', { name: 'Language' })
      .last()
      .getByRole('radio', { name: 'Deutsch' })
      .click();

    // Immediately, without a reload
    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
    await expect(page.getByLabel('Anzeigename')).toBeVisible();

    // Survives a reload
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();

    // A fresh browser (another device) gets German after signing in, because it is on the profile
    const otherDevice = await browser.newContext();
    const other = await otherDevice.newPage();
    await other.goto('/login');
    await expect(other.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await submitSignIn(other, email, PASSWORD);
    await expect(other.getByRole('heading', { level: 1 })).toHaveText('Meine Trainings');
    await otherDevice.close();
  });

  test('a head trainer sees the season section and can open the season wizard', async ({
    page,
  }) => {
    await signIn(page, 'headtrainer@club.de');
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Season' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Halls' })).toBeVisible();
    await page.getByRole('button', { name: 'New season' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Page header: Inbox and Sign out', () => {
  test('Inbox opens and closes a drawer; Sign out sits next to it; Settings keeps its own Sign out', async ({
    page,
  }) => {
    await signIn(page, 'trainer1@club.de');

    const header = page.getByRole('banner');
    await expect(header.getByRole('button')).toHaveText(['Inbox', 'Sign out']);

    await header.getByRole('button', { name: 'Inbox' }).click();
    const drawer = page.getByRole('dialog', { name: 'Notifications' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('No notifications yet.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    await page.goto('/settings');
    await expect(page.getByRole('main').getByRole('button', { name: 'Sign out' })).toBeVisible();
    await header.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Shell on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows the tab bar, and the account button opens Settings', async ({ page }) => {
    await signIn(page, 'trainer1@club.de');

    const tabBar = page.getByRole('navigation', { name: 'Main navigation' }).last();
    await expect(tabBar.getByRole('link')).toHaveText(['My sessions', 'Sessions', 'Gaps', 'Team']);
    await expect(page.getByRole('complementary')).toBeHidden();

    await page.getByRole('link', { name: 'Your account and settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByLabel('Display name')).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});
