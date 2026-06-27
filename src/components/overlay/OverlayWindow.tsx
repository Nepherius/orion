import { useHuntStore, initializeStoreFromDb } from '../../store';
import { LiveTimer } from '../layout/LiveTimer';
import { Play, Pause, GripVertical, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import type { AppSettings, HuntSession, Loadout, OverlayStatId } from '../../types';
import { getSessionActiveDurationMs } from '../../utils/sessionTiming';
import { normalizeOverlayStatIds } from '../../utils/overlayStats';

interface StoreSyncPayload {
  sourceId: string;
  sessions: HuntSession[];
  activeSessionId: string | null;
  loadouts: Loadout[];
  settings: AppSettings;
}

type OverlayMetricTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent' | 'muted';

interface OverlayMetric {
  id: OverlayStatId;
  label: string;
  value: ReactNode;
  title?: string;
  tone?: OverlayMetricTone;
  width?: 'normal' | 'wide';
}

const metricToneClass: Record<OverlayMetricTone, string> = {
  neutral: 'text-gray-200',
  positive: 'text-green-400',
  negative: 'text-red-400',
  warning: 'text-yellow-400',
  accent: 'text-blue-400',
  muted: 'text-muted',
};

const formatPed = (value: number, options: { showSign?: boolean } = {}) =>
  `${options.showSign && value >= 0 ? '+' : ''}${value.toFixed(2)} PED`;

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function OverlayWindow() {
  const isVisible = usePageVisibility();
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );
  const loadouts = useHuntStore((state) => state.loadouts);
  const settings = useHuntStore((state) => state.settings);
  const syncSetupRef = useRef(false);
  const hasReceivedSettingsSyncRef = useRef(false);
  const canSaveGeometryRef = useRef(false);
  const geometryReadyTimerRef = useRef<number | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  // Remove splash screen on mount
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.remove();
    }
  }, []);

  useEffect(() => {
    initializeStoreFromDb().catch(() => {
      // Silently fail; cross-window sync will still populate state
    });
  }, []);

  // Make the overlay document behave like a tiny window instead of inheriting the main app shell sizing.
  useEffect(() => {
    const root = document.getElementById('root');
    const previousBodyStyles = {
      backgroundColor: document.body.style.backgroundColor,
      display: document.body.style.display,
      minWidth: document.body.style.minWidth,
      minHeight: document.body.style.minHeight,
      overflow: document.body.style.overflow,
      placeItems: document.body.style.placeItems,
    };
    const previousRootStyles = root
      ? {
          height: root.style.height,
          minHeight: root.style.minHeight,
          minWidth: root.style.minWidth,
        }
      : null;

    document.body.style.backgroundColor = 'transparent';
    document.body.style.display = 'block';
    document.body.style.minWidth = '0';
    document.body.style.minHeight = '100vh';
    document.body.style.overflow = 'hidden';
    document.body.style.placeItems = 'normal';

    if (root) {
      root.style.height = '100vh';
      root.style.minHeight = '100vh';
      root.style.minWidth = '0';
    }

    return () => {
      document.body.style.backgroundColor = previousBodyStyles.backgroundColor;
      document.body.style.display = previousBodyStyles.display;
      document.body.style.minWidth = previousBodyStyles.minWidth;
      document.body.style.minHeight = previousBodyStyles.minHeight;
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.placeItems = previousBodyStyles.placeItems;

      if (root && previousRootStyles) {
        root.style.height = previousRootStyles.height;
        root.style.minHeight = previousRootStyles.minHeight;
        root.style.minWidth = previousRootStyles.minWidth;
      }
    };
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

          hasReceivedSettingsSyncRef.current = true;
          if (geometryReadyTimerRef.current === undefined) {
            geometryReadyTimerRef.current = window.setTimeout(() => {
              canSaveGeometryRef.current = true;
              geometryReadyTimerRef.current = undefined;
            }, 750);
          }

          // Apply state from main window without triggering broadcast
          useHuntStore.setState((prevState) => ({
            ...prevState,
            sessions: payload.sessions,
            activeSessionId: payload.activeSessionId,
            loadouts: payload.loadouts,
            settings: { ...prevState.settings, ...payload.settings },
          }));
        });
      } catch {
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
      if (isVisible) {
        requestInterval = window.setInterval(() => requestState(), 2000);
      }
    };

    setupListeners();

    return () => {
      unlistenSync?.();
      requestTimers.forEach(clearTimeout);
      if (requestInterval) {
        clearInterval(requestInterval);
      }
      if (geometryReadyTimerRef.current !== undefined) {
        window.clearTimeout(geometryReadyTimerRef.current);
        geometryReadyTimerRef.current = undefined;
      }
      syncSetupRef.current = false;
      hasReceivedSettingsSyncRef.current = false;
      canSaveGeometryRef.current = false;
    };
  }, [isVisible]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const pinTopmost = async () => {
      try {
        const displayServer = await invoke<string | null>('get_linux_display_server');
        if (!displayServer) {
          return;
        }

        await invoke('refresh_overlay_topmost');
      } catch {
        // Silently fail - best effort only
      }
    };

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void pinTopmost();
      }
    }, 1500);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void pinTopmost();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void pinTopmost();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Save overlay geometry when window is moved or resized
  useEffect(() => {
    let saveTimeout: ReturnType<typeof setTimeout> | undefined;

    const saveGeometry = async () => {
      try {
        if (!hasReceivedSettingsSyncRef.current || !canSaveGeometryRef.current) {
          return;
        }

        const currentWindow = getCurrentWindow();
        const isVisible = await currentWindow.isVisible();
        if (!isVisible) {
          return;
        }

        const geometry = await invoke<{
          x: number | null;
          y: number | null;
          width: number;
          height: number;
        } | null>('get_overlay_geometry');
        if (geometry && geometry.width > 0 && geometry.height > 0) {
          // Tell the main window to update and persist the settings
          // We don't call updateSettings here directly because the overlay store doesn't sync upwards to the main window.
          emit('overlay-geometry-changed', geometry).catch(console.error);
        }
      } catch (error) {
        console.error('Failed to save overlay geometry:', error);
      }
    };

    const debouncedSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveGeometry, 500); // Debounce save by 500ms
    };

    const setupListeners = async () => {
      const currentWindow = getCurrentWindow();
      const unlistenMove = await currentWindow.onMoved(debouncedSave);
      const unlistenResize = await currentWindow.onResized(debouncedSave);

      return () => {
        unlistenMove();
        unlistenResize();
        clearTimeout(saveTimeout);
      };
    };

    const cleanup = setupListeners();

    return () => {
      cleanup.then((fn) => fn());
      if (geometryReadyTimerRef.current !== undefined) {
        window.clearTimeout(geometryReadyTimerRef.current);
        geometryReadyTimerRef.current = undefined;
      }
      canSaveGeometryRef.current = false;
    };
  }, []);

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

        if (
          targetIndex < 0 ||
          targetIndex >= loadouts.length ||
          currentIndex < 0 ||
          currentIndex === targetIndex
        ) {
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
  }, [activeSession, loadouts]);

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

  const profit = activeSession.stats.adjustedProfit;
  const isProfitable = profit >= 0;
  const returns = activeSession.stats.adjustedReturns;
  const returnsPositive = returns >= 100;
  const ttReturnsPositive = activeSession.stats.ttReturns >= 100;
  const markupGain = activeSession.stats.totalMarkupGain + activeSession.stats.totalFixedGain;

  // Find loadout name
  const loadout = activeSession.loadoutId
    ? loadouts.find((l) => l.id === activeSession.loadoutId)
    : loadouts.find((l) => l.name === activeSession.weapon);
  const loadoutName = loadout?.name || activeSession.weapon || 'No Loadout';
  const activeDurationSeconds = Math.max(1, getSessionActiveDurationMs(activeSession, now) / 1000);
  const avgDps = activeSession.stats.damageDealt / activeDurationSeconds;
  const shotsFired = activeSession.stats.shotsFired;
  const landedHits = activeSession.stats.hits + activeSession.stats.criticalHits;
  const critRate = shotsFired > 0 ? (activeSession.stats.criticalHits / shotsFired) * 100 : 0;
  const hitRate = shotsFired > 0 ? (landedHits / shotsFired) * 100 : 0;
  const missRate = shotsFired > 0 ? (activeSession.stats.misses / shotsFired) * 100 : 0;
  const skillGains = activeSession.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
  const weaponDpp = loadout?.dpp ?? activeSession.dppSnapshot ?? 0;

  const overlayMetricsById: Record<OverlayStatId, OverlayMetric> = {
    time: {
      id: 'time',
      label: 'Time',
      value: (
        <LiveTimer
          startTime={activeSession.startTime}
          isRunning={activeSession.status === 'active'}
          pausedAt={activeSession.pausedAt}
          pausedDurationMs={activeSession.totalPausedMs || 0}
          className="font-mono text-xs font-bold"
        />
      ),
    },
    loadout: {
      id: 'loadout',
      label: 'Loadout',
      value: loadoutName,
      title: `${loadoutName} (Ctrl+Left/Right, Ctrl+1..9 to switch)`,
      width: 'wide',
    },
    creature: {
      id: 'creature',
      label: 'Creature',
      value: activeSession.creature || 'Unknown',
      title: activeSession.creature || 'Unknown',
      width: 'wide',
    },
    totalCost: {
      id: 'totalCost',
      label: 'Cost',
      value: formatPed(activeSession.stats.totalCost),
      tone: 'negative',
    },
    ttLoot: {
      id: 'ttLoot',
      label: 'TT Loot',
      value: formatPed(activeSession.stats.totalTtLoot),
      tone: 'accent',
    },
    adjustedLoot: {
      id: 'adjustedLoot',
      label: 'Adj Loot',
      value: formatPed(activeSession.stats.totalAdjustedLoot),
      tone: 'positive',
    },
    adjustedProfit: {
      id: 'adjustedProfit',
      label: 'Adj P/L',
      value: formatPed(profit, { showSign: true }),
      tone: isProfitable ? 'positive' : 'negative',
    },
    adjustedReturn: {
      id: 'adjustedReturn',
      label: 'Adj Ret',
      value: formatPercent(returns),
      tone: returnsPositive ? 'positive' : 'negative',
    },
    ttReturn: {
      id: 'ttReturn',
      label: 'TT Ret',
      value: formatPercent(activeSession.stats.ttReturns),
      tone: ttReturnsPositive ? 'positive' : 'negative',
    },
    markupGain: {
      id: 'markupGain',
      label: 'MU/Fixed',
      value: formatPed(markupGain, { showSign: true }),
      tone: markupGain >= 0 ? 'positive' : 'negative',
    },
    kills: {
      id: 'kills',
      label: 'Kills',
      value: activeSession.stats.kills,
      tone: 'warning',
    },
    lootEvents: {
      id: 'lootEvents',
      label: 'Loots',
      value: activeSession.stats.lootEvents,
    },
    globals: {
      id: 'globals',
      label: 'Globals',
      value:
        activeSession.stats.hofs > 0
          ? `${activeSession.stats.globals}/${activeSession.stats.hofs}`
          : activeSession.stats.globals,
      title: 'Globals / HoFs',
      tone: activeSession.stats.hofs > 0 ? 'warning' : 'neutral',
    },
    avgDps: {
      id: 'avgDps',
      label: 'Avg DPS',
      value: avgDps.toFixed(1),
      tone: 'accent',
    },
    weaponDpp: {
      id: 'weaponDpp',
      label: 'DPP',
      value: weaponDpp > 0 ? weaponDpp.toFixed(2) : 'N/A',
      tone: weaponDpp > 0 ? 'accent' : 'muted',
    },
    critRate: {
      id: 'critRate',
      label: 'Crit',
      value: formatPercent(critRate),
      tone: critRate > 0 ? 'warning' : 'neutral',
    },
    hitRate: {
      id: 'hitRate',
      label: 'Hit',
      value: formatPercent(hitRate),
      tone: hitRate >= 80 ? 'positive' : 'warning',
    },
    missRate: {
      id: 'missRate',
      label: 'Miss',
      value: formatPercent(missRate),
      tone: missRate > 10 ? 'warning' : 'neutral',
    },
    ammoCost: {
      id: 'ammoCost',
      label: 'Ammo',
      value: formatPed(activeSession.ammoCost),
      tone: 'negative',
    },
    weaponDecay: {
      id: 'weaponDecay',
      label: 'Decay',
      value: formatPed(activeSession.weaponDecay),
      tone: 'negative',
    },
    healingCost: {
      id: 'healingCost',
      label: 'Heal/FAP',
      value: formatPed(activeSession.healingCost),
      tone: activeSession.healingCost > 0 ? 'negative' : 'neutral',
    },
    otherCosts: {
      id: 'otherCosts',
      label: 'Other',
      value: formatPed(activeSession.otherCosts),
      tone: activeSession.otherCosts > 0 ? 'negative' : 'neutral',
    },
    skillGains: {
      id: 'skillGains',
      label: 'Skills',
      value: skillGains.toFixed(4),
      tone: skillGains > 0 ? 'positive' : 'neutral',
    },
  };
  const selectedOverlayMetrics = normalizeOverlayStatIds(settings.overlayStatIds).map(
    (id) => overlayMetricsById[id]
  );

  return (
    <div
      className="box-border h-screen w-full overflow-hidden rounded-2xl border border-border backdrop-blur-sm select-none"
      style={{ backgroundColor: 'rgba(6, 6, 7, 0.95)' }}
    >
      {/* Main Content - Horizontal Layout */}
      <div className="flex h-full min-w-0 items-center gap-2 overflow-hidden px-2 text-sm">
        {/* Drag Handle - This makes the window draggable */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="cursor-move flex items-center justify-center hover:bg-surface rounded p-1 transition-colors shrink-0"
        >
          <GripVertical className="w-3 h-3 text-muted" />
        </div>

        {/* Orion Logo */}
        <div className="font-bold text-primary-400 text-xs tracking-widest shrink-0">ORION</div>

        <div className="h-6 w-px bg-surface shrink-0"></div>

        {selectedOverlayMetrics.map((metric, index) => (
          <div key={metric.id} className="contents">
            {index > 0 && <div className="h-6 w-px bg-surface shrink-0"></div>}
            <div
              className={`flex min-w-0 flex-col items-center leading-none ${
                metric.width === 'wide'
                  ? 'basis-[96px] flex-[1.45_1_0]'
                  : 'basis-[56px] flex-[1_1_0]'
              }`}
            >
              <span className="text-muted text-[10px] text-center whitespace-nowrap">
                {metric.label}
              </span>
              <span
                className={`w-full truncate text-center text-xs font-bold whitespace-nowrap ${metricToneClass[metric.tone || 'neutral']}`}
                title={
                  metric.title || (typeof metric.value === 'string' ? metric.value : undefined)
                }
              >
                {metric.value}
              </span>
            </div>
          </div>
        ))}

        <div className="h-6 w-px bg-surface shrink-0"></div>

        {/* Pause/Resume Button */}
        <button
          onClick={handleTogglePause}
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
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
