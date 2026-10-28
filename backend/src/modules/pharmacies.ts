import { Router } from 'express';
import { db } from '../config/db.js';
import { allow } from '../middlewares/auth.js';
import { pharmacySchema } from './validation.js';
import { HttpError, requireFound } from '../utils/errors.js';
import { audit } from '../services/audit.js';
export const pharmacies = Router();
pharmacies.use(allow('ADMIN'));
pharmacies.get('/', async (_req, res) => {
  res.json(
    await db.pharmacy.findMany({
      orderBy: { code: 'asc' },
      include: {
        users: { where: { role: 'MANAGER' }, select: { id: true, name: true, active: true } },
        _count: { select: { users: true, medicines: true } },
      },
    }),
  );
});
for (const method of ['post', 'put'] as const)
  pharmacies[method](method === 'post' ? '/' : '/:id', async (req, res) => {
    const { managerId, ...data } = pharmacySchema.parse(req.body);
    const id = String(('id' in req.params ? req.params.id : undefined) ?? '');
    if (method === 'put') requireFound(await db.pharmacy.findUnique({ where: { id } }));
    const result = await db.$transaction(async (tx) => {
      const pharmacy =
        method === 'post'
          ? await tx.pharmacy.create({ data })
          : await tx.pharmacy.update({ where: { id }, data });
      if (managerId) {
        const manager = await tx.user.findFirst({ where: { id: managerId, role: 'MANAGER', active: true } });
        if (!manager || (manager.pharmacyId && manager.pharmacyId !== pharmacy.id))
          throw new HttpError(400, 'Chỉ gán quản lý chưa thuộc nhà thuốc khác.');
        await tx.user.update({ where: { id: managerId }, data: { pharmacyId: pharmacy.id } });
        await tx.session.deleteMany({ where: { userId: managerId } });
      }
      await audit(
        tx,
        req.user.id,
        pharmacy.id,
        method === 'post' ? 'CREATE' : 'UPDATE',
        'Pharmacy',
        pharmacy.id,
      );
      return pharmacy;
    });
    res.status(method === 'post' ? 201 : 200).json(result);
  });
