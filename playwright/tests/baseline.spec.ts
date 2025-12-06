import { test, expect } from '@playwright/test';

test.describe('Public pages snapshots', () => {
  test('home page renders', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/STEVI/i);
    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });
});

test.describe('Admin shell unauthenticated', () => {
  test('admin operations redirects or renders gate', async ({ page }) => {
    await page.goto('/admin/operations');
    await expect(page).toHaveScreenshot('admin-operations-unauth.png', { fullPage: true });
  });
});
