import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronDown, LayoutDashboard, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { homeFor, useAuth } from '../app/auth';
import type { User } from '../types';
import { roleNames } from '../utils/format';

export function AccountMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<'first' | 'last'>('first');
  const menuId = useId();
  const initials = user.name
    .split(' ')
    .slice(-2)
    .map((n) => n[0])
    .join('');

  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[initialFocus.current === 'last' ? items.length - 1 : 0]?.focus();
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div
      className="account-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        className={`user-menu ${open ? 'is-open' : ''}`}
        aria-label="Menu tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          initialFocus.current = 'first';
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
            setOpen(true);
          }
        }}
      >
        <div className="avatar account-avatar">
          {initials}
          <span className="account-online" />
        </div>
        <div className="account-trigger-text">
          <strong>{user.name}</strong>
          <small>{roleNames[user.role]}</small>
        </div>
        <ChevronDown size={16} className="account-chevron" />
      </button>
      {open && (
        <div className="account-dropdown" id={menuId}>
          <div className="account-menu-summary">
            <div className="avatar account-avatar">{initials}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <div className="account-menu-scope">
            <span>
              <ShieldCheck size={14} />
              {roleNames[user.role]}
            </span>
            <span>
              <Building2 size={14} />
              {user.pharmacy?.name || 'Toàn hệ thống'}
            </span>
          </div>
          <div
            ref={menu}
            role="menu"
            aria-label="Tùy chọn tài khoản"
            className="account-menu-options"
            onKeyDown={(event) => {
              const items = [
                ...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'),
              ];
              const index = items.indexOf(document.activeElement as HTMLElement);
              let next: number | undefined;
              if (event.key === 'ArrowDown') next = (index + 1) % items.length;
              if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
              if (event.key === 'Home') next = 0;
              if (event.key === 'End') next = items.length - 1;
              if (next !== undefined) {
                event.preventDefault();
                items[next]?.focus();
              }
            }}
          >
            <Link role="menuitem" to="/account" onClick={() => setOpen(false)}>
              <UserRound size={18} />
              <div>
                <strong>Thông tin tài khoản</strong>
                <small>Xem hồ sơ và quyền truy cập</small>
              </div>
            </Link>
            <Link role="menuitem" to={homeFor(user.role)} onClick={() => setOpen(false)}>
              <LayoutDashboard size={18} />
              <div>
                <strong>Không gian làm việc</strong>
                <small>Trở về trang chính của bạn</small>
              </div>
            </Link>
            <button
              type="button"
              role="menuitem"
              className="account-logout"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await logout();
                } catch (error) {
                  toast.error((error as Error).message);
                  setBusy(false);
                }
              }}
            >
              <LogOut size={18} />
              <strong>{busy ? 'Đang đăng xuất...' : 'Đăng xuất'}</strong>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
