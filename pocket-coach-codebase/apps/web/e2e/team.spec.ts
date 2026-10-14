import { test, expect, type Page } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

const member = (page: Page, email: string) =>
  page.locator(`[data-testid="team-member"][data-email="${email}"]`);

const openTeam = async (page: Page, phone = false) => {
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    [phone ? 'last' : 'first']()
    .getByRole('link', { name: 'Team' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Team' })).toBeVisible();
};

test.describe('Team', () => {
  test('a trainer sees the team and its filters, but no management actions', async ({ page }) => {
    await signIn(page, ACCOUNTS.trainer);
    await openTeam(page);

    await expect(page.getByText('Coaching staff')).toBeVisible();
    await expect(member(page, ACCOUNTS.admin)).toBeVisible();
    await expect(
      member(page, ACCOUNTS.admin).getByText('Super-admin', { exact: true }),
    ).toBeVisible();
    await expect(member(page, ACCOUNTS.junior).getByText('14/18 coach')).toBeVisible();

    await expect(page.getByRole('button', { name: /invite trainer/i })).toHaveCount(0);
    // Roles and removal live on a person's profile, and a trainer has neither there
    await expect(page.getByRole('button', { name: /edit roles|remove/i })).toHaveCount(0);
    // No email addresses on the list
    await expect(page.getByText(ACCOUNTS.admin)).toHaveCount(0);
  });

  test('the filters narrow the list and carry counts', async ({ page }) => {
    await signIn(page, ACCOUNTS.trainer);
    await page.goto('/trainers');

    await expect(page.getByRole('radio', { name: /^All \(\d+\)$/ })).toBeChecked();

    await page.getByRole('radio', { name: /^14\/18 coaches \(\d+\)$/ }).click();
    await expect(member(page, ACCOUNTS.junior)).toBeVisible();
    await expect(member(page, ACCOUNTS.trainer)).toHaveCount(0);

    await page.getByRole('radio', { name: /^Head trainers \(\d+\)$/ }).click();
    await expect(member(page, ACCOUNTS.head)).toBeVisible();
    // A Super-admin counts as a head trainer
    await expect(member(page, ACCOUNTS.admin)).toBeVisible();
    await expect(member(page, ACCOUNTS.junior)).toHaveCount(0);
  });

  test('Super-admins get the invite button', async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto('/trainers');

    await expect(page.getByRole('button', { name: /invite trainer/i })).toBeVisible();
  });

  test('Head-trainers and Super-admins see the session columns, strip and note; trainers do not', async ({
    page,
    browser,
  }) => {
    for (const account of [ACCOUNTS.head, ACCOUNTS.admin]) {
      const context = await browser.newContext();
      const p = await context.newPage();
      await signIn(p, account);
      await p.goto('/trainers');

      await expect(p.getByRole('columnheader')).toHaveText([
        'Trainers',
        'Trainer',
        'Assist.',
        '14/18',
        'Completed',
        'Upcoming',
      ]);
      // Every row has the name and its five counts; the database function answered without error
      await expect(member(p, ACCOUNTS.trainer).getByRole('cell')).toHaveCount(6);
      await expect(
        member(p, ACCOUNTS.trainer).getByRole('cell', { name: /^Completed: \d+$/ }),
      ).toBeVisible();
      await expect(p.getByText('Could not load the session counts.')).toHaveCount(0);
      await expect(p.getByLabel('Season totals')).toContainText('Average per trainer');
      await expect(p.getByText(/Counted automatically from assignments/)).toBeVisible();
      await context.close();
    }

    await signIn(page, ACCOUNTS.trainer);
    await page.goto('/trainers');
    await expect(member(page, ACCOUNTS.admin)).toBeVisible();
    await expect(page.getByRole('columnheader')).toHaveCount(0);
    await expect(page.getByLabel('Season totals')).toHaveCount(0);
  });

  test('the selected filter is black, as in the design', async ({ page }) => {
    await signIn(page, ACCOUNTS.trainer);
    await page.goto('/trainers');

    const selected = page.getByRole('radio', { name: /^All \(\d+\)$/ });
    await expect(selected).toHaveCSS('background-color', 'rgb(32, 30, 29)');
    await expect(selected).toHaveCSS('color', 'rgb(243, 242, 242)');
  });
});

test.describe('Profile page', () => {
  test('clicking anywhere on a row opens that person, and Back returns to the team', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.head);
    await openTeam(page);

    // Click the row far away from the name (in the Completed column): the whole row is the link,
    // so a click at that position lands on its overlay
    const box = (await member(page, ACCOUNTS.trainer).boundingBox())!;
    await page.mouse.click(box.x + box.width - 150, box.y + box.height / 2);

    await expect(page).toHaveURL(/\/trainers\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Max Trainer' })).toBeVisible();
    await expect(page.getByText('Coaching staff')).toBeVisible();
    await expect(page.getByRole('main').getByText(ACCOUNTS.trainer)).toBeVisible();
    // the section stays highlighted in the navigation
    await expect(
      page
        .getByRole('navigation', { name: 'Main navigation' })
        .first()
        .getByRole('link', { name: 'Team' }),
    ).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: '← Back' }).click();
    await expect(page).toHaveURL(/\/trainers$/);
  });

  test('a Head-trainer sees the counts, upcoming sessions and session log of anyone', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.head);
    await page.goto('/trainers');
    await member(page, ACCOUNTS.junior).getByRole('link').click();

    await expect(page.getByRole('heading', { level: 1, name: 'Lukas Junior' })).toBeVisible();
    await expect(page.getByText('14/18 coach', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^Completed sessions · /)).toBeVisible();
    for (const label of ['Trainer', 'Assistant coach', '14/18 coach', 'Completed', 'Upcoming']) {
      await expect(page.getByText(label, { exact: true }).and(page.locator('dt'))).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Upcoming', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Session log' })).toBeVisible();
    await expect(page.getByText('Could not load the session counts.')).toHaveCount(0);
    // A Head-trainer who is not a Super-admin cannot change roles
    await expect(page.getByRole('button', { name: 'Edit roles' })).toHaveCount(0);
  });

  test('a trainer sees their own counts and log, but not those of others', async ({ page }) => {
    await signIn(page, ACCOUNTS.trainer);
    await page.goto('/trainers');

    await member(page, ACCOUNTS.trainer).getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Max Trainer' })).toBeVisible();
    await expect(page.getByText(/^Completed sessions · /)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Session log' })).toBeVisible();

    await page.getByRole('link', { name: '← Back' }).click();
    await member(page, ACCOUNTS.admin).getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Super Admin' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upcoming', exact: true })).toBeVisible();
    await expect(page.getByText(/^Completed sessions · /)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Session log' })).toHaveCount(0);
  });

  test('a Super-admin can edit roles and deactivate someone, but asks first and cannot deactivate themselves', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto('/trainers');

    await member(page, ACCOUNTS.trainer).getByRole('link').click();
    await expect(page.getByRole('button', { name: 'Edit roles' })).toBeVisible();

    await page.getByRole('button', { name: 'Deactivate account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Deactivate account' });
    await expect(dialog).toContainText('Deactivate the account of Max Trainer');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole('link', { name: '← Back' }).click();
    await member(page, ACCOUNTS.trainer).waitFor();
    await member(page, ACCOUNTS.admin).getByRole('link').click();
    await expect(page.getByRole('button', { name: 'Edit roles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Deactivate account' })).toHaveCount(0);
  });

  test('an unknown person shows a message, not a broken page', async ({ page }) => {
    await signIn(page, ACCOUNTS.head);
    await page.goto('/trainers/00000000-0000-0000-0000-00000000dead');

    await expect(page.getByRole('alert')).toHaveText('This person could not be found.');
    await page.getByRole('link', { name: '← Back' }).click();
    await expect(page).toHaveURL(/\/trainers$/);
  });
});

test.describe('Team on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a head trainer sees only the Completed column', async ({ page }) => {
    await signIn(page, ACCOUNTS.head);
    await page.goto('/trainers');

    await expect(page.getByRole('columnheader', { name: 'Completed' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Assist.' })).toBeHidden();
    await expect(page.getByRole('columnheader', { name: 'Upcoming' })).toBeHidden();
    const row = await member(page, ACCOUNTS.trainer).boundingBox();
    expect(row!.width).toBeLessThanOrEqual(390);
  });

  test('a person opens in one column with the counts first', async ({ page }) => {
    await signIn(page, ACCOUNTS.head);
    await openTeam(page, true);
    await member(page, ACCOUNTS.junior).getByRole('link').click();

    await expect(page.getByRole('heading', { level: 1, name: 'Lukas Junior' })).toBeVisible();
    const stats = await page
      .getByText('Completed', { exact: true })
      .and(page.locator('dt'))
      .boundingBox();
    const details = await page.getByText('Email', { exact: true }).boundingBox();
    expect(stats!.y).toBeLessThan(details!.y);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
