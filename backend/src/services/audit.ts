import type { Prisma } from '@prisma/client';
export function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  pharmacyId: string | null,
  action: string,
  entity: string,
  entityId: string,
) {
  return tx.auditLog.create({ data: { actorId, pharmacyId, action, entity, entityId } });
}
