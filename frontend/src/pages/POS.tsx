import { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileCheck2,
  FileText,
  Minus,
  PackageCheck,
  Pill,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Medicine } from '../types';
import { useRecords } from '../hooks/useRecords';
import { Badge, DemoNotice, Empty, PageHeader, QueryState, SearchInput } from '../components/common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { allocateFEFO, sellable } from '../utils/inventory';
import { date, matches, money, parseVndInput, today, vndInput } from '../utils/format';
interface CartLine {
  medicine: Medicine;
  quantity: number;
}
export function POS() {
  const { query, records } = useRecords<Medicine>('/medicines');
  return (
    <>
      <PageHeader
        eyebrow="KHÔNG GIAN BÁN THUỐC"
        title="Bán thuốc tại quầy"
        description="Tra cứu nhanh. Chọn đúng lô. Tư vấn và phục vụ tại nhà thuốc."
        actions={<Badge tone="info">Xem trước giao dịch</Badge>}
      />
      <QueryState query={query}>
        <POSEditor medicines={records} />
      </QueryState>
    </>
  );
}
function POSEditor({ medicines }: { medicines: Medicine[] }) {
  const [search, setSearch] = useState(''),
    [mode, setMode] = useState<'OTC' | 'RX'>('OTC'),
    [cart, setCart] = useState<CartLine[]>([]),
    [customer, setCustomer] = useState('Khách lẻ'),
    [method, setMethod] = useState('CASH'),
    [discount, setDiscount] = useState(0),
    [cash, setCash] = useState(0),
    [preview, setPreview] = useState(false),
    [prescription, setPrescription] = useState({
      code: '',
      prescriber: '',
      date: today(),
      note: '',
      verified: false,
    });
  const [page, setPage] = useState(1);
  const filtered = medicines.filter(
    (m) =>
      m.active &&
      matches(search, m.name, m.code, m.ingredient, m.barcode, m.registrationNumber) &&
      (mode === 'RX' || !m.prescription),
  );
  const subtotalCents = cart.reduce(
      (s, l) => s + Math.round(Number(l.medicine.salePrice) * 100) * l.quantity,
      0,
    ),
    discountCents = Math.round(discount * 100),
    total = (subtotalCents - discountCents) / 100;
  const hasRx = cart.some((l) => l.medicine.prescription),
    rxValid =
      !hasRx ||
      (mode === 'RX' &&
        prescription.code.trim() &&
        prescription.prescriber.trim() &&
        prescription.date &&
        prescription.date <= today() &&
        prescription.verified);
  const invalidCart = cart.some(
    (l) =>
      !Number.isInteger(l.quantity) || l.quantity < 1 || allocateFEFO(l.medicine, l.quantity).missing > 0,
  );
  const discountValid = Number.isFinite(discount) && discount >= 0 && discountCents <= subtotalCents;
  const canPreview = cart.length > 0 && !invalidCart && discountValid && !!rxValid && !!customer.trim();
  function add(m: Medicine) {
    if (sellable(m) <= 0) {
      toast.error('Thuốc không có lô đủ điều kiện bán.');
      return;
    }
    const found = cart.find((l) => l.medicine.id === m.id);
    if (found && found.quantity >= sellable(m)) {
      toast.error('Số lượng đã đạt giới hạn tồn có thể bán.');
      return;
    }
    setCart(
      found
        ? cart.map((l) => (l.medicine.id === m.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...cart, { medicine: m, quantity: 1 }],
    );
  }
  function quantity(id: string, n: number) {
    setCart(cart.map((l) => (l.medicine.id === id ? { ...l, quantity: n } : l)));
  }
  return (
    <>
      <div className="pos-layout">
        <div className="pos-workspace">
          <section className="panel pos-search">
            <div className="table-toolbar">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Tìm tên thuốc, mã thuốc hoặc hoạt chất..."
                label="Tìm thuốc bán"
              />
              <span className="pos-search-hint">
                <Pill size={15} />
                {filtered.length} thuốc
              </span>
            </div>
            <div className="medicine-results">
              {filtered.slice((page - 1) * 4, page * 4).map((m) => (
                <button
                  className="medicine-result"
                  key={m.id}
                  onClick={() => add(m)}
                  disabled={sellable(m) <= 0}
                  aria-label={`Thêm ${m.name}`}
                >
                  <div className={`product-icon ${m.prescription ? 'blue' : 'teal'}`}>
                    <Pill size={25} />
                    <span>{m.prescription ? 'Rx' : 'OTC'}</span>
                  </div>
                  <div>
                    <strong>{m.name.replace('An Tâm ', '')}</strong>
                    <small>
                      {m.strength} · {m.unit}
                    </small>
                    <b>{money(m.salePrice)}</b>
                    <span className="available-stock">
                      Còn {sellable(m)} {m.unit.toLowerCase()}
                    </span>
                  </div>
                  <span className="add-product">
                    <Plus size={16} />
                  </span>
                </button>
              ))}
            </div>
            {!filtered.length && <Empty text="Không tìm thấy thuốc phù hợp." />}
            {filtered.length > 4 && (
              <div className="product-pagination">
                <span>Danh mục thuốc {mode === 'OTC' ? 'không kê đơn' : 'kê đơn & OTC'}</span>
                <div>
                  <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Trước
                  </button>
                  <span>
                    {page}/{Math.ceil(filtered.length / 4)}
                  </span>
                  <button disabled={page >= Math.ceil(filtered.length / 4)} onClick={() => setPage(page + 1)}>
                    Tiếp <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="panel cart-panel">
            <div className="panel-heading">
              <h2>
                <ShoppingBag size={18} />
                Phiếu bán đang soạn <span className="count-pill">{cart.length}</span>
              </h2>
              <Button variant="ghost" size="sm" disabled={!cart.length} onClick={() => setCart([])}>
                <RotateCcw size={14} />
                Làm mới
              </Button>
            </div>
            {cart.length ? (
              <div className="table-scroll">
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>Thuốc / Lô đề xuất</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th className="text-right">Thành tiền</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => {
                      const allocation = allocateFEFO(l.medicine, l.quantity);
                      return (
                        <tr key={l.medicine.id}>
                          <td>
                            <strong>{l.medicine.name}</strong>
                            <small>
                              {l.medicine.strength} · {l.medicine.unit}{' '}
                              {l.medicine.prescription && <span className="rx-inline">Rx</span>}
                            </small>
                            {allocation.allocations.map((a) => (
                              <div className="fefo-line" key={a.batch.id}>
                                <CheckCircle2 size={12} />
                                {a.batch.lotNumber} · HSD {date(a.batch.expiryDate)} · {a.quantity}{' '}
                                {l.medicine.unit.toLowerCase()}
                              </div>
                            ))}
                            {allocation.missing > 0 && (
                              <small className="field-error">
                                Thiếu {allocation.missing} đơn vị đủ điều kiện
                              </small>
                            )}
                          </td>
                          <td>
                            <div className="quantity-control">
                              <button
                                aria-label={`Giảm ${l.medicine.name}`}
                                disabled={l.quantity <= 1}
                                onClick={() => quantity(l.medicine.id, l.quantity - 1)}
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                aria-label={`Số lượng ${l.medicine.name}`}
                                type="number"
                                min="1"
                                step="1"
                                value={l.quantity || ''}
                                onChange={(e) => quantity(l.medicine.id, Number(e.target.value))}
                              />
                              <button
                                aria-label={`Tăng ${l.medicine.name}`}
                                onClick={() => quantity(l.medicine.id, l.quantity + 1)}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </td>
                          <td>{money(l.medicine.salePrice)}</td>
                          <td className="text-right">
                            <strong>
                              {money((Math.round(Number(l.medicine.salePrice) * 100) * l.quantity) / 100)}
                            </strong>
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`Bỏ ${l.medicine.name}`}
                              onClick={() => setCart(cart.filter((i) => i.medicine.id !== l.medicine.id))}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cart-empty">
                <div>
                  <ShoppingBag size={35} />
                </div>
                <h3>Bắt đầu phiếu bán mới</h3>
                <p>
                  Chọn thuốc trong danh mục để thêm vào phiếu.
                  <br />
                  Lô phù hợp sẽ được đề xuất tự động theo FEFO.
                </p>
              </div>
            )}
            <div className="fefo-notice">
              <PackageCheck size={19} />
              <div>
                <strong>Đề xuất lô theo FEFO</strong>
                <p>Ưu tiên hạn dùng gần nhất. Loại trừ lô hết hạn, đến hạn hôm nay và lô bị cách ly.</p>
              </div>
            </div>
          </section>
          {mode === 'RX' && (
            <section className="panel prescription-panel">
              <div className="panel-heading">
                <h2>
                  <FileCheck2 size={18} />
                  Thông tin đơn thuốc
                </h2>
                <Badge tone="warning">Chưa lưu</Badge>
              </div>
              <div className="form-grid">
                <label>
                  <span>
                    Mã đơn thuốc <em>*</em>
                  </span>
                  <input
                    value={prescription.code}
                    onChange={(e) => setPrescription({ ...prescription, code: e.target.value })}
                  />
                </label>
                <label>
                  <span>
                    Ngày kê đơn <em>*</em>
                  </span>
                  <input
                    type="date"
                    max={today()}
                    value={prescription.date}
                    onChange={(e) => setPrescription({ ...prescription, date: e.target.value })}
                  />
                </label>
                <label className="span-2">
                  <span>
                    Bác sĩ / người kê đơn <em>*</em>
                  </span>
                  <input
                    value={prescription.prescriber}
                    onChange={(e) => setPrescription({ ...prescription, prescriber: e.target.value })}
                  />
                </label>
                <label className="span-2">
                  Thông tin đơn thuốc
                  <textarea
                    rows={2}
                    value={prescription.note}
                    onChange={(e) => setPrescription({ ...prescription, note: e.target.value })}
                  />
                </label>
                <label className="checkbox-field span-2">
                  <input
                    type="checkbox"
                    checked={prescription.verified}
                    onChange={(e) => setPrescription({ ...prescription, verified: e.target.checked })}
                  />
                  <span>Đã kiểm tra đơn thuốc (minh họa thao tác của nhân viên)</span>
                </label>
              </div>
            </section>
          )}
        </div>
        <aside className="panel checkout-panel">
          <div className="panel-heading">
            <h2>
              <ReceiptText size={18} />
              Thông tin giao dịch
            </h2>
          </div>
          <div className="checkout-body">
            <label>
              Khách hàng
              <div className="customer-input">
                <UserRound size={17} />
                <input
                  aria-label="Khách hàng"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
              </div>
            </label>
            <label>Phân loại giao dịch</label>
            <div className="segmented">
              <button
                className={mode === 'OTC' ? 'selected' : ''}
                onClick={() => {
                  setMode('OTC');
                  setPage(1);
                  if (hasRx) {
                    setCart(cart.filter((l) => !l.medicine.prescription));
                    toast.info('Đã bỏ thuốc kê đơn khỏi phiếu OTC.');
                  }
                }}
              >
                Không kê đơn
              </button>
              <button
                className={mode === 'RX' ? 'selected' : ''}
                onClick={() => {
                  setMode('RX');
                  setPage(1);
                }}
              >
                Theo đơn
              </button>
            </div>
            <div className="checkout-totals">
              <div>
                <span>
                  Tiền hàng <small>({cart.reduce((s, l) => s + l.quantity, 0)} đơn vị)</small>
                </span>
                <strong>{money(subtotalCents / 100)}</strong>
              </div>
              <div>
                <label htmlFor="discount">Giảm giá (đ)</label>
                <input
                  id="discount"
                  aria-label="Giảm giá"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  value={vndInput(discount)}
                  placeholder="0"
                  onChange={(e) => setDiscount(parseVndInput(e.target.value))}
                />
              </div>
              <div className="grand-total">
                <span>Tổng thanh toán</span>
                <strong>{money(Math.max(0, total))}</strong>
              </div>
            </div>
            <label>Phương thức thanh toán</label>
            <div className="payment-methods">
              <button className={method === 'CASH' ? 'selected' : ''} onClick={() => setMethod('CASH')}>
                <Banknote size={19} />
                Tiền mặt
              </button>
              <button
                className={method === 'TRANSFER' ? 'selected' : ''}
                onClick={() => setMethod('TRANSFER')}
              >
                <CreditCard size={19} />
                Chuyển khoản
              </button>
            </div>
            {method === 'CASH' ? (
              <>
                <label>
                  Tiền khách đưa (đ)
                  <input
                    aria-label="Tiền khách đưa"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    value={vndInput(cash)}
                    placeholder="0"
                    onChange={(e) => setCash(parseVndInput(e.target.value))}
                  />
                </label>
                <div className="change-due">
                  <span>{cash >= total ? 'Tiền thừa' : 'Còn thiếu (minh họa)'}</span>
                  <strong>{money(Math.abs(cash - Math.max(0, total)))}</strong>
                </div>
              </>
            ) : (
              <p className="payment-note">
                Chỉ lựa chọn phương thức để xem trước. Chưa kết nối ngân hàng hoặc xác nhận chuyển khoản.
              </p>
            )}
            {!discountValid && <p className="field-error">Giảm giá phải từ 0 đến tiền hàng.</p>}
            {!rxValid && <p className="field-error">Cần nhập và kiểm tra thông tin đơn thuốc hợp lệ.</p>}
            {invalidCart && <p className="field-error">Kiểm tra số lượng và tồn có thể bán.</p>}
            <Button className="preview-button" disabled={!canPreview} onClick={() => setPreview(true)}>
              <EyeIcon />
              Xem trước phiếu bán
            </Button>
            <Button className="confirm-sale" variant="outline" disabled>
              Thanh toán chính thức · Giai đoạn 2
            </Button>
            <div className="checkout-disclaimer">
              <FileText size={15} />
              Chưa tạo giao dịch, chưa thu tiền
              <br />
              và chưa trừ tồn kho.
            </div>
          </div>
        </aside>
      </div>
      <DemoNotice />
      {preview && (
        <Dialog
          open
          onOpenChange={setPreview}
          title="Xem trước phiếu bán"
          description="Bản xem trước trên giao diện. Không phải hóa đơn hay xác nhận thanh toán."
          wide
        >
          <div className="preview-summary">
            <Badge tone="warning">CHƯA GIAO DỊCH</Badge>
            <span>
              {customer} · {mode === 'RX' ? 'Theo đơn' : 'Không kê đơn'} ·{' '}
              {method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Thuốc</th>
                  <th>Phân bổ lô FEFO</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => (
                  <tr key={l.medicine.id}>
                    <td>
                      {l.medicine.name}
                      <small>
                        {l.quantity} {l.medicine.unit.toLowerCase()}
                      </small>
                    </td>
                    <td>
                      {allocateFEFO(l.medicine, l.quantity).allocations.map((a) => (
                        <div key={a.batch.id}>
                          {a.batch.lotNumber} × {a.quantity}
                          <small>HSD {date(a.batch.expiryDate)}</small>
                        </div>
                      ))}
                    </td>
                    <td>{money(Number(l.medicine.salePrice) * l.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="preview-total">
            <span>Tổng sau giảm giá</span>
            <strong>{money(total)}</strong>
          </div>
          {hasRx && (
            <p className="detail-note">
              Đơn {prescription.code} · {prescription.prescriber} · {date(prescription.date)}. Thông tin chưa
              được lưu.
            </p>
          )}
          <div className="dialog-actions">
            <Button onClick={() => setPreview(false)}>Tiếp tục soạn phiếu</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function EyeIcon() {
  return <FileText size={17} />;
}
