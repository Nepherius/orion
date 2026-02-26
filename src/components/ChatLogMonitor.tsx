import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FileText, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { useHuntStore } from '../store';

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
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [eventsFound, setEventsFound] = useState(0);

  const { addGlobal, getActiveSession } = useHuntStore();
  const settings = useHuntStore((state) => state.settings);

  useEffect(() => {
    // Check if already watching on mount
    checkWatchStatus();

    // Listen for file updates
    const unlisten = listen<string>('chat-log-updated', async (event) => {
      try {
        const content = event.payload;
        const events: LootEvent[] = await invoke('parse_chat_log', { content });

        // Process new events
        const activeSession = getActiveSession();
        if (activeSession && events.length > 0) {
          // Get the last few events (avoid duplicates)
          const recentEvents = events.slice(-10);

          recentEvents.forEach((evt) => {
            // Only add if it's our player or we're in a team
            if (!settings.playerName || evt.player.includes(settings.playerName)) {
              addGlobal(activeSession.id, {
                creature: evt.creature,
                value: evt.value,
                isHoF: evt.is_hof,
              });
            }
          });

          setEventsFound(events.length);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('Error parsing chat log:', error);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [settings.playerName, addGlobal, getActiveSession]);

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

  const selectChatLog = async () => {
    try {
      const selected = (await open({
        multiple: false,
        filters: [
          {
            name: 'Log Files',
            extensions: ['log', 'txt'],
          },
        ],
      })) as string | null;

      if (selected) {
        const path = selected;
        setWatchedPath(path);

        // Read initial content
        const content: string = await invoke('read_chat_log', { path });
        const events: LootEvent[] = await invoke('parse_chat_log', { content });
        setEventsFound(events.length);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      setStatus('error');
    }
  };

  const startWatching = async () => {
    if (!watchedPath) return;

    try {
      await invoke('start_watching_file', { path: watchedPath });
      setIsWatching(true);
      setStatus('watching');
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error starting watch:', error);
      setStatus('error');
    }
  };

  const stopWatching = async () => {
    try {
      await invoke('stop_watching_file');
      setIsWatching(false);
      setStatus('idle');
    } catch (error) {
      console.error('Error stopping watch:', error);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-primary-500" />
        <h3 className="text-xl font-bold">Chat Log Monitor</h3>
      </div>

      <div className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-700">
          {status === 'watching' && (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400">Monitoring Active</span>
            </>
          )}
          {status === 'idle' && (
            <>
              <AlertCircle className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400">Not Monitoring</span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">Error</span>
            </>
          )}
        </div>

        {/* File Path */}
        {watchedPath && (
          <div className="p-3 bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Watching File:</div>
            <div className="text-sm font-mono truncate">{watchedPath}</div>
            <div className="text-xs text-gray-400 mt-2">
              Events found: {eventsFound}
              {lastUpdate && ` • Last update: ${lastUpdate}`}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <button onClick={selectChatLog} className="btn-secondary flex-1" disabled={isWatching}>
            <FileText className="w-4 h-4 inline mr-2" />
            Select Chat Log
          </button>

          {!isWatching ? (
            <button onClick={startWatching} className="btn-primary" disabled={!watchedPath}>
              <Play className="w-4 h-4 inline mr-2" />
              Start Monitoring
            </button>
          ) : (
            <button onClick={stopWatching} className="btn-danger">
              <Square className="w-4 h-4 inline mr-2" />
              Stop
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-400 p-3 bg-gray-700 rounded-lg">
          <p className="font-semibold mb-2">How to use:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create or select an active hunting session</li>
            <li>
              Click &quot;Select Chat Log&quot; and choose your Entropia Universe chat.log file
            </li>
            <li>Click &quot;Start Monitoring&quot; to begin automatic tracking</li>
            <li>Globals and HoFs will be automatically added to your active session</li>
          </ol>
          <p className="mt-2 text-xs">
            💡 Tip: Set your player name in Settings for automatic filtering
          </p>
        </div>
      </div>
    </div>
  );
}
