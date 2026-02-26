import { HuntSession } from '../types';
import { useHuntStore } from '../store';
import { Play, Pause, StopCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveSessionPanelProps {
  session: HuntSession;
}

export function ActiveSessionPanel({ session }: ActiveSessionPanelProps) {
  const { pauseSession, endSession, startSession } = useHuntStore();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-sm text-gray-300">Active Session</div>
          <div className="font-bold text-lg">{session.name}</div>
        </div>

        <div className="h-8 w-px bg-gray-600" />

        <div>
          <div className="text-xs text-gray-400">Loot Value</div>
          <div className="font-semibold text-green-400">
            {session.stats.totalLoot.toFixed(2)} PED
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400">Total Cost</div>
          <div className="font-semibold text-red-400">{session.stats.totalCost.toFixed(2)} PED</div>
        </div>

        <div>
          <div className="text-xs text-gray-400">Returns</div>
          <div
            className={`font-semibold ${session.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}`}
          >
            {session.stats.returns.toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400">Duration</div>
          <div className="font-semibold">
            {formatDistanceToNow(session.startTime, { addSuffix: false })}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {session.status === 'active' ? (
          <button
            onClick={() => pauseSession(session.id)}
            className="btn-secondary flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        ) : (
          <button
            onClick={() => startSession(session.id)}
            className="btn-primary flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        )}
        <button
          onClick={() => endSession(session.id)}
          className="btn-danger flex items-center gap-2"
        >
          <StopCircle className="w-4 h-4" />
          End Session
        </button>
      </div>
    </div>
  );
}
