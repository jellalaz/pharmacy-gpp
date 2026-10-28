export type ExportCell = string | number | null | undefined;
export function csvText(headers: string[], rows: ExportCell[][]) {
  const escape = (value: ExportCell) => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\ufeff' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}
export function exportCsv(filename: string, headers: string[], rows: ExportCell[][]) {
  const url = URL.createObjectURL(new Blob([csvText(headers, rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
