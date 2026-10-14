import { test, expect } from '@playwright/test';
import { ACCOUNTS, apiSignIn, deleteHallByName, signIn, uniqueName } from './helpers';

test.describe('Hall details', () => {
  test('Head-trainer adds a hall with address and note, then edits the details', async ({
    page,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const hall = uniqueName('E2E Hall');

    try {
      await signIn(page, ACCOUNTS.head);
      await page.goto('/sessions');
      await page.getByRole('button', { name: /manage halls/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: /sports hall locations/i })).toBeVisible();

      // Add a hall with an address and a note for trainers
      await dialog.getByPlaceholder('e.g. Sporthalle Borrweg').fill(hall);
      await dialog.getByLabel('Address', { exact: true }).fill('Hallenweg 1, 8000 Zürich');
      await dialog.getByLabel('Note for trainers', { exact: true }).fill('Key at reception');
      await dialog.getByRole('button', { name: /add location/i }).click();

      await expect(dialog.getByText(hall)).toBeVisible();
      await expect(dialog.getByText('Hallenweg 1, 8000 Zürich')).toBeVisible();
      await expect(dialog.getByText('Key at reception')).toBeVisible();

      // Edit the details of that hall
      const row = dialog.locator('div.py-3').filter({ hasText: hall });
      await row.getByRole('button', { name: /edit details/i }).click();
      await dialog.getByLabel(`Address of ${hall}`).fill('Neuer Weg 5, 8001 Zürich');
      await dialog.getByLabel(`Note for trainers at ${hall}`).fill('Side entrance');
      await dialog.getByRole('button', { name: /save details/i }).click();

      await expect(dialog.getByText('Neuer Weg 5, 8001 Zürich')).toBeVisible();
      await expect(dialog.getByText('Side entrance')).toBeVisible();
      await expect(dialog.getByText('Hallenweg 1, 8000 Zürich')).toHaveCount(0);

      // The details are saved, not just shown: they survive a reload
      await page.reload();
      await page.getByRole('button', { name: /manage halls/i }).click();
      await expect(page.getByRole('dialog').getByText('Neuer Weg 5, 8001 Zürich')).toBeVisible();
    } finally {
      await deleteHallByName(request, headToken, hall);
    }
  });

  test('Head-trainer adds and edits a hall in Settings, and trainers do not see the section', async ({
    page,
    request,
  }) => {
    const headToken = await apiSignIn(request, ACCOUNTS.head);
    const hall = uniqueName('E2E Settings Hall');

    try {
      await signIn(page, ACCOUNTS.head);
      await page.goto('/settings');

      const halls = page.getByRole('heading', { name: 'Halls' }).locator('xpath=ancestor::section');
      await page.getByRole('button', { name: '+ Add hall' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add hall' });
      await dialog.getByLabel('Hall name').fill(hall);
      await dialog.getByLabel('Address').fill('Hallenweg 1, 8000 Zürich');
      await dialog.getByLabel('Note for trainers').fill('Key at reception');
      await dialog.getByRole('button', { name: 'Save hall' }).click();

      await expect(page.getByRole('alert')).toHaveText('Hall saved.');
      await expect(halls.getByText(hall)).toBeVisible();
      await expect(halls.getByRole('link', { name: `Open ${hall} on the map` })).toHaveText(
        'Hallenweg 1, 8000 Zürich ↗',
      );
      await expect(halls.getByText('Key at reception')).toBeVisible();

      await page.getByRole('button', { name: `Edit ${hall}` }).click();
      const edit = page.getByRole('dialog', { name: 'Edit hall' });
      await edit.getByLabel('Address').fill('Neuer Weg 5, 8001 Zürich');
      await edit.getByLabel('Note for trainers').fill('Side entrance');
      await edit.getByRole('button', { name: 'Save hall' }).click();

      await expect(halls.getByText('Side entrance')).toBeVisible();
      await expect(halls.getByText('Key at reception')).toHaveCount(0);

      // Saved, not just shown
      await page.reload();
      await expect(page.getByRole('link', { name: `Open ${hall} on the map` })).toHaveText(
        'Neuer Weg 5, 8001 Zürich ↗',
      );
    } finally {
      await deleteHallByName(request, headToken, hall);
    }
  });
});
