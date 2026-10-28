import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';
const db = new PrismaClient();
if (
  process.env.DEMO_SEED !== 'true' ||
  !process.env.DEMO_PASSWORD ||
  process.env.DEMO_PASSWORD.length < 8 ||
  process.env.DEMO_PASSWORD.length > 128
) {
  throw new Error('Seed chỉ chạy khi DEMO_SEED=true và DEMO_PASSWORD có từ 8 đến 128 ký tự.');
}
const passwordHash = await hashPassword(process.env.DEMO_PASSWORD);
const today = new Date(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()),
);
const day = (offset: number) => new Date(+today + offset * 86400000);
const catalog = [
  ['An Tâm Paracetamol', 'Paracetamol', '500 mg', 'Viên', 'Giảm đau, hạ sốt', false, 2500],
  ['An Tâm Vitamin C', 'Acid ascorbic', '500 mg', 'Viên', 'Vitamin & khoáng chất', false, 3500],
  ['An Tâm Amoxicillin', 'Amoxicillin', '500 mg', 'Viên', 'Kháng sinh', true, 4200],
  ['An Tâm Cetirizine', 'Cetirizine', '10 mg', 'Viên', 'Dị ứng', false, 2800],
  ['An Tâm Oresol', 'Điện giải', '4,1 g', 'Gói', 'Tiêu hóa', false, 5500],
  ['An Tâm Omeprazole', 'Omeprazole', '20 mg', 'Viên', 'Tiêu hóa', true, 4000],
  ['An Tâm Nước muối', 'Natri clorid', '0,9% · 100 ml', 'Chai', 'Chăm sóc cá nhân', false, 12000],
  ['An Tâm Kẽm', 'Zinc gluconate', '10 mg', 'Viên', 'Vitamin & khoáng chất', false, 2200],
  ['An Tâm Amlodipine', 'Amlodipine', '5 mg', 'Viên', 'Tim mạch', true, 3800],
  ['An Tâm B Complex', 'Vitamin nhóm B', 'B1 · B6 · B12', 'Viên', 'Vitamin & khoáng chất', false, 3000],
  ['An Tâm Men vi sinh', 'Lactobacillus', '1 tỷ CFU', 'Gói', 'Tiêu hóa', false, 8500],
  ['An Tâm Siro ho', 'Chiết xuất thảo dược', '100 ml', 'Chai', 'Hô hấp', false, 62000],
  ['An Tâm Metformin', 'Metformin', '500 mg', 'Viên', 'Nội tiết', true, 1800],
  ['An Tâm Canxi D3', 'Calcium · D3', '500 mg', 'Viên', 'Vitamin & khoáng chất', false, 4500],
  ['An Tâm Loratadine', 'Loratadine', '10 mg', 'Viên', 'Dị ứng', false, 3200],
  ['An Tâm Azithromycin', 'Azithromycin', '250 mg', 'Viên', 'Kháng sinh', true, 14500],
  ['An Tâm Dung dịch sát khuẩn', 'Povidone iodine', '10% · 20 ml', 'Chai', 'Chăm sóc cá nhân', false, 18000],
  ['An Tâm Magnesi B6', 'Magnesium · B6', '470 mg', 'Viên', 'Vitamin & khoáng chất', false, 2600],
  ['An Tâm Salbutamol', 'Salbutamol', '2 mg', 'Viên', 'Hô hấp', true, 2100],
  ['An Tâm Gạc vô trùng', 'Gạc y tế', '10 × 10 cm', 'Gói', 'Vật tư y tế', false, 6500],
] as const;
try {
  await db.user.upsert({
    where: { email: 'admin@gpp.demo' },
    update: {},
    create: {
      id: 'demo-admin',
      name: 'Nguyễn Minh Anh',
      email: 'admin@gpp.demo',
      role: 'ADMIN',
      passwordHash,
    },
  });
  for (let p = 0; p < 3; p++) {
    const pharmacyId = `demo-pharmacy-${p + 1}`;
    const pharmacyNames = ['Nhà thuốc An Tâm', 'Nhà thuốc Bình An', 'Nhà thuốc Minh Châu'];
    await db.pharmacy.upsert({
      where: { id: pharmacyId },
      update: {},
      create: {
        id: pharmacyId,
        code: `NT00${p + 1}`,
        name: pharmacyNames[p],
        address: [
          '128 Nguyễn Văn Cừ, Phường Chợ Quán, TP. Hồ Chí Minh',
          '56 Lê Văn Sỹ, Phường Phú Nhuận, TP. Hồ Chí Minh',
          '240 Võ Văn Ngân, Phường Thủ Đức, TP. Hồ Chí Minh',
        ][p],
        phone: `0283824000${p + 1}`,
        email: `lienhe${p + 1}@gpp.demo`,
        active: true,
      },
    });
    for (const [role, prefix, name] of [
      ['MANAGER', 'manager', 'Trần Thanh Hà'],
      ['INVENTORY', 'inventory', 'Lê Hoàng Nam'],
      ['SALES', 'sales', 'Nguyễn Mai Linh'],
    ] as const) {
      const email = `${prefix}${p ? p + 1 : ''}@gpp.demo`;
      await db.user.upsert({
        where: { email },
        update: {},
        create: { id: `demo-${prefix}-${p + 1}`, name, role, email, pharmacyId, passwordHash },
      });
    }
    // Non-destructive and repeatable: never overwrite a pharmacy's existing catalog or balances.
    if (await db.medicine.count({ where: { pharmacyId } })) continue;
    await db.$transaction(
      async (tx) => {
        for (let s = 0; s < 6; s++)
          await tx.supplier.create({
            data: {
              id: `demo-supplier-${p}-${s}`,
              pharmacyId,
              code: `NCC00${s + 1}`,
              name: [
                'Dược phẩm An Việt',
                'Dược phẩm Hòa Bình',
                'Dược phẩm Minh Khang',
                'Thiết bị y tế Sài Gòn',
                'Dược phẩm Đông Nam',
                'Dược phẩm Thiên Phúc',
              ][s],
              address: `${36 + s * 12} Đường số ${s + 1}, TP. Hồ Chí Minh`,
              phone: `0283825000${s}`,
              email: `contact${s + 1}@supplier.demo`,
            },
          });
        const receiptId = `demo-receipt-${p}`;
        await tx.goodsReceipt.create({
          data: {
            id: receiptId,
            pharmacyId,
            supplierId: `demo-supplier-${p}-0`,
            createdById: `demo-inventory-${p + 1}`,
            code: 'PN-DEMO-001',
            documentNo: 'CT-MAU-001',
            receivedDate: day(-27),
            status: 'CONFIRMED',
            total: 0,
            isDemo: true,
            confirmedAt: day(-27),
            note: 'Chứng từ mẫu tạo bởi seed, không phải giao dịch thực tế.',
          },
        });
        let receiptTotal = new Prisma.Decimal(0);
        for (let m = 0; m < catalog.length; m++) {
          const [name, ingredient, strength, unit, category, prescription, salePrice] = catalog[m];
          const medicineId = `demo-medicine-${p}-${m}`;
          await tx.medicine.create({
            data: {
              id: medicineId,
              pharmacyId,
              code: `TH${String(m + 1).padStart(4, '0')}`,
              name,
              ingredient,
              strength,
              unit,
              category,
              prescription,
              salePrice,
              manufacturer: ['Dược An Việt (mẫu)', 'Dược Hòa Bình (mẫu)', 'Dược Minh Khang (mẫu)'][m % 3],
              lowStock: 30,
              description: 'Dữ liệu giả định phục vụ đồ án. Không dùng để tư vấn hoặc điều trị.',
            },
          });
          for (let b = 0; b < 3; b++) {
            const batchId = `demo-batch-${p}-${m}-${b}`,
              quantity = m % 6 === 4 ? [8, 12, 3][b] : [120 + m * 7, 220 + m * 5, 12][b];
            const purchasePrice = new Prisma.Decimal(salePrice).mul('0.65');
            const expiryDate = day(b === 0 ? 20 + m * 4 : b === 1 ? 240 + m * 8 : -12 - (m % 10));
            await tx.medicineBatch.create({
              data: {
                id: batchId,
                pharmacyId,
                medicineId,
                lotNumber: `AT${String(m + 1).padStart(2, '0')}-0${b + 1}`,
                expiryDate,
                receivedAt: day(-27),
                purchasePrice,
                status: m === 19 && b === 0 ? 'QUARANTINED' : 'AVAILABLE',
                isDemo: true,
                balance: { create: { quantity } },
              },
            });
            await tx.goodsReceiptItem.create({
              data: {
                pharmacyId,
                receiptId,
                medicineId,
                batchId,
                lotNumber: `AT${String(m + 1).padStart(2, '0')}-0${b + 1}`,
                expiryDate,
                unit,
                quantity,
                purchasePrice,
              },
            });
            await tx.stockMovement.create({
              data: {
                pharmacyId,
                batchId,
                type: 'RECEIPT',
                quantity,
                reference: 'PN-DEMO-001',
                isDemo: true,
                createdAt: day(-27),
              },
            });
            receiptTotal = receiptTotal.add(purchasePrice.mul(quantity));
          }
        }
        await tx.goodsReceipt.update({ where: { id: receiptId }, data: { total: receiptTotal } });
        for (let d = 0; d < 28; d++)
          for (let j = 0; j < 2; j++) {
            const indexes = [0, 1, 3, 6, 7, 9, 11, 13, 14, 17];
            const m = indexes[(d + j * 3) % indexes.length],
              quantity = 2 + ((d + j) % 6);
            const batchId = `demo-batch-${p}-${m}-0`,
              total = new Prisma.Decimal(catalog[m][6]).mul(quantity),
              saleId = `demo-sale-${p}-${d}-${j}`;
            const createdAt = new Date(+day(-27 + d) + (9 + j * 4) * 3600000);
            await tx.sale.create({
              data: {
                id: saleId,
                pharmacyId,
                createdById: `demo-sales-${p + 1}`,
                code: `BH-DEMO-${String(d * 2 + j + 1).padStart(4, '0')}`,
                subtotal: total,
                total,
                status: 'CONFIRMED',
                isDemo: true,
                createdAt,
                items: {
                  create: {
                    batchId,
                    medicineName: catalog[m][0],
                    unit: catalog[m][3],
                    quantity,
                    unitPrice: catalog[m][6],
                  },
                },
                payments: {
                  create: {
                    amount: total,
                    method: j ? 'TRANSFER' : 'CASH',
                    status: 'PAID',
                    reference: 'Thanh toán minh họa từ seed',
                    createdAt,
                  },
                },
              },
            });
            await tx.inventoryBalance.update({
              where: { batchId },
              data: { quantity: { decrement: quantity } },
            });
            await tx.stockMovement.create({
              data: {
                pharmacyId,
                batchId,
                type: 'SALE',
                quantity: -quantity,
                reference: saleId,
                isDemo: true,
                createdAt,
              },
            });
          }
      },
      { timeout: 60000 },
    );
  }
  // Enrich only missing metadata on known demo records; keep all user-entered values.
  for (let p = 0; p < 3; p++) {
    for (let m = 0; m < catalog.length; m++) {
      const id = `demo-medicine-${p}-${m}`;
      await db.medicine.updateMany({
        where: { id, barcode: null },
        data: { barcode: `DEMO-${p + 1}-${String(m + 1).padStart(4, '0')}` },
      });
      await db.medicine.updateMany({
        where: { id, registrationNumber: null },
        data: { registrationNumber: `SDK-MAU-${String(m + 1).padStart(3, '0')}` },
      });
      await db.medicine.updateMany({
        where: { id, storageLocation: null },
        data: { storageLocation: `Kệ ${String.fromCharCode(65 + Math.floor(m / 5))} · Ngăn ${(m % 5) + 1}` },
      });
    }
    for (let s = 0; s < 6; s++) {
      const id = `demo-supplier-${p}-${s}`;
      await db.supplier.updateMany({
        where: { id, contactName: null },
        data: { contactName: `Liên hệ mẫu ${s + 1}` },
      });
      await db.supplier.updateMany({
        where: { id, note: null },
        data: { note: 'Đối tác giả định phục vụ bài tập lớn.' },
      });
    }
  }
  console.log(
    'Seed hoàn tất: 3 nhà thuốc, 10 người dùng, 60 thuốc, 180 lô. Dữ liệu minh họa; giữ giá trị đã có, bổ sung thông tin demo còn trống.',
  );
} finally {
  await db.$disconnect();
}
