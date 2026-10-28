import type { User, Pharmacy } from '@prisma/client';
declare global {
  namespace Express {
    interface Request {
      user: User & { pharmacy: Pharmacy | null };
    }
  }
}
export {};
