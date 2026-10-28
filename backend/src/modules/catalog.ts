import { Router } from 'express';
import { db } from '../config/db.js';
import { allow, pharmacyId } from '../middlewares/auth.js';
import { medicineSchema, supplierSchema } from './validation.js';
import { requireFound } from '../utils/errors.js';
import { audit } from '../services/audit.js';
export const medicines = Router();
medicines.get('/', allow('MANAGER', 'INVENTORY', 'SALES'), async (req, res) => {
  res.json(
    await db.medicine.findMany({
      where: { pharmacyId: pharmacyId(req) },
      include: { batches: { include: { balance: true }, orderBy: { expiryDate: 'asc' } } },
      orderBy: { code: 'asc' },
    }),
  );
});
for (const method of ['post', 'put'] as const)
  medicines[method](method === 'post' ? '/' : '/:id', allow('MANAGER'), async (req, res) => {
    const data = medicineSchema.parse(req.body);
    const owner = pharmacyId(req),
      id = String(('id' in req.params ? req.params.id : undefined) ?? '');
    const where = { id_pharmacyId: { id, pharmacyId: owner } };
    if (method === 'put') requireFound(await db.medicine.findUnique({ where }));
    const result = await db.$transaction(async (tx) => {
      const record =
        method === 'post'
          ? await tx.medicine.create({ data: { ...data, pharmacyId: owner } })
          : await tx.medicine.update({ where, data });
      await audit(tx, req.user.id, owner, method === 'post' ? 'CREATE' : 'UPDATE', 'Medicine', record.id);
      return record;
    });
    res.status(method === 'post' ? 201 : 200).json(result);
  });
export const suppliers = Router();
suppliers.get('/', allow('MANAGER', 'INVENTORY'), async (req, res) => {
  res.json(await db.supplier.findMany({ where: { pharmacyId: pharmacyId(req) }, orderBy: { code: 'asc' } }));
});
for (const method of ['post', 'put'] as const)
  suppliers[method](method === 'post' ? '/' : '/:id', allow('MANAGER'), async (req, res) => {
    const data = supplierSchema.parse(req.body),
      owner = pharmacyId(req),
      id = String(('id' in req.params ? req.params.id : undefined) ?? '');
    const where = { id_pharmacyId: { id, pharmacyId: owner } };
    if (method === 'put') requireFound(await db.supplier.findUnique({ where }));
    const result = await db.$transaction(async (tx) => {
      const record =
        method === 'post'
          ? await tx.supplier.create({ data: { ...data, pharmacyId: owner } })
          : await tx.supplier.update({ where, data });
      await audit(tx, req.user.id, owner, method === 'post' ? 'CREATE' : 'UPDATE', 'Supplier', record.id);
      return record;
    });
    res.status(method === 'post' ? 201 : 200).json(result);
  });
