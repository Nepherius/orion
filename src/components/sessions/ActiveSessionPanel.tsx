import { HuntSession } from '../../types';
import { useHuntStore } from '../../store';
import { Play, Pause, StopCircle, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';

interface ActiveSessionPanelProps {
  session: HuntSession;
  onSessionEnded?: (sessionId: string) => void;
  onSessionResumed?: () => void;
}

export function ActiveSessionPanel({
  session,
  onSessionEnded,
  onSessionResumed,
}: ActiveSessionPanelProps) {
  const { pauseSession, resumeSession, endSession, settings } = useHuntStore();

  const handleShowOverlay = async () => {
    try {
      await invoke('show_overlay', {
        x: settings.overlayX,
        y: settings.overlayY,
        width: settings.overlayWidth,
        height: settings.overlayHeight,
      });
    } catch (error) {
      console.error('Failed to show overlay:', error);
    }
  };

  const handleEndSession = async () => {
    endSession(session.id);
    onSessionEnded?.(session.id);
    // Close overlay when session ends (safety feature)
    try {
      await invoke('hide_overlay');
    } catch (error) {
      console.error('Failed to hide overlay:', error);
    }
  };

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
            className="btn-secondary flex flex-1 items-center justify-center gap-2 px-8 py-1 text-sm"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        ) : (
          <button
            onClick={() => {
              resumeSession(session.id);
              onSessionResumed?.();
            }}
            className="btn-primary flex flex-1 items-center justify-center gap-2 px-8 py-1 text-sm"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        )}
        <button
          onClick={handleEndSession}
          className="btn-danger flex flex-1 items-center justify-center gap-2 px-8 py-1 text-sm"
        >
          <StopCircle className="w-4 h-4" />
          Stop
        </button>
        <button
          onClick={handleShowOverlay}
          className="btn-secondary flex flex-1 items-center justify-center gap-2 px-8 py-1 text-sm"
          title="Show Overlay Window"
        >
          <Maximize2 className="w-4 h-4" />
          Overlay
        </button>
      </div>
    </div>
  );
}
