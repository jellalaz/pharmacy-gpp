import { describe, it, expect } from 'vitest';
import { allocateFEFO, sellable, stock } from './inventory';
import type { Batch, Medicine } from '../types';
const now = '2026-10-28';
const batch = (
  id: string,
  expiryDate: string,
  quantity: number,
  status: Batch['status'] = 'AVAILABLE',
): Batch => ({
  id,
  medicineId: 'm',
  lotNumber: id,
  expiryDate,
  receivedAt: '2026-01-01',
  purchasePrice: '1000',
  isDemo: true,
  status,
  balance: { quantity },
});
const medicine: Medicine = {
  id: 'm',
  code: 'M01',
  name: 'Thuốc mẫu',
  ingredient: 'Mẫu',
  strength: '10 mg',
  unit: 'Viên',
  manufacturer: 'Mẫu',
  category: 'Mẫu',
  prescription: false,
  salePrice: '2000',
  lowStock: 10,
  description: 'Demo',
  active: true,
  batches: [
    batch('far', '2027-12-01', 20),
    batch('expired', '2026-01-01', 80),
    batch('soon', '2026-11-01', 5),
    batch('today', '2026-10-28', 8),
    batch('quarantine', '2026-10-30', 50, 'QUARANTINED'),
    batch('recalled', '2026-10-29', 50, 'RECALLED'),
  ],
};
describe('FEFO theo lô', () => {
  it('ưu tiên lô gần hạn và phân bổ nhiều lô khi cần', () => {
    const result = allocateFEFO(medicine, 8, now);
    expect(result.allocations.map((a) => [a.batch.id, a.quantity])).toEqual([
      ['soon', 5],
      ['far', 3],
    ]);
    expect(result.missing).toBe(0);
  });
  it('loại trừ hết hạn, đến hạn hôm nay, cách ly và thu hồi', () => {
    expect(sellable(medicine, now)).toBe(25);
    expect(stock(medicine)).toBe(213);
    expect(allocateFEFO(medicine, 26, now).missing).toBe(1);
  });
  it('không bán thuốc ngừng kinh doanh hoặc lượng không nguyên dương', () => {
    expect(allocateFEFO({ ...medicine, active: false }, 2, now).allocations).toEqual([]);
    expect(sellable({ ...medicine, active: false }, now)).toBe(0);
    expect(allocateFEFO(medicine, 1.5, now).allocations).toEqual([]);
    expect(allocateFEFO(medicine, -1, now).allocations).toEqual([]);
  });
  it('không biến đổi tồn kho nguồn', () => {
    const before = JSON.stringify(medicine);
    allocateFEFO(medicine, 20, now);
    expect(JSON.stringify(medicine)).toBe(before);
  });
  it('bỏ lô không có tồn', () => {
    expect(sellable({ ...medicine, batches: [batch('empty', '2028-01-01', 0)] }, now)).toBe(0);
  });
});
