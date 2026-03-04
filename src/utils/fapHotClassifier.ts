export interface ParsedHealingLine {
  timestamp: string;
  amount: number;
  isDirectUse: boolean;
}

export interface FapHotClassifierState {
  hotWindowEndMs: number | null;
  lastHealTimestampMs: number | null;
  lastHealAmount: number | null;
  pendingDirectHealTimestampMs: number | null;
  expectingDirectUseHeal: boolean; // Track if we just saw "Received Effect Over Time: Heal"
}

export interface FapHotClassificationResult {
  healingEvents: ParsedHealingLine[];
  nextState: FapHotClassifierState;
}

export type HealHotMode = 'always' | 'conditional' | 'none';

export interface HealToolProfile {
  windowDurationMs: number;
  hotMode: HealHotMode;
}

const FAP_HOT_WINDOW_MS = 10_000; // 10 seconds for FAP HOT
const CHIP_WINDOW_MS = 30_000; // 30 seconds for CHIP
const FAP_EOT_BIND_WINDOW_MS = 2_000;

export function getHealToolProfile(healToolName?: string): HealToolProfile {
  if (!healToolName) {
    return {
      windowDurationMs: FAP_HOT_WINDOW_MS,
      hotMode: 'conditional',
    };
  }

  const name = healToolName.toLowerCase();

  if (name.includes('regeneration') && name.includes('chip')) {
    return {
      windowDurationMs: FAP_HOT_WINDOW_MS,
      hotMode: 'none',
    };
  }

  if (name.includes('restoration') && name.includes('chip')) {
    return {
      windowDurationMs: CHIP_WINDOW_MS,
      hotMode: 'always',
    };
  }

  if (name.includes('chip')) {
    return {
      windowDurationMs: CHIP_WINDOW_MS,
      hotMode: 'always',
    };
  }

  return {
    windowDurationMs: FAP_HOT_WINDOW_MS,
    hotMode: 'conditional',
  };
}

// Backward-compatible helper for callers that only need duration
export function getHealWindowDuration(healToolName?: string): number {
  return getHealToolProfile(healToolName).windowDurationMs;
}

const HEAL_LINE_REGEX =
  /^(?<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}).*You healed yourself\s+(?<amount>[\d.]+)\s+points?/;
const EOT_LINE_REGEX =
  /^(?<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}).*Received Effect Over Time:\s*Heal/;

