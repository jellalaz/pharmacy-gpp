import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { authenticate, publicUser } from '../middlewares/auth.js';
import { HttpError } from '../utils/errors.js';
import { digestToken, verifyPassword, hashPassword } from '../utils/password.js';
export const auth = Router();
const cookie = { httpOnly: true, secure: env.COOKIE_SECURE === 'true', sameSite: 'lax' as const, path: '/' };
const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.' },
});
auth.post('/login', limiter, async (req, res) => {
  const input = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .transform((v) => v.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .strict()
    .parse(req.body);
  const user = await db.user.findUnique({ where: { email: input.email }, include: { pharmacy: true } });
  const valid = await verifyPassword(input.password, user?.passwordHash ?? dummyHash);
  if (!user || !valid || !user.active)
    throw new HttpError(401, 'Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.');
  if (user.role !== 'ADMIN' && !user.pharmacy?.active)
    throw new HttpError(403, 'Nhà thuốc chưa được gán hoặc đã ngừng hoạt động.');
  const token = randomBytes(32).toString('hex');
  const oldToken = req.cookies?.gpp_session;
  await db.$transaction(async (tx) => {
    if (typeof oldToken === 'string') await tx.session.deleteMany({ where: { id: digestToken(oldToken) } });
    await tx.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    await tx.session.create({
      data: { id: digestToken(token), userId: user.id, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) },
    });
  });
  res.cookie('gpp_session', token, { ...cookie, maxAge: 8 * 60 * 60 * 1000 }).json(publicUser(user));
});
auth.get('/me', authenticate, (req, res) => {
  res.json(publicUser(req.user));
});
auth.post('/logout', async (req, res) => {
  if (typeof req.cookies?.gpp_session === 'string')
    await db.session.deleteMany({ where: { id: digestToken(req.cookies.gpp_session) } });
  res.clearCookie('gpp_session', cookie).status(204).end();
});
