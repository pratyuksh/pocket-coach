import { test, expect, type Page } from '@playwright/test';
import { ACCOUNTS, apiSignIn, profileIdByEmail, signIn } from './helpers';

// Sub-Phase 1.4d milestone checks that span every screen: the Modernist look (light ground, no
// rounded corners), no horizontal scrolling on a phone, no request to Google Fonts, and German
// titles. The screens themselves have their own specs.

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

const ROLES = [
  { name: 'trainer', email: ACCOUNTS.trainer },
  { name: 'head-trainer', email: ACCOUNTS.head },
] as const;

const SCREENS = ['/dashboard', '/sessions', '/substitutions', '/trainers', '/settings'] as const;

/** Elements with a corner radius: the design has none (only fully round things such as spinners). */
const roundedElements = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const radius = getComputedStyle(el).borderTopLeftRadius;
        const value = parseFloat(radius);
        return value > 0 && value < 1000 && !radius.includes('%');
      })
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`),
  );

/**
 * Visible elements that stick out of the viewport sideways and are not inside something that
 * scrolls or clips them. (The page itself hides horizontal overflow, so `scrollWidth` cannot
 * show it.)
 */
const stickingOut = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return false;
        if (box.right <= window.innerWidth + 1 && box.left >= -1) return false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const overflowX = getComputedStyle(p).overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden')
            return false;
        }
        return true;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`),
  );

for (const role of ROLES) {
  for (const viewport of VIEWPORTS) {
    test(`every screen is Modernist and fits the ${viewport.name} (${role.name})`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const fontRequests: string[] = [];
      page.on('request', (req) => {
        if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) fontRequests.push(req.url());
      });

      await signIn(page, role.email);
      const token = await apiSignIn(request, ACCOUNTS.head);
      const personId = await profileIdByEmail(request, token, ACCOUNTS.junior);
      const screens = [...SCREENS, `/trainers/${personId}`];

      for (const path of screens) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible();
        // wait until nothing says "Loading" any more
        await expect(page.getByText(/^Loading/), path).toHaveCount(0);

        expect(await stickingOut(page), `${path} sticks out sideways`).toEqual([]);
        expect(await roundedElements(page), `${path} has rounded corners`).toEqual([]);
        // light ground (#f3f2f2), no dark mode
        const background = await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor,
        );
        expect(background, path).toBe('rgb(243, 242, 242)');
      }

      expect(fontRequests, 'requests to Google Fonts').toEqual([]);
    });
  }
}

test('the screens are titled in German when the language is German', async ({ page }) => {
  await signIn(page, ACCOUNTS.trainer);
  await page.goto('/settings');
  await page
    .getByRole('radiogroup', { name: 'Language' })
    .last()
    .getByRole('radio', { name: 'Deutsch' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();

  const titles: [string, string][] = [
    ['/dashboard', 'Dashboard'],
    ['/sessions', 'Trainings'],
    ['/substitutions', 'Lücken'],
    ['/trainers', 'Team'],
  ];
  for (const [path, title] of titles) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title }), path).toBeVisible();
  }

  // leave the shared test account the way it was
  await page.goto('/settings');
  await page
    .getByRole('radiogroup', { name: 'Sprache' })
    .last()
    .getByRole('radio', { name: 'English' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});
