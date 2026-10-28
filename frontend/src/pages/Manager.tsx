import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Users,
  Pill,
  Clock3,
  Search,
  Truck,
  ClipboardList,
  ShoppingBag,
  ChartNoAxesCombined,
  TriangleAlert,
} from 'lucide-react';
import { useAuth } from '../app/auth';
import { api } from '../services/api';
import type { Medicine, User, Report } from '../types';
import { Badge, DemoNotice, PageHeader, QueryState, StatCard } from '../components/common';
import { daysFromToday, money, today } from '../utils/format';
import { sellable } from '../utils/inventory';
const tasks = [
  {
    path: '/staff',
    title: 'Nhân viên & phân quyền',
    text: 'Tạo tài khoản, cấp vai trò, khóa hoặc mở quyền truy cập.',
    icon: Users,
  },
  {
    path: '/medicines',
    title: 'Danh mục & giá thuốc',
    text: 'Quản lý mã thuốc, mã vạch, giá bán và ngưỡng tồn.',
    icon: Pill,
  },
  {
    path: '/lookup',
    title: 'Tra cứu thuốc chung',
    text: 'Tìm thuốc trong cơ sở, kiểm tra giá và tồn từng lô.',
    icon: Search,
  },
  {
    path: '/suppliers',
    title: 'Nhà cung cấp',
    text: 'Quản lý đối tác, thông tin liên hệ và mã số thuế.',
    icon: Truck,
  },
  {
    path: '/receipt-history',
    title: 'Lịch sử nhập hàng',
    text: 'Xem phiếu nhập, nhà cung cấp, số lô và bản in.',
    icon: ClipboardList,
  },
  {
    path: '/sales',
    title: 'Lịch sử bán hàng',
    text: 'Xem phiếu bán, nhân viên thực hiện và thanh toán.',
    icon: ShoppingBag,
  },
  {
    path: '/expiry',
    title: 'Theo dõi hạn dùng',
    text: 'Kiểm tra các lô sắp hết hạn và đã hết hạn.',
    icon: Clock3,
  },
  {
    path: '/reports',
    title: 'Báo cáo hoạt động',
    text: 'Doanh thu chi tiết, nhập hàng và nhập – xuất – tồn.',
    icon: ChartNoAxesCombined,
  },
];
export function Manager() {
  const { user } = useAuth();
  const medicines = useQuery({ queryKey: ['/medicines'], queryFn: () => api<Medicine[]>('/medicines') });
  const staff = useQuery({ queryKey: ['/users'], queryFn: () => api<User[]>('/users') });
  const range = { from: today(), to: today() };
  const report = useQuery({
    queryKey: ['reports', range],
    queryFn: () => api<Report>(`/reports?from=${range.from}&to=${range.to}`),
  });
  const records = medicines.data ?? [];
  const low = records.filter((m) => m.active && sellable(m) < m.lowStock);
  const expired = records
    .flatMap((m) => m.batches)
    .filter((b) => (b.balance?.quantity ?? 0) > 0 && daysFromToday(b.expiryDate) <= 90);
  return (
    <>
      <PageHeader
        eyebrow="KHÔNG GIAN QUẢN LÝ"
        title="Tổng quan nhà thuốc"
        description={`Xin chào ${user?.name}. Điều hành công việc tại ${user?.pharmacy?.name}.`}
        actions={<Badge tone="info">Quản lý cơ sở</Badge>}
      />
      <QueryState query={report}>
        <QueryState query={staff}>
          <QueryState query={medicines}>
            <div className="stats-grid">
              <StatCard
                title="Doanh thu hôm nay"
                value={money(report.data?.revenue ?? 0)}
                note={`${report.data?.transactions ?? 0} phiếu đã xác nhận · dữ liệu trình diễn`}
                icon={ChartNoAxesCombined}
              />
              <StatCard
                title="Nhân viên hoạt động"
                value={(staff.data ?? []).filter((s) => s.active).length}
                note="Nhân viên kho và bán hàng"
                icon={Users}
                tone="blue"
              />
              <StatCard
                title="Thuốc tồn thấp"
                value={low.length}
                note="Dưới ngưỡng tồn có thể bán"
                icon={Pill}
                tone="amber"
              />
              <StatCard
                title="Lô cần theo dõi"
                value={expired.length}
                note="Có tồn; hết hạn hoặc còn ≤ 90 ngày"
                icon={Clock3}
                tone="orange"
              />
            </div>
            <section className="panel manager-actions">
              <div className="panel-heading">
                <div>
                  <h2>Công việc quản lý</h2>
                  <p>Chọn chức năng để thực hiện trong cơ sở của bạn.</p>
                </div>
                <Badge tone="success">8 nhóm chức năng</Badge>
              </div>
              <div className="action-grid">
                {tasks.map(({ path, title, text, icon: Icon }) => (
                  <Link className="action-card" key={path} to={path}>
                    <span className="entity-icon teal">
                      <Icon size={21} />
                    </span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </div>
            </section>
            <div className="manager-bottom">
              <section className="panel">
                <div className="panel-heading">
                  <h2 className="section-title-icon">
                    <TriangleAlert size={17} />
                    Ưu tiên hôm nay
                  </h2>
                </div>
                <div className="manager-alerts">
                  <Link to="/lookup">
                    <span className="priority-count">{low.length}</span>
                    <span>Thuốc cần kiểm tra tồn thấp</span>
                    <ArrowUpRight size={15} />
                  </Link>
                  <Link to="/expiry">
                    <span className="priority-count priority-expiry">{expired.length}</span>
                    <span>Lô cần theo dõi hạn dùng</span>
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2 className="section-title-icon">
                    <Users size={17} />
                    Phân công trong cơ sở
                  </h2>
                </div>
                <p className="detail-note">
                  Nhân viên kho lập phiếu nhập và kiểm kê. Nhân viên bán hàng sử dụng quầy bán. Cả hai cùng
                  quản lý đều tra cứu được danh mục thuốc và tồn kho của cơ sở.
                </p>
              </section>
            </div>
          </QueryState>
        </QueryState>
      </QueryState>
      <DemoNotice>
        Chứng từ xác nhận và số liệu doanh thu hiện là dữ liệu mẫu. Quản lý tài khoản, danh mục, nhà cung cấp
        và lưu phiếu nhập nháp hoạt động với MySQL.
      </DemoNotice>
    </>
  );
}
