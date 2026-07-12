import { test, expect } from '@playwright/test';

/**
 * Xodim (operator) login oqimi — seed'dagi demo akkaunt bilan.
 * CI'da seed bosqichi operator@example.com / Admin123! akkauntini yaratadi.
 */
test.describe('Xodim login', () => {
  test('login sahifasi ko‘rinadi', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Smart Murojaat AI' })).toBeVisible();
    await expect(page.getByPlaceholder('admin@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kirish' })).toBeVisible();
  });

  test('noto‘g‘ri parol xatolik ko‘rsatadi', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('admin@example.com').fill('operator@example.com');
    await page.getByPlaceholder('••••••••').fill('notohgri-parol');
    await page.getByRole('button', { name: 'Kirish' }).click();
    await expect(page.getByText(/noto‘g‘ri|xato/i)).toBeVisible();
  });

  test('to‘g‘ri parol bilan dashboard ochiladi', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('admin@example.com').fill('operator@example.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.getByRole('button', { name: 'Kirish' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
