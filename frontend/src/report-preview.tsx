import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClipboardList,
  Cross,
  Search,
  ShoppingBag,
  FileCheck2,
  Building2,
  UserRound,
  ShieldCheck,
} from 'lucide-react';
import { Badge, PageHeader, SearchInput } from './components/common';
import { Button } from './components/ui/button';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './styles.css';
import './report-preview.css';

const previews = [
  { key: 'nhap', label: 'Tiếp nhận thuốc', code: 'CN-02', role: 'Nhân viên kho', icon: ClipboardList },
  {
    key: 'ban',
    label: 'Bán thuốc tại quầy',
    code: 'CN-08, CN-10',
    role: 'Nhân viên bán thuốc',
    icon: ShoppingBag,
  },
  {
    key: 'lo',
    label: 'Tra cứu lô và chứng từ',
    code: 'CN-05, CN-06, CN-07',
    role: 'Quản lý nhà thuốc',
    icon: Search,
  },
  { key: 'don', label: 'Đối chiếu đơn thuốc', code: 'CN-09', role: 'Nhân viên bán thuốc', icon: FileCheck2 },
  {
    key: 'taikhoan',
    label: 'Tài khoản và nhật ký',
    code: 'CN-14, CN-16',
    role: 'Quản trị viên',
    icon: ShieldCheck,
  },
] as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label>
      {label}
      <input value={value} readOnly />
    </label>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel report-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, i) => (
                <td key={columns[i]}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Receipt() {
  return (
    <>
      <Panel title="Thông tin phiếu nhập">
        <div className="report-fields">
          <Field label="Mã phiếu" value="PN-M01" />
          <Field label="Nhà cung cấp" value="Nhà cung cấp mẫu" />
          <Field label="Số chứng từ giao" value="CT-M01" />
        </div>
      </Panel>
      <Panel title="Đối chiếu hàng giao">
        <Table
          columns={['Thuốc', 'Số lô', 'Hạn dùng', 'Số giao', 'Thực nhận', 'Lý do phần không nhận']}
          rows={[['Thuốc mẫu A', 'LÔ-M01', '31/12/2027', '14 viên', '12 viên', '2 viên có bao bì hư hỏng']]}
        />
        <div className="report-result">
          <Badge tone="warning">Phiếu nháp</Badge>
          <span>Tồn sổ chỉ tăng sau khi phiếu được xác nhận thành công.</span>
        </div>
      </Panel>
    </>
  );
}

function Counter() {
  const [search, setSearch] = useState('Thuốc mẫu A');
  const matches = ['thuốc mẫu a', 'th-m01'].some((term) =>
    term.includes(search.trim().toLocaleLowerCase('vi')),
  );
  return (
    <>
      <Panel title="Tra cứu thuốc tại quầy">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã thuốc" />
        <Table
          columns={['Mã thuốc', 'Tên thuốc', 'Phân loại', 'Lượng có thể bán', 'Đơn vị']}
          rows={
            matches
              ? [['TH-M01', 'Thuốc mẫu A', <Badge tone="success">Không kê đơn</Badge>, '20', 'Viên']]
              : []
          }
        />
        {!matches && <p className="report-result">Chưa tìm thấy thuốc theo tiêu chí tìm.</p>}
      </Panel>
      <Panel title="Phiếu bán đang soạn">
        <Table
          columns={['Thuốc', 'Lô thực lấy', 'Số lượng', 'Đơn giá', 'Thành tiền']}
          rows={[['Thuốc mẫu A', 'LÔ-M02', '2 viên', '5.000 ₫', '10.000 ₫']]}
        />
        <div className="report-result">
          <Badge tone="warning">Phiếu nháp</Badge>
          <span>Kiểm tra lại giá, lượng và trạng thái lô trước khi ghi bán.</span>
        </div>
      </Panel>
    </>
  );
}

const lots = [
  {
    number: 'LÔ-M01',
    expiry: '31/12/2027',
    stock: 12,
    sellable: 0,
    stopped: true,
    records: 'PN-M01 · PB-M02',
  },
  { number: 'LÔ-M02', expiry: '30/06/2028', stock: 20, sellable: 20, stopped: false, records: 'PN-M02' },
];

function Batches() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(lots[0]);
  const needle = query.trim().toLocaleLowerCase('vi');
  const visible = lots.filter((lot) =>
    `thuốc mẫu a th-m01 ${lot.number.toLocaleLowerCase('vi')}`.includes(needle),
  );
  return (
    <>
      <Panel title="Thuốc mẫu A · TH-M01 · Đơn vị: viên">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm theo tên thuốc, mã thuốc hoặc số lô"
        />
        <Table
          columns={['Số lô', 'Hạn dùng', 'Tồn sổ', 'Có thể bán', 'Trạng thái', 'Chứng từ']}
          rows={visible.map((lot) => [
            <button className="report-link" aria-pressed={selected === lot} onClick={() => setSelected(lot)}>
              {lot.number}
            </button>,
            lot.expiry,
            lot.stock,
            lot.sellable,
            <Badge tone={lot.stopped ? 'danger' : 'success'}>{lot.stopped ? 'Ngừng bán' : 'Được bán'}</Badge>,
            lot.records,
          ])}
        />
        {!visible.length && <p className="report-result">Chưa tìm thấy lô theo tiêu chí tìm.</p>}
      </Panel>
      <Panel title={`Chi tiết ${selected.number}`}>
        <div className="report-fields">
          <Field label="Tồn sổ" value={`${selected.stock} viên`} />
          <Field label="Có thể bán" value={`${selected.sellable} viên`} />
          <Field label="Chứng từ liên quan" value={selected.records} />
        </div>
        {selected.stopped && (
          <div className="report-result">
            <Badge tone="danger">Ngừng bán</Badge>
            <span>Căn cứ: thông báo mẫu TB-M01.</span>
          </div>
        )}
      </Panel>
    </>
  );
}

