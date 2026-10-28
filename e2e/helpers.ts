import { expect, type Page } from '@playwright/test';
export async function login(page: Page, role: string) {
  await page.goto('/login');
  await page.getByLabel('Email tài khoản').fill(`${role}@gpp.demo`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.DEMO_PASSWORD || 'GppDemo!2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
}
export async function ready(page: Page) {
  await expect(page.locator('.main-content h1')).toBeVisible();
  await expect(page.getByText('Đang tải dữ liệu...')).toHaveCount(0);
  await expect(page.getByText('Không tải được dữ liệu')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
