import { test, expect, type Page } from '@playwright/test';

type Credentials = {
  email?: string;
  password?: string;
};

const clientCreds: Credentials = {
  email: process.env.E2E_CLIENT_EMAIL,
  password: process.env.E2E_CLIENT_PASSWORD,
};

const adminCreds: Credentials = {
  email: process.env.E2E_TEST_EMAIL,
  password: process.env.E2E_TEST_PASSWORD,
};

async function loginWithEmail(page: Page, creds: Credentials, nextPath: string) {
  if (!creds.email || !creds.password) {
    throw new Error('Missing credentials for authenticated test.');
  }

  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByRole('textbox', { name: 'Email' }).fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('Authenticated shells', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('client user sees client shell navigation', async ({ page }) => {
    test.skip(!clientCreds.email || !clientCreds.password, 'E2E client credentials missing.');

    await loginWithEmail(page, clientCreds, '/home');

    await expect(page).toHaveURL(/\/(home|onboarding)(\?|$)/, { timeout: 20000 });

    const appNav = page.getByRole('navigation', { name: 'Application navigation' });
    await expect(appNav).toBeVisible({ timeout: 20000 });
    await expect(appNav.getByRole('link', { name: 'Support requests' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Operations hubs' })).toHaveCount(0);

    const cookies = await page.context().cookies();
    const hasSessionCookie = cookies.some((cookie) => cookie.name.includes('sb-') && cookie.name.endsWith('-auth-token'));
    expect(hasSessionCookie).toBeTruthy();
  });

  test('admin user sees ops shell navigation', async ({ page }) => {
    test.skip(!adminCreds.email || !adminCreds.password, 'E2E admin credentials missing.');

    await loginWithEmail(page, adminCreds, '/ops/today');

    await expect(page).toHaveURL(/\/ops\/today(\?|$)/);
    await expect(page.getByRole('navigation', { name: 'Operations hubs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clients' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open command palette' })).toBeEnabled();
    await expect(page.getByRole('navigation', { name: 'Application navigation' })).toHaveCount(0);
  });

  test('admin user can access app admin shell', async ({ page }) => {
    test.skip(!adminCreds.email || !adminCreds.password, 'E2E admin credentials missing.');

    await loginWithEmail(page, adminCreds, '/app-admin');

    await expect(page).toHaveURL(/\/app-admin(\?|$)/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /general settings/i })).toBeVisible();
  });

  test('ops user can preview the client portal', async ({ page }) => {
    test.skip(!adminCreds.email || !adminCreds.password, 'E2E admin credentials missing.');

    await loginWithEmail(page, adminCreds, '/home?preview=1');

    await expect(page).toHaveURL(/\/home\?preview=1/);
    const previewBanner = page.getByRole('status');
    await expect(previewBanner).toBeVisible();
    await expect(previewBanner).toContainText(/client preview/i);
    await expect(page.getByRole('link', { name: /exit preview/i })).toBeVisible();
  });
});
