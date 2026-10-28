import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { login, ready } from './helpers';

config({ path: 'backend/.env', quiet: true });
const db = new PrismaClient();
const suffix = Date.now().toString(36);
const prefix = `E2E-${suffix}`;

test.beforeAll(() => {
  if (process.env.DEMO_SEED !== 'true') throw new Error('CRUD E2E yêu cầu DB demo/test, DEMO_SEED=true.');
});
test.afterAll(async () => {
  // Clean only records from this run, including records created before an assertion failed.
  const [pharmacies, users, medicines, suppliers, receipts] = await Promise.all([
    db.pharmacy.findMany({ where: { code: `${prefix}-P` } }),
    db.user.findMany({ where: { email: `${prefix.toLowerCase()}@test.invalid` } }),
    db.medicine.findMany({ where: { code: `${prefix}-M` } }),
    db.supplier.findMany({ where: { code: `${prefix}-S` } }),
    db.goodsReceipt.findMany({ where: { documentNo: `${prefix}-R` } }),
  ]);
  const ids = [...pharmacies, ...users, ...medicines, ...suppliers, ...receipts].map((r) => r.id);
  await db.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { entityId: { in: ids } } });
    await tx.goodsReceiptItem.deleteMany({ where: { receiptId: { in: receipts.map((r) => r.id) } } });
    await tx.goodsReceipt.deleteMany({ where: { id: { in: receipts.map((r) => r.id) } } });
    await tx.medicine.deleteMany({ where: { id: { in: medicines.map((r) => r.id) } } });
    await tx.supplier.deleteMany({ where: { id: { in: suppliers.map((r) => r.id) } } });
    await tx.user.deleteMany({ where: { id: { in: users.map((r) => r.id) } } });
    await tx.pharmacy.deleteMany({ where: { id: { in: pharmacies.map((r) => r.id) } } });
  });
  await db.$disconnect();
});

test('Admin lưu nhà thuốc và tài khoản từ form, đọc lại sau reload', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/pharmacies');
  await page.getByRole('button', { name: 'Thêm nhà thuốc', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('[name="name"]').fill('Nhà thuốc kiểm thử giao diện');
  await dialog.locator('[name="code"]').fill(`${prefix}-P`);
  await dialog.locator('[name="phone"]').fill('0900000000');
  await dialog.locator('[name="address"]').fill('Địa chỉ kiểm thử');
  await dialog.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(`${prefix}-P`);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const pharmacy = await db.pharmacy.findUniqueOrThrow({ where: { code: `${prefix}-P` } });
  await page.goto('/users');
  await page.getByRole('button', { name: 'Thêm người dùng' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[name="name"]').fill('Quản lý kiểm thử giao diện');
  await dialog.locator('[name="email"]').fill(`${prefix.toLowerCase()}@test.invalid`);
  await dialog.locator('[name="password"]').fill('OnlyForTest!2026');
  await dialog.locator('[name="role"]').selectOption('MANAGER');
  await dialog.locator('[name="pharmacyId"]').selectOption(pharmacy.id);
  await dialog.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(`${prefix.toLowerCase()}@test.invalid`);
  await expect(page.locator('tbody tr')).toContainText('Quản lý nhà thuốc');
});

test('Manager lưu/sửa thuốc và nhà cung cấp từ giao diện', async ({ page }) => {
  await login(page, 'manager');
  await page.goto('/medicines');
  await page.getByRole('button', { name: 'Thêm thuốc mới', exact: true }).click();
  let dialog = page.getByRole('dialog');
  for (const [name, value] of Object.entries({
    code: `${prefix}-M`,
    name: 'Thuốc kiểm thử giao diện',
    ingredient: 'Thành phần mẫu',
    strength: '10 mg',
    unit: 'Viên',
    manufacturer: 'Nhà sản xuất mẫu',
    category: 'Nhóm kiểm thử',
    salePrice: '12345.25',
  }))
    await dialog.locator(`[name="${name}"]`).fill(value);
  await dialog.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(`${prefix}-M`);
  await page.getByRole('button', { name: 'Sửa Thuốc kiểm thử giao diện', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[name="salePrice"]').fill('15000');
  await dialog.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(`${prefix}-M`);
  await expect(page.locator('tbody tr')).toContainText('15.000');
  await page.goto('/suppliers');
  await page.getByRole('button', { name: 'Thêm nhà cung cấp', exact: true }).click();
  dialog = page.getByRole('dialog');
  for (const [name, value] of Object.entries({
    code: `${prefix}-S`,
    name: 'NCC kiểm thử giao diện',
    address: 'Địa chỉ kiểm thử',
    phone: '0900000000',
  }))
    await dialog.locator(`[name="${name}"]`).fill(value);
  await dialog.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(`${prefix}-S`);
  await expect(page.locator('tbody tr')).toContainText('NCC kiểm thử giao diện');
});

test('Nhân viên kho lưu nháp thật và xem lại, tồn không đổi', async ({ page }) => {
  const before = await db.inventoryBalance.aggregate({
    where: { pharmacyId: 'demo-pharmacy-1' },
    _sum: { quantity: true },
  });
  await login(page, 'inventory');
  await page.goto('/receipts');
  await ready(page);
  await page.getByLabel('Số chứng từ').fill(`${prefix}-R`);
  await page.getByRole('button', { name: 'Lưu phiếu nháp', exact: true }).click();
  await expect(page.locator('.saved-notice')).toContainText('Tồn kho chưa thay đổi');
  await page.reload();
  await page.getByRole('button', { name: 'Danh sách phiếu nhập' }).click();
  const receipt = await db.goodsReceipt.findFirstOrThrow({ where: { documentNo: `${prefix}-R` } });
  await expect(page.locator('tbody')).toContainText(receipt.code);
  expect(receipt.status).toBe('DRAFT');
  const after = await db.inventoryBalance.aggregate({
    where: { pharmacyId: 'demo-pharmacy-1' },
    _sum: { quantity: true },
  });
  expect(after).toEqual(before);
});
