import { useHuntStore } from '../../store';
import { format } from 'date-fns';
import { LiveTimer } from './LiveTimer';
import { MetricTile, Panel } from '../common/Panel';

export function ActiveSessionSidebar() {
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );

  if (!activeSession) {
    return null;
  }

  // Count rare items (creatures starting with "Rare:")
  const rareCount = activeSession.globals.filter((g) => g.creature.startsWith('Rare:')).length;

  return (
    <Panel
      title="Active Session"
      className="flex h-full flex-col"
      contentClassName="flex h-full flex-col"
    >
      <div className="mb-4 text-xs text-muted">Live Statistics</div>
      <div className="space-y-4">
        {/* Session Name */}
        <div>
          <div className="text-xs text-muted uppercase mb-1">Session</div>
          <div className="font-bold text-body">{activeSession.name}</div>
        </div>

        {/* Duration */}
        <MetricTile
          label="Duration"
          value={
            <LiveTimer
              startTime={activeSession.startTime}
              isRunning={activeSession.status === 'active'}
              pausedAt={activeSession.pausedAt}
              pausedDurationMs={activeSession.totalPausedMs || 0}
            />
          }
          valueClassName="font-mono text-blue-500 dark:text-blue-400"
          size="lg"
        />

        {/* My Globals */}
        <div className="flex-1">
          <div className="text-xs text-muted uppercase mb-3">My Globals</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeSession.globals.length === 0 ? (
              <p className="text-center text-muted text-sm italic py-4">No globals yet</p>
            ) : (
              activeSession.globals
                .slice()
                .reverse()
                .map((global) => {
                  const isRare = global.creature.startsWith('Rare:');
                  const badgeColor = isRare
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                    : global.isHoF
                      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300'
                      : '';
                  const valueColor = isRare
                    ? 'text-blue-500 dark:text-blue-400'
                    : global.isHoF
                      ? 'text-purple-500 dark:text-purple-400'
                      : 'text-yellow-600 dark:text-yellow-400';

                  return (
                    <div
                      key={global.id}
                      className="text-sm space-y-1 pb-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {format(global.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                        <span className={`font-semibold ${valueColor}`}>
                          {global.value.toFixed(2)} PED
                        </span>
                      </div>
                      <div className="text-body">{global.creature}</div>
                      {(global.isHoF || isRare) && (
                        <span className={`text-xs px-2 py-0.5 rounded ${badgeColor}`}>
                          {isRare ? 'RARE' : 'HoF'}
                        </span>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400">{activeSession.stats.globals}</div>
            <div className="text-xs text-muted">GLOBALS</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400">{activeSession.stats.hofs}</div>
            <div className="text-xs text-muted">HOFs</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{rareCount}</div>
            <div className="text-xs text-muted">RARES</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
