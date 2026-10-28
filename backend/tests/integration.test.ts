import 'dotenv/config';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/db.js';
import { env } from '../src/config/env.js';
const agents = {
  admin: request.agent(app),
  manager: request.agent(app),
  manager2: request.agent(app),
  inventory: request.agent(app),
  sales: request.agent(app),
};
const suffix = Date.now().toString(36);
const created = {
  pharmacies: [] as string[],
  users: [] as string[],
  medicines: [] as string[],
  suppliers: [] as string[],
  receipts: [] as string[],
};
const origin = env.APP_ORIGIN;
beforeAll(async () => {
  if (process.env.DEMO_SEED !== 'true')
    throw new Error('Chỉ chạy integration test trong DB demo (DEMO_SEED=true).');
  for (const [role, agent] of Object.entries(agents)) {
    const result = await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: `${role}@gpp.demo`, password: process.env.DEMO_PASSWORD });
    expect(result.status).toBe(200);
    expect(result.body).not.toHaveProperty('passwordHash');
    expect(result.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  }
}, 30000);
afterAll(async () => {
  const ids = Object.values(created).flat();
  await db.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { entityId: { in: ids } } });
    await tx.goodsReceiptItem.deleteMany({ where: { receiptId: { in: created.receipts } } });
    await tx.goodsReceipt.deleteMany({ where: { id: { in: created.receipts } } });
    await tx.medicine.deleteMany({ where: { id: { in: created.medicines } } });
    await tx.supplier.deleteMany({ where: { id: { in: created.suppliers } } });
    await tx.user.deleteMany({ where: { id: { in: created.users } } });
    await tx.pharmacy.deleteMany({ where: { id: { in: created.pharmacies } } });
  });
  for (const agent of Object.values(agents)) await agent.post('/api/auth/logout').set('Origin', origin);
  await db.$disconnect();
});
describe('Phiên và bảo vệ API', () => {
  it('từ chối truy cập ẩn danh và mật khẩu sai', async () => {
    expect((await request(app).get('/api/medicines')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .set('Origin', origin)
          .send({ email: 'admin@gpp.demo', password: 'wrong-password' })
      ).status,
    ).toBe(401);
  });
  it('từ chối yêu cầu ghi thiếu hoặc sai Origin', async () => {
    expect((await agents.admin.post('/api/pharmacies').send({})).status).toBe(403);
    expect(
      (await agents.admin.post('/api/pharmacies').set('Origin', 'https://evil.invalid').send({})).status,
    ).toBe(403);
  });
  it('kiểm tra quyền ở backend cho cả bán hàng và kho', async () => {
    expect((await agents.sales.post('/api/medicines').set('Origin', origin).send({})).status).toBe(403);
    expect((await agents.inventory.get('/api/users')).status).toBe(403);
    expect((await agents.inventory.get('/api/sales')).status).toBe(403);
    expect((await agents.admin.get('/api/medicines')).status).toBe(403);
  });
});
describe('Tách dữ liệu nhà thuốc và quản lý nhân viên', () => {
  it('ràng buộc DB ngăn tồn âm và liên kết lô chéo nhà thuốc', async () => {
    await db.$transaction(async (tx) => {
      await expect(
        tx.inventoryBalance.update({ where: { batchId: 'demo-batch-0-0-0' }, data: { quantity: -1 } }),
      ).rejects.toThrow();
      await expect(
        tx.inventoryBalance.update({
          where: { batchId: 'demo-batch-0-0-0' },
          data: { pharmacyId: 'demo-pharmacy-2' },
        }),
      ).rejects.toThrow();
    });
  });
  it('chỉ trả dữ liệu thuộc nhà thuốc, bỏ qua pharmacyId do client chọn', async () => {
    const a = await agents.manager.get('/api/medicines?pharmacyId=demo-pharmacy-2');
    const b = await agents.manager2.get('/api/medicines');
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.every((m: { pharmacyId: string }) => m.pharmacyId === 'demo-pharmacy-1')).toBe(true);
    expect(b.body.every((m: { pharmacyId: string }) => m.pharmacyId === 'demo-pharmacy-2')).toBe(true);
    expect(a.body.length).toBeGreaterThanOrEqual(20);
  });
  it('quản lý không thể cấp Admin, Manager hoặc gán sang nhà thuốc khác', async () => {
    const data = {
      name: 'Test',
      email: `x-${suffix}@test.invalid`,
      password: 'TestOnly!2026',
      role: 'ADMIN',
    };
    for (const role of ['ADMIN', 'MANAGER'])
      expect(
        (
          await agents.manager
            .post('/api/users')
            .set('Origin', origin)
            .send({ ...data, role })
        ).status,
      ).toBe(403);
    expect(
      (
        await agents.manager
          .post('/api/users')
          .set('Origin', origin)
          .send({ ...data, role: 'SALES', pharmacyId: 'demo-pharmacy-2' })
      ).status,
    ).toBe(403);
  });
  it('không được sửa tài khoản ngoài phạm vi, kể cả biết ID', async () => {
    expect(
      (
        await agents.manager
          .put('/api/users/demo-sales-2')
          .set('Origin', origin)
          .send({ name: 'Test', email: `s-${suffix}@test.invalid`, role: 'SALES', active: false })
      ).status,
    ).toBe(404);
  });
  it('tạo nhân viên, đăng nhập, khóa và thu hồi phiên', async () => {
    const email = `staff-${suffix}@test.invalid`;
    const data = {
      name: 'Nhân viên kiểm thử',
      email,
      password: 'TestOnly!2026',
      role: 'SALES',
      active: true,
    };
    const result = await agents.manager.post('/api/users').set('Origin', origin).send(data);
    expect(result.status).toBe(201);
    created.users.push(result.body.id);
    expect(result.body.pharmacyId).toBe('demo-pharmacy-1');
    const agent = request.agent(app);
    expect(
      (await agent.post('/api/auth/login').set('Origin', origin).send({ email, password: data.password }))
        .status,
    ).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect(
      (
        await agents.manager
          .put(`/api/users/${result.body.id}`)
          .set('Origin', origin)
          .send({ ...data, active: false })
      ).status,
    ).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});
describe('CRUD thật và phiếu nháp', () => {
  it('Admin tạo/sửa nhà thuốc và quản lý được gán', async () => {
    const data = {
      code: `TEST-${suffix}`,
      name: 'Nhà thuốc kiểm thử',
      address: 'Địa chỉ kiểm thử',
      phone: '0900000000',
      email: 'test@example.invalid',
      active: true,
    };
    const createdPharmacy = await agents.admin.post('/api/pharmacies').set('Origin', origin).send(data);
    expect(createdPharmacy.status).toBe(201);
    const id = createdPharmacy.body.id;
    created.pharmacies.push(id);
    const manager = await agents.admin
      .post('/api/users')
      .set('Origin', origin)
      .send({
        name: 'Quản lý kiểm thử',
        email: `manager-${suffix}@test.invalid`,
        password: 'TestOnly!2026',
        role: 'MANAGER',
        pharmacyId: id,
      });
    expect(manager.status).toBe(201);
    created.users.push(manager.body.id);
    const session = request.agent(app);
    expect(
      (
        await session
          .post('/api/auth/login')
          .set('Origin', origin)
          .send({ email: manager.body.email, password: 'TestOnly!2026' })
      ).status,
    ).toBe(200);
    expect(
      (
        await agents.admin
          .put(`/api/pharmacies/${id}`)
          .set('Origin', origin)
          .send({ ...data, active: false })
      ).status,
    ).toBe(200);
    expect((await session.get('/api/medicines')).status).toBe(403);
    expect((await agents.manager.get('/api/pharmacies')).status).toBe(403);
  });
  it('CRUD thuốc, nhà cung cấp và kiểm tra giá DECIMAL', async () => {
    const med = {
      code: `TEST-${suffix}`,
      name: 'Thuốc kiểm thử',
      ingredient: 'Mẫu',
      strength: '1 mg',
      unit: 'Viên',
      manufacturer: 'Mẫu',
      category: 'Mẫu',
      prescription: false,
      salePrice: '12500.25',
      active: true,
    };
    const result = await agents.manager.post('/api/medicines').set('Origin', origin).send(med);
    expect(result.status).toBe(201);
    created.medicines.push(result.body.id);
    expect(result.body.salePrice).toBe('12500.25');
    expect(
      (await agents.manager2.put(`/api/medicines/${result.body.id}`).set('Origin', origin).send(med)).status,
    ).toBe(404);
    expect(
      (
        await agents.manager
          .put(`/api/medicines/${result.body.id}`)
          .set('Origin', origin)
          .send({ ...med, name: 'Đã sửa' })
      ).status,
    ).toBe(200);
    const sup = {
      code: `TEST-${suffix}`,
      name: 'NCC kiểm thử',
      address: 'Địa chỉ',
      phone: '0900000000',
      email: 'ncc@example.invalid',
      active: true,
    };
    const s = await agents.manager.post('/api/suppliers').set('Origin', origin).send(sup);
    expect(s.status).toBe(201);
    created.suppliers.push(s.body.id);
    expect(
      (
        await agents.manager
          .put(`/api/suppliers/${s.body.id}`)
          .set('Origin', origin)
          .send({ ...sup, active: false })
      ).status,
    ).toBe(200);
  });
  it('lưu phiếu nháp thật, không tăng tồn và không cho xác nhận', async () => {
    const body = {
      supplierId: 'demo-supplier-0-0',
      documentNo: `TEST-${suffix}`,
      receivedDate: '2026-10-28',
      items: [
        {
          medicineId: 'demo-medicine-0-0',
          quantity: 3,
          purchasePrice: '1250.25',
          lotNumber: 'TEST-LOT',
          expiryDate: '2028-10-28',
        },
      ],
    };
    const before = await db.inventoryBalance.aggregate({
      where: { pharmacyId: 'demo-pharmacy-1' },
      _sum: { quantity: true },
    });
    const r = await agents.inventory.post('/api/receipts').set('Origin', origin).send(body);
    expect(r.status).toBe(201);
    created.receipts.push(r.body.id);
    expect(r.body.status).toBe('DRAFT');
    expect(r.body.total).toBe('3750.75');
    expect(
      (await agents.inventory.post(`/api/receipts/${r.body.id}/confirm`).set('Origin', origin)).status,
    ).toBe(501);
    const after = await db.inventoryBalance.aggregate({
      where: { pharmacyId: 'demo-pharmacy-1' },
      _sum: { quantity: true },
    });
    expect(after).toEqual(before);
    expect(
      (
        await agents.inventory
          .post('/api/receipts')
          .set('Origin', origin)
          .send({ ...body, supplierId: 'demo-supplier-1-0' })
      ).status,
    ).toBe(404);
    expect(
      (
        await agents.inventory
          .post('/api/receipts')
          .set('Origin', origin)
          .send({ ...body, items: [{ ...body.items[0], medicineId: 'demo-medicine-1-0' }] })
      ).status,
    ).toBe(400);
    expect(
      (
        await agents.inventory
          .post('/api/receipts')
          .set('Origin', origin)
          .send({ ...body, status: 'CONFIRMED' })
      ).status,
    ).toBe(400);
  });
  it('chặn giao dịch bán thật và trả báo cáo đúng phạm vi', async () => {
    expect((await agents.sales.post('/api/sales').set('Origin', origin).send({})).status).toBe(501);
    const result = await agents.manager.get('/api/reports?from=2020-01-01&to=2030-01-01');
    expect(result.status).toBe(400);
    expect((await agents.sales.get('/api/reports?from=2026-10-01&to=2026-10-28')).status).toBe(403);
  });
});

describe('Chức năng quản lý mở rộng', () => {
  it('cấp vai trò trong cơ sở, thu hồi phiên và áp dụng quyền mới khi đăng nhập lại', async () => {
    const email = `grant-${suffix}@test.invalid`,
      password = 'GrantOnly!2026';
    const made = await agents.manager
      .post('/api/users')
      .set('Origin', origin)
      .send({ name: 'Cấp quyền kiểm thử', email, password, role: 'SALES', active: true });
    expect(made.status).toBe(201);
    created.users.push(made.body.id);
    const employee = request.agent(app);
    await employee.post('/api/auth/login').set('Origin', origin).send({ email, password }).expect(200);
    await employee.get('/api/sales').expect(200);
    await agents.manager
      .patch(`/api/users/${made.body.id}/role`)
      .set('Origin', origin)
      .send({ role: 'INVENTORY' })
      .expect(200);
    await employee.get('/api/auth/me').expect(401);
    await employee.post('/api/auth/login').set('Origin', origin).send({ email, password }).expect(200);
    await employee.get('/api/receipts').expect(200);
    await employee.get('/api/sales').expect(403);
    await employee.get('/api/medicines').expect(200);
    await employee.post('/api/auth/logout').set('Origin', origin);
    const log = await db.auditLog.findFirst({
      where: { entityId: made.body.id, action: 'CHANGE_STAFF_ROLE' },
    });
    expect(log?.actorId).toBe('demo-manager-1');
  });
  it('chặn nhân viên cấp quyền, quản lý cấp quyền cao hoặc sửa cơ sở khác', async () => {
    await agents.sales
      .patch('/api/users/demo-inventory-1/role')
      .set('Origin', origin)
      .send({ role: 'SALES' })
      .expect(403);
    for (const role of ['ADMIN', 'MANAGER'])
      await agents.manager
        .patch('/api/users/demo-sales-1/role')
        .set('Origin', origin)
        .send({ role })
        .expect(400);
    await agents.manager
      .patch('/api/users/demo-sales-2/role')
      .set('Origin', origin)
      .send({ role: 'INVENTORY' })
      .expect(404);
    await agents.manager
      .patch('/api/users/demo-manager-1/role')
      .set('Origin', origin)
      .send({ role: 'INVENTORY' })
      .expect(404);
    await agents.manager
      .patch('/api/users/demo-sales-1/role')
      .set('Origin', origin)
      .send({ role: 'SALES', pharmacyId: 'demo-pharmacy-2' })
      .expect(400);
  });
  it('quản lý xem chứng từ thuộc cơ sở, không có quyền lập phiếu kho/bán', async () => {
    for (const path of ['receipts', 'sales']) {
      const response = await agents.manager.get(`/api/${path}?pharmacyId=demo-pharmacy-2`).expect(200);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.every((r: { pharmacyId: string }) => r.pharmacyId === 'demo-pharmacy-1')).toBe(
        true,
      );
      await agents.manager.post(`/api/${path}`).set('Origin', origin).send({}).expect(403);
    }
    await agents.manager
      .post('/api/receipts/demo-receipt-0/confirm')
      .set('Origin', origin)
      .send({})
      .expect(403);
  });
  it('báo cáo chi tiết khớp chứng từ và sổ nhập–xuất–tồn, tách cơ sở', async () => {
    const from = '2000-01-01';
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.parse(end) - 90 * 86400000).toISOString().slice(0, 10);
    await agents.manager.get(`/api/reports/details?kind=inventory&from=${from}&to=${end}`).expect(400);
    for (const manager of ['manager', 'manager2'] as const) {
      const owner = manager === 'manager' ? 'demo-pharmacy-1' : 'demo-pharmacy-2';
      const suffixQuery = `from=${start}&to=${end}&pharmacyId=demo-pharmacy-3`;
      const saleReport = await agents[manager]
        .get(`/api/reports/details?kind=sales&${suffixQuery}`)
        .expect(200);
      const sales = await db.sale.findMany({
        where: {
          pharmacyId: owner,
          status: 'CONFIRMED',
          createdAt: { gte: new Date(`${start}T00:00:00+07:00`), lte: new Date(`${end}T23:59:59.999+07:00`) },
        },
        include: { items: true },
      });
      expect(saleReport.body.rows.map((r: { id: string }) => r.id).sort()).toEqual(
        sales.flatMap((s) => s.items.map((i) => i.id)).sort(),
      );
      expect(saleReport.body.total).toBeCloseTo(
        sales.reduce((a, s) => a + Number(s.total), 0),
        2,
      );
      const receiptReport = await agents[manager]
        .get(`/api/reports/details?kind=receipts&${suffixQuery}`)
        .expect(200);
      const confirmed = await db.goodsReceipt.findMany({
        where: {
          pharmacyId: owner,
          status: 'CONFIRMED',
          receivedDate: {
            gte: new Date(`${start}T00:00:00+07:00`),
            lte: new Date(`${end}T23:59:59.999+07:00`),
          },
        },
        include: { items: true },
      });
      expect(receiptReport.body.rows.map((r: { id: string }) => r.id).sort()).toEqual(
        confirmed.flatMap((r) => r.items.map((i) => i.id)).sort(),
      );
      const inventory = await agents[manager]
        .get(`/api/reports/details?kind=inventory&${suffixQuery}`)
        .expect(200);
      const balances = await db.inventoryBalance.aggregate({
        where: { pharmacyId: owner },
        _sum: { quantity: true },
      });
      let total = 0;
      for (const row of inventory.body.rows) {
        expect(row.closing).toBe(row.opening + row.incoming - row.outgoing + row.adjustment);
        total += row.closing;
      }
      expect(total).toBe(balances._sum.quantity);
      const todayReport = await agents[manager]
        .get(`/api/reports/details?kind=inventory&from=${end}&to=${end}`)
        .expect(200);
      expect(todayReport.body.rows.some((r: { opening: number }) => r.opening > 0)).toBe(true);
      expect(todayReport.body.rows.reduce((sum: number, r: { closing: number }) => sum + r.closing, 0)).toBe(
        total,
      );
    }
    await agents.sales.get(`/api/reports/details?kind=sales&from=${start}&to=${end}`).expect(403);
  });
  it('mã vạch duy nhất trong cơ sở và nhân viên đều đọc được thông tin thuốc', async () => {
    const template = await db.medicine.findUniqueOrThrow({ where: { id: 'demo-medicine-0-0' } });
    const { name, ingredient, strength, unit, manufacturer, category, prescription, lowStock } = template;
    const data = {
      name,
      ingredient,
      strength,
      unit,
      manufacturer,
      category,
      prescription,
      lowStock,
      salePrice: '1200.50',
      code: `BAR-${suffix}`,
      barcode: `BARCODE-${suffix}`,
      registrationNumber: 'SDK-TEST',
      storageLocation: 'Kệ kiểm thử',
      active: true,
    };
    const made = await agents.manager.post('/api/medicines').set('Origin', origin).send(data).expect(201);
    created.medicines.push(made.body.id);
    await agents.manager
      .post('/api/medicines')
      .set('Origin', origin)
      .send({ ...data, code: `DUP-${suffix}` })
      .expect(409);
    const other = await agents.manager2.post('/api/medicines').set('Origin', origin).send(data).expect(201);
    created.medicines.push(other.body.id);
    for (const employee of [agents.inventory, agents.sales]) {
      const lookup = await employee.get('/api/medicines').expect(200);
      const found = lookup.body.find((m: { id: string }) => m.id === made.body.id);
      expect(found.barcode).toBe(data.barcode);
      expect(found.storageLocation).toBe('Kệ kiểm thử');
      expect(lookup.body.some((m: { id: string }) => m.id === other.body.id)).toBe(false);
    }
    const {
      barcode: _barcode,
      registrationNumber: _registration,
      storageLocation: _storage,
      ...oldPayload
    } = data;
    const updated = await agents.manager
      .put(`/api/medicines/${made.body.id}`)
      .set('Origin', origin)
      .send(oldPayload)
      .expect(200);
    expect(updated.body.barcode).toBe(data.barcode);
  });
});
