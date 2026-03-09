import { useMemo } from 'react';
import { useHuntStore } from '../../../store';

export default function LoadoutPerformancePanel() {
  const loadoutRaw = useHuntStore((state) => state.analyticsData.performance?.loadoutData);
  const loadouts = useHuntStore((state) => state.loadouts);

  const loadoutData = useMemo(() => {
    if (!loadoutRaw) return [];
    return loadoutRaw
      .map((item) => {
        const loadout = loadouts.find((l) => l.id === item.loadoutId);
        return {
          name: loadout?.name || 'Unknown',
          sessions: item.sessions,
          returnRate: item.returnRate,
          profit: item.profit,
          avgKills: item.avgKills,
        };
      })
      .filter((item) => item.name !== 'Unknown');
  }, [loadoutRaw, loadouts]);

  if (loadoutData.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Loadout Performance</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
          <div>Loadout</div>
          <div className="text-right">Sessions</div>
          <div className="text-right">Return %</div>
          <div className="text-right">Profit</div>
          <div className="text-right">Avg Kills</div>
        </div>
        {loadoutData.map((loadout) => (
          <div
            key={loadout.name}
            className="grid grid-cols-5 gap-2 text-sm py-2 hover:bg-surface-hover"
          >
            <div className="font-semibold truncate" title={loadout.name}>
              {loadout.name}
            </div>
            <div className="text-right text-muted">{loadout.sessions}</div>
            <div
              className={`text-right font-bold ${loadout.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
            >
              {loadout.returnRate.toFixed(2)}%
            </div>
            <div
              className={`text-right ${loadout.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {loadout.profit >= 0 ? '+' : ''}
              {loadout.profit.toFixed(2)}
            </div>
            <div className="text-right">{loadout.avgKills.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
