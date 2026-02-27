import { useHuntStore } from '../../store';
import { format } from 'date-fns';
import { LiveTimer } from './LiveTimer';

export function ActiveSessionSidebar() {
  const activeSession = useHuntStore((state) => state.getActiveSession());

  if (!activeSession) {
    return null;
  }

  // Count rare items (creatures starting with "Rare:")
  const rareCount = activeSession.globals.filter((g) => g.creature.startsWith('Rare:')).length;

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold">Active Session</h3>
        <div className="text-xs text-gray-400">Live Statistics</div>
      </div>

      <div className="space-y-4">
        {/* Session Name */}
        <div>
          <div className="text-xs text-gray-400 uppercase mb-1">Session</div>
          <div className="font-bold text-white">{activeSession.name}</div>
        </div>

        {/* Duration */}
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-4xl font-bold text-blue-400 font-mono">
            <LiveTimer
              startTime={activeSession.startTime}
              isRunning={activeSession.status === 'active'}
              pausedAt={activeSession.pausedAt}
              pausedDurationMs={activeSession.totalPausedMs || 0}
            />
          </div>
        </div>

        {/* Loadout */}
        {activeSession.location && (
          <div>
            <div className="text-xs text-gray-400 uppercase mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600"></span>
              Loadout
            </div>
            <div className="text-white">{activeSession.location}</div>
          </div>
        )}

        {/* My Globals */}
        <div className="flex-1">
          <div className="text-xs text-gray-400 uppercase mb-3">My Globals</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeSession.globals.length === 0 ? (
              <p className="text-center text-gray-500 text-sm italic py-4">No globals yet</p>
            ) : (
              activeSession.globals.slice().reverse().map((global) => {
                const isRare = global.creature.startsWith('Rare:');
                const badgeColor = isRare ? 'bg-blue-900 text-blue-300' : (global.isHoF ? 'bg-purple-900 text-purple-300' : '');
                const valueColor = isRare ? 'text-blue-400' : (global.isHoF ? 'text-purple-400' : 'text-yellow-400');
                
                return (
                  <div key={global.id} className="text-sm space-y-1 pb-2 border-b border-gray-700 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {format(global.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                      <span className={`font-semibold ${valueColor}`}>
                        {global.value.toFixed(2)} PED
                      </span>
                    </div>
                    <div className="text-white">{global.creature}</div>
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
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400">{activeSession.stats.globals}</div>
            <div className="text-xs text-gray-400">GLOBALS</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400">{activeSession.stats.hofs}</div>
            <div className="text-xs text-gray-400">HOFs</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{rareCount}</div>
            <div className="text-xs text-gray-400">RARES</div>
          </div>
        </div>
      </div>
    </div>
  );
}
