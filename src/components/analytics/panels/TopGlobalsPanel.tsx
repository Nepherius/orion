import { format } from 'date-fns';
import { useHuntStore } from '../../../store';

export default function TopGlobalsPanel() {
  const allGlobals = useHuntStore((state) => state.analyticsData.performance?.allGlobals);

  if (!allGlobals || allGlobals.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">
        Top Globals {allGlobals.some((g) => g.isHoF) && '& Hall of Fame'}
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border sticky top-0 bg-surface">
          <div>Creature</div>
          <div className="text-right">Value</div>
          <div>Session</div>
          <div>Location</div>
          <div className="text-right">Date</div>
        </div>
        {allGlobals.map((global) => (
          <div
            key={global.id}
            className={`grid grid-cols-5 gap-2 text-sm py-2 hover:bg-surface-hover ${global.isHoF ? 'bg-purple-900/20' : ''}`}
          >
            <div className="font-semibold text-yellow-400 flex items-center gap-1">
              {global.isHoF && <span className="text-purple-400">★</span>}
              {global.creature}
            </div>
            <div className="text-right font-bold text-green-400">{global.value.toFixed(2)} PED</div>
            <div className="truncate text-muted" title={global.sessionName}>
              {global.sessionName}
            </div>
            <div className="truncate text-muted" title={global.location || 'Unknown'}>
              {global.location || 'Unknown'}
            </div>
            <div className="text-right text-muted">{format(global.timestamp, 'MM/dd/yy')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
