import { HuntSession } from '../../types';
import { useHuntStore } from '../../store';
import { Play, Pause, StopCircle, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

interface ActiveSessionPanelProps {
  session: HuntSession;
  onSessionEnded?: (completedSession: HuntSession) => void;
  onSessionResumed?: () => void;
}

export function ActiveSessionPanel({
  session,
  onSessionEnded,
  onSessionResumed,
}: ActiveSessionPanelProps) {
  const { pauseSession, resumeSession, endSession, settings } = useHuntStore();
  const [showOverlayWaylandWarning, setShowOverlayWaylandWarning] = useState(false);

  const handleShowOverlay = async () => {
    try {
      const displayServer = await invoke<string | null>('get_linux_display_server');
      setShowOverlayWaylandWarning(displayServer === 'wayland');

      const isVisible = await invoke<boolean>('is_overlay_visible');
      if (isVisible) {
        await invoke('hide_overlay');
        return;
      }

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
    await endSession(session.id);
    const completedSession = useHuntStore.getState().sessions.find((s) => s.id === session.id);
    if (completedSession) {
      onSessionEnded?.(completedSession);
    } else {
      // Fallback if not found for some reason, though it should be in the store
      onSessionEnded?.({ ...session, status: 'completed' });
    }

    try {
      await invoke('hide_overlay');
    } catch (error) {
      console.error('Failed to hide overlay:', error);
    }
  };

  return (
    <div className="space-y-2">
      {showOverlayWaylandWarning && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/30 flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 rounded-full bg-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-200">Overlay limitation on Wayland</p>
              <p className="text-xs text-yellow-300/80 mt-1">
                Some Wayland compositors can prevent always-on-top overlays above fullscreen games.
                If it drops behind, use borderless/windowed mode or an X11 session.
              </p>
            </div>
            <button
              onClick={() => setShowOverlayWaylandWarning(false)}
              className="flex-shrink-0 text-yellow-300/50 hover:text-yellow-300 transition-colors"
              aria-label="Dismiss Wayland overlay warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-sm text-gray-300">Active Session</div>
            <div className="font-bold text-lg">{session.name}</div>
          </div>

          <div className="h-8 w-px bg-gray-600" />

          <div>
            <div className="text-xs text-muted">Adj Loot</div>
            <div className="font-semibold text-green-400">
              {session.stats.totalAdjustedLoot.toFixed(2)} PED
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">TT Loot</div>
            <div className="font-semibold text-blue-400">
              {session.stats.totalTtLoot.toFixed(2)} PED
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Total Cost</div>
            <div className="font-semibold text-red-400">
              {session.stats.totalCost.toFixed(2)} PED
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Adj Return</div>
            <div
              className={`font-semibold ${session.stats.adjustedReturns >= 100 ? 'text-green-400' : 'text-red-400'}`}
            >
              {session.stats.adjustedReturns.toFixed(1)}%
              <span className="ml-1 text-xs text-muted">
                TT {session.stats.ttReturns.toFixed(1)}%
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Duration</div>
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
            Complete
          </button>
          <button
            onClick={handleShowOverlay}
            className="btn-secondary flex flex-1 items-center justify-center gap-2 px-8 py-1 text-sm"
            title="Toggle Overlay Window"
          >
            <Maximize2 className="w-4 h-4" />
            Overlay
          </button>
        </div>
      </div>
    </div>
  );
}
