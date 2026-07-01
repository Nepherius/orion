import { describe, expect, it } from 'vitest';
import type { HuntSession } from '../types';
import {
  getSessionActiveDurationHours,
  getSessionActiveDurationMs,
  getSessionPausedMs,
  normalizeTimestampMs,
} from './sessionTiming';

const makeSession = (overrides: Partial<HuntSession>): HuntSession =>
  ({
    startTime: 1_700_000_000_000,
    status: 'active',
    totalPausedMs: 0,
    stats: { duration: 0 } as HuntSession['stats'],
    ...overrides,
  }) as HuntSession;

describe('sessionTiming', () => {
  it('normalizes second timestamps to milliseconds', () => {
    expect(normalizeTimestampMs(1_700_000_000)).toBe(1_700_000_000_000);
    expect(normalizeTimestampMs(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it('includes an in-progress pause in paused duration', () => {
    const session = makeSession({
      status: 'paused',
      pausedAt: 1_700_000_005_000,
      totalPausedMs: 2_000,
    });

    expect(getSessionPausedMs(session, 1_700_000_008_000)).toBe(5_000);
  });

  it('uses completed timestamps and paused duration before stored stats', () => {
    const session = makeSession({
      status: 'completed',
      startTime: 1_700_000_001_000,
      endTime: 1_700_000_020_000,
      totalPausedMs: 5_000,
      stats: { duration: 99 } as HuntSession['stats'],
    });

    expect(getSessionActiveDurationMs(session, 30_000)).toBe(14_000);
    expect(getSessionActiveDurationHours(session, 30_000)).toBeCloseTo(14 / 3600, 8);
  });

  it('falls back to completed stats duration when end time is missing', () => {
    const session = makeSession({
      status: 'completed',
      startTime: 1_700_000_001_000,
      totalPausedMs: 5_000,
      stats: { duration: 12 } as HuntSession['stats'],
    });

    expect(getSessionActiveDurationMs(session, 30_000)).toBe(12_000);
  });
});
