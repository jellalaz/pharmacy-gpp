import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, digestToken } from '../src/utils/password.js';
import { money, receiptSchema, userSchema } from '../src/modules/validation.js';
describe('Bảo vệ thông tin đăng nhập', () => {
  it('hash bằng salt riêng và xác minh đúng mật khẩu', async () => {
    const a = await hashPassword('UnitTest!2026');
    const b = await hashPassword('UnitTest!2026');
    expect(a).not.toBe(b);
    expect(a).not.toContain('UnitTest');
    expect(await verifyPassword('UnitTest!2026', a)).toBe(true);
    expect(await verifyPassword('sai', a)).toBe(false);
  });
  it('không lưu token phiên dạng rõ', () => {
    expect(digestToken('opaque-session')).toHaveLength(64);
    expect(digestToken('opaque-session')).not.toBe('opaque-session');
  });
});
describe('Kiểm tra đầu vào', () => {
  it('mật khẩu nhận đủ 8–128 ký tự và giữ nguyên khoảng trắng', () => {
    const user = { name: 'Test', email: 't@example.com', role: 'SALES' };
    expect(userSchema.safeParse({ ...user, password: '1234567' }).success).toBe(false);
    expect(userSchema.parse({ ...user, password: ' Nv!026 ' }).password).toBe(' Nv!026 ');
    expect(userSchema.safeParse({ ...user, password: 'x'.repeat(128) }).success).toBe(true);
    expect(userSchema.safeParse({ ...user, password: 'x'.repeat(129) }).success).toBe(false);
  });
  it('giữ giá tiền chính xác ở dạng chuỗi', () => {
    expect(money.parse('12500.25')).toBe('12500.25');
    expect(money.safeParse('-1').success).toBe(false);
    expect(money.safeParse('1.234').success).toBe(false);
    expect(money.safeParse(Infinity).success).toBe(false);
  });
  it('không nhận vai trò lạ hoặc trường nâng quyền ngoài schema', () => {
    expect(userSchema.safeParse({ name: 'Test', email: 't@example.com', role: 'SUPERADMIN' }).success).toBe(
      false,
    );
    expect(
      userSchema.safeParse({ name: 'Test', email: 't@example.com', role: 'SALES', isAdmin: true }).success,
    ).toBe(false);
  });
  it('phiếu nháp không cho truyền trạng thái CONFIRMED và không nhận lượng âm', () => {
    const valid = {
      supplierId: 's',
      documentNo: 'PN01',
      receivedDate: '2026-10-28',
      items: [
        { medicineId: 'm', quantity: 2, purchasePrice: '12.25', lotNumber: 'L01', expiryDate: '2028-01-01' },
      ],
    };
    expect(receiptSchema.safeParse(valid).success).toBe(true);
    expect(receiptSchema.safeParse({ ...valid, status: 'CONFIRMED' }).success).toBe(false);
    expect(receiptSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: -2 }] }).success).toBe(
      false,
    );
    expect(receiptSchema.safeParse({ ...valid, receivedDate: '2026-02-30' }).success).toBe(false);
  });
});
