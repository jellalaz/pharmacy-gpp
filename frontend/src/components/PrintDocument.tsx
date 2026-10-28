import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { useAuth } from '../app/auth';
import { Button } from './ui/button';
import type { ExportCell } from '../utils/export';
export function PrintDocument({
  title,
  subtitle,
  headers,
  rows,
  footer,
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: ExportCell[][];
  footer: string;
}) {
  const { user } = useAuth();
  return (
    <>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer size={16} />
        In / lưu PDF
      </Button>
      {createPortal(
        <article className="print-document">
          <header>
            <strong>{user?.pharmacy?.name}</strong>
            <p>
              {user?.pharmacy?.address} · {user?.pharmacy?.phone}
            </p>
          </header>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <table>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="print-footer">{footer}</p>
          <p>Pharmacy GPP · Bản đồ án giai đoạn 1</p>
        </article>,
        document.body,
      )}
    </>
  );
}
