import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useHuntStore } from '../store';

export function useSettingsModel() {
  const { settings, updateSettings } = useHuntStore();
  const [chatLogPath, setChatLogPath] = useState(settings.chatLogPath || '');
  const [detectedPath, setDetectedPath] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

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

  const confirmClearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    detectChatLog();
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
  };
}
