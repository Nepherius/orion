import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useRef, useState } from 'react';
import { initializeStoreFromDb, useHuntStore } from '../../store';
import type { AppSettings, HuntSession, Loadout } from '../../types';

interface StoreSyncPayload {
  sourceId: string;
  sessions: HuntSession[];
  activeSessionId: string | null;
  loadouts: Loadout[];
  settings: AppSettings;
}

export function useOverlayClock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return now;
}

export function useOverlayWindowLifecycle(isVisible: boolean) {
  const syncSetupRef = useRef(false);
  const hasReceivedSettingsSyncRef = useRef(false);
  const canSaveGeometryRef = useRef(false);
  const geometryReadyTimerRef = useRef<number | undefined>(undefined);

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

          useHuntStore.setState((prevState) => ({
            ...prevState,
            sessions: payload.sessions,
            activeSessionId: payload.activeSessionId,
            loadouts: payload.loadouts,
            settings: { ...prevState.settings, ...payload.settings },
          }));
        });
      } catch {
        // Silently fail if listen is unavailable
      }

      const requestState = () => {
        emit('store-sync-request', {}).catch(() => {
          // Silently fail
        });
      };

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

  useEffect(() => {
    let saveTimeout: ReturnType<typeof setTimeout> | undefined;

    const saveGeometry = async () => {
      try {
        if (!hasReceivedSettingsSyncRef.current || !canSaveGeometryRef.current) {
          return;
        }

        const currentWindow = getCurrentWindow();
        const windowIsVisible = await currentWindow.isVisible();
        if (!windowIsVisible) {
          return;
        }

        const geometry = await invoke<{
          x: number | null;
          y: number | null;
          width: number;
          height: number;
        } | null>('get_overlay_geometry');
        if (geometry && geometry.width > 0 && geometry.height > 0) {
          emit('overlay-geometry-changed', geometry).catch(console.error);
        }
      } catch (error) {
        console.error('Failed to save overlay geometry:', error);
      }
    };

    const debouncedSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveGeometry, 500);
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
}

export function useOverlayLoadoutHotkeys(activeSession: HuntSession | null, loadouts: Loadout[]) {
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
}
