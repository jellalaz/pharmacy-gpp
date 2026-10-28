import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { allow, pharmacyId } from '../middlewares/auth.js';
import { dateString } from './validation.js';
import { HttpError } from '../utils/errors.js';
export const reports = Router();
reports.get('/', allow('MANAGER'), async (req, res) => {
  const filter = z.object({ from: dateString, to: dateString }).parse(req.query);
  const from = new Date(`${filter.from}T00:00:00+07:00`),
    to = new Date(`${filter.to}T23:59:59.999+07:00`);
  if (from > to || +to - +from > 366 * 86400000)
    throw new HttpError(400, 'Khoảng báo cáo phải hợp lệ và không quá 366 ngày.');
  const owner = pharmacyId(req);
  const [sales, receipts, inventory] = await Promise.all([
    db.sale.findMany({
      where: { pharmacyId: owner, status: 'CONFIRMED', createdAt: { gte: from, lte: to } },
      include: { items: true },
    }),
    db.goodsReceipt.findMany({
      where: { pharmacyId: owner, status: 'CONFIRMED', receivedDate: { gte: from, lte: to } },
      include: { items: true },
    }),
    db.inventoryBalance.aggregate({ where: { pharmacyId: owner }, _sum: { quantity: true } }),
  ]);
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  const daily = new Map<string, { date: string; revenue: number; incoming: number; outgoing: number }>();
  for (let t = +from; t <= +to; t += 86400000) {
    const key = dayKey(new Date(t));
    daily.set(key, { date: key, revenue: 0, incoming: 0, outgoing: 0 });
  }
  const tops = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const sale of sales) {
    const day = daily.get(dayKey(sale.createdAt));
    if (day) {
      day.revenue += Number(sale.total);
      day.outgoing += sale.items.reduce((s, i) => s + i.quantity, 0);
    }
    for (const item of sale.items) {
      const top = tops.get(item.medicineName) ?? { name: item.medicineName, quantity: 0, revenue: 0 };
      top.quantity += item.quantity;
      top.revenue += Number(item.unitPrice) * item.quantity;
      tops.set(item.medicineName, top);
    }
  }
  for (const receipt of receipts) {
    const day = daily.get(dayKey(receipt.receivedDate));
    if (day) day.incoming += receipt.items.reduce((s, i) => s + i.quantity, 0);
  }
  res.json({
    dataMode: sales.some((s) => s.isDemo) || receipts.some((r) => r.isDemo) ? 'DEMO' : 'LIVE',
    revenue: sales.reduce((s, i) => s + Number(i.total), 0),
    transactions: sales.length,
    imported: receipts.reduce((s, r) => s + r.items.reduce((a, i) => a + i.quantity, 0), 0),
    sold: sales.reduce((s, r) => s + r.items.reduce((a, i) => a + i.quantity, 0), 0),
    stock: inventory._sum.quantity ?? 0,
    daily: [...daily.values()],
    top: [...tops.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  });
});

// Detail reports share the tenant boundary and Vietnam date boundaries of the summary.
reports.get('/details', allow('MANAGER'), async (req, res) => {
  const {
    from: start,
    to: end,
    kind,
  } = z
    .object({
      from: dateString,
      to: dateString,
      kind: z.enum(['sales', 'receipts', 'inventory']),
    })
    .parse(req.query);
  const from = new Date(`${start}T00:00:00+07:00`);
  const to = new Date(`${end}T23:59:59.999+07:00`);
  if (from > to || +to - +from > 366 * 86400000)
    throw new HttpError(400, 'Khoảng báo cáo phải hợp lệ và không quá 366 ngày.');
  const owner = pharmacyId(req);
  if (kind === 'inventory') {
    const [medicines, movements] = await Promise.all([
      db.medicine.findMany({ where: { pharmacyId: owner }, orderBy: { code: 'asc' } }),
      db.stockMovement.findMany({
        where: { pharmacyId: owner, createdAt: { lte: to } },
        include: { batch: { select: { medicineId: true } } },
      }),
    ]);
    const rows = new Map(
      medicines.map((m) => [
        m.id,
        {
          id: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          opening: 0,
          incoming: 0,
          outgoing: 0,
          adjustment: 0,
          closing: 0,
        },
      ]),
    );
    for (const movement of movements) {
      const row = rows.get(movement.batch.medicineId);
      if (!row) continue;
      if (movement.createdAt < from) row.opening += movement.quantity;
      else if (movement.type === 'RECEIPT') row.incoming += movement.quantity;
      else if (movement.type === 'SALE') row.outgoing -= movement.quantity;
      else row.adjustment += movement.quantity;
      row.closing += movement.quantity;
    }
    res.json({ kind, dataMode: movements.some((m) => m.isDemo) ? 'DEMO' : 'LIVE', rows: [...rows.values()] });
    return;
  }
  if (kind === 'sales') {
    const records = await db.sale.findMany({
      where: { pharmacyId: owner, status: 'CONFIRMED', createdAt: { gte: from, lte: to } },
      include: { createdBy: { select: { name: true } }, items: { include: { batch: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      kind,
      dataMode: records.some((s) => s.isDemo) ? 'DEMO' : 'LIVE',
      documents: records.length,
      total: Number(records.reduce((sum, s) => sum.add(s.total), new Prisma.Decimal(0))),
      discount: Number(records.reduce((sum, s) => sum.add(s.discount), new Prisma.Decimal(0))),
      rows: records.flatMap((s) =>
        s.items.map((i) => ({
          id: i.id,
          code: s.code,
          date: s.createdAt,
          partner: s.customerName,
          staff: s.createdBy.name,
          name: i.medicineName,
          lot: i.batch.lotNumber,
          unit: i.unit,
          quantity: i.quantity,
          price: Number(i.unitPrice),
          amount: Number(i.unitPrice.mul(i.quantity)),
        })),
      ),
    });
    return;
  }
  const records = await db.goodsReceipt.findMany({
    where: { pharmacyId: owner, status: 'CONFIRMED', receivedDate: { gte: from, lte: to } },
    include: {
      supplier: true,
      createdBy: { select: { name: true } },
      items: { include: { medicine: true } },
    },
    orderBy: { receivedDate: 'desc' },
  });
  res.json({
    kind,
    dataMode: records.some((r) => r.isDemo) ? 'DEMO' : 'LIVE',
    documents: records.length,
    total: Number(records.reduce((sum, r) => sum.add(r.total), new Prisma.Decimal(0))),
    discount: 0,
    rows: records.flatMap((r) =>
      r.items.map((i) => ({
        id: i.id,
        code: r.code,
        date: r.receivedDate,
        partner: r.supplier.name,
        staff: r.createdBy.name,
        name: i.medicine.name,
        lot: i.lotNumber,
        unit: i.unit,
        quantity: i.quantity,
        price: Number(i.purchasePrice),
        amount: Number(i.purchasePrice.mul(i.quantity)),
      })),
    ),
  });
});
