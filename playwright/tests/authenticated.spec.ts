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
  test('client user sees client shell navigation', async ({ page }) => {
    test.skip(!clientCreds.email || !clientCreds.password, 'E2E client credentials missing.');

    await loginWithEmail(page, clientCreds, '/home');

    await expect(page).toHaveURL(/\/(home|onboarding)(\?|$)/);
    await expect(page.getByRole('navigation', { name: 'Application navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Appointments' })).toBeVisible();
  });

  test('admin user sees ops shell navigation', async ({ page }) => {
    test.skip(!adminCreds.email || !adminCreds.password, 'E2E admin credentials missing.');

    await loginWithEmail(page, adminCreds, '/ops/today');

    await expect(page).toHaveURL(/\/ops\/today(\?|$)/);
    await expect(page.getByRole('navigation', { name: 'Application navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clients' })).toBeVisible();
  });

  test('admin user can access ops admin shell', async ({ page }) => {
    test.skip(!adminCreds.email || !adminCreds.password, 'E2E admin credentials missing.');

    await loginWithEmail(page, adminCreds, '/ops/admin');

    await expect(page).toHaveURL(/\/ops\/admin(\?|$)/);
    await expect(page.getByRole('heading', { name: /general settings/i })).toBeVisible();
  });
});
