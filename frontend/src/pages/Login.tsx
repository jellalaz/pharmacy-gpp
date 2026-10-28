import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  Boxes,
  Cross,
  Eye,
  EyeOff,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, homeFor } from '../app/auth';
import { Button } from '../components/ui/button';
const schema = z.object({
  email: z.string().email('Vui lòng nhập email hợp lệ.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});
export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <Cross size={30} strokeWidth={3} />
          <span>
            Pharmacy <b>GPP</b>
          </span>
        </div>
        <div className="story-content">
          <span className="story-label">KHÔNG GIAN QUẢN LÝ NHÀ THUỐC</span>
          <h1>
            Chăm sóc tốt hơn.
            <br />
            Bắt đầu từ quản lý
            <br />
            <em>thông minh hơn.</em>
          </h1>
          <p>
            Kết nối con người, danh mục thuốc và vận hành
            <br />
            trong một không gian làm việc rõ ràng.
          </p>
          <div className="story-features">
            <div>
              <ShieldCheck />
              <span>Phân quyền theo vai trò</span>
            </div>
            <div>
              <Boxes />
              <span>Theo dõi tồn kho đến từng lô</span>
            </div>
            <div>
              <Layers3 />
              <span>Dữ liệu độc lập cho mỗi nhà thuốc</span>
            </div>
          </div>
        </div>
        <div className="story-footer">
          ĐỒ ÁN PHÂN TÍCH & THIẾT KẾ HỆ THỐNG THÔNG TIN <span>OOAD.G607</span>
        </div>
        <div className="story-art" aria-hidden="true">
          <div className="art-ring" />
          <div className="art-cross">+</div>
          <div className="art-pill" />
        </div>
      </section>
      <section className="login-form-section">
        <div className="login-form">
          <div className="login-welcome-icon">
            <LockKeyhole size={25} />
          </div>
          <div className="eyebrow">CHÀO MỪNG TRỞ LẠI</div>
          <h2>Đăng nhập hệ thống</h2>
          <p>Nhập thông tin tài khoản để bắt đầu ca làm việc.</p>
          <form
            onSubmit={handleSubmit(async (data) => {
              setError('');
              try {
                const u = await login(data.email, data.password);
                navigate(homeFor(u.role), { replace: true });
              } catch (e) {
                setError((e as Error).message);
              }
            })}
          >
            <label>
              Email tài khoản
              <input
                type="email"
                autoComplete="username"
                placeholder="ten@nhathuoc.vn"
                {...register('email')}
              />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>
            <label>
              Mật khẩu
              <div className="password-input">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <small className="field-error">{errors.password.message}</small>}
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <Button className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  Đăng nhập <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
          <div className="demo-accounts">
            <span>TRẢI NGHIỆM THEO VAI TRÒ</span>
            <div>
              {[
                ['admin', 'Quản trị viên'],
                ['manager', 'Quản lý'],
                ['inventory', 'Nhân viên kho'],
                ['sales', 'Bán thuốc'],
              ].map(([key, name]) => (
                <button key={key} type="button" onClick={() => setValue('email', `${key}@gpp.demo`)}>
                  {name}
                </button>
              ))}
            </div>
            <p>
              Tài khoản demo dùng trong môi trường phát triển.
              <br />
              Xem mật khẩu và hướng dẫn trong README của dự án.
            </p>
          </div>
        </div>
        <footer>
          Pharmacy GPP · Giai đoạn 1 <span>Phiên bản phục vụ đồ án</span>
        </footer>
      </section>
    </div>
  );
}
