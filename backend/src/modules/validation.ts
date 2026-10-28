import { z } from 'zod';
export const text = (max = 160) => z.string().trim().min(1, 'Thông tin này là bắt buộc.').max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));
const email = z
  .union([z.string().trim().email().max(160), z.literal('')])
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));
export const phone = z
  .string()
  .trim()
  .regex(/^[+\d ()-]{8,30}$/, 'Số điện thoại không hợp lệ.');
export const pharmacySchema = z
  .object({
    code: text(40),
    name: text(),
    address: text(255),
    phone,
    email,
    active: z.boolean().default(true),
    managerId: z.string().nullable().optional(),
  })
  .strict();
export const userSchema = z
  .object({
    name: text(120),
    email: z
      .string()
      .trim()
      .email()
      .max(160)
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
      .max(128, 'Mật khẩu không được quá 128 ký tự.')
      .optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'INVENTORY', 'SALES']),
    pharmacyId: z.string().nullable().optional(),
    active: z.boolean().default(true),
  })
  .strict();
export const money = z
  .union([
    z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, 'Giá trị tiền không hợp lệ.'),
    z.number().finite().nonnegative().max(999999999).multipleOf(0.01),
  ])
  .transform(String);
export const medicineSchema = z
  .object({
    code: text(40),
    name: text(),
    ingredient: text(),
    strength: text(80),
    unit: text(40),
    manufacturer: text(),
    barcode: optionalText(64),
    registrationNumber: optionalText(80),
    storageLocation: optionalText(80),
    category: text(80),
    prescription: z.boolean(),
    salePrice: money,
    lowStock: z.number().int().min(0).max(1000000).default(30),
    description: z.string().max(2000).optional(),
    active: z.boolean().default(true),
  })
  .strict();
export const supplierSchema = z
  .object({
    code: text(40),
    name: text(),
    address: text(255),
    phone,
    email,
    taxCode: optionalText(40),
    contactName: optionalText(120),
    note: optionalText(2000),
    active: z.boolean().default(true),
  })
  .strict();
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Ngày không hợp lệ.');
export const receiptSchema = z
  .object({
    supplierId: text(),
    documentNo: text(80),
    receivedDate: dateString,
    note: z.string().max(2000).optional(),
    items: z
      .array(
        z
          .object({
            medicineId: text(),
            quantity: z.number().int().positive().max(100000),
            purchasePrice: money,
            lotNumber: text(80),
            expiryDate: dateString,
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
