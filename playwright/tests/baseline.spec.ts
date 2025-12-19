import { test, expect } from '@playwright/test';

test.describe('Client shell', () => {
  test('requires auth and preserves preview flag', async ({ page }) => {
    await page.goto('/home?preview=1');
    await expect(page).toHaveURL(/\/login\?next=%2Fhome%3Fpreview%3D1/);
    await expect(page.getByRole('heading', { name: /sign in to stevi/i })).toBeVisible();
  });
});

test.describe('Login layout', () => {
  test('shows the branded login form and controls', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to stevi/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Email' })).toBeChecked();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register here/i })).toBeVisible();
  });

  test('toggles between email and phone inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await page.getByRole('radio', { name: 'Phone' }).click();
    await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();
    await page.getByRole('radio', { name: 'Email' }).click();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  });
});

test.describe('Operations shell', () => {
  test('frontline routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/ops/today');
    await expect(page).toHaveURL(/\/login\?next=%2Fops%2Ftoday/);
  });

  test('STEVI Admin routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/ops/hq');
    await expect(page).toHaveURL(/\/login\?next=%2Fops%2Fhq/);
  });
});
