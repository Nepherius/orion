import type { HuntSession } from '../types';

export function normalizeTimestampMs(timestamp?: number): number | undefined {
  if (!timestamp) {
    return undefined;
  }

  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

export function getSessionPausedMs(session: HuntSession, now: number = Date.now()): number {
  const pausedAtMs = normalizeTimestampMs(session.pausedAt);
  return (
    (session.totalPausedMs || 0) +
    (session.status === 'paused' && pausedAtMs ? Math.max(0, now - pausedAtMs) : 0)
  );
}

export function getSessionActiveDurationMs(session: HuntSession, now: number = Date.now()): number {
  if (session.status === 'completed' && session.stats.duration > 0) {
    return Math.max(0, session.stats.duration * 1000);
  }

  const startTimeMs = normalizeTimestampMs(session.startTime) ?? now;
  const endTimeMs = normalizeTimestampMs(session.endTime);
  const elapsedReference = session.status === 'completed' && endTimeMs ? endTimeMs : now;

  return Math.max(0, elapsedReference - startTimeMs - getSessionPausedMs(session, now));
}

export function getSessionActiveDurationHours(
  session: HuntSession,
  now: number = Date.now()
): number {
  return getSessionActiveDurationMs(session, now) / 1000 / 60 / 60;
}
