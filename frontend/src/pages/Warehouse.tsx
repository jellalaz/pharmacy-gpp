import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  ClipboardPlus,
  Clock3,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Batch, Medicine } from '../types';
import { useRecords } from '../hooks/useRecords';
import {
  Badge,
  DataTable,
  DemoNotice,
  PageHeader,
  PrototypeNotice,
  QueryState,
  SearchInput,
  StatCard,
} from '../components/common';
import { Button } from '../components/ui/button';
import { date, daysFromToday, matches, number } from '../utils/format';
import { eligible, sellable, stock } from '../utils/inventory';
import { BatchBadge } from './Inventory';
export function Warehouse() {
  const { query, records } = useRecords<Medicine>('/medicines');
  const batches = records.flatMap((m) => m.batches);
  return (
    <>
      <PageHeader
        eyebrow="NHÂN VIÊN KHO"
        title="Tổng quan kho thuốc"
        description="Chủ động nguồn hàng, kiểm soát tồn kho và hạn sử dụng mỗi ngày."
        actions={
          <Button asChild>
            <Link to="/receipts">
              <ClipboardPlus size={17} />
              Lập phiếu nhập
            </Link>
          </Button>
        }
      />
      <div className="stats-grid">
        <StatCard
          title="Danh mục thuốc"
          value={records.length}
          note="Thuộc nhà thuốc hiện tại"
          icon={Package}
        />
        <StatCard
          title="Tổng tồn vật lý"
          value={number(records.reduce((s, m) => s + stock(m), 0))}
          note="Tổng đơn vị quản lý, gồm lô hết hạn"
          icon={Boxes}
          tone="blue"
        />
        <StatCard
          title="Thuốc cần bổ sung"
          value={records.filter((m) => sellable(m) < m.lowStock).length}
          note="Thấp hơn ngưỡng tồn có thể bán"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          title="Lô sắp hết hạn"
          value={batches.filter((b) => eligible(b) && daysFromToday(b.expiryDate) <= 90).length}
          note="Cần theo dõi trong 90 ngày"
          icon={Clock3}
          tone="orange"
        />
      </div>
      <div className="quick-grid">
        {[
          ['/receipts', 'Tiếp nhận thuốc', 'Lập và lưu phiếu nhập nháp', ClipboardPlus],
          ['/stocktake', 'Kiểm kê tồn kho', 'Đối chiếu số lượng thực tế', ClipboardCheck],
          ['/expiry', 'Theo dõi hạn dùng', 'Xem cảnh báo theo từng lô', Clock3],
        ].map(([path, title, desc, Icon]) => {
          const I = Icon as typeof Clock3;
          return (
            <Link className="panel quick-card" key={String(path)} to={String(path)}>
              <I size={25} />
              <h3>{String(title)}</h3>
              <p>{String(desc)}</p>
              <ArrowRight size={19} />
            </Link>
          );
        })}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Thuốc cần chú ý về tồn kho</h2>
          <Button variant="ghost" asChild>
            <Link to="/inventory">
              Xem toàn bộ
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <QueryState query={query}>
          <DataTable
            data={records.filter((m) => sellable(m) < m.lowStock)}
            columns={[
              {
                label: 'Thuốc',
                render: (m) => (
                  <div className="cell-stack">
                    <strong>{m.name}</strong>
                    <small>{m.code}</small>
                  </div>
                ),
              },
              { label: 'Có thể bán', render: (m) => `${sellable(m)} ${m.unit.toLowerCase()}` },
              { label: 'Ngưỡng cảnh báo', render: (m) => m.lowStock },
              { label: 'Trạng thái', render: () => <Badge tone="warning">Cần bổ sung</Badge> },
            ]}
          />
        </QueryState>
      </section>
      <DemoNotice />
    </>
  );
}
export function Expiry() {
  const { query, records } = useRecords<Batch>('/inventory');
  const [days, setDays] = useState('90'),
    [search, setSearch] = useState('');
  const filtered = records.filter(
    (b) =>
      (b.balance?.quantity ?? 0) > 0 &&
      matches(search, b.lotNumber, b.medicine?.name) &&
      (days === 'expired'
        ? daysFromToday(b.expiryDate) <= 0
        : days === 'all' || (daysFromToday(b.expiryDate) > 0 && daysFromToday(b.expiryDate) <= Number(days))),
  );
  return (
    <>
      <PageHeader
        eyebrow="KIỂM SOÁT HẠN SỬ DỤNG"
        title="Theo dõi hạn dùng"
        description="Phát hiện sớm các lô cần xử lý và tách biệt thuốc hết hạn."
      />
      <div className="stats-grid three">
        <StatCard
          title="Hết hạn / đến hạn hôm nay"
          value={
            records.filter((b) => daysFromToday(b.expiryDate) <= 0 && (b.balance?.quantity ?? 0) > 0).length
          }
          note="Không được đề xuất bán"
          icon={AlertTriangle}
          tone="orange"
        />
        <StatCard
          title="Còn hạn trong 30 ngày"
          value={
            records.filter((b) => daysFromToday(b.expiryDate) > 0 && daysFromToday(b.expiryDate) <= 30).length
          }
          note="Ưu tiên theo dõi và rà soát"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          title="Còn hạn trong 90 ngày"
          value={
            records.filter((b) => daysFromToday(b.expiryDate) > 0 && daysFromToday(b.expiryDate) <= 90).length
          }
          note="Bao gồm các lô trong 30 và 60 ngày"
          icon={Package}
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm thuốc hoặc số lô..." />
          <select aria-label="Khoảng hạn sử dụng" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="30">Trong 30 ngày</option>
            <option value="60">Trong 60 ngày</option>
            <option value="90">Trong 90 ngày</option>
            <option value="expired">Đã hết hạn / đến hạn hôm nay</option>
            <option value="all">Tất cả lô còn tồn</option>
          </select>
        </div>
        <QueryState query={query}>
          <DataTable
            data={filtered}
            columns={[
              {
                label: 'Tên thuốc',
                render: (b) => (
                  <div className="cell-stack">
                    <strong>{b.medicine?.name}</strong>
                    <small>{b.medicine?.code}</small>
                  </div>
                ),
              },
              { label: 'Số lô', render: (b) => b.lotNumber },
              { label: 'Hạn dùng', render: (b) => <strong>{date(b.expiryDate)}</strong> },
              {
                label: 'Số ngày còn lại',
                render: (b) =>
                  daysFromToday(b.expiryDate) <= 0 ? 'Đã đến hạn' : `${daysFromToday(b.expiryDate)} ngày`,
              },
              { label: 'Tồn', render: (b) => b.balance?.quantity ?? 0 },
              { label: 'Trạng thái', render: (b) => <BatchBadge batch={b} /> },
            ]}
          />
        </QueryState>
      </section>
      <DemoNotice />
    </>
  );
}
export function Stocktake() {
  const { query, records } = useRecords<Batch>('/inventory');
  const [search, setSearch] = useState(''),
    [counts, setCounts] = useState<Record<string, string>>({}),
    [notes, setNotes] = useState<Record<string, string>>({});
  const counted = Object.entries(counts).filter(
    ([, v]) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0,
  );
  const difference = counted.reduce(
    (s, [id, v]) => s + Number(v) - (records.find((b) => b.id === id)?.balance?.quantity ?? 0),
    0,
  );
  return (
    <>
      <PageHeader
        eyebrow="ĐỐI CHIẾU TỒN KHO"
        title="Kiểm kê thuốc theo lô"
        description="Ghi số lượng kiểm đếm và đối chiếu với tồn sổ sách."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setCounts({});
              setNotes({});
              toast.info('Đã xóa dữ liệu kiểm đếm trên giao diện.');
            }}
          >
            Bắt đầu lại
          </Button>
        }
      />
      <PrototypeNotice>
        Bản mô phỏng tương tác: số lượng kiểm đếm và ghi chú chỉ ở trang hiện tại, chưa lưu biên bản và không
        điều chỉnh tồn kho.
      </PrototypeNotice>
      <div className="stats-grid three">
        <StatCard title="Tổng số lô" value={records.length} note="Phạm vi nhà thuốc hiện tại" icon={Boxes} />
        <StatCard
          title="Đã kiểm đếm"
          value={counted.length}
          note="Lô có số lượng thực tế hợp lệ"
          icon={ClipboardCheck}
          tone="green"
        />
        <StatCard
          title="Chênh lệch tổng"
          value={`${difference > 0 ? '+' : ''}${difference}`}
          note="Tổng đơn vị thừa / thiếu đã nhập"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm thuốc hoặc số lô cần kiểm kê..."
          />
          <Badge tone="warning">Chưa lưu</Badge>
        </div>
        <QueryState query={query}>
          <DataTable
            data={records.filter((b) => matches(search, b.medicine?.name, b.lotNumber))}
            pageSize={6}
            columns={[
              {
                label: 'Thuốc / Lô',
                render: (b) => (
                  <div className="cell-stack">
                    <strong>{b.medicine?.name}</strong>
                    <small>
                      {b.lotNumber} · HSD {date(b.expiryDate)}
                    </small>
                  </div>
                ),
              },
              { label: 'Tồn sổ sách', render: (b) => b.balance?.quantity ?? 0 },
              {
                label: 'Số lượng thực tế',
                render: (b) => (
                  <input
                    className="count-input"
                    aria-label={`Kiểm đếm ${b.lotNumber}`}
                    type="number"
                    min="0"
                    step="1"
                    value={counts[b.id] ?? ''}
                    onChange={(e) => setCounts({ ...counts, [b.id]: e.target.value })}
                    placeholder="Chưa đếm"
                  />
                ),
              },
              {
                label: 'Chênh lệch',
                render: (b) => {
                  const v = counts[b.id];
                  if (v === undefined || v === '') return '—';
                  if (!Number.isInteger(Number(v)) || Number(v) < 0)
                    return <Badge tone="danger">Không hợp lệ</Badge>;
                  const d = Number(v) - (b.balance?.quantity ?? 0);
                  return (
                    <Badge tone={d ? 'warning' : 'success'}>
                      {d > 0 ? '+' : ''}
                      {d}
                    </Badge>
                  );
                },
              },
              {
                label: 'Ghi chú',
                render: (b) => (
                  <input
                    aria-label={`Ghi chú ${b.lotNumber}`}
                    value={notes[b.id] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [b.id]: e.target.value })}
                    placeholder="Ghi chú kiểm đếm"
                  />
                ),
              },
            ]}
          />
        </QueryState>
      </section>
    </>
  );
}
