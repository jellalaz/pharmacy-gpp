import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { login, ready } from './helpers';
config({ path: 'backend/.env', quiet: true });
const db = new PrismaClient();
const email = `role-ui-${Date.now().toString(36)}@test.invalid`;
const staffPassword = ' Nv!026 '; // Exactly eight characters, including spaces.
test.beforeAll(() => {
  if (process.env.DEMO_SEED !== 'true') throw new Error('Chỉ chạy kiểm thử trên DB demo.');
});
test.afterAll(async () => {
  const user = await db.user.findUnique({ where: { email } });
  if (user)
    await db.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({ where: { entityId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });
  await db.$disconnect();
});
test('Quản lý tạo tài khoản, cấp lại vai trò và nhân viên đăng nhập đúng quyền', async ({
  page,
  browser,
}) => {
  await login(page, 'manager');
  await expect(page.getByRole('heading', { name: 'Tổng quan nhà thuốc' })).toBeVisible();
  await expect(page.locator('.action-card')).toHaveCount(8);
  await page.locator('.action-card').filter({ hasText: 'Nhân viên & phân quyền' }).click();
  await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
  const form = page.getByRole('dialog');
  await form.locator('[name="name"]').fill('Nhân viên phân quyền kiểm thử');
  await form.locator('[name="email"]').fill(email);
  let userPosts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/users') userPosts++;
  });
  await form.locator('[name="password"]').fill('1234567');
  await form.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(form.locator('[name="password"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByRole('alert')).toHaveText('Mật khẩu phải có ít nhất 8 ký tự.');
  expect(userPosts).toBe(0);
  await form.locator('[name="password"]').fill('a'.repeat(129));
  await form.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(form.getByRole('alert')).toHaveText('Mật khẩu không được quá 128 ký tự.');
  expect(userPosts).toBe(0);
  expect(staffPassword).toHaveLength(8);
  await form.locator('[name="password"]').fill(staffPassword);
  await form.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
  await expect(form.locator('[name="password"]')).toHaveAttribute('type', 'text');
  await form.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click();
  await expect(form.locator('[name="password"]')).toHaveAttribute('type', 'password');
  await expect(form.locator('[name="role"] option')).toHaveCount(3); // empty choice + two staff roles
  await form.locator('[name="role"]').selectOption('SALES');
  await form.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(form).toBeHidden();
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(email);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  // Editing with an empty password must preserve the existing password.
  await page.getByRole('button', { name: 'Sửa Nhân viên phân quyền kiểm thử', exact: true }).click();
  await expect(form.locator('[name="password"]')).toHaveValue('');
  await form.locator('[name="password"]').fill('short');
  await form.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(form.getByRole('alert')).toHaveText('Mật khẩu phải có ít nhất 8 ký tự.');
  await form.locator('[name="password"]').fill('');
  await form.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(form).toBeHidden();
  const staffContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    const employee = await staffContext.newPage();
    const signIn = async () => {
      await employee.goto('/login');
      await employee.getByLabel('Email tài khoản').fill(email);
      await employee.getByLabel('Mật khẩu', { exact: true }).fill(staffPassword);
      await employee.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await expect(employee.locator('.sidebar')).toBeVisible();
    };
    await signIn();
    await expect(employee).toHaveURL(/\/pos$/);
    await page
      .getByRole('button', { name: 'Cấp vai trò cho Nhân viên phân quyền kiểm thử', exact: true })
      .click();
    await form.locator('[name="role"]').selectOption('INVENTORY');
    await form.getByRole('button', { name: 'Lưu thông tin' }).click();
    await expect(form).toBeHidden();
    expect((await employee.request.get('/api/auth/me')).status()).toBe(401);
    await signIn();
    await expect(employee).toHaveURL(/\/warehouse$/);
    await employee.goto('/lookup');
    await employee.getByLabel('Tìm kiếm', { exact: true }).fill('DEMO-1-0001');
    await expect(employee.locator('tbody tr')).toHaveCount(1);
    await expect(employee.locator('tbody')).toContainText('An Tâm Paracetamol');
    await employee.goto('/staff');
    await expect(employee.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  } finally {
    await staffContext.close();
  }
});
for (const role of ['manager', 'inventory', 'sales'])
  test(`${role}: tra cứu chung bằng mã vạch, lọc thuốc và xem thông tin lô`, async ({ page }) => {
    await login(page, role);
    await page.goto('/lookup');
    await ready(page);
    await page.getByLabel('Tìm kiếm', { exact: true }).fill('DEMO-1-0001');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByLabel('Loại thuốc tra cứu').selectOption('rx');
    await expect(page.getByText('Chưa có dữ liệu phù hợp.')).toBeVisible();
    await page.getByLabel('Loại thuốc tra cứu').selectOption('otc');
    await page.getByRole('button', { name: '3 lô' }).click();
    await expect(page.getByRole('dialog')).toContainText('DEMO-1-0001');
    await expect(page.getByRole('dialog')).toContainText('Kệ A');
    await expect(page.getByRole('dialog')).toContainText('SDK-MAU-001');
  });
test('Quản lý xem chi tiết chứng từ và bản in chứa tất cả dòng, gồm nhãn mẫu', async ({ page }) => {
  await login(page, 'manager');
  await page.goto('/receipt-history');
  await ready(page);
  await expect(page.getByRole('button', { name: 'Lập phiếu nhập', exact: true })).toHaveCount(0);
  await page.getByLabel('Trạng thái phiếu nhập').selectOption('CONFIRMED');
  await page.locator('tbody tr').first().getByRole('button').click();
  const count = await db.goodsReceiptItem.count({ where: { receiptId: 'demo-receipt-0' } });
  await expect(page.locator('.print-document tbody tr')).toHaveCount(count);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-document')).toBeVisible();
  await expect(page.locator('.print-document')).toContainText('DỮ LIỆU MẪU');
  await expect(page.locator('#root')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.goto('/sales');
  await ready(page);
  await page.locator('tbody tr').first().getByRole('button').click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'In / lưu PDF' })).toBeVisible();
  await expect(page.locator('.print-document')).toContainText('KHÔNG PHẢI THANH TOÁN THẬT');
});
test('Báo cáo chi tiết đổi khoảng ngày, xuất CSV và tính tồn cuối', async ({ page }) => {
  await login(page, 'manager');
  await page.goto('/reports');
  await page.getByRole('button', { name: 'Doanh thu chi tiết', exact: true }).click();
  await ready(page);
  await expect(page.locator('.detailed-report tbody tr')).toHaveCount(6);
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất CSV', exact: true }).click();
  const download = await downloadWait;
  expect(download.suggestedFilename()).toMatch(/^bao-cao-sales/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const content = Buffer.concat(chunks).toString('utf8');
  expect(content).toContain('DỮ LIỆU MẪU');
  expect(content.split('\r\n').length).toBeGreaterThan(9);
  await page.getByRole('button', { name: 'Nhập – Xuất – Tồn', exact: true }).click();
  await ready(page);
  const cells = await page.locator('.detailed-report tbody tr').first().locator('td').allTextContents();
  const value = (i: number) => Number(cells[i].replaceAll('.', ''));
  expect(value(6)).toBe(value(2) + value(3) - value(4) + value(5));
  await page.getByRole('button', { name: 'Nhập hàng chi tiết', exact: true }).click();
  await page.getByRole('button', { name: 'Hôm nay', exact: true }).click();
  await expect(page.getByText('Chưa có dữ liệu phù hợp.')).toBeVisible();
});
test('Nhập thuốc tìm theo mã vạch và thêm đúng thuốc vào phiếu', async ({ page }) => {
  await login(page, 'inventory');
  await page.goto('/receipts');
  await ready(page);
  await page.getByLabel('Tìm thuốc để nhập', { exact: true }).fill('DEMO-1-0004');
  await page.locator('.medicine-suggestions button').click();
  await expect(page.getByLabel('Thuốc nhập', { exact: true })).toHaveCount(4);
  await expect(page.getByLabel('Thuốc nhập', { exact: true }).last()).toHaveValue('demo-medicine-0-3');
});

test('Lỗi xác thực từ máy chủ được hiển thị đúng trường trong form', async ({ page }) => {
  await login(page, 'manager');
  const response = await page.request.post('/api/users', {
    headers: { Origin: new URL(page.url()).origin },
    data: { name: 'Kiểm tra mật khẩu ngắn', email, password: '1234567', role: 'SALES', active: true },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).errors.fieldErrors.password).toContain('Mật khẩu phải có ít nhất 8 ký tự.');
  await page.goto('/suppliers');
  await page.getByRole('button', { name: 'Thêm nhà cung cấp', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.locator('[name="code"]').fill('INVALID-INPUT-ONLY');
  await form.locator('[name="name"]').fill('Kiểm tra lỗi dữ liệu');
  await form.locator('[name="address"]').fill('Địa chỉ kiểm thử');
  await form.locator('[name="phone"]').fill('khong-phai-so');
  await form.getByRole('button', { name: 'Lưu thông tin' }).click();
  const phone = form.locator('[name="phone"]');
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(phone).toBeFocused();
  await expect(form.locator('.field-error')).toHaveText('Số điện thoại không hợp lệ.');
  await expect(form.locator('.form-error')).toHaveText('Vui lòng kiểm tra các trường được đánh dấu.');
  await form.getByRole('button', { name: 'Hủy bỏ' }).click();
});
