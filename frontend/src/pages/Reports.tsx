import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  ChartNoAxesCombined,
  Package,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import type { Report, Medicine } from '../types';
import { api } from '../services/api';
import { useAuth } from '../app/auth';
import { Badge, DemoNotice, PageHeader, QueryState, StatCard } from '../components/common';
import { Button } from '../components/ui/button';
import { money, number, today } from '../utils/format';
import { ReportDetails, type DetailKind } from './ReportDetails';
import { sellable } from '../utils/inventory';
const offset = (days: number) => new Date(Date.parse(today()) - days * 86400000).toISOString().slice(0, 10);
export function Reports({ overview = false }: { overview?: boolean }) {
  const { user } = useAuth();
  const [range, setRange] = useState({ from: offset(27), to: today() }),
    [draft, setDraft] = useState(range),
    [period, setPeriod] = useState('month'),
    [error, setError] = useState('');
  const [tab, setTab] = useState<'summary' | DetailKind>('summary');
  const report = useQuery({
    queryKey: ['reports', range],
    queryFn: () => api<Report>(`/reports?from=${range.from}&to=${range.to}`),
  });
  const inventory = useQuery({ queryKey: ['/medicines'], queryFn: () => api<Medicine[]>('/medicines') });
  const r = report.data;
  const shortMoney = (v: number) =>
    v >= 1000000
      ? `${(v / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`
      : v >= 1000
        ? `${Math.round(v / 1000)}k`
        : String(v);
  function preset(p: string) {
    setPeriod(p);
    const d = { from: p === 'today' ? today() : p === 'week' ? offset(6) : offset(27), to: today() };
    setRange(d);
    setDraft(d);
    setError('');
  }
  return (
    <>
      <PageHeader
        eyebrow={overview ? 'KHÔNG GIAN QUẢN LÝ' : 'PHÂN TÍCH HOẠT ĐỘNG'}
        title={overview ? `Chào ${user?.name.split(' ').at(-1)}, một ngày tốt lành!` : 'Báo cáo & thống kê'}
        description={
          overview
            ? 'Một góc nhìn rõ ràng để bắt đầu ngày làm việc của nhà thuốc.'
            : 'Hiểu hoạt động hôm nay, chủ động quyết định cho ngày mai.'
        }
        actions={
          <>
            <span className="small-label">
              <CalendarDays size={16} />
              {user?.pharmacy?.name}
            </span>
            {r?.dataMode === 'DEMO' && <Badge tone="info">Dữ liệu demo</Badge>}
          </>
        }
      />
      <div className="page-tabs tabs" aria-label="Loại báo cáo">
        {(
          [
            ['summary', 'Tổng quan'],
            ['sales', 'Doanh thu chi tiết'],
            ['receipts', 'Nhập hàng chi tiết'],
            ['inventory', 'Nhập – Xuất – Tồn'],
          ] as const
        ).map(([value, label]) => (
          <button key={value} className={tab === value ? 'selected' : ''} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="report-filter">
        <div className="segmented">
          {[
            ['today', 'Hôm nay'],
            ['week', '7 ngày'],
            ['month', '28 ngày'],
          ].map(([p, label]) => (
            <button key={p} className={period === p ? 'selected' : ''} onClick={() => preset(p)}>
              {label}
            </button>
          ))}
        </div>
        <div className="date-filter">
          <label>
            Từ
            <input
              type="date"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label>
            Đến
            <input
              type="date"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (
                !draft.from ||
                !draft.to ||
                draft.from > draft.to ||
                Date.parse(draft.to) - Date.parse(draft.from) > 365 * 86400000
              ) {
                setError('Chọn khoảng thời gian hợp lệ, tối đa 366 ngày.');
                return;
              }
              setError('');
              setPeriod('custom');
              setRange(draft);
            }}
          >
            Áp dụng
          </Button>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {tab === 'summary' ? (
        <QueryState query={report}>
          {r && (
            <>
              <div className="stats-grid">
                <StatCard
                  title="Doanh thu trong kỳ"
                  value={money(r.revenue)}
                  note={`${r.transactions} phiếu bán đã xác nhận${r.dataMode === 'DEMO' ? ' (mẫu)' : ''}`}
                  icon={TrendingUp}
                />
                <StatCard
                  title="Giao dịch bán"
                  value={r.transactions}
                  note="Theo khoảng thời gian đã chọn"
                  icon={ReceiptText}
                  tone="blue"
                />
                <StatCard
                  title="Số lượng nhập"
                  value={number(r.imported)}
                  note="Đơn vị từ phiếu nhập đã xác nhận"
                  icon={ArrowDownToLine}
                  tone="green"
                />
                <StatCard
                  title="Số lượng bán"
                  value={number(r.sold)}
                  note="Đơn vị thuốc đã xuất trong kỳ"
                  icon={ArrowUpFromLine}
                  tone="amber"
                />
              </div>
              <div className="report-charts">
                <section className="panel revenue-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Doanh thu theo ngày</h2>
                      <p>Giá trị phiếu bán đã xác nhận · VNĐ</p>
                    </div>
                    <span className="chart-legend">
                      <i />
                      Doanh thu
                    </span>
                  </div>
                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={r.daily} margin={{ top: 15, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0c9198" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#0c9198" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e9eef1" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => `${d.slice(8)}/${d.slice(5, 7)}`}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={30}
                          tick={{ fill: '#8493a0', fontSize: 11 }}
                        />
                        <YAxis
                          tickFormatter={shortMoney}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#8493a0', fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(v) => [money(Number(v)), 'Doanh thu']}
                          labelFormatter={(v) => `Ngày ${v}`}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8ed', fontSize: 12 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0b8e97"
                          strokeWidth={2.5}
                          fill="url(#revenueGradient)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="panel top-medicines">
                  <div className="panel-heading">
                    <div>
                      <h2>Thuốc bán nhiều nhất</h2>
                      <p>Theo số lượng trong kỳ</p>
                    </div>
                    <ChartNoAxesCombined size={20} />
                  </div>
                  <div className="ranking-list">
                    {r.top.length ? (
                      r.top.map((m, i) => (
                        <div className="ranking-item" key={m.name}>
                          <span className={`ranking-number rank-${i}`}>{String(i + 1).padStart(2, '0')}</span>
                          <div>
                            <strong>{m.name.replace('An Tâm ', '')}</strong>
                            <div className="rank-track">
                              <div
                                style={{ width: `${(m.quantity / Math.max(1, r.top[0].quantity)) * 100}%` }}
                              />
                            </div>
                          </div>
                          <b>
                            {m.quantity}
                            <small>đơn vị</small>
                          </b>
                        </div>
                      ))
                    ) : (
                      <p className="empty-inline">Chưa có giao dịch trong kỳ.</p>
                    )}
                  </div>
                </section>
              </div>
              <div className="report-bottom">
                <section className="panel movement-chart">
                  <div className="panel-heading">
                    <h2>Nhập – Xuất trong kỳ</h2>
                    <div className="chart-legends">
                      <span>
                        <i />
                        Nhập
                      </span>
                      <span>
                        <i />
                        Xuất
                      </span>
                    </div>
                  </div>
                  <div className="chart-area small-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={r.daily} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => d.slice(8)}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={20}
                          tick={{ fontSize: 10, fill: '#8493a0' }}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8493a0' }} />
                        <Tooltip
                          formatter={(v, n) => [number(Number(v)), n === 'incoming' ? 'Nhập' : 'Xuất']}
                        />
                        <Bar
                          dataKey="incoming"
                          fill="#0e9198"
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="outgoing"
                          fill="#a7d9d7"
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="panel inventory-alerts">
                  <div className="panel-heading">
                    <h2>Tình hình tồn kho</h2>
                    <Package size={19} />
                  </div>
                  <div className="inventory-total">
                    <span>Tổng tồn vật lý hiện tại</span>
                    <strong>
                      {number(r.stock)} <small>đơn vị</small>
                    </strong>
                  </div>
                  <QueryState query={inventory}>
                    {(inventory.data ?? [])
                      .filter((m) => m.active && sellable(m) < m.lowStock)
                      .slice(0, 3)
                      .map((m) => (
                        <div className="stock-alert" key={m.id}>
                          <span>{m.name.replace('An Tâm ', '')}</span>
                          <Badge tone="warning">Còn {sellable(m)}</Badge>
                        </div>
                      ))}
                    {inventory.data && !inventory.data.some((m) => m.active && sellable(m) < m.lowStock) && (
                      <p className="empty-inline">Không có thuốc tồn thấp.</p>
                    )}
                  </QueryState>
                </section>
              </div>
              <DemoNotice>
                {r.dataMode === 'DEMO'
                  ? 'Báo cáo tổng hợp từ chứng từ mẫu trong MySQL. Số liệu phục vụ trình diễn, không phải doanh thu thực tế.'
                  : 'Báo cáo tổng hợp từ chứng từ trong MySQL. Tồn hiện tại không phụ thuộc khoảng ngày báo cáo.'}
              </DemoNotice>
            </>
          )}
        </QueryState>
      ) : (
        <ReportDetails kind={tab} from={range.from} to={range.to} />
      )}
    </>
  );
}
