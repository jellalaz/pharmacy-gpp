import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Cross,
  LayoutDashboard,
  Menu,
  Pill,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../app/auth';
import type { Role } from '../types';
import { roleNames } from '../utils/format';
import { Button } from '../components/ui/button';
import { Loading, PageHeader } from '../components/common';
import { AccountMenu } from '../components/AccountMenu';
type Item = { path: string; label: string; icon: LucideIcon };
export const navigation: Record<Role, Item[]> = {
  ADMIN: [
    { path: '/admin', label: 'Tổng quan hệ thống', icon: LayoutDashboard },
    { path: '/pharmacies', label: 'Quản lý nhà thuốc', icon: Building2 },
    { path: '/users', label: 'Quản lý người dùng', icon: Users },
  ],
  MANAGER: [
    { path: '/overview', label: 'Tổng quan', icon: LayoutDashboard },
    { path: '/medicines', label: 'Danh mục thuốc', icon: Pill },
    { path: '/suppliers', label: 'Nhà cung cấp', icon: Truck },
    { path: '/lookup', label: 'Tra cứu thuốc', icon: Search },
    { path: '/expiry', label: 'Theo dõi hạn dùng', icon: Clock3 },
    { path: '/receipt-history', label: 'Lịch sử nhập hàng', icon: ClipboardList },
    { path: '/sales', label: 'Lịch sử bán hàng', icon: ShoppingBag },
    { path: '/staff', label: 'Nhân viên & phân quyền', icon: Users },
    { path: '/reports', label: 'Báo cáo', icon: ChartNoAxesCombined },
  ],
  INVENTORY: [
    { path: '/warehouse', label: 'Tổng quan kho', icon: LayoutDashboard },
    { path: '/receipts', label: 'Nhập thuốc', icon: ClipboardList },
    { path: '/lookup', label: 'Tra cứu tồn kho', icon: Search },
    { path: '/stocktake', label: 'Kiểm kê', icon: ClipboardCheck },
    { path: '/expiry', label: 'Hạn sử dụng', icon: Clock3 },
  ],
  SALES: [
    { path: '/pos', label: 'Bán thuốc tại quầy', icon: ShoppingBag },
    { path: '/lookup', label: 'Tra cứu thuốc', icon: Search },
    { path: '/sales', label: 'Lịch sử bán hàng', icon: ClipboardList },
  ],
};
export function AppLayout() {
  const { user } = useAuth();
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  if (!user) return null;
  const links = navigation[user.role],
    active = links.find((i) => i.path === location.pathname);
  return (
    <div className="app-shell">
      {mobile && (
        <button className="sidebar-backdrop" aria-label="Đóng điều hướng" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
        <Link to={links[0].path} className="brand">
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
        </Link>
        <button className="mobile-close icon-button" onClick={() => setMobile(false)} aria-label="Đóng menu">
          <X size={20} />
        </button>
        <div className="workspace-label">
          <div className="workspace-icon">
            {user.role === 'ADMIN' ? <ShieldCheck size={18} /> : <Building2 size={18} />}
          </div>
          <div>
            <small>{user.role === 'ADMIN' ? 'KHÔNG GIAN LÀM VIỆC' : 'NHÀ THUỐC CỦA BẠN'}</small>
            <strong>{user.pharmacy?.name || 'Quản trị hệ thống'}</strong>
          </div>
        </div>
        <div className="nav-caption">QUẢN LÝ VẬN HÀNH</div>
        <nav>
          {links.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobile(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="phase-card">
            <span className="phase-icon">
              <Activity size={18} />
            </span>
            <strong>Vận hành minh bạch</strong>
            <p>Mỗi nhà thuốc, một không gian dữ liệu độc lập.</p>
            <span className="phase-version">BẢN ĐỒ ÁN · GIAI ĐOẠN 1</span>
          </div>
          <div className="sidebar-footer">
            <span>OOAD.G607</span>
            <span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button className="mobile-menu icon-button" aria-label="Mở menu" onClick={() => setMobile(true)}>
              <Menu size={21} />
            </button>
            <span>{user.role === 'ADMIN' ? 'Hệ thống' : 'Không gian nhà thuốc'}</span>
            <ChevronRight size={14} />
            <strong>{active?.label || 'Tài khoản cá nhân'}</strong>
          </div>
          <div className="header-right">
            <span className="environment">
              <span />
              Môi trường trình diễn
            </span>
            <div className="header-divider" />
            <AccountMenu user={user} />
          </div>
        </header>
        <main className="main-content">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>Pharmacy GPP © 2026 · OOAD.G607</span>
          <span>
            Phần mềm minh họa đồ án <ArrowUpRight size={12} />
          </span>
        </footer>
      </div>
    </div>
  );
}
export function AccountPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        eyebrow="KHÔNG GIAN CÁ NHÂN"
        title="Thông tin tài khoản"
        description="Quyền truy cập được xác định và kiểm tra tại máy chủ."
      />
      <section className="panel account-panel">
        <div className="profile-avatar">
          <UserRound size={34} />
        </div>
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
        <dl className="detail-grid">
          <div>
            <dt>Vai trò</dt>
            <dd>{user && roleNames[user.role]}</dd>
          </div>
          <div>
            <dt>Nhà thuốc</dt>
            <dd>{user?.pharmacy?.name || 'Toàn hệ thống'}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>Đang hoạt động</dd>
          </div>
          <div>
            <dt>Phiên truy cập</dt>
            <dd>Hiệu lực tối đa 8 giờ</dd>
          </div>
        </dl>
        <Button variant="outline" asChild>
          <Link to={user ? navigation[user.role][0].path : '/login'}>Trở về không gian làm việc</Link>
        </Button>
      </section>
    </>
  );
}
