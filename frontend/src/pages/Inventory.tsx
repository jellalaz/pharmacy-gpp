import { useState } from 'react';
import { AlertTriangle, Boxes, ChevronRight, Clock3, Package, SearchCheck } from 'lucide-react';
import type { Medicine, Batch } from '../types';
import { useRecords } from '../hooks/useRecords';
import {
  Badge,
  DataTable,
  DemoNotice,
  PageHeader,
  QueryState,
  SearchInput,
  StatCard,
} from '../components/common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { date, daysFromToday, matches, money, number } from '../utils/format';
import { useAuth } from '../app/auth';
import { exportCsv } from '../utils/export';
import { eligible, sellable, stock } from '../utils/inventory';
export function BatchBadge({ batch }: { batch: Batch }) {
  const days = daysFromToday(batch.expiryDate);
  return (
    <Badge
      tone={
        days <= 0 ? 'danger' : batch.status !== 'AVAILABLE' ? 'neutral' : days <= 90 ? 'warning' : 'success'
      }
    >
      {days <= 0
        ? 'Hết hạn / hết hạn hôm nay'
        : batch.status === 'QUARANTINED'
          ? 'Cách ly'
          : batch.status === 'RECALLED'
            ? 'Thu hồi'
            : days <= 90
              ? 'Sắp hết hạn'
              : 'Còn hạn'}
    </Badge>
  );
}
export function BatchDetail({ medicine, onClose }: { medicine: Medicine; onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Tồn theo lô · ${medicine.name}`}
      description={`${medicine.code} · Tổng tồn ${number(stock(medicine))} ${medicine.unit.toLowerCase()} · Có thể bán ${number(sellable(medicine))}`}
      wide
    >
      <dl className="medicine-facts">
        <div>
          <dt>Hoạt chất / hàm lượng</dt>
          <dd>
            {medicine.ingredient} · {medicine.strength}
          </dd>
        </div>
        <div>
          <dt>Nhóm / đơn vị</dt>
          <dd>
            {medicine.category} · {medicine.unit}
          </dd>
        </div>
        <div>
          <dt>Mã vạch</dt>
          <dd>{medicine.barcode || 'Chưa cập nhật'}</dd>
        </div>
        <div>
          <dt>Số đăng ký</dt>
          <dd>{medicine.registrationNumber || 'Chưa cập nhật'}</dd>
        </div>
        <div>
          <dt>Nhà sản xuất</dt>
          <dd>{medicine.manufacturer}</dd>
        </div>
        <div>
          <dt>Vị trí kệ / giá bán</dt>
          <dd>
            {medicine.storageLocation || 'Chưa cập nhật'} · {money(medicine.salePrice)}
          </dd>
        </div>
      </dl>
      {medicine.description && <p className="detail-note">{medicine.description}</p>}
      <DataTable
        pageSize={5}
        data={medicine.batches}
        columns={[
          { label: 'Số lô', render: (b) => <strong>{b.lotNumber}</strong> },
          { label: 'Ngày nhập', render: (b) => date(b.receivedAt) },
          { label: 'Hạn sử dụng', render: (b) => date(b.expiryDate) },
          { label: 'Tồn', render: (b) => number(b.balance?.quantity ?? 0) },
          { label: 'Trạng thái', render: (b) => <BatchBadge batch={b} /> },
        ]}
      />
      <div className="detail-note">
        Lô hết hạn, hết hạn hôm nay, cách ly hoặc thu hồi không được đề xuất bán. Lựa chọn FEFO là xem trước,
        chưa giữ chỗ tồn kho.
      </div>
    </Dialog>
  );
}
export function Inventory() {
  const { user } = useAuth();
  const { query, records } = useRecords<Medicine>('/medicines');
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [category, setCategory] = useState('all'),
    [type, setType] = useState('all'),
    [unit, setUnit] = useState('all'),
    [detail, setDetail] = useState<Medicine | null>(null);
  const filtered = records.filter(
    (m) =>
      matches(search, m.name, m.code, m.ingredient, m.barcode, m.registrationNumber) &&
      (category === 'all' || m.category === category) &&
      (unit === 'all' || m.unit === unit) &&
      (type === 'all' || (type === 'rx' ? m.prescription : !m.prescription)) &&
      (filter === 'all' ||
        (filter === 'low' && m.active && sellable(m) < m.lowStock) ||
        (filter === 'available' && sellable(m) > 0) ||
        (filter === 'out' && sellable(m) === 0)),
  );
  const batches = records.flatMap((m) => m.batches);
  const low = records.filter((m) => m.active && sellable(m) < m.lowStock);
  const expiring = batches.filter((b) => eligible(b) && daysFromToday(b.expiryDate) <= 90);
  return (
    <>
      <PageHeader
        eyebrow="KHO THUỐC & LÔ HÀNG"
        title="Tra cứu thuốc & tồn kho"
        description={`Tra cứu chung cho quản lý và nhân viên · ${user?.pharmacy?.name}.`}
        actions={
          <span className="live-label">
            <span />
            Dữ liệu từ MySQL
          </span>
        }
      />
      <div className="stats-grid">
        <StatCard
          title="Danh mục thuốc"
          value={records.length}
          note="Mã thuốc trong nhà thuốc"
          icon={Package}
        />
        <StatCard
          title="Tổng số lô"
          value={batches.length}
          note="Theo dõi độc lập theo hạn dùng"
          icon={Boxes}
          tone="blue"
        />
        <StatCard
          title="Thuốc tồn thấp"
          value={low.length}
          note="Dưới ngưỡng cảnh báo có thể bán"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          title="Lô sắp hết hạn"
          value={expiring.length}
          note="Còn hạn tối đa 90 ngày"
          icon={Clock3}
          tone="orange"
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Tồn kho hiện tại</h2>
            <p>Số lượng có thể bán đã loại trừ các lô không đủ điều kiện.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!filtered.length}
            onClick={() =>
              exportCsv(
                'tra-cuu-thuoc.csv',
                ['Mã', 'Tên thuốc', 'Mã vạch', 'Nhóm', 'Đơn vị', 'Tổng tồn', 'Có thể bán', 'Giá bán'],
                filtered.map((m) => [
                  m.code,
                  m.name,
                  m.barcode,
                  m.category,
                  m.unit,
                  stock(m),
                  sellable(m),
                  Number(m.salePrice),
                ]),
              )
            }
          >
            Xuất CSV
          </Button>
        </div>
        <div className="table-toolbar lookup-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm tên, mã, mã vạch, hoạt chất hoặc SĐK..."
          />
          <select aria-label="Tình trạng tồn kho" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tất cả tình trạng</option>
            <option value="low">Tồn thấp</option>
            <option value="available">Có thể bán</option>
            <option value="out">Hết hàng có thể bán</option>
          </select>
          <select
            aria-label="Nhóm thuốc tra cứu"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Tất cả nhóm</option>
            {[...new Set(records.map((m) => m.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Loại thuốc tra cứu" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Rx / OTC</option>
            <option value="rx">Kê đơn (Rx)</option>
            <option value="otc">Không kê đơn</option>
          </select>
          <select aria-label="Đơn vị tra cứu" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="all">Tất cả đơn vị</option>
            {[...new Set(records.map((m) => m.unit))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <QueryState query={query}>
          <DataTable
            pageSize={5}
            data={filtered}
            columns={[
              {
                label: 'Thông tin thuốc',
                render: (m) => (
                  <div className="entity-cell">
                    <div className="entity-icon teal">
                      <Package size={20} />
                    </div>
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.code} · {m.strength}
                      </small>
                    </div>
                  </div>
                ),
              },
              {
                label: 'Phân loại',
                render: (m) => (
                  <span className={`rx-label ${m.prescription ? 'rx' : ''}`}>
                    {m.prescription ? 'Rx · Kê đơn' : 'OTC'}
                  </span>
                ),
              },
              {
                label: 'Tổng tồn',
                className: 'text-right',
                render: (m) => (
                  <div className="cell-stack">
                    <strong>{number(stock(m))}</strong>
                    <small>{m.unit}</small>
                  </div>
                ),
              },
              {
                label: 'Có thể bán',
                className: 'text-right',
                render: (m) => <strong className="teal-text">{number(sellable(m))}</strong>,
              },
              { label: 'Giá bán', className: 'text-right', render: (m) => money(m.salePrice) },
              {
                label: 'Tình trạng',
                render: (m) => (
                  <Badge
                    tone={
                      !m.active
                        ? 'neutral'
                        : sellable(m) === 0
                          ? 'danger'
                          : sellable(m) < m.lowStock
                            ? 'warning'
                            : 'success'
                    }
                  >
                    {!m.active
                      ? 'Ngừng kinh doanh'
                      : sellable(m) === 0
                        ? 'Hết hàng'
                        : sellable(m) < m.lowStock
                          ? 'Tồn thấp'
                          : 'Đủ hàng'}
                  </Badge>
                ),
              },
              {
                label: 'Chi tiết lô',
                render: (m) => (
                  <Button variant="ghost" size="sm" onClick={() => setDetail(m)}>
                    {m.batches.length} lô
                    <ChevronRight size={14} />
                  </Button>
                ),
              },
            ]}
          />
        </QueryState>
      </section>
      <div className="info-banner">
        <SearchCheck size={24} />
        <div>
          <strong>Đề xuất xuất kho theo FEFO</strong>
          <p>
            Ưu tiên lô đủ điều kiện có hạn dùng gần nhất. Tồn kho chỉ thay đổi khi nghiệp vụ xác nhận được
            triển khai.
          </p>
        </div>
      </div>
      <DemoNotice />
      {detail && <BatchDetail medicine={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