function parseTimestampMs(timestamp: string): number | null {
  const match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

function defaultState(state?: Partial<FapHotClassifierState>): FapHotClassifierState {
  return {
    hotWindowEndMs: state?.hotWindowEndMs ?? null,
    lastHealTimestampMs: state?.lastHealTimestampMs ?? null,
    lastHealAmount: state?.lastHealAmount ?? null,
    pendingDirectHealTimestampMs: state?.pendingDirectHealTimestampMs ?? null,
    expectingDirectUseHeal: state?.expectingDirectUseHeal ?? false,
  };
}

export function classifyFapHealingFromLogLines(
  content: string,
  state?: Partial<FapHotClassifierState>,
  windowDurationMs?: number,
  hotMode: HealHotMode = 'conditional'
): FapHotClassificationResult {
  const workingState = defaultState(state);
  const eotWindowMs = windowDurationMs ?? FAP_HOT_WINDOW_MS;
  const healingEvents: ParsedHealingLine[] = [];

  for (const line of content.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    // Check for "Received Effect Over Time: Heal" - can come before OR after a heal
    const eotMatch = line.match(EOT_LINE_REGEX);
    if (eotMatch?.groups) {
      if (hotMode === 'none') {
        continue;
      }

      const eotTimestampMs = parseTimestampMs(eotMatch.groups.ts);
      if (eotTimestampMs === null) {
        continue;
      }

      // If we just marked a heal as direct use, bind the EOT to it
      if (workingState.pendingDirectHealTimestampMs !== null) {
        const gap = eotTimestampMs - workingState.pendingDirectHealTimestampMs;
        if (gap >= 0 && gap <= FAP_EOT_BIND_WINDOW_MS) {
          workingState.hotWindowEndMs = workingState.pendingDirectHealTimestampMs + eotWindowMs;
        }
        workingState.pendingDirectHealTimestampMs = null;
      }

      // Rule: first heal after EOT is always direct use.
      // This applies even when EOT is close to a previous direct heal.
      workingState.expectingDirectUseHeal = true;
      continue;
    }

    const healMatch = line.match(HEAL_LINE_REGEX);
    if (healMatch?.groups) {
      const timestamp = healMatch.groups.ts;
      const amount = Number(healMatch.groups.amount);
      const timestampMs = parseTimestampMs(timestamp);

      if (!Number.isFinite(amount) || timestampMs === null) {
        continue;
      }

      // Check if this heal should be marked as direct use based on EOT flag
      const wasExpectingDirectUse = workingState.expectingDirectUseHeal;
      let isDirectUse = wasExpectingDirectUse;
      workingState.expectingDirectUseHeal = false;

      // If not marked by EOT flag, use window-based classification
      if (!isDirectUse) {
        if (hotMode === 'none') {
          // Regeneration chip: all heals are direct uses
          isDirectUse = true;
        } else if (hotMode === 'always') {
          // Restoration chip: first use is direct, all heals within window are passive ticks
          // Heal amounts are consistent (no big jumps), so use window timing only
          const withinHotWindow =
            workingState.hotWindowEndMs !== null && timestampMs <= workingState.hotWindowEndMs;
          isDirectUse = !withinHotWindow;
        } else {
          // FAP (conditional): direct heals are MUCH stronger than ticks
          // Use aggressive 3x threshold to detect new direct uses by heal amount jump
          const withinHotWindow =
            workingState.hotWindowEndMs !== null && timestampMs <= workingState.hotWindowEndMs;

          const isSignificantHealJump =
            workingState.lastHealAmount !== null && amount >= workingState.lastHealAmount * 3.0;

          if (!withinHotWindow) {
            // Outside any window = direct use
            isDirectUse = true;
          } else if (isSignificantHealJump) {
            // Large heal jump within window = new direct use
            isDirectUse = true;
          } else {
            // Small heal within window = passive tick
            isDirectUse = false;
          }
        }
      }

      healingEvents.push({
        timestamp,
        amount,
        isDirectUse,
      });

      if (isDirectUse) {
        if (hotMode === 'always') {
          workingState.hotWindowEndMs = timestampMs + eotWindowMs;
          workingState.pendingDirectHealTimestampMs = timestampMs;
        } else if (hotMode === 'conditional') {
          const wasWithinActiveWindow =
            workingState.hotWindowEndMs !== null && timestampMs <= workingState.hotWindowEndMs;

          if (wasExpectingDirectUse || wasWithinActiveWindow) {
            workingState.hotWindowEndMs = timestampMs + eotWindowMs;
          }
          workingState.pendingDirectHealTimestampMs = timestampMs;
        } else {
          workingState.hotWindowEndMs = null;
          workingState.pendingDirectHealTimestampMs = null;
        }
      }

      workingState.lastHealTimestampMs = timestampMs;
      workingState.lastHealAmount = amount;
      continue;
    }

    const lineTimestampMatch = line.match(/^(?<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if (!lineTimestampMatch?.groups) {
      continue;
    }

    const lineTimestampMs = parseTimestampMs(lineTimestampMatch.groups.ts);
    if (
      lineTimestampMs !== null &&
      workingState.pendingDirectHealTimestampMs !== null &&
      lineTimestampMs - workingState.pendingDirectHealTimestampMs > FAP_EOT_BIND_WINDOW_MS
    ) {
      workingState.pendingDirectHealTimestampMs = null;
    }
  }

  return {
    healingEvents,
    nextState: workingState,
  };
}
