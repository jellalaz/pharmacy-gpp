import { test, expect } from '@playwright/test';
import { login, ready } from './helpers';
test('đăng nhập sai, đúng, điều hướng Admin và đăng xuất', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email tài khoản').fill('admin@gpp.demo');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Email hoặc mật khẩu');
  await login(page, 'admin');
  await page.getByRole('navigation').getByRole('link', { name: 'Quản lý nhà thuốc', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quản lý nhà thuốc', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Menu tài khoản', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/login/);
});
test('quản lý: tìm kiếm, form, dữ liệu lô, điều hướng và báo cáo', async ({ page }) => {
  await login(page, 'manager');
  for (const [route, heading] of [
    ['/medicines', 'Danh mục thuốc'],
    ['/suppliers', 'Nhà cung cấp'],
    ['/staff', 'Quản lý nhân viên'],
    ['/inventory', 'Tra cứu thuốc & tồn kho'],
    ['/reports', 'Báo cáo & thống kê'],
  ]) {
    await page.goto(route);
    await ready(page);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.goto('/medicines');
  await page.getByLabel('Tìm kiếm', { exact: true }).fill('paracetamol');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Thêm thuốc mới', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByText('Vui lòng nhập thông tin.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Hủy bỏ' }).click();
  await page.goto('/inventory');
  await page.getByLabel('Tìm kiếm', { exact: true }).fill('paracetamol');
  await page.getByRole('button', { name: '3 lô' }).click();
  await expect(page.getByRole('dialog')).toContainText('Hết hạn');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
});
test('POS xem trước FEFO, chặn vượt tồn và kiểm tra đơn thuốc', async ({ page }) => {
  await login(page, 'sales');
  await page.getByRole('button', { name: 'Thêm An Tâm Paracetamol', exact: true }).click();
  await page.getByLabel('Số lượng An Tâm Paracetamol', { exact: true }).fill('999999');
  await expect(page.getByRole('button', { name: 'Xem trước phiếu bán' })).toBeDisabled();
  await page.getByLabel('Số lượng An Tâm Paracetamol', { exact: true }).fill('10');
  await page.getByLabel('Tiền khách đưa', { exact: true }).fill('400000');
  await expect(page.getByLabel('Tiền khách đưa', { exact: true })).toHaveValue('400.000');
  await page.getByRole('button', { name: 'Xem trước phiếu bán' }).click();
  await expect(page.getByRole('dialog')).toContainText('CHƯA GIAO DỊCH');
  await expect(page.getByRole('dialog')).toContainText('AT01-01');
  await expect(page.getByRole('dialog')).not.toContainText('AT01-03');
  await page.getByRole('button', { name: 'Tiếp tục soạn phiếu' }).click();
  await page.getByRole('button', { name: 'Theo đơn', exact: true }).click();
  await page.getByLabel('Tìm thuốc bán', { exact: true }).fill('amoxicillin');
  await page.getByRole('button', { name: 'Thêm An Tâm Amoxicillin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xem trước phiếu bán' })).toBeDisabled();
  await page.getByLabel('Mã đơn thuốc').fill('RX-DEMO-01');
  await page.getByLabel('Bác sĩ / người kê đơn').fill('Người kê đơn mẫu');
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: 'Xem trước phiếu bán' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Thanh toán chính thức · Giai đoạn 2' })).toBeDisabled();
  await page.goto('/sales');
  await ready(page);
  await page.locator('tbody tr').first().getByRole('button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
test('kho: tính phiếu nhập, kiểm kê không đổi tồn và lọc hết hạn', async ({ page }) => {
  await login(page, 'inventory');
  await page.goto('/receipts');
  await ready(page);
  await page.getByRole('button', { name: 'Thêm dòng thuốc' }).click();
  await expect(page.getByLabel('Thuốc nhập', { exact: true })).toHaveCount(4);
  await page.getByRole('button', { name: 'Xóa dòng thuốc' }).last().click();
  await expect(page.getByLabel('Thuốc nhập', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Xác nhận nhập · Giai đoạn 2' })).toBeDisabled();
  await page.goto('/stocktake');
  await ready(page);
  await page.getByRole('spinbutton').first().fill('0');
  await expect(page.locator('.stats-grid .stat-value').nth(1)).toHaveText('1');
  await page.goto('/expiry');
  await ready(page);
  await page.getByLabel('Khoảng hạn sử dụng').selectOption('expired');
  await expect(page.locator('tbody tr').first()).toContainText('Hết hạn');
});
for (const width of [1440, 1024, 768, 390])
  test(`responsive ${width}px: điều hướng và không tràn khung`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 740 : 900 });
    await login(page, 'manager');
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('.sidebar nav').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(page.locator('.sidebar').getByRole('link', { name: 'Tài khoản cá nhân' })).toHaveCount(0);
    await expect(page.locator('.sidebar').getByRole('button', { name: 'Đăng xuất' })).toHaveCount(0);
    if (width < 1000) {
      await page.getByRole('button', { name: 'Mở menu' }).click();
      await expect(page.locator('.sidebar')).toHaveClass(/sidebar-open/);
      await page
        .getByRole('navigation')
        .getByRole('link', { name: 'Báo cáo', exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        page.getByRole('navigation').getByRole('link', { name: 'Báo cáo', exact: true }),
      ).toBeInViewport();
      await page.getByRole('link', { name: 'Danh mục thuốc', exact: true }).click();
    } else await page.goto('/medicines');
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const path of ['/staff', '/lookup', '/reports']) {
      await page.goto(path);
      await ready(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
