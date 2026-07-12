import { test, expect } from '@playwright/test';

/**
 * Fuqaro portali (autentifikatsiyasiz) uchidan-uchiga oqimi:
 * murojaat yuborish -> raqam olish -> shu raqam bo'yicha holatni kuzatish.
 * Haqiqiy brauzer + haqiqiy API orqali ishlaydi.
 */
test.describe('Fuqaro portali', () => {
  test('bosh sahifa va ikkala tab ko‘rinadi', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Smart Murojaat AI' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Murojaat yuborish/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Holatni tekshirish/ })).toBeVisible();
  });

  test('murojaat yuboriladi va raqam bo‘yicha kuzatiladi', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('Aliyev Vali').fill('E2E Test Fuqaro');
    await page.getByPlaceholder('+998901234567').fill('+998901234567');
    await page.getByPlaceholder(/Ko‘chada suv quvuri/).fill('E2E: ko‘chada chiroq yonmayapti');
    await page
      .getByPlaceholder(/Muammoni batafsil yozing/)
      .fill('Kechqurun butun ko‘cha qorong‘i bo‘lib qolmoqda, chiroqlar bir oydan beri ishlamaydi.');

    await page.getByRole('button', { name: 'Murojaatni yuborish' }).click();

    // Muvaffaqiyat ekrani + murojaat raqami
    await expect(page.getByText('Murojaatingiz qabul qilindi!')).toBeVisible();
    const numberEl = page.locator('text=/SM-\\d{8}-\\d+/').first();
    await expect(numberEl).toBeVisible();
    const appealNumber = (await numberEl.textContent())?.trim() || '';
    expect(appealNumber).toMatch(/^SM-\d{8}-\d+$/);

    // Endi shu raqam bo'yicha holatni kuzatamiz
    await page.goto('/');
    await page.getByRole('button', { name: /Holatni tekshirish/ }).click();
    await page.getByPlaceholder(/SM-\d{8}-\d+/).fill(appealNumber);
    await page.getByRole('button', { name: 'Tekshirish', exact: true }).click();

    await expect(page.getByText(appealNumber)).toBeVisible();
  });
});
