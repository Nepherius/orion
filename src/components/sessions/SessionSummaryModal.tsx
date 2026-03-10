import { X, Trophy, Target, Crosshair, Clock, TrendingUp, TrendingDown, Skull, DollarSign, Zap, Shield } from 'lucide-react';
import type { HuntSession } from '../../types';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: HuntSession;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function SessionSummaryModal({ isOpen, onClose, session }: SessionSummaryModalProps) {
  if (!isOpen) return null;

  const stats = session.stats;
  const profit = stats.totalLoot - stats.totalCost;
  const isProfitable = profit >= 0;
  const hitRate =
    stats.hits + stats.criticalHits + stats.misses > 0
      ? ((stats.hits + stats.criticalHits) / (stats.hits + stats.criticalHits + stats.misses)) * 100
      : 0;
  const critRate =
    stats.hits + stats.criticalHits > 0
      ? (stats.criticalHits / (stats.hits + stats.criticalHits)) * 100
      : 0;
  const avgLootPerKill = stats.kills > 0 ? stats.totalLoot / stats.kills : 0;
  const avgCostPerKill = stats.kills > 0 ? stats.totalCost / stats.kills : 0;
  const dps = stats.duration > 0 ? stats.damageDealt / stats.duration : 0;
  const killsPerHour = stats.duration > 0 ? (stats.kills / stats.duration) * 3600 : 0;

  // Determine top loot items
  const lootByName = new Map<string, { name: string; value: number; count: number }>();
  for (const item of session.loot) {
    const existing = lootByName.get(item.name);
    if (existing) {
      existing.value += item.totalValue;
      existing.count += 1;
    } else {
      lootByName.set(item.name, { name: item.name, value: item.totalValue, count: 1 });
    }
  }
  const topLoot = Array.from(lootByName.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-surface rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{session.name}</h2>
              <p className="text-sm text-muted mt-1">
                {session.creature && session.creature !== 'Unknown' ? session.creature : ''}
                {session.location ? ` • ${session.location}` : ''}
                {session.weapon ? ` • ${session.weapon}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big P&L Hero */}
        <div className={`px-6 py-5 ${isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isProfitable ? (
                <TrendingUp className="w-8 h-8 text-green-400" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-400" />
              )}
              <div>
                <div className="text-xs text-muted uppercase tracking-wide">Net Profit</div>
                <div className={`text-2xl font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                  {isProfitable ? '+' : ''}{profit.toFixed(2)} PED
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted uppercase tracking-wide">Return</div>
              <div className={`text-2xl font-bold ${stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.returns.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-4 space-y-4">
          {/* Economy Row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<DollarSign className="w-4 h-4 text-green-400" />} label="Total Loot" value={`${stats.totalLoot.toFixed(2)} PED`} />
            <StatCard icon={<DollarSign className="w-4 h-4 text-red-400" />} label="Total Cost" value={`${stats.totalCost.toFixed(2)} PED`} />
            <StatCard icon={<Clock className="w-4 h-4 text-blue-400" />} label="Duration" value={formatDuration(stats.duration)} />
          </div>

          {/* Combat Row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Skull className="w-4 h-4 text-orange-400" />} label="Kills" value={stats.kills.toString()} />
            <StatCard icon={<Crosshair className="w-4 h-4 text-yellow-400" />} label="Hit Rate" value={`${hitRate.toFixed(1)}%`} />
            <StatCard icon={<Zap className="w-4 h-4 text-purple-400" />} label="Crit Rate" value={`${critRate.toFixed(1)}%`} />
          </div>

          {/* Efficiency Row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Target className="w-4 h-4 text-cyan-400" />} label="Kills/Hour" value={killsPerHour.toFixed(1)} />
            <StatCard icon={<DollarSign className="w-4 h-4 text-green-300" />} label="Avg Loot/Kill" value={`${avgLootPerKill.toFixed(3)}`} />
            <StatCard icon={<DollarSign className="w-4 h-4 text-red-300" />} label="Avg Cost/Kill" value={`${avgCostPerKill.toFixed(3)}`} />
          </div>

          {/* Damage & Defense */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Zap className="w-4 h-4 text-orange-300" />} label="DPS" value={dps.toFixed(1)} />
            <StatCard icon={<Shield className="w-4 h-4 text-blue-300" />} label="Dmg Taken" value={stats.damageTaken.toFixed(0)} />
            <StatCard icon={<Trophy className="w-4 h-4 text-yellow-300" />} label="Globals" value={`${stats.globals}${stats.hofs > 0 ? ` (${stats.hofs} HoF)` : ''}`} />
          </div>

          {/* Top Loot */}
          {topLoot.length > 0 && (
            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-2">Top Loot Items</div>
              <div className="space-y-1">
                {topLoot.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm bg-white/5 rounded px-3 py-1.5">
                    <span className="truncate mr-2">{item.name}{item.count > 1 ? ` ×${item.count}` : ''}</span>
                    <span className="text-green-400 font-medium whitespace-nowrap">{item.value.toFixed(2)} PED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <button onClick={onClose} className="btn-primary w-full py-2">Done</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted">{label}</span>
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
