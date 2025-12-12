import { test, expect } from '@playwright/test';

test.describe('Client shell', () => {
  test('requires auth and preserves preview flag', async ({ page }) => {
    await page.goto('/home?preview=1');
    await expect(page).toHaveURL(/\/login\?next=%2Fhome%3Fpreview%3D1/);
    await expect(page.getByRole('heading', { name: /sign in to stevi/i })).toBeVisible();
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
