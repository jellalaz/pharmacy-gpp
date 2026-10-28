import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  Inbox,
  LoaderCircle,
  Search,
  type LucideIcon,
} from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
export function StatCard({
  title,
  value,
  note,
  icon: Icon,
  tone = 'teal',
}: {
  title: string;
  value: ReactNode;
  note: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className={`stat-icon ${tone}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}
export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="demo-notice">
      <Database size={16} />
      <span>
        {children || 'Dữ liệu minh họa phục vụ đồ án • Không sử dụng cho hoạt động nhà thuốc thực tế.'}
      </span>
      <span className="demo-tag">GIAI ĐOẠN 1</span>
    </div>
  );
}
export function PrototypeNotice({ children }: { children: ReactNode }) {
  return (
    <div className="prototype-notice">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  label = 'Tìm kiếm',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="search-input">
      <Search size={18} />
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button aria-label="Xóa tìm kiếm" onClick={() => onChange('')}>
          ×
        </button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="state-panel" role="status">
      <LoaderCircle className="spin" size={28} />
      <h3>Đang tải dữ liệu...</h3>
      <p>Đang kết nối với nhà thuốc của bạn.</p>
    </div>
  );
}
export function Empty({ text = 'Chưa có dữ liệu phù hợp.' }: { text?: string }) {
  return (
    <div className="state-panel">
      <Inbox size={32} />
      <h3>{text}</h3>
      <p>Thử thay đổi bộ lọc hoặc thêm bản ghi mới.</p>
    </div>
  );
}
export function QueryState({
  query,
  children,
}: {
  query: Pick<UseQueryResult, 'isPending' | 'error' | 'refetch'>;
  children: ReactNode;
}) {
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <div className="state-panel" role="alert">
        <AlertCircle size={28} />
        <h3>Không tải được dữ liệu</h3>
        <p>{query.error.message}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  return children;
}
export interface Column<T> {
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
}
export function DataTable<T extends { id: string }>({
  data,
  columns,
  pageSize = 7,
}: {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
}) {
  const [page, setPage] = useState(1),
    pages = Math.max(1, Math.ceil(data.length / pageSize)),
    current = Math.min(page, pages);
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label} className={c.className}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice((current - 1) * pageSize, current * pageSize).map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.label} className={c.className}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && <Empty />}
      </div>
      <div className="table-footer">
        <span>
          Hiển thị {data.length ? (current - 1) * pageSize + 1 : 0}–
          {Math.min(current * pageSize, data.length)} trên <strong>{data.length}</strong> kết quả
        </span>
        <div className="pagination">
          <Button
            size="icon"
            variant="outline"
            aria-label="Trang trước"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ArrowLeft size={15} />
          </Button>
          <span>
            {current} / {pages}
          </span>
          <Button
            size="icon"
            variant="outline"
            aria-label="Trang sau"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
  pending = false,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && !pending && onClose()} title={title} description={description}>
      <div className="dialog-actions">
        <Button variant="outline" disabled={pending} onClick={onClose}>
          Quay lại
        </Button>
        <Button disabled={pending} onClick={onConfirm}>
          {pending ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}Xác nhận
        </Button>
      </div>
    </Dialog>
  );
}
