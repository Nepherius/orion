import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useHuntStore } from '../store';

export function useSettingsModel() {
  const { settings, updateSettings, clearAllData } = useHuntStore();
  const [chatLogPath, setChatLogPath] = useState(settings.chatLogPath || '');
  const [detectedPath, setDetectedPath] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [clearDataError, setClearDataError] = useState<string | null>(null);

  const detectChatLog = async () => {
    try {
      const detected: string | null = await invoke('detect_chat_log_path');
      if (detected) {
        setDetectedPath(detected);
        if (!chatLogPath) {
          setChatLogPath(detected);
          updateSettings({ chatLogPath: detected });
        }
      }
    } catch (error) {
      console.error('Error detecting chat log:', error);
    }
  };

  const handleBrowse = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Log Files',
            extensions: ['log', 'txt'],
          },
        ],
      });
      if (selected) {
        setChatLogPath(selected as string);
        updateSettings({ chatLogPath: selected as string });
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

  const handleChatLogPathChange = (value: string) => {
    setChatLogPath(value);
    updateSettings({ chatLogPath: value });
  };

  const requestClearData = () => {
    setShowClearDataConfirm(true);
  };

  const confirmClearData = async () => {
    setClearDataError(null);
    const cleared = await clearAllData();
    if (cleared) {
      window.location.reload();
      return;
    }

    setClearDataError(
      'Orion could not clear the database. No data was intentionally removed; please try again.'
    );
  };

  useEffect(() => {
    detectChatLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    settings,
    updateSettings,
    chatLogPath,
    detectedPath,
    handleBrowse,
    handleChatLogPathChange,
    requestClearData,
    confirmClearData,
    showClearDataConfirm,
    setShowClearDataConfirm,
    clearDataError,
    setClearDataError,
  };
}
