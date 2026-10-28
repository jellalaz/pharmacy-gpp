import { useState } from 'react';
import { Eye, ReceiptText } from 'lucide-react';
import type { Sale } from '../types';
import { useRecords } from '../hooks/useRecords';
import { Badge, DataTable, DemoNotice, PageHeader, QueryState, SearchInput } from '../components/common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { PrintDocument } from '../components/PrintDocument';
import { exportCsv } from '../utils/export';
import { date, matches, money } from '../utils/format';
export function Sales() {
  const { query, records } = useRecords<Sale>('/sales');
  const [search, setSearch] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [detail, setDetail] = useState<Sale | null>(null);
  const validRange = !from || !to || from <= to;
  const filtered = records.filter(
    (s) =>
      validRange &&
      matches(search, s.code, s.createdBy.name, s.customerName) &&
      (!from || new Date(s.createdAt) >= new Date(`${from}T00:00:00+07:00`)) &&
      (!to || new Date(s.createdAt) <= new Date(`${to}T23:59:59.999+07:00`)),
  );
  return (
    <>
      <PageHeader
        eyebrow="GIAO DỊCH TẠI QUẦY"
        title="Lịch sử bán hàng"
        description="Tra cứu phiếu bán và thông tin thanh toán trong nhà thuốc."
      />
      <DemoNotice>
        Các giao dịch mẫu được seed vào MySQL và gắn nhãn Demo. POS chưa phát sinh giao dịch bán thật.
      </DemoNotice>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <ReceiptText size={18} />
            Danh sách phiếu bán
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={!filtered.length}
            onClick={() =>
              exportCsv(
                'lich-su-ban-hang.csv',
                ['Mã phiếu', 'Ngày', 'Khách hàng', 'Nhân viên', 'Tổng tiền'],
                filtered.map((s) => [
                  s.code,
                  date(s.createdAt),
                  s.customerName,
                  s.createdBy.name,
                  Number(s.total),
                ]),
              )
            }
          >
            Xuất CSV · {filtered.length} phiếu
          </Button>
        </div>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm mã phiếu, khách hoặc nhân viên..."
          />
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
        <QueryState query={query}>
          <DataTable
            data={filtered}
            columns={[
              {
                label: 'Mã phiếu',
                render: (s) => (
                  <div className="cell-stack">
                    <strong>{s.code}</strong>
                    {s.isDemo && <small>Dữ liệu demo</small>}
                  </div>
                ),
              },
              { label: 'Ngày bán', render: (s) => date(s.createdAt) },
              { label: 'Nhân viên', render: (s) => s.createdBy.name },
              {
                label: 'Tổng tiền',
                className: 'text-right',
                render: (s) => <strong>{money(s.total)}</strong>,
              },
              {
                label: 'Phương thức',
                render: (s) => (s.payments[0]?.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'),
              },
              {
                label: 'Thanh toán',
                render: (s) => (
                  <Badge tone={s.payments[0]?.status === 'PAID' ? 'success' : 'warning'}>
                    {s.payments[0]?.status === 'PAID' ? 'Đã trả (mẫu)' : 'Chờ xử lý'}
                  </Badge>
                ),
              },
              {
                label: 'Chi tiết',
                render: (s) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Chi tiết ${s.code}`}
                    onClick={() => setDetail(s)}
                  >
                    <Eye size={17} />
                  </Button>
                ),
              },
            ]}
          />
        </QueryState>
      </section>
      {detail && (
        <Dialog
          open
          onOpenChange={() => setDetail(null)}
          title={detail.code}
          description={`${date(detail.createdAt)} · ${detail.createdBy.name} · ${detail.isDemo ? 'Dữ liệu mẫu' : 'Giao dịch'}`}
          wide
        >
          <DataTable
            data={detail.items}
            columns={[
              {
                label: 'Thuốc / Lô',
                render: (i) => (
                  <div>
                    <strong>{i.medicineName}</strong>
                    <small>
                      {i.batch.lotNumber} · HSD {date(i.batch.expiryDate)}
                    </small>
                  </div>
                ),
              },
              { label: 'Số lượng', render: (i) => `${i.quantity} ${i.unit}` },
              { label: 'Đơn giá', render: (i) => money(i.unitPrice) },
              { label: 'Thành tiền', render: (i) => money(Number(i.unitPrice) * i.quantity) },
            ]}
          />
          <p className="detail-note">
            Khách hàng: {detail.customerName} · Giảm giá: {money(detail.discount)}
          </p>
          <div className="preview-total">
            <span>Tổng giá trị</span>
            <strong>{money(detail.total)}</strong>
          </div>
          <p className="detail-note">
            {detail.isDemo
              ? 'Chứng từ mẫu từ seed, không phải thanh toán thật.'
              : 'Thông tin ghi nhận từ hệ thống.'}
          </p>
          <PrintDocument
            title={`PHIẾU BÁN · ${detail.code}`}
            subtitle={`${date(detail.createdAt)} · Khách: ${detail.customerName} · Nhân viên: ${detail.createdBy.name}`}
            headers={['Thuốc', 'Số lô', 'Hạn dùng', 'SL', 'Đơn vị', 'Đơn giá', 'Thành tiền']}
            rows={detail.items.map((i) => [
              i.medicineName,
              i.batch.lotNumber,
              date(i.batch.expiryDate),
              i.quantity,
              i.unit,
              money(i.unitPrice),
              money(Number(i.unitPrice) * i.quantity),
            ])}
            footer={`Giảm giá: ${money(detail.discount)} · Tổng: ${money(detail.total)} · ${detail.isDemo ? 'DỮ LIỆU MẪU — KHÔNG PHẢI THANH TOÁN THẬT' : 'Thông tin từ hệ thống'}`}
          />
        </Dialog>
      )}
    </>
  );
}
