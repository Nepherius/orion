import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FileText, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { useHuntStore } from '../../store';

interface LootEvent {
  timestamp: string;
  player: string;
  creature: string;
  value: number;
  is_hof: boolean;
}

export function ChatLogMonitor() {
  const [isWatching, setIsWatching] = useState(false);
  const [watchedPath, setWatchedPath] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'watching' | 'error'>('idle');

  const { addGlobal, getActiveSession, createSession, startSession } = useHuntStore();
  const settings = useHuntStore((state) => state.settings);
  const activeSession = useHuntStore((state) => state.getActiveSession());
  const getActiveLoadout = useHuntStore((state) => state.getActiveLoadout);

  // Auto-start monitoring when a session becomes active and chat log path is set
  useEffect(() => {
    if (activeSession && activeSession.status === 'active' && settings.chatLogPath && !isWatching) {
      console.debug('Auto-starting file watcher for active session:', activeSession.id);
      startWatching();
    }
  }, [activeSession?.id, activeSession?.status, settings.chatLogPath, isWatching]);

  useEffect(() => {
    // Check if already watching on mount
    checkWatchStatus();

    // Listen for file updates
    const unlisten = listen<string>('chat-log-updated', async (event) => {
      try {
        const content = event.payload;
        console.debug('chat-log-updated payload length:', content?.length);
        const events: LootEvent[] = await invoke('parse_chat_log', { content });
        console.debug('parsed events from payload:', events);

        // Process new events
        let activeSession = getActiveSession();
        // If there's no active session but we have system pickups and auto-start is enabled, auto-create one
        if (!activeSession && events.length > 0 && settings.autoStartSession) {
          const hasSystemPickup = events.some((e) => !e.player || e.player.trim() === '');
          if (hasSystemPickup) {
            const activeLoadout = getActiveLoadout();
            console.debug('No active session — creating auto session to capture system pickups');
            createSession({
              name: 'Auto Session (Chat Monitor)',
              weapon: activeLoadout?.name || 'No Loadout',
              armor: '',
              location: 'Auto',
              startTime: Date.now(),
              status: 'active',
              ammoCost: 0,
              repairCost: 0,
              armorDecay: 0,
              healingCost: 0,
              otherCosts: 0,
              notes: 'Automatically created to capture system pickups from chat.log',
            });
            const newId = useHuntStore.getState().sessions[0]?.id;
            if (newId) {
              startSession(newId);
              activeSession = getActiveSession();
              console.debug('Auto session created and started:', newId);
            }
          }
        }

        if (activeSession && events.length > 0) {
          console.debug('activeSession id:', activeSession.id);
          // Get the last few events (avoid duplicates)
          const recentEvents = events.slice(-10);

          recentEvents.forEach((evt) => {
            // Only add if it's our player, a system pickup (no player in line),
            // or we're in a team (no avatarName set).
            const isSystemPickup = !evt.player || evt.player.trim() === '';
            if (!settings.avatarName || isSystemPickup || evt.player.includes(settings.avatarName)) {
              console.debug('adding global to session', activeSession.id, evt.creature, evt.value, 'isHoF', evt.is_hof);
              addGlobal(activeSession.id, {
                creature: evt.creature,
                value: evt.value,
                isHoF: evt.is_hof,
              });
              // Debug: log updated session stats so we can verify UI updates
              const updatedSession = useHuntStore.getState().sessions.find((s) => s.id === activeSession.id);
              console.debug('updated session after addGlobal:', {
                id: updatedSession?.id,
                globals: updatedSession?.globals.length,
                hofs: updatedSession?.globals.filter((g) => g.isHoF).length,
                stats: updatedSession?.stats,
              });
            }
          });

          setStatus('watching');
        }
      } catch (error) {
        console.error('Error parsing chat log:', error);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [settings.avatarName, addGlobal, getActiveSession, createSession, startSession]);

  const checkWatchStatus = async () => {
    try {
      const watching: boolean = await invoke('is_watching');
      setIsWatching(watching);

      if (watching) {
        const path: string | null = await invoke('get_watched_path');
        setWatchedPath(path);
        setStatus('watching');
      }
    } catch (error) {
      console.error('Error checking watch status:', error);
    }
  };

  const startWatching = async () => {
    const pathToWatch = watchedPath || settings.chatLogPath;
    if (!pathToWatch) return;

    try {
      await invoke('start_watching_file', { path: pathToWatch });
      setIsWatching(true);
      if (!watchedPath) {
        setWatchedPath(pathToWatch);
      }
      setStatus('watching');
    } catch (error) {
      console.error('Error starting watch:', error);
      setStatus('error');
    }
  };

  const stopWatching = async () => {
    // Prevent stopping monitoring during an active session
    if (activeSession && activeSession.status === 'active') {
      alert('Cannot stop monitoring during an active session. Please pause or end the session first.');
      return;
    }

    try {
      await invoke('stop_watching_file');
      setIsWatching(false);
      setStatus('idle');
    } catch (error) {
      console.error('Error stopping watch:', error);
    }
  };

  const toggleAutoStart = () => {
    const newValue = !settings.autoStartSession;
    useHuntStore.getState().updateSettings({ autoStartSession: newValue });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary-500" />
        <h3 className="text-sm font-bold">Chat Log Monitor</h3>
      </div>

      <div className="space-y-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-700">
          {status === 'watching' && (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Monitoring</span>
            </>
          )}
          {status === 'idle' && (
            <>
              <AlertCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Not Monitoring</span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Error</span>
            </>
          )}
        </div>

        {/* Start/Stop Button */}
        {!isWatching ? (
          <button 
            onClick={startWatching} 
            className="btn-primary w-full" 
            disabled={activeSession !== null || (!watchedPath && !settings.chatLogPath)}
          >
            <Play className="w-4 h-4 inline mr-2" />
            Start
          </button>
        ) : (
          <button onClick={stopWatching} className="btn-danger w-full">
            <Square className="w-4 h-4 inline mr-2" />
            Stop
          </button>
        )}

        {/* Auto-start Toggle */}
        <label className="flex items-center justify-between p-2 rounded-lg bg-gray-700 cursor-pointer hover:bg-gray-600 transition-colors">
          <span className="text-sm text-gray-300">Auto-start session</span>
          <input
            type="checkbox"
            checked={settings.autoStartSession}
            onChange={toggleAutoStart}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-gray-800"
          />
        </label>
      </div>
    </div>
  );
}
