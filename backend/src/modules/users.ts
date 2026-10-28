import { Router } from 'express';
import { db } from '../config/db.js';
import { allow, pharmacyId } from '../middlewares/auth.js';
import { userSchema } from './validation.js';
import { HttpError, requireFound } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';
import { audit } from '../services/audit.js';
import { z } from 'zod';
export const users = Router();
const select = {
  id: true,
  name: true,
  email: true,
  role: true,
  pharmacyId: true,
  active: true,
  createdAt: true,
  pharmacy: { select: { id: true, name: true, code: true } },
} as const;
users.use(allow('ADMIN', 'MANAGER'));
users.get('/', async (req, res) => {
  const where =
    req.user.role === 'ADMIN'
      ? {}
      : { pharmacyId: pharmacyId(req), role: { in: ['SALES', 'INVENTORY'] as ('SALES' | 'INVENTORY')[] } };
  res.json(await db.user.findMany({ where, select, orderBy: { createdAt: 'asc' } }));
});
// A dedicated, narrow operation prevents accidental password/profile changes when granting a role.
users.patch('/:id/role', allow('MANAGER'), async (req, res) => {
  const { role } = z
    .object({ role: z.enum(['SALES', 'INVENTORY']) })
    .strict()
    .parse(req.body);
  const owner = pharmacyId(req);
  const result = await db.$transaction(async (tx) => {
    const target = requireFound(
      await tx.user.findFirst({
        where: { id: String(req.params.id), pharmacyId: owner, role: { in: ['SALES', 'INVENTORY'] } },
      }),
    );
    const changed = await tx.user.updateMany({
      where: { id: target.id, pharmacyId: owner, role: { in: ['SALES', 'INVENTORY'] } },
      data: { role },
    });
    if (changed.count !== 1) throw new HttpError(409, 'Tài khoản đã thay đổi. Vui lòng tải lại.');
    await tx.session.deleteMany({ where: { userId: target.id } });
    await audit(tx, req.user.id, owner, 'CHANGE_STAFF_ROLE', 'User', target.id);
    return tx.user.findUniqueOrThrow({ where: { id: target.id }, select });
  });
  res.json(result);
});
for (const method of ['post', 'put'] as const)
  users[method](method === 'post' ? '/' : '/:id', async (req, res) => {
    const input = userSchema.parse(req.body);
    const id = String(('id' in req.params ? req.params.id : undefined) ?? '');
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && !['SALES', 'INVENTORY'].includes(input.role))
      throw new HttpError(403, 'Quản lý chỉ được tạo hoặc sửa nhân viên bán thuốc và nhân viên kho.');
    if (!isAdmin && input.pharmacyId && input.pharmacyId !== pharmacyId(req))
      throw new HttpError(403, 'Không được gán nhân viên sang nhà thuốc khác.');
    if (method === 'put') {
      const target = requireFound(
        await db.user.findFirst({
          where: {
            id,
            ...(!isAdmin ? { pharmacyId: pharmacyId(req), role: { in: ['SALES', 'INVENTORY'] } } : {}),
          },
        }),
      );
      if (target.id === req.user.id && (!input.active || input.role !== 'ADMIN' || input.pharmacyId))
        throw new HttpError(400, 'Không được tự khóa hoặc tự thay đổi quyền quản trị.');
    } else if (!input.password) throw new HttpError(400, 'Tài khoản mới cần mật khẩu tối thiểu 8 ký tự.');
    const owner = input.role === 'ADMIN' ? null : isAdmin ? input.pharmacyId || null : pharmacyId(req);
    if (!owner && ['SALES', 'INVENTORY'].includes(input.role))
      throw new HttpError(400, 'Nhân viên phải thuộc một nhà thuốc.');
    if (owner) requireFound(await db.pharmacy.findUnique({ where: { id: owner } }));
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    const data = {
      name: input.name,
      email: input.email,
      role: input.role,
      pharmacyId: owner,
      active: input.active,
    };
    const result = await db.$transaction(async (tx) => {
      const user =
        method === 'post'
          ? await tx.user.create({ data: { ...data, passwordHash: passwordHash! }, select })
          : await tx.user.update({
              where: { id },
              data: { ...data, ...(passwordHash ? { passwordHash } : {}) },
              select,
            });
      if (method === 'put') await tx.session.deleteMany({ where: { userId: id } });
      await audit(tx, req.user.id, owner, method === 'post' ? 'CREATE' : 'UPDATE', 'User', user.id);
      return user;
    });
    res.status(method === 'post' ? 201 : 200).json(result);
  });
