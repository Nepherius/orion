import { useHuntStore, initializeStoreFromDb } from '../../store';
import { LiveTimer } from '../layout/LiveTimer';
import { Play, Pause, GripVertical, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { HuntSession, Loadout } from '../../types';

interface StoreSyncPayload {
  sourceId: string;
  sessions: HuntSession[];
  activeSessionId: string | null;
  loadouts: Loadout[];
}

export function OverlayWindow() {
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );
  const updateSettings = useHuntStore((state) => state.updateSettings);
  const loadouts = useHuntStore((state) => state.loadouts);
  const syncSetupRef = useRef(false);

  useEffect(() => {
    initializeStoreFromDb().catch(() => {
      // Silently fail; cross-window sync will still populate state
    });
  }, []);

  // Setup overlay to ONLY listen for state from main window
  // Do NOT call setupStoreSync - that would set up bidirectional broadcasting
  // Overlay is read-only except for pause/resume which go through normal store actions
  useEffect(() => {
    if (syncSetupRef.current) {
      return;
    }
    syncSetupRef.current = true;

    let unlistenSync: (() => void) | undefined;
    const requestTimers: number[] = [];
    let requestInterval: number | undefined;

    const setupListeners = async () => {
      try {
        // Listen for state broadcasts from main window ONLY
        // Do not broadcast back - overlay is read-only
        unlistenSync = await listen<StoreSyncPayload>('store-sync', (event) => {
          const payload = event.payload;
          if (!payload) {
            return;
          }

          // Apply state from main window without triggering broadcast
          useHuntStore.setState((prevState) => ({
            ...prevState,
            sessions: payload.sessions,
            activeSessionId: payload.activeSessionId,
            loadouts: payload.loadouts,
          }));
        });
      } catch (error) {
        // Silently fail if listen not available
      }

      // Request current state from main window periodically
      const requestState = () => {
        emit('store-sync-request', {}).catch(() => {
          // Silently fail
        });
      };

      // Request immediately and retry a few times
      requestState();
      requestTimers.push(window.setTimeout(() => requestState(), 100));
      requestTimers.push(window.setTimeout(() => requestState(), 300));
      requestInterval = window.setInterval(() => requestState(), 2000);
    };

    setupListeners();

    return () => {
      unlistenSync?.();
      requestTimers.forEach(clearTimeout);
      if (requestInterval) {
        clearInterval(requestInterval);
      }
    };
  }, []);

  // Save overlay geometry when window is moved or resized
  useEffect(() => {
    let saveTimeout: number;

    const saveGeometry = async () => {
      try {
        const geometry = await invoke<{
          x: number;
          y: number;
          width: number;
          height: number;
        } | null>('get_overlay_geometry');
        if (geometry) {
          updateSettings({
            overlayX: geometry.x,
            overlayY: geometry.y,
            overlayWidth: geometry.width,
            overlayHeight: geometry.height,
          });
        }
      } catch (error) {
        console.error('Failed to save overlay geometry:', error);
      }
    };

    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveGeometry, 500); // Debounce save by 500ms
    };

    const setupListeners = async () => {
      const window = getCurrentWindow();
      const unlistenMove = await window.onMoved(debouncedSave);
      const unlistenResize = await window.onResized(debouncedSave);

      return () => {
        unlistenMove();
        unlistenResize();
        clearTimeout(saveTimeout);
      };
    };

    const cleanup = setupListeners();

    return () => {
      cleanup.then((fn) => fn());
    };
  }, [updateSettings]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeSession) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      const isNextLoadout = event.ctrlKey && event.key === 'ArrowRight';
      const isPrevLoadout = event.ctrlKey && event.key === 'ArrowLeft';
      const numericKey =
        event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey
          ? Number.parseInt(event.key, 10)
          : NaN;
      const isNumberShortcut = Number.isInteger(numericKey) && numericKey >= 1 && numericKey <= 9;

      if (!isNextLoadout && !isPrevLoadout && !isNumberShortcut) {
        return;
      }

      if (loadouts.length === 0) {
        return;
      }

      event.preventDefault();

      const emitLoadoutCommand = (command: 'next_loadout' | 'prev_loadout') => {
        emit('overlay-session-command', {
          sessionId: activeSession.id,
          command,
        }).catch((error) => {
          console.error('Failed to send overlay loadout command:', error);
        });
      };

      if (isNumberShortcut) {
        const currentIndex = activeSession.loadoutId
          ? loadouts.findIndex((l) => l.id === activeSession.loadoutId)
          : loadouts.findIndex((l) => l.name === activeSession.weapon);

        const hotkeyMatchIndex = loadouts.findIndex((l) => l.hotkey === numericKey);
        const targetIndex = hotkeyMatchIndex >= 0 ? hotkeyMatchIndex : numericKey - 1;

        if (targetIndex < 0 || targetIndex >= loadouts.length || currentIndex < 0 || currentIndex === targetIndex) {
          return;
        }

        const forwardSteps = (targetIndex - currentIndex + loadouts.length) % loadouts.length;
        const backwardSteps = (currentIndex - targetIndex + loadouts.length) % loadouts.length;
        const command =
          forwardSteps <= backwardSteps ? ('next_loadout' as const) : ('prev_loadout' as const);
        const steps = Math.min(forwardSteps, backwardSteps);

        for (let index = 0; index < steps; index++) {
          window.setTimeout(() => emitLoadoutCommand(command), index * 40);
        }
        return;
      }

      emitLoadoutCommand(isNextLoadout ? 'next_loadout' : 'prev_loadout');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSession, loadouts.length]);

  if (!activeSession) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 text-gray-400">
          <span>No Active Session</span>
          <button
            onClick={handleCloseOverlay}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-300"
            title="Close Overlay"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const profit = activeSession.stats.totalLoot - activeSession.stats.totalCost;
  const isProfitable = profit >= 0;
  const returns = activeSession.stats.returns;
  const returnsPositive = returns >= 100;

  // Find loadout name
  const loadout = activeSession.loadoutId
    ? loadouts.find((l) => l.id === activeSession.loadoutId)
    : loadouts.find((l) => l.name === activeSession.weapon);
  const loadoutName = loadout?.name || activeSession.weapon || 'No Loadout';

  return (
    <div className="h-screen w-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden select-none">
      {/* Main Content - Horizontal Layout */}
      <div className="h-full flex items-center px-4 gap-4">
        {/* Drag Handle - This makes the window draggable */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="cursor-move flex items-center justify-center hover:bg-gray-800 rounded p-1 transition-colors shrink-0"
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>

        {/* Orion Logo */}
        <div className="font-bold text-primary-400 text-sm tracking-widest shrink-0">ORION</div>

        <div className="h-8 w-px bg-gray-700 shrink-0"></div>

        {/* Timer */}
        <div className="flex flex-col items-center leading-tight shrink-0">
          <span className="text-gray-400 text-xs">Time</span>
          <LiveTimer
            startTime={activeSession.startTime}
            isRunning={activeSession.status === 'active'}
            pausedAt={activeSession.pausedAt}
            pausedDurationMs={activeSession.totalPausedMs || 0}
            className="font-mono text-sm font-bold"
          />
        </div>

        <div className="h-8 w-px bg-gray-700 shrink-0"></div>

        {/* Loadout - Double size */}
        <div className="flex flex-col items-center leading-tight flex-[2] min-w-0">
          <span className="text-gray-400 text-xs whitespace-nowrap text-center">Loadout</span>
          <span
            className="font-medium text-sm truncate text-center w-full"
            title={`${loadoutName} (Ctrl+Left/Right, Ctrl+1..9 to switch)`}
          >
            {loadoutName}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-700 shrink-0"></div>

        {/* Loot Value */}
        <div className="flex flex-col items-center leading-tight flex-1">
          <span className="text-gray-400 text-xs text-center whitespace-nowrap">Loot</span>
          <span className="font-bold text-green-400 text-sm whitespace-nowrap">
            {activeSession.stats.totalLoot.toFixed(2)} PED
          </span>
        </div>

        <div className="h-8 w-px bg-gray-700 shrink-0"></div>

        {/* Profit */}
        <div className="flex flex-col items-center leading-tight flex-1">
          <span className="text-gray-400 text-xs text-center whitespace-nowrap">Profit</span>
          <span
            className={`font-bold text-sm whitespace-nowrap ${isProfitable ? 'text-green-400' : 'text-red-400'}`}
          >
            {isProfitable ? '+' : ''}
            {profit.toFixed(2)} PED
          </span>
        </div>

        <div className="h-8 w-px bg-gray-700 shrink-0"></div>

        {/* Returns */}
        <div className="flex flex-col items-center leading-tight flex-1">
          <span className="text-gray-400 text-xs text-center whitespace-nowrap">Returns</span>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span
              className={`font-bold text-sm ${returnsPositive ? 'text-green-400' : 'text-red-400'}`}
            >
              {returnsPositive ? '+' : ''}
              {(returns - 100).toFixed(1)}%
            </span>
            <span className="text-gray-500 text-xs">({returns.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-700 shrink-0"></div>

        {/* Pause/Resume Button */}
        <button
          onClick={handleTogglePause}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            activeSession.status === 'active'
              ? 'text-orange-400 hover:bg-orange-500/20'
              : 'text-green-400 hover:bg-green-500/20'
          }`}
          title={activeSession.status === 'active' ? 'Pause' : 'Resume'}
        >
          {activeSession.status === 'active' ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
