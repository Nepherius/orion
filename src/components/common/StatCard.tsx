import { Info } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  info?: string;
  unit?: string;
}

export function StatCard({ label, value, color = 'text-body', info, unit }: StatCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
        {label}
        {info && <Info className="w-3 h-3 cursor-help" />}
      </div>
      <div className={`shrink-0 text-right font-semibold ${color}`}>
        {value}
        {unit && <span className="text-xs ml-1">{unit}</span>}
      </div>
    </div>
  );
}
