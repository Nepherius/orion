export interface TheoryKillEvent {
  killId: string;
  sessionId: string;
  timestamp: number;
  creature: string;
  maturity: string;
  cost: number;
  ttLoot: number;
  adjustedLoot: number;
  itemRows: number;
}

export interface TheorySessionReturn {
  sessionId: string;
  startTime: number;
  creature: string;
  totalCost: number;
  ttLoot: number;
  adjustedLoot: number;
  shrapnelTt: number;
  efficiency: number | null;
  dpp: number | null;
  loadoutName: string | null;
}

export interface ConvergenceMetrics {
  longTermReturn: number;
  totalKills: number;
  totalPed: number;
  points: Array<{ kills: number; ped: number; returnRate: number }>;
  thresholds: Array<{ threshold: number; kills: number | null; ped: number | null }>;
}

export interface BankrollRiskMetrics {
  simulations: number;
  horizon: number;
  medianMaxDrawdown: number;
  probability10: number;
  probability25: number;
  probability50: number;
  probabilityBelow100: number;
}

export interface MultiplierDistribution {
  creature: string;
  maturity: string;
  kills: number;
  mean: number;
  median: number;
  p10: number;
  p90: number;
  minimum: number;
  maximum: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function calculateConvergenceMetrics(
  events: TheoryKillEvent[],
  blockSize = 500
): ConvergenceMetrics | null {
  const valid = events
    .filter((event) => event.cost > 0 && event.ttLoot >= 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (valid.length === 0) return null;

  let cumulativeCost = 0;
  let cumulativeLoot = 0;
  const allPoints: Array<{ kills: number; ped: number; returnRate: number }> = [];

  valid.forEach((event, index) => {
    cumulativeCost += event.cost;
    cumulativeLoot += event.ttLoot;
    allPoints.push({
      kills: index + 1,
      ped: cumulativeCost,
      returnRate: cumulativeCost > 0 ? (cumulativeLoot / cumulativeCost) * 100 : 0,
    });
  });

  const longTermReturn = allPoints[allPoints.length - 1].returnRate;
  const suffixMaxDeviation = new Array<number>(allPoints.length);
  let maxDeviation = 0;
  for (let index = allPoints.length - 1; index >= 0; index -= 1) {
    maxDeviation = Math.max(maxDeviation, Math.abs(allPoints[index].returnRate - longTermReturn));
    suffixMaxDeviation[index] = maxDeviation;
  }

  const thresholds = [5, 3, 1].map((threshold) => {
    const index = suffixMaxDeviation.findIndex((deviation) => deviation <= threshold);
    return {
      threshold,
      kills: index >= 0 ? allPoints[index].kills : null,
      ped: index >= 0 ? allPoints[index].ped : null,
    };
  });

  const points = allPoints.filter(
    (point) => point.kills % blockSize === 0 || point.kills === allPoints.length
  );

  return {
    longTermReturn,
    totalKills: valid.length,
    totalPed: cumulativeCost,
    points,
    thresholds,
  };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export function calculateBankrollRisk(
  sessions: TheorySessionReturn[],
  simulations = 3000,
  horizon = 20,
  startingBankroll = 1000
): BankrollRiskMetrics | null {
  const observations = sessions
    .filter((session) => session.totalCost > 0 && session.ttLoot >= 0)
    .map((session) => ({
      cost: session.totalCost,
      multiplier: session.ttLoot / session.totalCost,
    }));
  if (observations.length < 5) return null;

  const random = seededRandom(0x0a7100);
  const drawdowns: number[] = [];
  let hit10 = 0;
  let hit25 = 0;
  let hit50 = 0;
  let below100 = 0;

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    let bankroll = startingBankroll;
    let peak = startingBankroll;
    let maximumDrawdown = 0;

    for (let run = 0; run < horizon && bankroll > 0; run += 1) {
      const observation = observations[Math.floor(random() * observations.length)];
      const cycled = Math.min(bankroll, observation.cost);
      bankroll += cycled * (observation.multiplier - 1);
      bankroll = Math.max(0, bankroll);
      peak = Math.max(peak, bankroll);
      maximumDrawdown = Math.max(maximumDrawdown, peak > 0 ? (peak - bankroll) / peak : 0);
    }

    drawdowns.push(maximumDrawdown * 100);
    if (maximumDrawdown >= 0.1) hit10 += 1;
    if (maximumDrawdown >= 0.25) hit25 += 1;
    if (maximumDrawdown >= 0.5) hit50 += 1;
    if (bankroll < 100) below100 += 1;
  }

  drawdowns.sort((a, b) => a - b);
  return {
    simulations,
    horizon,
    medianMaxDrawdown: percentile(drawdowns, 0.5),
    probability10: (hit10 / simulations) * 100,
    probability25: (hit25 / simulations) * 100,
    probability50: (hit50 / simulations) * 100,
    probabilityBelow100: (below100 / simulations) * 100,
  };
}

export function calculateMultiplierDistributions(
  events: TheoryKillEvent[],
  minimumKills = 30
): MultiplierDistribution[] {
  const grouped = new Map<string, { creature: string; maturity: string; values: number[] }>();

  for (const event of events) {
    if (event.cost <= 0 || event.ttLoot < 0) continue;
    const key = `${event.creature}\u0000${event.maturity}`;
    const group = grouped.get(key) ?? {
      creature: event.creature,
      maturity: event.maturity,
      values: [],
    };
    group.values.push(event.ttLoot / event.cost);
    grouped.set(key, group);
  }

  return Array.from(grouped.values())
    .filter((group) => group.values.length >= minimumKills)
    .map((group) => {
      const sorted = [...group.values].sort((a, b) => a - b);
      return {
        creature: group.creature,
        maturity: group.maturity,
        kills: sorted.length,
        mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
        median: percentile(sorted, 0.5),
        p10: percentile(sorted, 0.1),
        p90: percentile(sorted, 0.9),
        minimum: sorted[0],
        maximum: sorted[sorted.length - 1],
      };
    })
    .sort((a, b) => b.kills - a.kills);
}
