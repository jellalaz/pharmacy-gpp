import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2, Eye, MapPin, Pencil, Plus, Power, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Pharmacy, User } from '../types';
import { api } from '../services/api';
import { useRecords } from '../hooks/useRecords';
import {
  Badge,
  ConfirmDialog,
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
import { matches } from '../utils/format';
export function Pharmacies() {
  const { query, records, persist } = useRecords<Pharmacy>('/pharmacies');
  const users = useQuery({ queryKey: ['/users'], queryFn: () => api<User[]>('/users') });
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [edit, setEdit] = useState<Pharmacy | null | undefined>(),
    [detail, setDetail] = useState<Pharmacy | null>(null),
    [toggle, setToggle] = useState<Pharmacy | null>(null),
    [busy, setBusy] = useState(false);
  const fields: Field[] = [
    { name: 'name', label: 'Tên nhà thuốc', required: true, full: true },
    { name: 'code', label: 'Mã nhà thuốc', required: true },
    { name: 'phone', label: 'Số điện thoại', required: true },
    { name: 'address', label: 'Địa chỉ', required: true, full: true },
    { name: 'email', label: 'Email liên hệ', type: 'email' },
    {
      name: 'managerId',
      label: 'Gán thêm quản lý',
      type: 'select',
      options: (users.data ?? [])
        .filter((u) => u.role === 'MANAGER' && u.active && (!u.pharmacyId || u.pharmacyId === edit?.id))
        .map((u) => ({ value: u.id, label: u.name })),
      hint: 'Chỉ quản lý chưa được gán hoặc thuộc nhà thuốc này.',
    },
    { name: 'active', label: 'Nhà thuốc đang hoạt động', type: 'checkbox', full: true },
  ];
  const filtered = records.filter(
    (p) => matches(search, p.name, p.code, p.address) && (filter === 'all' || String(p.active) === filter),
  );
  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Quản lý nhà thuốc"
        description="Một góc nhìn thống nhất. Mỗi nhà thuốc một không gian độc lập."
        actions={
          <Button onClick={() => setEdit(null)}>
            <Plus size={17} />
            Thêm nhà thuốc
          </Button>
        }
      />
      <div className="stats-grid three">
        <StatCard
          title="Tổng số nhà thuốc"
          value={String(records.length).padStart(2, '0')}
          note="Cơ sở được quản lý trên hệ thống"
          icon={Building2}
        />
        <StatCard
          title="Đang hoạt động"
          value={String(records.filter((p) => p.active).length).padStart(2, '0')}
          note="Sẵn sàng phục vụ và vận hành"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          title="Nhân sự toàn hệ thống"
          value={users.data?.length ?? '—'}
          note="Tài khoản nội bộ đã được tạo"
          icon={Users}
          tone="blue"
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Danh sách nhà thuốc <span className="count-pill">{records.length}</span>
            </h2>
            <p>Quản lý thông tin, người phụ trách và trạng thái vận hành.</p>
          </div>
          <span className="small-label">
            <Building2 size={15} /> Toàn hệ thống
          </span>
        </div>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm tên, mã hoặc địa chỉ nhà thuốc..."
          />
          <select
            aria-label="Trạng thái nhà thuốc"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng hoạt động</option>
          </select>
        </div>
        <QueryState query={query}>
          <DataTable
            data={filtered}
            columns={[
              {
                label: 'Nhà thuốc',
                render: (p) => (
                  <div className="entity-cell">
                    <div className="entity-icon teal">
                      <Building2 size={22} />
                    </div>
                    <div>
                      <strong>{p.name}</strong>
                      <small>{p.code}</small>
                    </div>
                  </div>
                ),
              },
              {
                label: 'Thông tin liên hệ',
                render: (p) => (
                  <div className="cell-stack">
                    <span>{p.phone}</span>
                    <small className="address-cell">
                      <MapPin size={12} />
                      {p.address}
                    </small>
                  </div>
                ),
              },
              {
                label: 'Quản lý phụ trách',
                render: (p) => (
                  <div className="cell-stack">
                    <span>{p.users?.map((u) => u.name).join(', ') || 'Chưa được gán'}</span>
                    <small>{p._count?.users ?? 0} tài khoản nội bộ</small>
                  </div>
                ),
              },
              {
                label: 'Trạng thái',
                render: (p) => (
                  <Badge tone={p.active ? 'success' : 'neutral'}>
                    {p.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                ),
              },
              {
                label: 'Thao tác',
                className: 'text-right',
                render: (p) => (
                  <div className="row-actions">
                    <button
                      aria-label={`Chi tiết ${p.name}`}
                      title="Xem chi tiết"
                      onClick={() => setDetail(p)}
                    >
                      <Eye size={16} />
                    </button>
                    <button aria-label={`Sửa ${p.name}`} title="Chỉnh sửa" onClick={() => setEdit(p)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      aria-label={`${p.active ? 'Ngừng' : 'Kích hoạt'} ${p.name}`}
                      title="Đổi trạng thái"
                      onClick={() => setToggle(p)}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </QueryState>
      </section>
      <div className="info-banner">
        <ShieldIcon />
        <div>
          <strong>Dữ liệu được phân tách theo từng nhà thuốc</strong>
          <p>Danh mục thuốc, nhân viên, tồn kho và giao dịch chỉ hiển thị trong phạm vi được phân quyền.</p>
        </div>
      </div>
      <DemoNotice />
      {edit !== undefined && (
        <RecordForm
          title={edit ? 'Chỉnh sửa nhà thuốc' : 'Thêm nhà thuốc mới'}
          fields={fields}
          defaults={edit ? toForm(edit) : { active: true }}
          onClose={() => setEdit(undefined)}
          onSave={(data) => persist({ ...data, managerId: data.managerId || null }, edit?.id)}
        />
      )}
      {toggle && (
        <ConfirmDialog
          title={toggle.active ? 'Ngừng hoạt động nhà thuốc?' : 'Kích hoạt nhà thuốc?'}
          description={
            toggle.active
              ? 'Tài khoản thuộc nhà thuốc này sẽ không thể truy cập cho đến khi được kích hoạt lại.'
              : 'Các tài khoản đang hoạt động sẽ có thể truy cập lại.'
          }
          pending={busy}
          onClose={() => setToggle(null)}
          onConfirm={() => {
            setBusy(true);
            const { code, name, address, phone, email, active } = toggle;
            void persist({ code, name, address, phone, email: email || '', active: !active }, toggle.id)
              .then(() => setToggle(null))
              .catch((e) => toast.error(e.message))
              .finally(() => setBusy(false));
          }}
        />
      )}
      {detail && (
        <Dialog
          open
          onOpenChange={() => setDetail(null)}
          title={detail.name}
          description={`Mã nhà thuốc: ${detail.code}`}
        >
          <dl className="detail-grid">
            <div>
              <dt>Địa chỉ</dt>
              <dd>{detail.address}</dd>
            </div>
            <div>
              <dt>Liên hệ</dt>
              <dd>
                {detail.phone}
                <br />
                {detail.email}
              </dd>
            </div>
            <div>
              <dt>Quản lý</dt>
              <dd>{detail.users?.map((u) => u.name).join(', ') || 'Chưa gán'}</dd>
            </div>
            <div>
              <dt>Quy mô dữ liệu</dt>
              <dd>
                {detail._count?.users} tài khoản · {detail._count?.medicines} thuốc
              </dd>
            </div>
          </dl>
        </Dialog>
      )}
    </>
  );
}
function ShieldIcon() {
  return (
    <div className="info-icon">
      <CheckCircle2 size={22} />
    </div>
  );
}
