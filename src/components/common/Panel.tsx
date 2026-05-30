import type { ReactNode } from 'react';
import { InfoTooltip } from './InfoTooltip';

interface PanelProps {
  title?: string;
  tooltip?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Panel({
  title,
  tooltip,
  action,
  children,
  className = '',
  contentClassName = '',
}: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          {title ? (
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold uppercase tracking-wide text-body">
                {title}
              </h3>
              {tooltip && <InfoTooltip tooltip={tooltip} />}
            </div>
          ) : (
            <div />
          )}
          {action}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

interface MetricTileProps {
  label: string;
  value: string | number;
  tone?: 'positive' | 'negative' | 'neutral' | 'warning' | 'accent';
  icon?: ReactNode;
  detail?: string;
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  valueClassName?: string;
}

const toneClass = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  neutral: 'text-body',
  warning: 'text-yellow-400',
  accent: 'text-blue-400',
};

const sizeClass = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export function MetricTile({
  label,
  value,
  tone = 'neutral',
  icon,
  detail,
  tooltip,
  size = 'md',
  valueClassName = '',
}: MetricTileProps) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
        {tooltip && <InfoTooltip tooltip={tooltip} />}
      </div>
      <div
        className={`flex min-w-0 items-center gap-2 font-semibold ${sizeClass[size]} ${valueClassName || toneClass[tone]}`}
      >
        {icon}
        <span className="truncate">{value}</span>
      </div>
      {detail && <div className="mt-1 truncate text-xs text-muted">{detail}</div>}
    </div>
  );
}
