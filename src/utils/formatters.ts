export function formatDurationSeconds(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatDurationMinutes(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

export function formatDurationMs(totalMs: number): string {
  return formatDurationMinutes(totalMs / 1000);
}

export function formatCompactDurationMs(totalMs: number): string {
  const minutes = Math.floor(Math.max(0, totalMs) / 1000 / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  return `${minutes}m`;
}

export function formatSmallNumber(value: number, decimals: number = 2): string {
  const absolute = Math.abs(value);
  const threshold = Math.pow(10, -decimals);

  if (absolute === 0) {
    return value.toFixed(decimals);
  }

  if (absolute < threshold) {
    return `${value < 0 ? '-' : ''}<${threshold.toFixed(decimals)}`;
  }

  return value.toFixed(decimals);
}
