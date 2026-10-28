import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '../config/db.js';
import { allow, pharmacyId } from '../middlewares/auth.js';
import { receiptSchema } from './validation.js';
import { requireFound, HttpError } from '../utils/errors.js';
import { audit } from '../services/audit.js';
export const receipts = Router();
receipts.use(allow('INVENTORY', 'MANAGER'));
receipts.get('/', async (req, res) => {
  res.json(
    await db.goodsReceipt.findMany({
      where: { pharmacyId: pharmacyId(req) },
      include: {
        supplier: true,
        createdBy: { select: { name: true } },
        items: { include: { medicine: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  );
});
receipts.post('/', allow('INVENTORY'), async (req, res) => {
  const input = receiptSchema.parse(req.body),
    owner = pharmacyId(req);
  const result = await db.$transaction(async (tx) => {
    requireFound(
      await tx.supplier.findFirst({ where: { id: input.supplierId, pharmacyId: owner, active: true } }),
    );
    const uniqueIds = [...new Set(input.items.map((i) => i.medicineId))];
    const meds = await tx.medicine.findMany({
      where: { id: { in: uniqueIds }, pharmacyId: owner, active: true },
    });
    if (meds.length !== uniqueIds.length)
      throw new HttpError(400, 'Thuốc không hoạt động hoặc không thuộc nhà thuốc.');
    const total = input.items.reduce(
      (sum, i) => sum.add(new Prisma.Decimal(i.purchasePrice).mul(i.quantity)),
      new Prisma.Decimal(0),
    );
    if (total.greaterThan('999999999999.99')) throw new HttpError(400, 'Tổng phiếu vượt giới hạn.');
    const receipt = await tx.goodsReceipt.create({
      data: {
        pharmacyId: owner,
        supplierId: input.supplierId,
        createdById: req.user.id,
        code: `PN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        documentNo: input.documentNo,
        receivedDate: new Date(input.receivedDate),
        note: input.note,
        total,
        status: 'DRAFT',
        items: {
          create: input.items.map((i) => ({
            ...i,
            expiryDate: new Date(i.expiryDate),
            unit: meds.find((m) => m.id === i.medicineId)!.unit,
          })),
        },
      },
      include: { items: true },
    });
    await audit(tx, req.user.id, owner, 'CREATE_DRAFT', 'GoodsReceipt', receipt.id);
    return receipt;
  });
  res.status(201).json(result);
});
receipts.post('/:id/confirm', allow('INVENTORY'), (_req, _res) => {
  throw new HttpError(501, 'Xác nhận nhập và cập nhật tồn thuộc giai đoạn 2. Phiếu chỉ được lưu nháp.');
});
