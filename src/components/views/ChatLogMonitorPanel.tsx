import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { useHuntStore } from '../../store';
import { AlertModal } from '../common/AlertModal';

/**
 * UI Panel for Chat Log Monitor controls
 * The actual event listening logic is in ChatLogMonitor.tsx (always mounted in App.tsx)
 */
export function ChatLogMonitorPanel() {
  const [isWatching, setIsWatching] = useState(false);
  const [watchedPath, setWatchedPath] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'watching' | 'error'>('idle');
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showSessionActiveAlert, setShowSessionActiveAlert] = useState(false);

  const settings = useHuntStore((state) => state.settings);
  const activeSession = useHuntStore((state) => state.getActiveSession());

  const checkWatchStatus = async () => {
    try {
      const watching: boolean = await invoke('is_watching');
      setIsWatching(watching);

      if (watching) {
        const path: string | null = await invoke('get_watched_path');
        setWatchedPath(path);
        setStatus('watching');
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('[ChatLogMonitorPanel] Error checking watch status:', error);
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
      console.error('[ChatLogMonitorPanel] Error starting watch:', error);
      setStatus('error');
    }
  };

  const stopWatching = async () => {
    // Prevent stopping monitoring during an active session
    if (activeSession && activeSession.status === 'active') {
      setShowSessionActiveAlert(true);
      return;
    }

    if (settings.autoStartSession) {
      setShowStopConfirm(true);
      return;
    }

    try {
      await invoke('stop_watching_file');
      setIsWatching(false);
      setStatus('idle');
    } catch (error) {
      console.error('[ChatLogMonitorPanel] Error stopping watch:', error);
    }
  };

  const confirmStopWatching = async () => {
    setShowStopConfirm(false);
    useHuntStore.getState().updateSettings({ autoStartSession: false });
    try {
      await invoke('stop_watching_file');
      setIsWatching(false);
      setStatus('idle');
    } catch (error) {
      console.error('[ChatLogMonitorPanel] Error stopping watch:', error);
    }
  };

  const toggleAutoStart = () => {
    const newValue = !settings.autoStartSession;
    useHuntStore.getState().updateSettings({ autoStartSession: newValue });
  };

  // Check status on mount
  useEffect(() => {
    checkWatchStatus();
  }, []);

  // Update when active session changes
  useEffect(() => {
    checkWatchStatus();
  }, [activeSession?.id]);

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

      {showStopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-2">Disable Auto-Start?</h3>
            <p className="text-sm text-gray-300 mb-4">
              Auto-start is enabled. Stopping the file monitor will disable auto-start. Do you want
              to continue?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowStopConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="button" onClick={confirmStopWatching} className="btn-danger flex-1">
                Stop & Disable
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={showSessionActiveAlert}
        onClose={() => setShowSessionActiveAlert(false)}
        variant="warning"
        title="Cannot Stop Monitoring"
        message="Cannot stop monitoring during an active session."
        detail="Please pause or end the session first before stopping the file monitor."
      />
    </div>
  );
}
