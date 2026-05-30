import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  span?: number;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  className?: string;
  maxHeightClassName?: string;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  className = '',
  maxHeightClassName = '',
  rowClassName,
  onRowClick,
  emptyMessage = 'No rows found.',
}: DataTableProps<T>) {
  const gridTemplateColumns = columns.map((column) => `minmax(0, ${column.span ?? 1}fr)`).join(' ');

  return (
    <div className={`overflow-x-auto ${maxHeightClassName} ${className}`}>
      <div className="min-w-[680px]">
        <div
          className="sticky top-0 z-10 grid gap-2 border-b border-border bg-surface pb-2 text-xs font-semibold uppercase tracking-wide text-muted"
          style={{ gridTemplateColumns }}
        >
          {columns.map((column) => (
            <div key={column.key} className={column.align === 'right' ? 'text-right' : ''}>
              {column.header}
            </div>
          ))}
        </div>
        <div className="divide-y divide-border/60">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">{emptyMessage}</div>
          ) : (
            rows.map((row) => (
              <div
                key={getRowKey(row)}
                className={`grid gap-2 py-2 text-sm transition-colors hover:bg-surface-hover ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName?.(row) ?? ''}`}
                style={{ gridTemplateColumns }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={column.align === 'right' ? 'text-right' : 'min-w-0'}
                  >
                    {column.render(row)}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
