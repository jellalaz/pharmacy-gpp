import { describe, expect, it } from 'vitest';
import { csvText } from './export';
import { parseVndInput, vndInput } from './format';
describe('CSV dùng cho báo cáo', () => {
  it('giữ dấu tiếng Việt, dấu phẩy, nháy và xuống dòng', () => {
    expect(csvText(['Thuốc'], [['Tên, "mẫu"\nA']])).toBe('\ufeff"Thuốc"\r\n"Tên, ""mẫu""\nA"');
  });
  it('vô hiệu hóa công thức từ chuỗi nhập và giữ số âm dưới dạng số', () => {
    const csv = csvText(['Dữ liệu'], [['=1+1'], [' +SUM(A1)'], ['@SUM(A1)'], [-10], [null]]);
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"\' +SUM(A1)"');
    expect(csv).toContain('"\'@SUM(A1)"');
    expect(csv).toContain('"-10"');
    expect(csv).toContain('""');
  });
});

describe('ô nhập tiền VND', () => {
  it('hiển thị dấu chấm hàng nghìn và đọc lại đúng giá trị số', () => {
    expect(vndInput(400000)).toBe('400.000');
    expect(parseVndInput('400.000')).toBe(400000);
    expect(parseVndInput('1.250.000 đ')).toBe(1250000);
    expect(vndInput(0)).toBe('');
  });
});
