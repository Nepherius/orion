export interface ParsedHealingLine {
  timestamp: string;
  amount: number;
  isDirectUse: boolean;
}

export interface FapHotClassifierState {
  hotWindowEndMs: number | null;
  lastHealTimestampMs: number | null;
  lastHealAmount: number | null;
  baseActiveHealAmount: number | null; // Track the amount of the initial direct heal to determine passive ticks
  pendingDirectHealTimestampMs: number | null;
  expectingDirectUseHeal: boolean; // Track if we just saw "Received Effect Over Time: Heal"
}

export interface FapHotClassificationResult {
  healingEvents: ParsedHealingLine[];
  nextState: FapHotClassifierState;
}

export type HealHotMode = 'always' | 'eotOnly' | 'vivoS10' | 'refurbishedHeart' | 'none';

export interface HealToolProfile {
  windowDurationMs: number;
  hotMode: HealHotMode;
}

const FAP_HOT_WINDOW_MS = 10_000; // 10 seconds for FAP HOT
const CHIP_WINDOW_MS = 30_000; // 30 seconds for CHIP
const REFURBISHED_HEART_WINDOW_MS = 5_000; // 5 seconds for Refurbished H.E.A.R.T. VI-VIII
const FAP_EOT_BIND_WINDOW_MS = 2_000;

export function getHealToolProfile(healToolName?: string): HealToolProfile {
  if (!healToolName) {
    return {
      windowDurationMs: FAP_HOT_WINDOW_MS,
      hotMode: 'none',
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

  if (name.includes('chip') && !name.includes('regeneration')) {
    // Treat other unexpected chips as always hot mode just in case
    return {
      windowDurationMs: CHIP_WINDOW_MS,
      hotMode: 'always',
    };
  }

  // Vivo S10 has 10 second heal over time
  if (name.includes('vivo') && name.includes('s10')) {
    return {
      windowDurationMs: FAP_HOT_WINDOW_MS,
      hotMode: 'vivoS10',
    };
  }

  // Refurbished H.E.A.R.T. Rank VI to VIII have 5 second heal over time
  if (name.includes('refurbished') && name.includes('h.e.a.r.t')) {
    const hasRankVI = /\bvi\b/.test(name);
    const hasRankVII = /\bvii\b/.test(name);
    const hasRankVIII = /\bviii\b/.test(name);

    if (hasRankVI || hasRankVII || hasRankVIII) {
      return {
        windowDurationMs: REFURBISHED_HEART_WINDOW_MS,
        hotMode: 'refurbishedHeart',
      };
    }
  }

  // All other FAPs: single heal, no HoT
  return {
    windowDurationMs: FAP_HOT_WINDOW_MS,
    hotMode: 'none',
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
    baseActiveHealAmount: state?.baseActiveHealAmount ?? null,
    pendingDirectHealTimestampMs: state?.pendingDirectHealTimestampMs ?? null,
    expectingDirectUseHeal: state?.expectingDirectUseHeal ?? false,
  };
}

export function classifyFapHealingFromLogLines(
  content: string,
  state?: Partial<FapHotClassifierState>,
  windowDurationMs?: number,
  hotMode: HealHotMode = 'none'
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
          workingState.pendingDirectHealTimestampMs = null;
          continue; // Bound it directly, don't set expectingDirectUseHeal
        }
      }

      // Rule: first heal after EOT is usually direct use.
      // EXCEPT for Refurbished HEART which has no direct heal at all!
      if (hotMode !== 'refurbishedHeart') {
        workingState.expectingDirectUseHeal = true;
      } else {
        // For the Heart, the EOT marker ITSELF starts the window!
        workingState.hotWindowEndMs = eotTimestampMs + eotWindowMs;
      }

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
          // No HoT: all heals are direct uses
          isDirectUse = true;
        } else if (
          hotMode === 'always' ||
          hotMode === 'eotOnly' ||
          hotMode === 'vivoS10' ||
          hotMode === 'refurbishedHeart'
        ) {
          const gracePeriodMs = wasExpectingDirectUse ? 0 : 1000;
          const withinHotWindow =
            workingState.hotWindowEndMs !== null &&
            timestampMs <= workingState.hotWindowEndMs + gracePeriodMs;

          if (!withinHotWindow) {
            isDirectUse = true;
          } else {
            // We are within a HoT window!
            // For 'always' (Restoration Chips) or generic 'eotOnly', first heal is Direct, all subsequent in window are ticks.
            // For 'vivoS10', subsequent active heals inside window reset it.
            if (hotMode === 'vivoS10') {
              // The user specified "ticks are up to 20% of the main heal".
              // If the heal amount is > 25% of the baseline active heal, we confidently classify it as an active use.
              if (
                workingState.baseActiveHealAmount !== null &&
                amount > workingState.baseActiveHealAmount * 0.25
              ) {
                isDirectUse = true;
              } else {
                isDirectUse = false;
              }
            } else {
              // hotMode === 'always' or 'eotOnly' or 'refurbishedHeart'
              isDirectUse = false;
            }
          }
        }
      }

      healingEvents.push({
        timestamp,
        amount,
        isDirectUse,
      });

      if (isDirectUse) {
        workingState.baseActiveHealAmount = amount; // Lock in the baseline for tick calculation

        if (
          hotMode === 'always' ||
          ((hotMode === 'eotOnly' || hotMode === 'vivoS10') &&
            (wasExpectingDirectUse || workingState.hotWindowEndMs !== null))
        ) {
          // Always refresh window for restoration chips, or when an EOT starts a window for Vivo.
          // ALSO refresh if it was a direct use while an active eot window was already running!
          workingState.hotWindowEndMs = timestampMs + eotWindowMs;
          workingState.pendingDirectHealTimestampMs = timestampMs;
        } else {
          workingState.hotWindowEndMs = null;
          workingState.pendingDirectHealTimestampMs = null;
        }
      } else {
        // Ticks DO NOT refresh the timer!
        // The original logic here was wrong, passive ticks simply consume the duration.
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
