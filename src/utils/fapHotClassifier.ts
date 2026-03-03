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
}

export interface FapHotClassificationResult {
  healingEvents: ParsedHealingLine[];
  nextState: FapHotClassifierState;
}

const FAP_HOT_WINDOW_MS = 10_000;
const FAP_EOT_BIND_WINDOW_MS = 2_000;

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
  };
}

export function classifyFapHealingFromLogLines(
  content: string,
  state?: Partial<FapHotClassifierState>
): FapHotClassificationResult {
  const workingState = defaultState(state);
  const healingEvents: ParsedHealingLine[] = [];

  for (const line of content.split('\n')) {
    if (!line.trim()) {
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

      const withinHotWindow =
        workingState.hotWindowEndMs !== null && timestampMs <= workingState.hotWindowEndMs;

      const isSmallHeal =
        workingState.lastHealAmount !== null && amount < workingState.lastHealAmount * 1.5;

      const isDirectUse = !withinHotWindow || (withinHotWindow && !isSmallHeal);

      healingEvents.push({
        timestamp,
        amount,
        isDirectUse,
      });

      if (isDirectUse) {
        workingState.hotWindowEndMs = timestampMs + FAP_HOT_WINDOW_MS;
        workingState.pendingDirectHealTimestampMs = timestampMs;
      }

      workingState.lastHealTimestampMs = timestampMs;
      workingState.lastHealAmount = amount;
      continue;
    }

    const eotMatch = line.match(EOT_LINE_REGEX);
    if (eotMatch?.groups) {
      const eotTimestampMs = parseTimestampMs(eotMatch.groups.ts);
      if (eotTimestampMs === null) {
        continue;
      }

      if (workingState.pendingDirectHealTimestampMs !== null) {
        const gap = eotTimestampMs - workingState.pendingDirectHealTimestampMs;
        if (gap >= 0 && gap <= FAP_EOT_BIND_WINDOW_MS) {
          workingState.hotWindowEndMs =
            workingState.pendingDirectHealTimestampMs + FAP_HOT_WINDOW_MS;
        }

        if (gap > FAP_EOT_BIND_WINDOW_MS || gap >= 0) {
          workingState.pendingDirectHealTimestampMs = null;
        }
      }
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
