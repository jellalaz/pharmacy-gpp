import type { Batch, Medicine } from '../types';
import { daysFromToday } from './format';
// Conservative Phase-1 rule: do not propose a lot expiring today.
export const eligible = (batch: Batch, now?: string) =>
  batch.status === 'AVAILABLE' &&
  daysFromToday(batch.expiryDate, now) > 0 &&
  (batch.balance?.quantity ?? 0) > 0;
export const stock = (medicine: Medicine) =>
  medicine.batches.reduce((s, b) => s + (b.balance?.quantity ?? 0), 0);
export const sellable = (medicine: Medicine, now?: string) =>
  medicine.active
    ? medicine.batches.filter((b) => eligible(b, now)).reduce((s, b) => s + (b.balance?.quantity ?? 0), 0)
    : 0;
export function allocateFEFO(medicine: Medicine, quantity: number, now?: string) {
  if (!medicine.active || !Number.isInteger(quantity) || quantity <= 0)
    return { allocations: [], missing: Math.max(0, quantity) };
  let remaining = quantity;
  const allocations: { batch: Batch; quantity: number }[] = [];
  for (const batch of [...medicine.batches]
    .filter((b) => eligible(b, now))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.lotNumber.localeCompare(b.lotNumber))) {
    const take = Math.min(remaining, batch.balance?.quantity ?? 0);
    if (take > 0) allocations.push({ batch, quantity: take });
    remaining -= take;
    if (remaining === 0) break;
  }
  return { allocations, missing: remaining };
}
