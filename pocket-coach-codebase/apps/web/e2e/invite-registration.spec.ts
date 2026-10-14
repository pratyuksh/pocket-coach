import { test, expect, type Page } from '@playwright/test';
import { submitSignIn } from './helpers';

async function signedInEmail(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key)!).user?.email : null;
  });
}

test.describe('Invite Registration E2E Flow', () => {
  test('Invited head-trainer / 14/18 coach completes setup via the invite link', async ({
    page,
    browser,
  }) => {
    const inviteEmail = `e2einvite_${Date.now()}@club.de`;
    const newPassword = 'MyOwnSecret!42';

    // 1. Super Admin invites a Head-trainer with the 14/18 Coach label
    await page.goto('/login');
    await submitSignIn(page, 'admin@club.de', 'Password123!');
    await expect(page).toHaveURL(/\/(trainers|dashboard|$)/);

    await page.goto('/trainers');
    await page.getByRole('button', { name: /invite trainer/i }).click();
    const inviteDialog = page.getByRole('dialog', { name: 'Invite a trainer' });
    await inviteDialog.getByLabel('Email').fill(inviteEmail);
    await inviteDialog.getByRole('checkbox', { name: 'Head trainer' }).click();
    await inviteDialog.getByRole('checkbox', { name: '14/18 coach' }).click();
    await inviteDialog.getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByRole('dialog', { name: 'Invitation sent' })).toBeVisible({
      timeout: 10000,
    });

    // 2. Sending the invite must not swap the admin's session for the invitee's
    expect(await signedInEmail(page)).toBe('admin@club.de');

    // 3. Invitee opens the invite link in a fresh browser and completes setup
    const inviteeContext = await browser.newContext();
    const invitee = await inviteeContext.newPage();
    const token = Buffer.from(inviteEmail).toString('base64');
    await invitee.goto(`/invite/${token}`);

    await expect(invitee.getByLabel('Email', { exact: true })).toHaveValue(inviteEmail);
    await invitee.getByLabel('Your name').fill('Invited Coach Final');
    await invitee.getByLabel('Choose a password').fill(newPassword);
    await invitee.getByRole('button', { name: 'Create account' }).click();

    await expect(invitee).toHaveURL(/\/dashboard/, { timeout: 10000 });
    expect(await signedInEmail(invitee)).toBe(inviteEmail);

    // 4. Role and profile label granted at invite time are in effect
    await expect(
      invitee.getByRole('main').getByText('Head Trainer', { exact: true }),
    ).toBeVisible();
    await invitee.goto('/settings');
    await expect(invitee.getByLabel('Display name')).toHaveValue('Invited Coach Final');
    // The 14/18 label granted at invite time is shown, and cannot be changed here
    await expect(invitee.getByText('14/18 coach', { exact: true })).toBeVisible();
    await expect(invitee.getByRole('checkbox')).toHaveCount(0);
    await inviteeContext.close();

    // 5. The invitee can sign in with the password they chose
    const loginContext = await browser.newContext();
    const login = await loginContext.newPage();
    await login.goto('/login');
    await submitSignIn(login, inviteEmail, newPassword);
    await expect(login).toHaveURL(/\/(trainers|dashboard|$)/);
    expect(await signedInEmail(login)).toBe(inviteEmail);
    await loginContext.close();
  });
});
