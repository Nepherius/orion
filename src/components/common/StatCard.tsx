import { Info } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  info?: string;
  unit?: string;
}

export function StatCard({ label, value, color = 'text-white', info, unit }: StatCardProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {label}
        {info && <Info className="w-3 h-3 cursor-help" title={info} />}
      </div>
      <div className={`font-semibold ${color}`}>
        {value}
        {unit && <span className="text-xs ml-1">{unit}</span>}
      </div>
    </div>
  );
}
