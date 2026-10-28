import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { login, ready } from './helpers';
const directory = 'docs/report/chapter-2-6/images';
const screens = [
  ['admin', '/pharmacies', 'hinh-2-09-manage-pharmacies.png'],
  ['manager', '/medicines', 'hinh-2-10-manage-medicines.png'],
  ['inventory', '/receipts', 'hinh-2-11-receive-medicines.png'],
  ['inventory', '/inventory', 'hinh-2-12-search-stock.png'],
  ['sales', '/pos', 'hinh-2-13-sell-medicines.png'],
  ['manager', '/reports', 'hinh-2-14-view-reports.png'],
];
for (const [role, path, file] of screens)
  test(`Ảnh báo cáo: ${file}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, role);
    await page.goto(path);
    await ready(page);
    if (path === '/pos') {
      for (const name of ['An Tâm Paracetamol', 'An Tâm Vitamin C', 'An Tâm Cetirizine'])
        await page.getByRole('button', { name: `Thêm ${name}`, exact: true }).click();
      await page.getByLabel('Số lượng An Tâm Paracetamol', { exact: true }).fill('10');
      await page.getByLabel('Số lượng An Tâm Vitamin C', { exact: true }).fill('5');
      await page.getByLabel('Số lượng An Tâm Cetirizine', { exact: true }).fill('5');
      await page.getByLabel('Tiền khách đưa', { exact: true }).fill('100000');
    }
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    if (['/pharmacies', '/medicines', '/inventory'].includes(path))
      await expect(page.locator('.table-footer')).toBeInViewport();
    if (path === '/receipts')
      await expect(page.getByRole('button', { name: 'Lưu phiếu nháp', exact: true })).toBeInViewport();
    if (path === '/pos')
      await expect(page.getByRole('button', { name: 'Xem trước phiếu bán', exact: true })).toBeInViewport();
    expect(errors).toEqual([]);
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/${file}`, fullPage: false, animations: 'disabled' });
  });

const managementScreens = [
  ['/overview', 'hinh-2-15-manager-overview.png', 'overview'],
  ['/overview', 'hinh-2-21-account-menu.png', 'avatar'],
  ['/staff', 'hinh-2-16-staff-permissions.png', 'staff'],
  ['/staff', 'hinh-2-17-assign-role.png', 'role'],
  ['/lookup', 'hinh-2-18-shared-lookup.png', 'lookup'],
  ['/reports', 'hinh-2-19-sales-detail.png', 'sales'],
  ['/reports', 'hinh-2-20-stock-movement.png', 'movement'],
];
for (const [path, file, screen] of managementScreens)
  test(`Ảnh mở rộng: ${file}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, 'manager');
    await page.goto(path);
    await ready(page);
    if (screen === 'avatar') await page.getByRole('button', { name: 'Menu tài khoản', exact: true }).click();
    if (screen === 'staff') await page.locator('.permission-guide summary').click();
    if (screen === 'role')
      await page
        .getByRole('button', { name: /^Cấp vai trò cho/ })
        .first()
        .click();
    if (screen === 'lookup') {
      await page.getByLabel('Tìm kiếm', { exact: true }).fill('DEMO-1-0001');
      await page.getByRole('button', { name: '3 lô' }).click();
    }
    if (screen === 'sales')
      await page.getByRole('button', { name: 'Doanh thu chi tiết', exact: true }).click();
    if (screen === 'movement')
      await page.getByRole('button', { name: 'Nhập – Xuất – Tồn', exact: true }).click();
    await ready(page);
    if (screen === 'sales' || screen === 'movement') {
      await expect(page.locator('.detailed-report .table-footer')).toBeInViewport();
      await expect(page.locator('.detailed-report .detail-note')).toBeInViewport();
    }
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    expect(errors).toEqual([]);
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/${file}`, fullPage: false, animations: 'disabled' });
  });
