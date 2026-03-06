import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useHuntStore } from '../../../store';
import { type FapHotClassifierState } from '../../../utils/fapHotClassifier';
import { processRecentChatLines } from './chatLogEventProcessor';

// Limit buffer size to prevent memory explosion (10MB max)
const MAX_PENDING_BUFFER = 10 * 1024 * 1024;

export function useChatLogMonitorLogic() {
  const [listenerReady, setListenerReady] = useState(false);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const detectionInProgress = useRef(false);
  const pendingPayloadRef = useRef('');
  const coalesceTimerRef = useRef<number | null>(null);
  const parseInProgressRef = useRef(false);
  const reparseQueuedRef = useRef(false);
  const fapHotStateRef = useRef<FapHotClassifierState>({
    hotWindowEndMs: null,
    lastHealTimestampMs: null,
    lastHealAmount: null,
    pendingDirectHealTimestampMs: null,
    expectingDirectUseHeal: false,
  });

  const debugLog = (..._args: unknown[]) => {
    // Development debug logs removed
  };

  const debugDetail = (..._args: unknown[]) => {
    // Development debug logs removed
  };

  const avatarName = useHuntStore((state) => state.settings.avatarName);
  const chatLogPath = useHuntStore((state) => state.settings.chatLogPath);
  const autoStartSession = useHuntStore((state) => state.settings.autoStartSession);
  const updateSettings = useHuntStore((state) => state.updateSettings);
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );

  const getIsWatching = async () => {
    try {
      const watching: boolean = await invoke('is_watching');
      return watching;
    } catch (error) {
      console.error('[ChatLogMonitor] Error checking watch status:', error);
      return false;
    }
  };

  const detectAndSetChatLogPath = async () => {
    if (detectionInProgress.current) {
      return;
    }

    detectionInProgress.current = true;
    try {
      const detected: string | null = await invoke('detect_chat_log_path');
      if (detected) {
        updateSettings({ chatLogPath: detected });
      }
    } catch (error) {
      console.error('[ChatLogMonitor] Error detecting chat log:', error);
    } finally {
      detectionInProgress.current = false;
    }
  };

  const startWatching = async () => {
    const pathToWatch = chatLogPath;
    if (!pathToWatch) {
      console.warn('[ChatLogMonitor] No path to watch, returning');
      return;
    }

    try {
      await invoke('start_watching_file', { path: pathToWatch });
    } catch (error) {
      console.error('Error starting watch:', error);
    }
  };

  const stopWatching = async () => {
    try {
      await invoke('stop_watching_file');
    } catch (error) {
      console.error('[ChatLogMonitor] Error stopping watch:', error);
    }
  };

  useEffect(() => {
    if (avatarName && !chatLogPath && listenerReady && !detectionInProgress.current) {
      void detectAndSetChatLogPath();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarName, chatLogPath, listenerReady]);

  useEffect(() => {
    if (!listenerReady || !chatLogPath) {
      return;
    }

    const ensureWatching = async () => {
      const watching = await getIsWatching();
      const currentPrimaryLoadout = useHuntStore.getState().getPrimaryLoadout();

      if (autoStartSession) {
        if (activeSession && activeSession.status === 'paused') {
          if (watching) {
            void stopWatching();
          }
          return;
        }

        if (!currentPrimaryLoadout) {
          if (watching) {
            void stopWatching();
          }
          return;
        }

        if (!watching) {
          void startWatching();
        }
        return;
      }

      if (activeSession && activeSession.status === 'active') {
        if (!watching) {
          processedEventsRef.current = new Set();
          void startWatching();
        }
      } else if (watching) {
        void stopWatching();
      }
    };

    void ensureWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenerReady, activeSession?.id, activeSession?.status, chatLogPath, autoStartSession]);

  useEffect(() => {
    let unlistenFn: UnlistenFn | null = null;
    let isMounted = true;

    const setupListener = async () => {
      try {
        const parseBufferedPayload = async () => {
          if (parseInProgressRef.current) {
            reparseQueuedRef.current = true;
            return;
          }

          const content = pendingPayloadRef.current;
          if (!content) {
            return;
          }

          const lines = content.split('\n');
          const recentLines = lines.slice(-100).join('\n');

          pendingPayloadRef.current = '';
          parseInProgressRef.current = true;

          try {
            fapHotStateRef.current = await processRecentChatLines({
              recentLines,
              processedEvents: processedEventsRef.current,
              fapHotState: fapHotStateRef.current,
              debugDetail,
            });
          } catch (error) {
            console.error('[ChatLogMonitor] Error parsing chat log:', error);
          } finally {
            parseInProgressRef.current = false;
            if (reparseQueuedRef.current || pendingPayloadRef.current.length > 0) {
              reparseQueuedRef.current = false;
              coalesceTimerRef.current = window.setTimeout(() => {
                coalesceTimerRef.current = null;
                void parseBufferedPayload();
              }, 50);
            }
          }
        };

        const scheduleParse = () => {
          if (coalesceTimerRef.current !== null) {
            return;
          }

          coalesceTimerRef.current = window.setTimeout(() => {
            coalesceTimerRef.current = null;
            void parseBufferedPayload();
          }, 100);
        };

        unlistenFn = await listen<string>('chat-log-updated', (event) => {
          const newContent = event.payload.endsWith('\n') ? event.payload : event.payload + '\n';
          const totalSize = pendingPayloadRef.current.length + newContent.length;

          if (totalSize > MAX_PENDING_BUFFER) {
            const mergedLines = (pendingPayloadRef.current + newContent).split('\n');
            const recentLines = mergedLines.slice(-500);
            pendingPayloadRef.current = recentLines.join('\n');
            debugDetail('[ChatLogMonitor] Buffer size limit exceeded, trimmed to recent lines');
          } else {
            pendingPayloadRef.current += newContent;
          }

          scheduleParse();
        });

        if (!isMounted) {
          if (unlistenFn) {
            unlistenFn();
          }
          return;
        }

        pendingPayloadRef.current = '';
        setListenerReady(true);
      } catch (error) {
        console.error('[ChatLogMonitor] Failed to setup event listener:', error);
      }
    };

    debugLog('[ChatLogMonitor] Setting up event listener on mount');
    void setupListener();

    return () => {
      isMounted = false;
      if (coalesceTimerRef.current !== null) {
        window.clearTimeout(coalesceTimerRef.current);
        coalesceTimerRef.current = null;
      }
      if (unlistenFn) {
        unlistenFn();
      }
      setListenerReady(false);
    };
  }, []);
}
