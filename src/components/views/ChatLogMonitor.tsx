import { useChatLogMonitorLogic } from './chatlog/useChatLogMonitorLogic';

export function ChatLogMonitor() {
  useChatLogMonitorLogic();

  // UI is in ChatLogMonitorPanel.tsx, this wrapper only activates logic.
  return null;
}
