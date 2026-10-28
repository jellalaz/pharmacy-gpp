import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, ChevronRight, Plus, ShieldCheck, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Pharmacy, User } from '../types';
import { api } from '../services/api';
import { useAuth } from '../app/auth';
import { Badge, DataTable, DemoNotice, PageHeader, QueryState, StatCard } from '../components/common';
import { Button } from '../components/ui/button';
import { roleNames, date } from '../utils/format';
export function Admin() {
  const { user } = useAuth();
  const pharmacies = useQuery({ queryKey: ['/pharmacies'], queryFn: () => api<Pharmacy[]>('/pharmacies') });
  const users = useQuery({ queryKey: ['/users'], queryFn: () => api<User[]>('/users') });
  const ps = pharmacies.data ?? [],
    us = users.data ?? [];
  const chart = Object.entries(roleNames).map(([r, name]) => ({
    name: name
      .replace('Nhân viên ', '')
      .replace('Quản trị hệ thống', 'Quản trị')
      .replace('Quản lý nhà thuốc', 'Quản lý'),
    count: us.filter((u) => u.role === r).length,
  }));
  return (
    <>
      <PageHeader
        eyebrow="TỔNG QUAN HỆ THỐNG"
        title={`Chào ${user?.name.split(' ').at(-1)}, chào mừng trở lại!`}
        description="Theo dõi các nhà thuốc và quản lý quyền truy cập từ một nơi."
        actions={
          <Button asChild>
            <Link to="/pharmacies">
              <Plus size={17} />
              Quản lý nhà thuốc
            </Link>
          </Button>
        }
      />
      <div className="stats-grid">
        <StatCard
          title="Tổng nhà thuốc"
          value={ps.length}
          note="Cơ sở được tạo trên hệ thống"
          icon={Building2}
        />
        <StatCard
          title="Đang hoạt động"
          value={ps.filter((p) => p.active).length}
          note="Nhà thuốc sẵn sàng vận hành"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          title="Tổng người dùng"
          value={us.length}
          note="Tài khoản nội bộ toàn hệ thống"
          icon={Users}
          tone="blue"
        />
        <StatCard
          title="Vai trò hệ thống"
          value={4}
          note="Admin · Quản lý · Kho · Bán thuốc"
          icon={ShieldCheck}
          tone="amber"
        />
      </div>
      <div className="admin-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Nhà thuốc trên hệ thống</h2>
              <p>Thông tin và trạng thái vận hành mới nhất.</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pharmacies">
                Xem tất cả
                <ChevronRight size={15} />
              </Link>
            </Button>
          </div>
          <QueryState query={pharmacies}>
            <DataTable
              data={[...ps].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
              columns={[
                {
                  label: 'Nhà thuốc',
                  render: (p) => (
                    <div className="entity-cell">
                      <div className="entity-icon teal">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.code}</small>
                      </div>
                    </div>
                  ),
                },
                { label: 'Ngày tạo', render: (p) => date(p.createdAt) },
                { label: 'Nhân sự', render: (p) => p._count?.users ?? 0 },
                {
                  label: 'Trạng thái',
                  render: (p) => (
                    <Badge tone={p.active ? 'success' : 'neutral'}>
                      {p.active ? 'Hoạt động' : 'Đã ngừng'}
                    </Badge>
                  ),
                },
              ]}
            />
          </QueryState>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Nhân sự theo vai trò</h2>
            <Users size={19} />
          </div>
          <QueryState query={users}>
            <div className="chart-area admin-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [v, 'Tài khoản']} />
                  <Bar
                    dataKey="count"
                    fill="#138e96"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </QueryState>
        </section>
      </div>
      <div className="admin-callout">
        <div className="admin-callout-icon">
          <ShieldCheck size={34} />
        </div>
        <div>
          <span className="eyebrow">QUẢN TRỊ TẬP TRUNG</span>
          <h2>Đúng vai trò. Đúng phạm vi truy cập.</h2>
          <p>Admin thiết lập nhà thuốc và tài khoản. Mỗi đội ngũ vận hành trong không gian riêng của mình.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/users">
            Quản lý người dùng
            <ChevronRight size={16} />
          </Link>
        </Button>
      </div>
      <DemoNotice />
    </>
  );
}