function Prescription() {
  return (
    <>
      <Panel title="Thông tin đối chiếu">
        <div className="report-fields">
          <Field label="Mã phiếu nháp" value="PB-M03" />
          <Field label="Tham chiếu đơn" value="ĐM-01" />
          <Field label="Người kiểm tra" value="NV-M01" />
        </div>
      </Panel>
      <Panel title="Các dòng thuốc dự kiến giao">
        <Table
          columns={['Dòng', 'Thuốc trên đơn', 'Lượng ghi trên đơn', 'Dự kiến giao', 'Lô dự kiến', 'Kết quả']}
          rows={[
            ['01', 'Thuốc mẫu B', '4 viên', '4 viên', 'LÔ-M03', <Badge tone="success">Đã đối chiếu</Badge>],
            ['02', 'Thuốc mẫu C', '6 (chưa rõ đơn vị)', '—', '—', <Badge tone="warning">Chờ kiểm tra</Badge>],
          ]}
        />
        <div className="report-result">
          <span>Dòng 02 cần xác minh đơn vị tính. Phiếu đang ở trạng thái nháp.</span>
          <Button disabled>Xác nhận bán</Button>
        </div>
      </Panel>
    </>
  );
}

function Accounts() {
  return (
    <>
      <Panel title="Tài khoản nhân viên">
        <Table
          columns={['Tài khoản', 'Vai trò', 'Trạng thái']}
          rows={[
            ['NV-KHO01', 'Nhân viên kho', <Badge tone="success">Đang hoạt động</Badge>],
            ['NV-BAN02', 'Nhân viên bán thuốc', <Badge tone="warning">Tạm khóa</Badge>],
          ]}
        />
      </Panel>
      <Panel title="Nhật ký thay đổi quyền">
        <Table
          columns={['Thời điểm', 'Người thực hiện', 'Thao tác', 'Tài khoản', 'Kết quả']}
          rows={[
            [
              '22/11/2026 09:15',
              'QT-M01',
              'Tạm khóa tài khoản',
              'NV-BAN02',
              <Badge tone="success">Đã ghi</Badge>,
            ],
            [
              '21/11/2026 14:20',
              'QT-M01',
              'Cấp vai trò Nhân viên kho',
              'NV-KHO01',
              <Badge tone="success">Đã ghi</Badge>,
            ],
          ]}
        />
      </Panel>
    </>
  );
}

const screens = {
  taikhoan: { view: Accounts, description: 'Tra trạng thái tài khoản và xem các lần thay đổi quyền.' },
  nhap: { view: Receipt, description: 'Ghi chứng từ và đối chiếu phần thuốc thực nhận.' },
  ban: { view: Counter, description: 'Tra thuốc, chọn lô thực lấy và xem trước phiếu bán không kê đơn.' },
  lo: { view: Batches, description: 'Phân biệt tồn sổ với lượng còn được bán, truy chứng từ theo từng lô.' },
  don: {
    view: Prescription,
    description: 'So sánh từng dòng đơn với lượng dự kiến giao trước khi xác nhận.',
  },
};

function ReportPreview() {
  const key = new URLSearchParams(location.search).get('man-hinh');
  const page = previews.find((p) => p.key === key) ?? previews[0];
  const { view: View, description } = screens[page.key];
  return (
    <div className="app-shell report-shell">
      <aside className="sidebar">
        <a className="brand" href="?man-hinh=nhap">
          <span className="brand-mark">
            <Cross size={25} strokeWidth={3} />
          </span>
          <span>
            Pharmacy
            <span className="brand-gpp">
              GPP
              <span className="brand-dot" />
            </span>
          </span>
        </a>
        <div className="workspace-label">
          <div className="workspace-icon">
            <Building2 size={18} />
          </div>
          <div>
            <small>OOAD.G607</small>
            <strong>Quản lý nhà thuốc</strong>
          </div>
        </div>
        <div className="nav-caption">GIAO DIỆN MINH HỌA</div>
        <nav aria-label="Màn hình báo cáo">
          {previews.map(({ key, icon: Icon, label }) => (
            <a
              href={`?man-hinh=${key}`}
              key={key}
              className={`nav-item ${page.key === key ? 'active' : ''}`}
              aria-current={page.key === key ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Nhà thuốc</span>
            <strong>{page.label}</strong>
          </div>
          <div className="header-right">
            <span className="environment">
              <span />
              Dữ liệu mẫu
            </span>
            <UserRound size={17} />
            {page.role}
          </div>
        </header>
        <main className="main-content">
          <PageHeader eyebrow={page.code} title={page.label} description={description} />
          <View />
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<ReportPreview />);
