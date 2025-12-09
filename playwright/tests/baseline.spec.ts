import { test, expect } from '@playwright/test';

test.describe('Client shell', () => {
  test('requires auth and preserves preview flag', async ({ page }) => {
    await page.goto('/home?preview=1');
    await expect(page).toHaveURL(/\/login\?next=%2Fhome%3Fpreview%3D1/);
    await expect(page.getByRole('heading', { name: /sign in to stevi/i })).toBeVisible();
  });
});

test.describe('Workspace shell', () => {
  test('admin routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/admin/operations');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Foperations/);
    await expect(page.locator('body')).not.toContainText('Client portal');
  });

  test('staff routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/ops/today');
    await expect(page).toHaveURL(/\/login\?next=%2Fworkspace%2Ftoday/);
  });
});
