import { useHuntStore } from '../../../store';

export default function LocationPerformancePanel() {
  const locationData = useHuntStore((state) => state.analyticsData.performance?.locationData);

  if (!locationData || locationData.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Performance by Location</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
          <div>Location</div>
          <div className="text-right">Sessions</div>
          <div className="text-right">Return %</div>
          <div className="text-right">Profit</div>
          <div className="text-right">Globals</div>
        </div>
        {locationData.map((loc) => (
          <div
            key={loc.location}
            className="grid grid-cols-5 gap-2 text-sm py-1 hover:bg-surface-hover"
          >
            <div className="truncate" title={loc.location}>
              {loc.location}
            </div>
            <div className="text-right text-muted">{loc.sessions}</div>
            <div
              className={`text-right font-semibold ${loc.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
            >
              {loc.returnRate.toFixed(2)}%
            </div>
            <div className={`text-right ${loc.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {loc.profit >= 0 ? '+' : ''}
              {loc.profit.toFixed(2)}
            </div>
            <div className="text-right text-yellow-400">{loc.globals}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
