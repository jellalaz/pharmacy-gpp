import { useState } from 'react';
import { BadgeCheck, Eye, PackageCheck, Pencil, Pill, Plus, SlidersHorizontal } from 'lucide-react';
import type { Medicine } from '../types';
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
import { RecordForm, toForm, type Field } from '../features/RecordForm';
import { matches, money } from '../utils/format';
const fields: Field[] = [
  { name: 'code', label: 'Mã thuốc', required: true },
  { name: 'name', label: 'Tên thuốc', required: true },
  { name: 'ingredient', label: 'Hoạt chất / thành phần', required: true },
  { name: 'strength', label: 'Hàm lượng', required: true },
  { name: 'unit', label: 'Đơn vị tính', required: true },
  { name: 'manufacturer', label: 'Nhà sản xuất', required: true },
  { name: 'barcode', label: 'Mã vạch', hint: 'Không trùng trong cùng cơ sở; có thể để trống.' },
  { name: 'registrationNumber', label: 'Số đăng ký' },
  { name: 'storageLocation', label: 'Vị trí kệ / tủ' },
  { name: 'category', label: 'Nhóm thuốc', required: true },
  { name: 'salePrice', label: 'Giá bán (VNĐ)', type: 'number', required: true },
  { name: 'lowStock', label: 'Ngưỡng cảnh báo tồn', type: 'number', required: true },
  { name: 'prescription', label: 'Thuốc kê đơn (Rx)', type: 'checkbox' },
  { name: 'description', label: 'Mô tả', type: 'textarea', full: true },
  { name: 'active', label: 'Đang kinh doanh', type: 'checkbox', full: true },
];
export function Medicines() {
  const { query, records, persist } = useRecords<Medicine>('/medicines');
  const [search, setSearch] = useState(''),
    [type, setType] = useState('all'),
    [category, setCategory] = useState('all'),
    [edit, setEdit] = useState<Medicine | null | undefined>(),
    [detail, setDetail] = useState<Medicine | null>(null);
  const categories = [...new Set(records.map((m) => m.category))];
  const filtered = records.filter(
    (m) =>
      matches(search, m.name, m.code, m.ingredient, m.barcode, m.registrationNumber) &&
      (type === 'all' || (type === 'rx' ? m.prescription : type === 'otc' ? !m.prescription : !m.active)) &&
      (category === 'all' || m.category === category),
  );
  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC & GIÁ BÁN"
        title="Danh mục thuốc"
        description="Thông tin chính xác. Giá bán nhất quán. Quản lý dễ dàng."
        actions={
          <Button onClick={() => setEdit(null)}>
            <Plus size={17} />
            Thêm thuốc mới
          </Button>
        }
      />
      <div className="stats-grid three">
        <StatCard
          title="Tổng danh mục thuốc"
          value={records.length}
          note={`${categories.length} nhóm thuốc và vật tư`}
          icon={Pill}
        />
        <StatCard
          title="Thuốc đang kinh doanh"
          value={records.filter((m) => m.active).length}
          note="Được phép sử dụng trong nghiệp vụ"
          icon={PackageCheck}
          tone="green"
        />
        <StatCard
          title="Thuốc kê đơn"
          value={records.filter((m) => m.prescription).length}
          note="Yêu cầu kiểm tra thông tin đơn thuốc"
          icon={BadgeCheck}
          tone="blue"
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Danh sách thuốc <span className="count-pill">{records.length}</span>
            </h2>
            <p>Giá được niêm yết theo đơn vị quản lý tồn kho.</p>
          </div>
          <span className="small-label">Đơn vị tiền tệ: VNĐ</span>
        </div>
        <div className="tab-toolbar">
          <div className="tabs">
            {[
              ['all', 'Tất cả thuốc'],
              ['otc', 'Không kê đơn (OTC)'],
              ['rx', 'Kê đơn (Rx)'],
              ['inactive', 'Ngừng kinh doanh'],
            ].map(([v, n]) => (
              <button key={v} className={v === type ? 'selected' : ''} onClick={() => setType(v)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm tên thuốc, mã thuốc hoặc hoạt chất..."
          />
          <div className="filter-select">
            <SlidersHorizontal size={16} />
            <select aria-label="Nhóm thuốc" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Tất cả nhóm thuốc</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <QueryState query={query}>
          <DataTable
            data={filtered}
            pageSize={5}
            columns={[
              {
                label: 'Mã / Tên thuốc',
                render: (m) => (
                  <div className="entity-cell">
                    <div className={`entity-icon ${m.prescription ? 'blue' : 'teal'}`}>
                      <Pill size={20} />
                    </div>
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.code} <span className="dot-separator">·</span> {m.strength}
                      </small>
                    </div>
                  </div>
                ),
              },
              {
                label: 'Nhóm thuốc',
                render: (m) => (
                  <div className="cell-stack">
                    <span>{m.category}</span>
                    <small>{m.ingredient}</small>
                  </div>
                ),
              },
              {
                label: 'Phân loại',
                render: (m) => (
                  <span className={`rx-label ${m.prescription ? 'rx' : ''}`}>
                    {m.prescription ? 'Rx · Kê đơn' : 'OTC · Không kê đơn'}
                  </span>
                ),
              },
              { label: 'Đơn vị', render: (m) => m.unit },
              {
                label: 'Giá bán',
                className: 'text-right',
                render: (m) => <strong className="price">{money(m.salePrice)}</strong>,
              },
              {
                label: 'Trạng thái',
                render: (m) => (
                  <Badge tone={m.active ? 'success' : 'neutral'}>
                    {m.active ? 'Kinh doanh' : 'Đã ngừng'}
                  </Badge>
                ),
              },
              {
                label: 'Thao tác',
                render: (m) => (
                  <div className="row-actions">
                    <button aria-label={`Chi tiết ${m.name}`} onClick={() => setDetail(m)}>
                      <Eye size={16} />
                    </button>
                    <button aria-label={`Sửa ${m.name}`} onClick={() => setEdit(m)}>
                      <Pencil size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </QueryState>
      </section>
      <DemoNotice />
      {edit !== undefined && (
        <RecordForm
          title={edit ? 'Chỉnh sửa thông tin thuốc' : 'Thêm thuốc mới'}
          fields={fields}
          defaults={edit ? toForm(edit) : { active: true, prescription: false, lowStock: 30, salePrice: 0 }}
          onClose={() => setEdit(undefined)}
          onSave={(data) => persist(data, edit?.id)}
        />
      )}
      {detail && (
        <Dialog
          open
          onOpenChange={() => setDetail(null)}
          title={detail.name}
          description={`${detail.code} · ${detail.category}`}
        >
          <dl className="detail-grid">
            {[
              ['Hoạt chất', detail.ingredient],
              ['Hàm lượng', detail.strength],
              ['Nhà sản xuất', detail.manufacturer],
              ['Đơn vị', detail.unit],
              ['Mã vạch', detail.barcode || 'Chưa cập nhật'],
              ['Số đăng ký', detail.registrationNumber || 'Chưa cập nhật'],
              ['Vị trí kệ', detail.storageLocation || 'Chưa cập nhật'],
              ['Giá bán', money(detail.salePrice)],
              ['Phân loại', detail.prescription ? 'Kê đơn' : 'Không kê đơn'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="detail-note">{detail.description}</p>
        </Dialog>
      )}
    </>
  );
}
