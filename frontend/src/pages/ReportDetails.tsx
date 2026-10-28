import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Badge, DataTable, QueryState } from '../components/common';
import { Button } from '../components/ui/button';
import { PrintDocument } from '../components/PrintDocument';
import { date, money, number } from '../utils/format';
import { exportCsv, type ExportCell } from '../utils/export';
interface MovementRow {
  id: string;
  code: string;
  name: string;
  unit: string;
  opening: number;
  incoming: number;
  outgoing: number;
  adjustment: number;
  closing: number;
}
interface DocumentRow {
  id: string;
  code: string;
  date: string;
  partner: string;
  staff: string;
  name: string;
  lot: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
}
type DetailReport = { dataMode: string } & (
  | { kind: 'inventory'; rows: MovementRow[] }
  | { kind: 'sales' | 'receipts'; documents: number; total: number; discount: number; rows: DocumentRow[] }
);
export type DetailKind = 'sales' | 'receipts' | 'inventory';
const titles = {
  sales: 'Doanh thu chi tiết',
  receipts: 'Nhập hàng chi tiết',
  inventory: 'Nhập – Xuất – Tồn',
};
export function ReportDetails({ kind, from, to }: { kind: DetailKind; from: string; to: string }) {
  const query = useQuery({
    queryKey: ['report-details', kind, from, to],
    queryFn: () => api<DetailReport>(`/reports/details?kind=${kind}&from=${from}&to=${to}`),
  });
  const r = query.data;
  const headers =
    kind === 'inventory'
      ? ['Mã', 'Thuốc', 'Đơn vị', 'Tồn đầu', 'Nhập', 'Xuất', 'Điều chỉnh', 'Tồn cuối']
      : [
          'Phiếu',
          'Ngày',
          kind === 'sales' ? 'Khách hàng' : 'Nhà cung cấp',
          'Nhân viên',
          'Thuốc',
          'Lô',
          'Đơn vị',
          'SL',
          'Đơn giá',
          'Thành tiền',
        ];
  const rows: ExportCell[][] = !r
    ? []
    : r.kind === 'inventory'
      ? r.rows.map((i) => [
          i.code,
          i.name,
          i.unit,
          i.opening,
          i.incoming,
          i.outgoing,
          i.adjustment,
          i.closing,
        ])
      : r.rows.map((i) => [
          i.code,
          date(i.date),
          i.partner,
          i.staff,
          i.name,
          i.lot,
          i.unit,
          i.quantity,
          i.price,
          i.amount,
        ]);
  const footer = !r
    ? ''
    : `${r.dataMode === 'DEMO' ? 'DỮ LIỆU MẪU. ' : ''}${r.kind === 'inventory' ? 'Tồn cuối = tồn đầu + nhập − xuất + điều chỉnh. Tổng hợp từ sổ biến động đến cuối kỳ; bao gồm cả lô hết hạn/cách ly.' : `${r.documents} chứng từ đã xác nhận · Giảm giá toàn phiếu: ${money(r.discount)} · Tổng sau giảm: ${money(r.total)}. Thành tiền từng dòng chưa trừ giảm giá toàn phiếu.`}`;
  return (
    <QueryState query={query}>
      {r && (
        <section className="panel detailed-report">
          <div className="panel-heading">
            <div>
              <h2>{titles[kind]}</h2>
              <p>
                {date(from)} – {date(to)} · {rows.length} dòng
              </p>
            </div>
            <div className="report-actions">
              <Badge tone={r.dataMode === 'DEMO' ? 'warning' : 'info'}>
                {r.dataMode === 'DEMO' ? 'Dữ liệu demo' : 'Dữ liệu cơ sở'}
              </Badge>
              <Button
                variant="outline"
                disabled={!rows.length}
                onClick={() => exportCsv(`bao-cao-${kind}-${from}-${to}.csv`, headers, [...rows, [footer]])}
              >
                Xuất CSV
              </Button>
              <PrintDocument
                title={titles[kind]}
                subtitle={`Từ ${date(from)} đến ${date(to)}`}
                headers={headers}
                rows={rows}
                footer={footer}
              />
            </div>
          </div>
          {r.kind === 'inventory' ? (
            <DataTable
              data={r.rows}
              pageSize={6}
              columns={[
                {
                  label: 'Thuốc',
                  render: (i) => (
                    <div className="cell-stack">
                      <strong>{i.name}</strong>
                      <small>{i.code}</small>
                    </div>
                  ),
                },
                { label: 'Đơn vị', render: (i) => i.unit },
                { label: 'Tồn đầu', className: 'text-right', render: (i) => number(i.opening) },
                { label: 'Nhập', className: 'text-right', render: (i) => number(i.incoming) },
                { label: 'Xuất', className: 'text-right', render: (i) => number(i.outgoing) },
                { label: 'Điều chỉnh', className: 'text-right', render: (i) => number(i.adjustment) },
                {
                  label: 'Tồn cuối',
                  className: 'text-right',
                  render: (i) => <strong className="teal-text">{number(i.closing)}</strong>,
                },
              ]}
            />
          ) : (
            <>
              <div className="detail-summary">
                <span>
                  <strong>{r.documents}</strong> chứng từ
                </span>
                <span>
                  Giảm giá: <strong>{money(r.discount)}</strong>
                </span>
                <span>
                  Tổng sau giảm: <strong>{money(r.total)}</strong>
                </span>
              </div>
              <DataTable
                data={r.rows}
                pageSize={6}
                columns={[
                  {
                    label: 'Phiếu / ngày',
                    render: (i) => (
                      <div className="cell-stack">
                        <strong>{i.code}</strong>
                        <small>{date(i.date)}</small>
                      </div>
                    ),
                  },
                  {
                    label: kind === 'sales' ? 'Khách / nhân viên' : 'NCC / nhân viên',
                    render: (i) => (
                      <div className="cell-stack">
                        <span>{i.partner}</span>
                        <small>{i.staff}</small>
                      </div>
                    ),
                  },
                  {
                    label: 'Thuốc / lô',
                    render: (i) => (
                      <div className="cell-stack">
                        <strong>{i.name}</strong>
                        <small>{i.lot}</small>
                      </div>
                    ),
                  },
                  { label: 'Số lượng', render: (i) => `${i.quantity} ${i.unit}` },
                  { label: 'Đơn giá', className: 'text-right', render: (i) => money(i.price) },
                  { label: 'Thành tiền', className: 'text-right', render: (i) => money(i.amount) },
                ]}
              />
            </>
          )}
          <p className="detail-note">{footer}</p>
        </section>
      )}
    </QueryState>
  );
}
