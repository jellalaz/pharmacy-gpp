import { useState } from 'react';
import { Mail, Pencil, Plus, Truck } from 'lucide-react';
import type { Supplier } from '../types';
import { useRecords } from '../hooks/useRecords';
import { Badge, DataTable, DemoNotice, PageHeader, QueryState, SearchInput } from '../components/common';
import { Button } from '../components/ui/button';
import { RecordForm, toForm, type Field } from '../features/RecordForm';
import { matches } from '../utils/format';
const fields: Field[] = [
  { name: 'code', label: 'Mã nhà cung cấp', required: true },
  { name: 'name', label: 'Tên nhà cung cấp', required: true },
  { name: 'phone', label: 'Số điện thoại', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Địa chỉ', required: true, full: true },
  { name: 'taxCode', label: 'Mã số thuế' },
  { name: 'contactName', label: 'Người liên hệ' },
  { name: 'note', label: 'Ghi chú', type: 'textarea', full: true },
  { name: 'active', label: 'Đang hợp tác', type: 'checkbox', full: true },
];
export function Suppliers() {
  const { query, records, persist } = useRecords<Supplier>('/suppliers');
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [edit, setEdit] = useState<Supplier | null | undefined>();
  return (
    <>
      <PageHeader
        eyebrow="ĐỐI TÁC NHÀ THUỐC"
        title="Nhà cung cấp"
        description="Thông tin đối tác tập trung, kết nối nhập hàng thuận tiện."
        actions={
          <Button onClick={() => setEdit(null)}>
            <Plus size={17} />
            Thêm nhà cung cấp
          </Button>
        }
      />
      <div className="supplier-summary">
        <Truck size={30} />
        <div>
          <h2>{records.filter((s) => s.active).length} đối tác đang hợp tác</h2>
          <p>Danh sách nhà cung cấp của nhà thuốc hiện tại.</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Danh sách nhà cung cấp</h2>
          <span className="count-pill">{records.length}</span>
        </div>
        <div className="table-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, mã hoặc số điện thoại..." />
          <select aria-label="Trạng thái hợp tác" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hợp tác</option>
            <option value="false">Ngừng hợp tác</option>
          </select>
        </div>
        <QueryState query={query}>
          <DataTable
            data={records.filter(
              (s) =>
                matches(search, s.name, s.code, s.phone, s.taxCode, s.contactName) &&
                (status === 'all' || String(s.active) === status),
            )}
            columns={[
              {
                label: 'Nhà cung cấp',
                render: (s) => (
                  <div className="entity-cell">
                    <div className="entity-icon teal">
                      <Truck size={21} />
                    </div>
                    <div>
                      <strong>{s.name}</strong>
                      <small>{s.code}</small>
                    </div>
                  </div>
                ),
              },
              {
                label: 'Liên hệ',
                render: (s) => (
                  <div className="cell-stack">
                    <span>{s.phone}</span>
                    <small>
                      <Mail size={12} /> {s.email || 'Chưa có email'}
                    </small>
                  </div>
                ),
              },
              {
                label: 'Địa chỉ / MST',
                render: (s) => (
                  <div className="cell-stack">
                    <span>{s.address}</span>
                    <small>
                      MST: {s.taxCode || 'Chưa có'} · {s.contactName || 'Chưa có người liên hệ'}
                    </small>
                  </div>
                ),
              },
              {
                label: 'Trạng thái',
                render: (s) => (
                  <Badge tone={s.active ? 'success' : 'neutral'}>
                    {s.active ? 'Đang hợp tác' : 'Ngừng hợp tác'}
                  </Badge>
                ),
              },
              {
                label: 'Thao tác',
                render: (s) => (
                  <Button size="icon" variant="ghost" aria-label={`Sửa ${s.name}`} onClick={() => setEdit(s)}>
                    <Pencil size={16} />
                  </Button>
                ),
              },
            ]}
          />
        </QueryState>
      </section>
      <DemoNotice />
      {edit !== undefined && (
        <RecordForm
          title={edit ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
          fields={fields}
          defaults={edit ? toForm(edit) : { active: true }}
          onClose={() => setEdit(undefined)}
          onSave={(data) => persist(data, edit?.id)}
        />
      )}
    </>
  );
}
