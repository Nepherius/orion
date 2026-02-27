import { useState, useEffect } from 'react';

interface LiveTimerProps {
  startTime: number;
  isRunning?: boolean;
  pausedAt?: number;
  pausedDurationMs?: number;
  className?: string;
}

export function LiveTimer({
  startTime,
  isRunning = true,
  pausedAt,
  pausedDurationMs = 0,
  className = '',
}: LiveTimerProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    setCurrentTime(Date.now());

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const elapsedEnd = isRunning ? currentTime : pausedAt ?? currentTime;
  const duration = Math.max(0, elapsedEnd - startTime - pausedDurationMs);
  const totalSeconds = Math.floor(duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return <span className={className}>{formatted}</span>;
}
