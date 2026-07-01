import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { GripVertical, Pause, Play, X } from 'lucide-react';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { useHuntStore } from '../../store';
import { OverlayStats } from './OverlayStats';
import { useOverlayOrientation } from './useOverlayOrientation';
import {
  useOverlayClock,
  useOverlayLoadoutHotkeys,
  useOverlayWindowLifecycle,
} from './useOverlayWindowEffects';

export function OverlayWindow() {
  const isVisible = usePageVisibility();
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );
  const loadouts = useHuntStore((state) => state.loadouts);
  const settings = useHuntStore((state) => state.settings);
  const now = useOverlayClock();
  const { overlayRootRef, isVerticalOverlay } = useOverlayOrientation(activeSession?.id);

  useOverlayWindowLifecycle(isVisible);
  useOverlayLoadoutHotkeys(activeSession, loadouts);

  const handleTogglePause = () => {
    if (!activeSession) return;
    const command = activeSession.status === 'active' ? 'pause' : 'resume';
    emit('overlay-session-command', {
      sessionId: activeSession.id,
      command,
    }).catch((error) => {
      console.error('Failed to send overlay session command:', error);
    });
  };

  const handleStartDrag = async () => {
    try {
      await getCurrentWindow().startDragging();
    } catch (error) {
      console.error('Failed to start window drag:', error);
    }
  };

  const handleCloseOverlay = async () => {
    try {
      await invoke('hide_overlay');
    } catch (error) {
      console.error('Failed to hide overlay:', error);
    }
  };

  if (!activeSession) {
    return (
      <div
        className="h-screen w-full flex items-center justify-center backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(6, 6, 7, 0.95)' }}
      >
        <div className="flex items-center gap-2 text-muted text-sm">
          <span>No Active Session</span>
          <button
            onClick={handleCloseOverlay}
            className="p-1 rounded-lg hover:bg-surface transition-colors text-muted hover:text-gray-300"
            title="Close Overlay"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRootRef}
      className="box-border h-screen w-full overflow-hidden rounded-2xl border border-border backdrop-blur-sm select-none"
      style={{ backgroundColor: 'rgba(6, 6, 7, 0.95)' }}
    >
      <div
        className={
          isVerticalOverlay
            ? 'flex h-full min-w-0 flex-col overflow-hidden px-2 py-2 text-sm'
            : 'flex h-full min-w-0 items-stretch gap-2 overflow-hidden px-2 text-sm'
        }
      >
        {isVerticalOverlay ? (
          <div
            data-tauri-drag-region
            onMouseDown={handleStartDrag}
            className="flex w-full shrink-0 cursor-move items-center justify-center gap-2 rounded px-1 py-1 transition-colors hover:bg-surface"
          >
            <GripVertical className="h-3 w-3 text-muted" />
            <span className="text-xs font-bold tracking-widest text-primary-400">ORION</span>
          </div>
        ) : (
          <>
            <div
              data-tauri-drag-region
              onMouseDown={handleStartDrag}
              className="cursor-move flex shrink-0 items-center justify-center self-center rounded p-1 transition-colors hover:bg-surface"
            >
              <GripVertical className="w-3 h-3 text-muted" />
            </div>

            <div className="shrink-0 self-center text-xs font-bold tracking-widest text-primary-400">
              ORION
            </div>

            <div className="h-6 w-px shrink-0 self-center bg-surface"></div>
          </>
        )}

        <OverlayStats
          activeSession={activeSession}
          loadouts={loadouts}
          settings={settings}
          now={now}
          isVerticalOverlay={isVerticalOverlay}
        />

        {!isVerticalOverlay && <div className="h-6 w-px shrink-0 self-center bg-surface"></div>}

        <button
          onClick={handleTogglePause}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${
            isVerticalOverlay ? 'mx-auto mt-1 self-center' : 'self-center'
          } ${
            activeSession.status === 'active'
              ? 'text-orange-400 hover:bg-orange-500/20'
              : 'text-green-400 hover:bg-green-500/20'
          }`}
          title={activeSession.status === 'active' ? 'Pause' : 'Resume'}
        >
          {activeSession.status === 'active' ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
}
