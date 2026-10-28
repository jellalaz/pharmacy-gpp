export type Role = 'ADMIN' | 'MANAGER' | 'INVENTORY' | 'SALES';
export interface Pharmacy {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  active: boolean;
  createdAt: string;
  users?: { id: string; name: string; active: boolean }[];
  _count?: { users: number; medicines: number };
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pharmacyId: string | null;
  pharmacy: Pharmacy | null;
  active: boolean;
  createdAt?: string;
}
export interface Batch {
  id: string;
  medicineId: string;
  lotNumber: string;
  expiryDate: string;
  receivedAt: string;
  purchasePrice: string;
  status: 'AVAILABLE' | 'QUARANTINED' | 'RECALLED';
  isDemo: boolean;
  balance: { quantity: number } | null;
  medicine?: Medicine;
}
export interface Medicine {
  id: string;
  code: string;
  name: string;
  ingredient: string;
  strength: string;
  unit: string;
  manufacturer: string;
  barcode?: string | null;
  registrationNumber?: string | null;
  storageLocation?: string | null;
  category: string;
  prescription: boolean;
  salePrice: string;
  lowStock: number;
  description: string;
  active: boolean;
  batches: Batch[];
}
export interface Supplier {
  taxCode?: string | null;
  contactName?: string | null;
  note?: string | null;
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  active: boolean;
}
export interface Receipt {
  note?: string;
  id: string;
  code: string;
  receivedDate: string;
  documentNo: string;
  status: string;
  total: string;
  isDemo: boolean;
  supplier: Supplier;
  createdBy: { name: string };
  items: {
    id: string;
    medicine: Medicine;
    quantity: number;
    purchasePrice: string;
    lotNumber: string;
    expiryDate: string;
    unit: string;
  }[];
}
export interface Sale {
  subtotal: string;
  discount: string;
  id: string;
  code: string;
  createdAt: string;
  customerName: string;
  total: string;
  status: string;
  isDemo: boolean;
  createdBy: { name: string };
  payments: { method: string; status: string; amount: string }[];
  items: {
    id: string;
    medicineName: string;
    quantity: number;
    unit: string;
    unitPrice: string;
    batch: Batch;
  }[];
}
export interface Report {
  dataMode: 'DEMO' | 'LIVE';
  revenue: number;
  transactions: number;
  imported: number;
  sold: number;
  stock: number;
  daily: { date: string; revenue: number; incoming: number; outgoing: number }[];
  top: { name: string; quantity: number; revenue: number }[];
}
