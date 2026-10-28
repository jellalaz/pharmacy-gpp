import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from './config/env.js';
import { db } from './config/db.js';
import { HttpError } from './utils/errors.js';
import { authenticate, allow, pharmacyId } from './middlewares/auth.js';
import { auth } from './modules/auth.js';
import { pharmacies } from './modules/pharmacies.js';
import { users } from './modules/users.js';
import { medicines, suppliers } from './modules/catalog.js';
import { receipts } from './modules/receipts.js';
import { sales } from './modules/sales.js';
import { reports } from './modules/reports.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet(), express.json({ limit: '256kb' }), cookieParser());
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== env.APP_ORIGIN)
    throw new HttpError(403, 'Nguồn yêu cầu không hợp lệ.');
  next();
});
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', database: 'mysql', phase: 1 });
});
app.use('/api/auth', auth);
app.use('/api', authenticate);
app.use('/api/pharmacies', pharmacies);
app.use('/api/users', users);
app.use('/api/medicines', medicines);
app.use('/api/suppliers', suppliers);
app.use('/api/receipts', receipts);
app.use('/api/sales', sales);
app.use('/api/reports', reports);
app.get('/api/inventory', allow('MANAGER', 'INVENTORY', 'SALES'), async (req, res) => {
  res.json(
    await db.medicineBatch.findMany({
      where: { pharmacyId: pharmacyId(req) },
      include: { medicine: true, balance: true },
      orderBy: { expiryDate: 'asc' },
    }),
  );
});
app.post('/api/stocktakes', allow('INVENTORY'), (_req, _res) => {
  throw new HttpError(501, 'Kiểm kê hiện là bản mô phỏng, chưa lưu biên bản và chưa điều chỉnh tồn.');
});
app.use((_req, _res) => {
  throw new HttpError(404, 'Đường dẫn không tồn tại.');
});
const errorHandler: express.ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: 'Dữ liệu chưa hợp lệ.', errors: error.flatten() });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: 'Mã hoặc email đã tồn tại. Vui lòng sử dụng giá trị khác.' });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ message: 'Dữ liệu liên kết không hợp lệ.' });
      return;
    }
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ message: 'Nội dung JSON không hợp lệ.' });
    return;
  }
  console.error(error instanceof Error ? error.name : 'Unhandled error');
  res.status(500).json({ message: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' });
};
app.use(errorHandler);
