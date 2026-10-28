import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LockKeyhole, Pencil, Plus, ShieldCheck, UserCheck, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Pharmacy, User } from '../types';
import { useAuth } from '../app/auth';
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
import { RecordForm, toForm, type Field } from '../features/RecordForm';
import { matches, roleNames } from '../utils/format';
export function Users() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const { query, records, persist } = useRecords<User>('/users');
  const pharmacies = useQuery({
    queryKey: ['/pharmacies'],
    queryFn: () => api<Pharmacy[]>('/pharmacies'),
    enabled: admin,
  });
  const [search, setSearch] = useState(''),
    [role, setRole] = useState('all'),
    [status, setStatus] = useState('all'),
    [grant, setGrant] = useState<User | null>(null),
    [edit, setEdit] = useState<User | null | undefined>(),
    [toggle, setToggle] = useState<User | null>(null),
    [busy, setBusy] = useState(false);
  const fields: Field[] = [
    { name: 'name', label: 'Họ và tên', required: true },
    { name: 'email', label: 'Email đăng nhập', type: 'email', required: true },
    {
      name: 'password',
      label: edit ? 'Mật khẩu mới (nếu đổi)' : 'Mật khẩu',
      type: 'password',
      required: !edit,
      minLength: 8,
      maxLength: 128,
      hint: edit ? 'Từ 8 đến 128 ký tự. Để trống để giữ mật khẩu hiện tại.' : 'Từ 8 đến 128 ký tự.',
    },
    {
      name: 'role',
      label: 'Vai trò',
      type: 'select',
      required: true,
      options: Object.entries(roleNames)
        .filter(([r]) => admin || ['SALES', 'INVENTORY'].includes(r))
        .map(([value, label]) => ({ value, label })),
    },
    ...(admin
      ? [
          {
            name: 'pharmacyId',
            label: 'Nhà thuốc được gán',
            type: 'select' as const,
            options: pharmacies.data?.map((p) => ({ value: p.id, label: p.name })),
            full: true,
            hint: 'Admin không thuộc nhà thuốc. Quản lý có thể được gán sau.',
          },
        ]
      : []),
    { name: 'active', label: 'Cho phép tài khoản hoạt động', type: 'checkbox', full: true },
  ];
  return (
    <>
      <PageHeader
        eyebrow={admin ? 'QUẢN TRỊ HỆ THỐNG' : 'ĐỘI NGŨ NHÀ THUỐC'}
        title={admin ? 'Quản lý người dùng' : 'Quản lý nhân viên'}
        description={
          admin
            ? 'Phân công đúng người, đúng vai trò, đúng nhà thuốc.'
            : 'Quản lý tài khoản bán thuốc và nhân viên kho trong nhà thuốc của bạn.'
        }
        actions={
          <Button onClick={() => setEdit(null)}>
            <Plus size={17} />
            Thêm {admin ? 'người dùng' : 'nhân viên'}
          </Button>
        }
      />
      <div className="stats-grid three">
        <StatCard
          title="Tổng tài khoản"
          value={records.length}
          note={admin ? 'Trong toàn hệ thống' : 'Thuộc nhà thuốc của bạn'}
          icon={UsersIcon}
        />
        <StatCard
          title="Đang hoạt động"
          value={records.filter((u) => u.active).length}
          note="Tài khoản được phép truy cập"
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          title="Vai trò được quản lý"
          value={admin ? 4 : 2}
          note="Quyền được kiểm tra tại máy chủ"
          icon={ShieldCheck}
          tone="blue"
        />
      </div>
      {!admin && (
        <details className="panel permission-guide">
          <summary>
            <ShieldCheck size={17} /> Quyền theo vai trò trong cơ sở
          </summary>
          <div className="permission-grid">
            <div>
              <strong>Nhân viên kho</strong>
              <p>Tra cứu thuốc, lập phiếu nhập nháp, theo dõi hạn dùng và xem trước kiểm kê.</p>
            </div>
            <div>
              <strong>Nhân viên bán hàng</strong>
              <p>Tra cứu thuốc, sử dụng quầy bán mô phỏng và xem lịch sử bán hàng.</p>
            </div>
            <div>
              <strong>Quản lý</strong>
              <p>
                Tạo tài khoản, cấp vai trò, quản lý thuốc, giá, nhà cung cấp, theo dõi chứng từ và báo cáo.
              </p>
            </div>
          </div>
        </details>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Danh sách {admin ? 'người dùng' : 'nhân viên'}</h2>
          <Badge tone="info">Phân quyền theo vai trò</Badge>
        </div>
        <div className="table-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo họ tên hoặc email..." />
          <select aria-label="Lọc vai trò" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            {Object.entries(roleNames)
              .filter(([r]) => admin || ['SALES', 'INVENTORY'].includes(r))
              .map(([r, n]) => (
                <option key={r} value={r}>
                  {n}
                </option>
              ))}
          </select>
          <select
            aria-label="Trạng thái tài khoản"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
        </div>
        <QueryState query={query}>
          <DataTable
            data={records.filter(
              (u) =>
                matches(search, u.name, u.email) &&
                (role === 'all' || u.role === role) &&
                (status === 'all' || u.active === (status === 'active')),
            )}
            columns={[
              {
                label: 'Người dùng',
                render: (u) => (
                  <div className="entity-cell">
                    <div className="avatar avatar-teal">{u.name.split(' ').at(-1)?.[0]}</div>
                    <div>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </div>
                  </div>
                ),
              },
              {
                label: 'Vai trò',
                render: (u) => (
                  <Badge tone={u.role === 'ADMIN' ? 'info' : 'neutral'}>{roleNames[u.role]}</Badge>
                ),
              },
              { label: 'Nhà thuốc', render: (u) => u.pharmacy?.name || 'Toàn hệ thống / chưa gán' },
              {
                label: 'Trạng thái',
                render: (u) => (
                  <Badge tone={u.active ? 'success' : 'danger'}>{u.active ? 'Hoạt động' : 'Đã khóa'}</Badge>
                ),
              },
              {
                label: 'Thao tác',
                render: (u) => (
                  <div className="row-actions">
                    {!admin && (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Cấp vai trò cho ${u.name}`}
                        onClick={() => setGrant(u)}
                      >
                        <ShieldCheck size={15} />
                        Cấp vai trò
                      </Button>
                    )}
                    <button aria-label={`Sửa ${u.name}`} onClick={() => setEdit(u)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      disabled={u.id === user?.id}
                      aria-label={`Khóa hoặc mở khóa ${u.name}`}
                      onClick={() => setToggle(u)}
                    >
                      <LockKeyhole size={16} />
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
          title={edit ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
          fields={fields}
          defaults={edit ? toForm(edit) : { active: true, role: 'SALES' }}
          onClose={() => setEdit(undefined)}
          onSave={async (data) => {
            const { password, ...rest } = data;
            await persist(
              {
                ...rest,
                pharmacyId: admin
                  ? data.role === 'ADMIN'
                    ? null
                    : data.pharmacyId || null
                  : user?.pharmacyId,
                ...(password ? { password } : {}),
              },
              edit?.id,
            );
          }}
        />
      )}
      {grant && (
        <RecordForm
          title={`Cấp vai trò · ${grant.name}`}
          fields={[
            {
              name: 'role',
              label: 'Vai trò nhân viên',
              type: 'select',
              required: true,
              options: [
                { value: 'INVENTORY', label: roleNames.INVENTORY },
                { value: 'SALES', label: roleNames.SALES },
              ],
              hint: 'Chọn một vai trò. Nhân viên sẽ cần đăng nhập lại sau khi lưu.',
            },
          ]}
          defaults={{ role: grant.role }}
          onClose={() => setGrant(null)}
          onSave={async (data) => {
            await api(`/users/${grant.id}/role`, {
              method: 'PATCH',
              body: JSON.stringify({ role: data.role }),
            });
            await query.refetch();
            toast.success('Đã cấp vai trò và thu hồi các phiên đăng nhập cũ.');
          }}
        />
      )}
      {toggle && (
        <ConfirmDialog
          title={toggle.active ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
          description={`Thay đổi quyền truy cập của ${toggle.name}. Các phiên cũ sẽ bị thu hồi.`}
          pending={busy}
          onClose={() => setToggle(null)}
          onConfirm={() => {
            setBusy(true);
            const { name, email, role, pharmacyId, active } = toggle;
            void persist({ name, email, role, pharmacyId, active: !active }, toggle.id)
              .then(() => setToggle(null))
              .catch((e) => toast.error(e.message))
              .finally(() => setBusy(false));
          }}
        />
      )}
    </>
  );
}
