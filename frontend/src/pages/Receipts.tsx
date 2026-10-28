import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, Eye, FileText, Plus, Save, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import type { Medicine, Receipt, Supplier } from '../types';
import { api, save } from '../services/api';
import { useAuth } from '../app/auth';
import { Badge, DataTable, DemoNotice, PageHeader, PrototypeNotice, QueryState } from '../components/common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { PrintDocument } from '../components/PrintDocument';
import { SearchInput } from '../components/common';
import { date, matches, money, today } from '../utils/format';
export function Receipts({ readOnly = false }: { readOnly?: boolean }) {
  const [tab, setTab] = useState(readOnly ? 'history' : 'create');
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const validRange = !from || !to || from <= to;
  const medicines = useQuery({ queryKey: ['/medicines'], queryFn: () => api<Medicine[]>('/medicines') });
  const suppliers = useQuery({ queryKey: ['/suppliers'], queryFn: () => api<Supplier[]>('/suppliers') });
  const receipts = useQuery({ queryKey: ['/receipts'], queryFn: () => api<Receipt[]>('/receipts') });
  const [detail, setDetail] = useState<Receipt | null>(null);
  return (
    <>
      <PageHeader
        eyebrow="TIẾP NHẬN & NHẬP KHO"
        title={readOnly ? 'Lịch sử nhập hàng' : 'Nhập thuốc'}
        description="Ghi nhận nguồn hàng, số lô và hạn dùng ngay từ bước tiếp nhận."
      />
      {!readOnly && (
        <div className="page-tabs tabs">
          <button className={tab === 'create' ? 'selected' : ''} onClick={() => setTab('create')}>
            <Plus size={16} />
            Lập phiếu nhập
          </button>
          <button className={tab === 'history' ? 'selected' : ''} onClick={() => setTab('history')}>
            <ClipboardList size={16} />
            Danh sách phiếu nhập
          </button>
        </div>
      )}
      {tab === 'create' ? (
        <QueryState query={medicines}>
          <QueryState query={suppliers}>
            {medicines.data && suppliers.data && (
              <ReceiptEditor medicines={medicines.data} suppliers={suppliers.data} />
            )}
          </QueryState>
        </QueryState>
      ) : (
        <section className="panel">
          <div className="table-toolbar">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm phiếu, chứng từ, nhà cung cấp..."
            />
            <select
              aria-label="Trạng thái phiếu nhập"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
            </select>
            <div className="date-filter">
              <label>
                Từ
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                Đến
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
          </div>
          {!validRange && <p className="form-error">Ngày kết thúc phải từ ngày bắt đầu trở đi.</p>}
          <QueryState query={receipts}>
            <DataTable
              data={(receipts.data ?? []).filter(
                (r) =>
                  validRange &&
                  matches(search, r.code, r.documentNo, r.supplier.name, r.createdBy.name) &&
                  (status === 'all' || r.status === status) &&
                  (!from || r.receivedDate.slice(0, 10) >= from) &&
                  (!to || r.receivedDate.slice(0, 10) <= to),
              )}
              columns={[
                {
                  label: 'Mã phiếu',
                  render: (r) => (
                    <div className="cell-stack">
                      <strong>{r.code}</strong>
                      {r.isDemo && <small>Dữ liệu demo</small>}
                    </div>
                  ),
                },
                { label: 'Ngày nhập', render: (r) => date(r.receivedDate) },
                { label: 'Nhà cung cấp', render: (r) => r.supplier.name },
                { label: 'Người nhập', render: (r) => r.createdBy.name },
                { label: 'Tổng giá trị', render: (r) => money(r.total) },
                {
                  label: 'Trạng thái',
                  render: (r) => (
                    <Badge tone={r.status === 'DRAFT' ? 'warning' : 'info'}>
                      {r.status === 'DRAFT' ? 'Bản nháp' : r.isDemo ? 'Đã xác nhận (mẫu)' : r.status}
                    </Badge>
                  ),
                },
                {
                  label: 'Chi tiết',
                  render: (r) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Xem ${r.code}`}
                      onClick={() => setDetail(r)}
                    >
                      <Eye size={17} />
                    </Button>
                  ),
                },
              ]}
            />
          </QueryState>
        </section>
      )}
      {detail && (
        <Dialog
          open
          onOpenChange={() => setDetail(null)}
          title={detail.code}
          description={`${detail.supplier.name} · ${date(detail.receivedDate)}`}
          wide
        >
          <DataTable
            data={detail.items}
            columns={[
              { label: 'Thuốc', render: (i) => i.medicine.name },
              { label: 'Số lượng', render: (i) => `${i.quantity} ${i.unit}` },
              { label: 'Giá nhập', render: (i) => money(i.purchasePrice) },
              {
                label: 'Lô / Hạn dùng',
                render: (i) => (
                  <div>
                    {i.lotNumber}
                    <small>{date(i.expiryDate)}</small>
                  </div>
                ),
              },
            ]}
          />
          <h3 className="receipt-total">Tổng giá trị: {money(detail.total)}</h3>
          <p className="detail-note">
            Chứng từ: {detail.documentNo} · Người lập: {detail.createdBy.name}
            <br />
            {detail.note || 'Không có ghi chú'}
            <br />
            {detail.status === 'DRAFT'
              ? 'Bản nháp — chưa cộng tồn kho.'
              : detail.isDemo
                ? 'Chứng từ mẫu phục vụ trình diễn.'
                : 'Phiếu đã xác nhận.'}
          </p>
          <PrintDocument
            title={`PHIẾU NHẬP · ${detail.code}`}
            subtitle={`${date(detail.receivedDate)} · ${detail.supplier.name} · Chứng từ ${detail.documentNo} · ${detail.createdBy.name}`}
            headers={['Thuốc', 'Đơn vị', 'SL', 'Giá nhập', 'Số lô', 'Hạn dùng', 'Thành tiền']}
            rows={detail.items.map((i) => [
              i.medicine.name,
              i.unit,
              i.quantity,
              money(i.purchasePrice),
              i.lotNumber,
              date(i.expiryDate),
              money(Number(i.purchasePrice) * i.quantity),
            ])}
            footer={`Tổng: ${money(detail.total)} · ${detail.status === 'DRAFT' ? 'BẢN NHÁP — CHƯA CỘNG TỒN' : detail.isDemo ? 'DỮ LIỆU MẪU' : 'Đã xác nhận'}. ${detail.note || ''}`}
          />
        </Dialog>
      )}
    </>
  );
}
interface Line {
  id: string;
  medicineId: string;
  quantity: number;
  purchasePrice: number;
  lotNumber: string;
  expiryDate: string;
}
function ReceiptEditor({ medicines, suppliers }: { medicines: Medicine[]; suppliers: Supplier[] }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const active = medicines.filter((m) => m.active);
  const future = new Date(Date.parse(today()) + 365 * 86400000).toISOString().slice(0, 10);
  const createLine = (m = active[0], i = 0): Line => ({
    id: crypto.randomUUID(),
    medicineId: m?.id ?? '',
    quantity: 20 + i * 10,
    purchasePrice: Number(m?.salePrice ?? 0) * 0.65,
    lotNumber: `LO-MAU-${i + 1}`,
    expiryDate: future,
  });
  const [medicineSearch, setMedicineSearch] = useState('');
  const [lines, setLines] = useState<Line[]>(active.slice(0, 3).map((m, i) => createLine(m, i)));
  const [supplierId, setSupplierId] = useState(suppliers.find((s) => s.active)?.id ?? ''),
    [documentNo, setDocumentNo] = useState('HD-MAU-2026-001'),
    [receivedDate, setReceivedDate] = useState(today()),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(''),
    [error, setError] = useState('');
  const total = lines.reduce((s, l) => s + Math.round(l.purchasePrice * 100) * l.quantity, 0) / 100;
  const touch = () => setSaved('');
  const update = (id: string, patch: Partial<Line>) => {
    touch();
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  async function submit() {
    setError('');
    if (!supplierId || !documentNo.trim() || !receivedDate || !lines.length) {
      setError('Vui lòng chọn nhà cung cấp, số chứng từ, ngày nhập và ít nhất một dòng thuốc.');
      return;
    }
    if (
      lines.some(
        (l) =>
          !l.medicineId ||
          !l.lotNumber.trim() ||
          !l.expiryDate ||
          !Number.isInteger(l.quantity) ||
          l.quantity <= 0 ||
          !Number.isFinite(l.purchasePrice) ||
          l.purchasePrice < 0,
      )
    ) {
      setError('Kiểm tra số lượng nguyên dương, giá nhập, số lô và hạn dùng ở mỗi dòng.');
      return;
    }
    setBusy(true);
    try {
      const result = await save<Receipt>('/receipts', {
        supplierId,
        documentNo,
        receivedDate,
        note,
        items: lines.map(({ id: _id, ...l }) => ({ ...l, purchasePrice: l.purchasePrice.toFixed(2) })),
      });
      setSaved(result.code);
      await client.invalidateQueries({ queryKey: ['/receipts'] });
      toast.success(`Đã lưu nháp ${result.code}. Tồn kho chưa thay đổi.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PrototypeNotice>
        Phiếu nháp được lưu thật vào MySQL. Xác nhận nhập và cộng tồn sẽ được triển khai ở giai đoạn 2.
      </PrototypeNotice>
      <section className="panel receipt-information">
        <div className="panel-heading">
          <h2>
            <FileText size={18} />
            Thông tin phiếu nhập
          </h2>
          <Badge tone="warning">{saved ? 'Đã lưu nháp' : 'Phiếu nháp mới'}</Badge>
        </div>
        <div className="receipt-meta-grid">
          <label>
            Mã phiếu
            <input readOnly value={saved || 'Tự động khi lưu'} />
          </label>
          <label>
            Ngày nhập
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => {
                touch();
                setReceivedDate(e.target.value);
              }}
            />
          </label>
          <label>
            Người nhập
            <input readOnly value={user?.name ?? ''} />
          </label>
          <label className="span-2">
            <span>
              Nhà cung cấp <em>*</em>
            </span>
            <select
              aria-label="Nhà cung cấp"
              value={supplierId}
              onChange={(e) => {
                touch();
                setSupplierId(e.target.value);
              }}
            >
              <option value="">Chọn nhà cung cấp</option>
              {suppliers
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.code}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>
              Số chứng từ <em>*</em>
            </span>
            <input
              value={documentNo}
              onChange={(e) => {
                touch();
                setDocumentNo(e.target.value);
              }}
            />
          </label>
        </div>
      </section>
      <section className="panel receipt-lines">
        <div className="panel-heading">
          <div>
            <h2>
              <Truck size={18} />
              Chi tiết thuốc nhập <span className="count-pill">{lines.length}</span>
            </h2>
            <p>Nhập số lượng theo đúng đơn vị quản lý của thuốc.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!active.length}
            onClick={() => {
              touch();
              setLines([...lines, createLine(active[0], lines.length)]);
            }}
          >
            <Plus size={16} />
            Thêm dòng thuốc
          </Button>
        </div>
        <div className="receipt-search">
          <input
            aria-label="Tìm thuốc để nhập"
            placeholder="Tìm tên, mã hoặc mã vạch để thêm thuốc..."
            value={medicineSearch}
            onChange={(e) => setMedicineSearch(e.target.value)}
          />
          {medicineSearch.trim() && (
            <div className="medicine-suggestions">
              {active
                .filter((m) => matches(medicineSearch, m.name, m.code, m.barcode, m.ingredient))
                .slice(0, 6)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      touch();
                      setLines([...lines, createLine(m, lines.length)]);
                      setMedicineSearch('');
                    }}
                  >
                    <strong>{m.name}</strong>
                    <small>
                      {m.code} · {m.unit} · Giá bán {money(m.salePrice)}
                    </small>
                    <Plus size={16} />
                  </button>
                ))}
              {!active.some((m) => matches(medicineSearch, m.name, m.code, m.barcode, m.ingredient)) && (
                <p>Không tìm thấy thuốc đang kinh doanh.</p>
              )}
            </div>
          )}
        </div>
        <div className="table-scroll">
          <table className="receipt-table">
            <thead>
              <tr>
                {['Thuốc / Đơn vị', 'Số lượng', 'Giá nhập (đ)', 'Số lô', 'Hạn sử dụng', 'Thành tiền', ''].map(
                  (h) => (
                    <th key={h}>{h}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    <select
                      aria-label="Thuốc nhập"
                      value={l.medicineId}
                      onChange={(e) => {
                        const m = active.find((m) => m.id === e.target.value);
                        update(l.id, {
                          medicineId: e.target.value,
                          purchasePrice: Number(m?.salePrice ?? 0) * 0.65,
                        });
                      }}
                    >
                      {active.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <small>
                      {active.find((m) => m.id === l.medicineId)?.unit} ·{' '}
                      {active.find((m) => m.id === l.medicineId)?.strength}
                    </small>
                  </td>
                  <td>
                    <input
                      aria-label="Số lượng nhập"
                      type="number"
                      min="1"
                      step="1"
                      value={l.quantity || ''}
                      onChange={(e) => update(l.id, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Giá nhập"
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.purchasePrice}
                      onChange={(e) => update(l.id, { purchasePrice: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Số lô nhập"
                      value={l.lotNumber}
                      onChange={(e) => update(l.id, { lotNumber: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Hạn sử dụng nhập"
                      type="date"
                      value={l.expiryDate}
                      onChange={(e) => update(l.id, { expiryDate: e.target.value })}
                    />
                  </td>
                  <td>
                    <strong>{money((Math.round(l.purchasePrice * 100) * l.quantity) / 100)}</strong>
                  </td>
                  <td>
                    <button
                      className="icon-button danger-text"
                      aria-label="Xóa dòng thuốc"
                      onClick={() => {
                        touch();
                        setLines(lines.filter((i) => i.id !== l.id));
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="receipt-bottom">
          <label>
            Ghi chú phiếu nhập
            <textarea
              rows={2}
              placeholder="Thông tin bổ sung về đợt nhập hàng..."
              value={note}
              onChange={(e) => {
                touch();
                setNote(e.target.value);
              }}
            />
          </label>
          <div className="receipt-summary">
            <span>
              Số dòng thuốc <strong>{lines.length}</strong>
            </span>
            <span>
              Tổng số lượng <strong>{numberSum(lines)}</strong>
            </span>
            <div>
              Tổng giá trị phiếu<strong>{money(total)}</strong>
            </div>
          </div>
        </div>
      </section>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="saved-notice">
          <Check size={18} />
          Đã lưu nháp {saved}. Tồn kho chưa thay đổi.
        </div>
      )}
      <div className="receipt-actions">
        <span>
          <FileText size={16} />
          Kiểm tra số lô và hạn dùng trước khi lưu.
        </span>
        <div>
          <Button variant="outline" disabled title="Giai đoạn 2: xác nhận và cập nhật tồn">
            Xác nhận nhập · Giai đoạn 2
          </Button>
          <Button disabled={busy || !!saved} onClick={() => void submit()}>
            <Save size={17} />
            {busy ? 'Đang lưu...' : saved ? 'Đã lưu nháp' : 'Lưu phiếu nháp'}
          </Button>
        </div>
      </div>
      <DemoNotice />
    </>
  );
}
function numberSum(lines: Line[]) {
  return lines.reduce((s, l) => s + l.quantity, 0).toLocaleString('vi-VN');
}
