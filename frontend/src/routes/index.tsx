import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from '../types';
import { useAuth, homeFor } from '../app/auth';
import { Loading } from '../components/common';
import { Button } from '../components/ui/button';
import { AppLayout, AccountPage } from '../layouts/AppLayout';
const Login = lazy(() => import('../pages/Login').then((m) => ({ default: m.Login })));
const Admin = lazy(() => import('../pages/Admin').then((m) => ({ default: m.Admin })));
const Pharmacies = lazy(() => import('../pages/Pharmacies').then((m) => ({ default: m.Pharmacies })));
const Users = lazy(() => import('../pages/Users').then((m) => ({ default: m.Users })));
const Medicines = lazy(() => import('../pages/Medicines').then((m) => ({ default: m.Medicines })));
const Suppliers = lazy(() => import('../pages/Suppliers').then((m) => ({ default: m.Suppliers })));
const Inventory = lazy(() => import('../pages/Inventory').then((m) => ({ default: m.Inventory })));
const Expiry = lazy(() => import('../pages/Warehouse').then((m) => ({ default: m.Expiry })));
const Stocktake = lazy(() => import('../pages/Warehouse').then((m) => ({ default: m.Stocktake })));
const Warehouse = lazy(() => import('../pages/Warehouse').then((m) => ({ default: m.Warehouse })));
const Receipts = lazy(() => import('../pages/Receipts').then((m) => ({ default: m.Receipts })));
const POS = lazy(() => import('../pages/POS').then((m) => ({ default: m.POS })));
const Sales = lazy(() => import('../pages/Sales').then((m) => ({ default: m.Sales })));
const Manager = lazy(() => import('../pages/Manager').then((m) => ({ default: m.Manager })));
const Reports = lazy(() => import('../pages/Reports').then((m) => ({ default: m.Reports })));
function Protected({ roles }: { roles?: Role[] }) {
  const { user, pending } = useAuth();
  const location = useLocation();
  if (pending) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role))
    return (
      <div className="state-panel">
        <h1>Không có quyền truy cập</h1>
        <p>Vai trò hiện tại không được sử dụng chức năng này.</p>
        <Button onClick={() => window.location.assign(homeFor(user.role))}>Về trang của tôi</Button>
      </div>
    );
  return <Outlet />;
}
function Home() {
  const { user, pending } = useAuth();
  return pending ? <Loading /> : <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}
export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route element={<Protected />}>
          <Route element={<AppLayout />}>
            <Route path="/account" element={<AccountPage />} />
            <Route element={<Protected roles={['ADMIN']} />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/pharmacies" element={<Pharmacies />} />
              <Route path="/users" element={<Users />} />
            </Route>
            <Route element={<Protected roles={['MANAGER']} />}>
              <Route path="/overview" element={<Manager />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/staff" element={<Users />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/receipt-history" element={<Receipts readOnly />} />
            </Route>
            <Route element={<Protected roles={['MANAGER', 'INVENTORY', 'SALES']} />}>
              <Route path="/lookup" element={<Inventory />} />
              <Route path="/inventory" element={<Navigate to="/lookup" replace />} />
            </Route>
            <Route element={<Protected roles={['INVENTORY']} />}>
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/stocktake" element={<Stocktake />} />
            </Route>
            <Route element={<Protected roles={['MANAGER', 'INVENTORY']} />}>
              <Route path="/expiry" element={<Expiry />} />
            </Route>
            <Route element={<Protected roles={['MANAGER', 'SALES']} />}>
              <Route path="/sales" element={<Sales />} />
            </Route>
            <Route element={<Protected roles={['SALES']} />}>
              <Route path="/pos" element={<POS />} />
            </Route>
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <div className="state-panel">
              <h1>Không tìm thấy trang</h1>
              <a href="/">Về trang chủ</a>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
