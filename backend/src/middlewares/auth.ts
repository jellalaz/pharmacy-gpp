import type { RequestHandler, Request } from 'express';
import type { Role } from '@prisma/client';
import { db } from '../config/db.js';
import { digestToken } from '../utils/password.js';
import { HttpError } from '../utils/errors.js';
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.gpp_session;
  if (typeof token !== 'string') throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.');
  const session = await db.session.findUnique({
    where: { id: digestToken(token) },
    include: { user: { include: { pharmacy: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active)
    throw new HttpError(401, 'Phiên đăng nhập đã hết hạn hoặc tài khoản bị khóa.');
  if (session.user.role !== 'ADMIN' && !session.user.pharmacy?.active)
    throw new HttpError(403, 'Nhà thuốc chưa được gán hoặc đã ngừng hoạt động.');
  req.user = session.user;
  next();
};
export const allow =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role))
      throw new HttpError(403, 'Bạn không có quyền thực hiện thao tác này.');
    next();
  };
export function pharmacyId(req: Request) {
  if (!req.user.pharmacyId || req.user.role === 'ADMIN')
    throw new HttpError(403, 'Thao tác yêu cầu tài khoản thuộc nhà thuốc.');
  return req.user.pharmacyId;
}
export function publicUser(user: Request['user']) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    pharmacyId: user.pharmacyId,
    pharmacy: user.pharmacy,
  };
}
