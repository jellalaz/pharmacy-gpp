import { Router } from 'express';
import { db } from '../config/db.js';
import { allow, pharmacyId } from '../middlewares/auth.js';
import { HttpError } from '../utils/errors.js';
export const sales = Router();
sales.use(allow('SALES', 'MANAGER'));
sales.get('/', async (req, res) => {
  res.json(
    await db.sale.findMany({
      where: { pharmacyId: pharmacyId(req) },
      include: { createdBy: { select: { name: true } }, items: { include: { batch: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  );
});
sales.post('/', allow('SALES'), (_req, _res) => {
  throw new HttpError(501, 'POS hiện chỉ hỗ trợ xem trước. Chưa tạo phiếu bán hoặc xử lý thanh toán.');
});
