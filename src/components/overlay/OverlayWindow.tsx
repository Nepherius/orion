import { useHuntStore, setupStoreSync } from '../../store';
import { LiveTimer } from '../layout/LiveTimer';
import { Play, Pause, GripVertical, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';

export function OverlayWindow() {
  const activeSession = useHuntStore((state) => state.getActiveSession());
  const pauseSession = useHuntStore((state) => state.pauseSession);
  const resumeSession = useHuntStore((state) => state.resumeSession);
  const updateSettings = useHuntStore((state) => state.updateSettings);

  // Setup cross-window sync on mount
  useEffect(() => {
    setupStoreSync();
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
    if (activeSession.status === 'active') {
      pauseSession(activeSession.id);
    } else {
      resumeSession(activeSession.id);
    }
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
  const loadouts = useHuntStore.getState().loadouts;
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
          <span className="font-medium text-sm truncate text-center w-full" title={loadoutName}>
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
