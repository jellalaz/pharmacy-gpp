export const money = (value: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    Number(value),
  );
export const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
export const vndInput = (value: number) => (value > 0 ? number(value) : '');
export const parseVndInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 15);
  return digits ? Number(digits) : 0;
};
export const date = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
export const daysFromToday = (value: string, now = today()) =>
  Math.round((Date.parse(value.slice(0, 10)) - Date.parse(now)) / 86400000);
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
export const matches = (query: string, ...texts: (string | null | undefined)[]) =>
  normalize(texts.filter(Boolean).join(' ')).includes(normalize(query));
export const roleNames = {
  ADMIN: 'Quản trị hệ thống',
  MANAGER: 'Quản lý nhà thuốc',
  INVENTORY: 'Nhân viên kho',
  SALES: 'Nhân viên bán thuốc',
};
