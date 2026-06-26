import type { CreatureEntry, HuntSession, Loadout } from '../types';
import { calculateDamageNeededToBeatRegen } from './creatureRegen';

export interface SessionAdvisorFactor {
  id: string;
  label: string;
  points: number;
  detail: string;
  formula?: string;
}

export interface SessionAdvisorMaturityBreakdown {
  maturity: string;
  hp: number;
  regenDps: number;
  regenRisk: 'known' | 'unknown-low' | 'unknown-medium' | 'unknown-high';
  weight: number;
  regenRatio?: number;
  canBeatRegen?: boolean;
}

export interface SessionAdvisorMetrics {
  creatureEntry?: CreatureEntry;
  creatureMatches: number;
  hpRange?: { min: number; median: number; max: number };
  effectiveDamage?: number;
  maxDamagePerShot?: number;
  planningDamagePerShot?: number;
  usesPerMinute?: number;
  effectiveDps?: number;
  advisorDpp?: number;
  regenDps: number;
  canBeatRegen?: boolean;
  estimatedKillSeconds?: number;
  estimatedShotsToKill?: number;
  estimatedCostPerKill?: number;
  theoreticalCostPerKill?: number;
  historicalCostPerKill?: number;
  historicalKillSamples: number;
  costEstimateSource: 'theoretical' | 'maturity-history';
  bankrollKills?: number;
  personalSessions: number;
  personalAdjustedReturnPercent?: number;
  personalTtReturnPercent?: number;
  personalReturnCv?: number;
  sameLoadoutSessions: number;
  sameLoadoutAdjustedReturnPercent?: number;
  sameLoadoutTtReturnPercent?: number;
  plannedMaturities: string[];
  scoredMaturities: string[];
  maturitySelectionMode: 'selected' | 'fallback';
  maturityAggregationMode: 'single' | 'median' | 'risk-weighted';
  maturityBreakdown: SessionAdvisorMaturityBreakdown[];
  failedRegenMaturities: string[];
  weakestRegenMaturity?: string;
  weakestRegenRatio?: number;
  overkillRatio?: number;
  overkillMaturity?: string;
  regenRisk: 'known' | 'unknown-low' | 'unknown-medium' | 'unknown-high';
  weaponMaxDamage?: number;
  amplifierMaxDamage?: number;
  usableAmplifierDamage?: number;
  wastedAmplifierDamage?: number;
}

export interface SessionAdvisorResult {
  score: number | null;
  label: string;
  summary: string;
  factors: SessionAdvisorFactor[];
  metrics: SessionAdvisorMetrics;
  assumptions: string[];
}

interface SessionAdvisorInput {
  loadout?: Loadout | null;
  creatureName: string;
  creatureEntries: CreatureEntry[];
  bankroll?: number | null;
  plannedMaturities?: string[];
  sessions: HuntSession[];
}

const BASE_SCORE = 0;
const SCORE_MAX = 100;
const HUNTABILITY_POINTS = 35;
const KILL_PACE_POINTS = 20;
const WEAPON_FIT_POINTS = 10;
const BANKROLL_POINTS = 20;
const AMPLIFIER_POINTS = 4;
const ARMOR_POINTS = 3;
const ECONOMY_POINTS = 3;
const PERSONAL_HISTORY_POINTS = 3;
const SAME_LOADOUT_HISTORY_POINTS = 2;
const MAXED_AVERAGE_HIT_RATIO = 0.75;
const MAXED_HIT_RATE = 0.9;
const FINISHING_SHOT_BUFFER = 0.75;
const MIN_HISTORY_KILLS_FOR_COST = 20;

export function parseOptionalBankroll(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalize = (value: string | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const baseCreatureName = (value: string | undefined): string =>
  normalize(value).replace(/\s*\([^)]*\)\s*$/u, '');

const formatNumber = (value: number, digits = 1): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatDps = (value: number): string => formatNumber(value, value > 0 && value < 0.01 ? 4 : 2);

const totalTtLoot = (session: HuntSession): number =>
  session.loot.reduce((sum, item) => sum + item.value * item.quantity, 0);

const totalAdjustedLoot = (session: HuntSession): number =>
  session.loot.reduce((sum, item) => sum + item.totalValue, 0);

const totalCost = (session: HuntSession): number =>
  session.ammoCost + session.weaponDecay + session.healingCost + session.otherCosts;

function totalItemDamage(item: Loadout['weapon'] | Loadout['amplifier']): number {
  return Object.values(item?.Properties?.Damage ?? {}).reduce<number>(
    (sum, value) => sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0),
    0
  );
}

function calculateCombatDamage(loadout?: Loadout | null): {
  maxDamagePerShot?: number;
  planningDamagePerShot?: number;
  weaponMaxDamage?: number;
  amplifierMaxDamage?: number;
  usableAmplifierDamage?: number;
  wastedAmplifierDamage?: number;
  advisorDpp?: number;
} {
  if (!loadout) return {};

  const weaponMaxDamage = totalItemDamage(loadout.weapon);
  const amplifierMaxDamage = totalItemDamage(loadout.amplifier);
  const hasItemDamage = weaponMaxDamage > 0 || amplifierMaxDamage > 0;
  const amplifierCap = weaponMaxDamage > 0 ? weaponMaxDamage * 0.5 : amplifierMaxDamage;
  const usableAmplifierDamage =
    amplifierMaxDamage > 0 ? Math.min(amplifierMaxDamage, amplifierCap) : 0;
  const wastedAmplifierDamage = Math.max(0, amplifierMaxDamage - usableAmplifierDamage);
  const maxDamagePerShot = hasItemDamage
    ? weaponMaxDamage + usableAmplifierDamage
    : loadout.totalDamage > 0
      ? loadout.totalDamage
      : undefined;
  const planningDamagePerShot = maxDamagePerShot
    ? maxDamagePerShot * MAXED_AVERAGE_HIT_RATIO * MAXED_HIT_RATE
    : loadout.effectiveDamage > 0
      ? loadout.effectiveDamage * MAXED_AVERAGE_HIT_RATIO
      : undefined;

  return {
    maxDamagePerShot,
    planningDamagePerShot,
    weaponMaxDamage: hasItemDamage ? weaponMaxDamage : undefined,
    amplifierMaxDamage: hasItemDamage ? amplifierMaxDamage : undefined,
    usableAmplifierDamage: hasItemDamage ? usableAmplifierDamage : undefined,
    wastedAmplifierDamage: hasItemDamage ? wastedAmplifierDamage : undefined,
    advisorDpp:
      maxDamagePerShot && loadout.costPerShot > 0 ? maxDamagePerShot / loadout.costPerShot : 0,
  };
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => {
      const diff = value - mean;
      return sum + diff * diff;
    }, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function matchesCreatureName(candidate: string | undefined, target: string): boolean {
  const candidateNormalized = normalize(candidate);
  const targetNormalized = normalize(target);
  if (!candidateNormalized || !targetNormalized) return false;

  return (
    candidateNormalized === targetNormalized ||
    baseCreatureName(candidate) === targetNormalized ||
    candidateNormalized === baseCreatureName(target)
  );
}

function findCreatureEntries(entries: CreatureEntry[], creatureName: string): CreatureEntry[] {
  const exact = entries.filter((entry) => matchesCreatureName(entry.name, creatureName));
  if (exact.length > 0) return exact;

  const target = normalize(creatureName);
  return entries.filter((entry) => normalize(`${entry.name} ${entry.maturity}`) === target);
}

function normalizeMaturity(value: string | undefined): string {
  return normalize(value);
}

function filterEntriesByMaturity(
  entries: CreatureEntry[],
  plannedMaturities: string[] = []
): CreatureEntry[] {
  const selectedMaturities = new Set(plannedMaturities.map(normalizeMaturity).filter(Boolean));
  if (selectedMaturities.size === 0) return [];
  return entries.filter((entry) => selectedMaturities.has(normalizeMaturity(entry.maturity)));
}

function hasKnownRegenData(entry: CreatureEntry): boolean {
  return (
    entry.regenAmount !== null &&
    entry.regenAmount !== undefined &&
    entry.regenInterval !== null &&
    entry.regenInterval !== undefined
  );
}

function regenRiskForEntry(entry: CreatureEntry): SessionAdvisorMaturityBreakdown['regenRisk'] {
  if (hasKnownRegenData(entry)) return 'known';
  if (entry.hp < 50) return 'unknown-low';
  if (entry.hp > 150) return 'unknown-high';
  return 'unknown-medium';
}

function worstRegenRisk(
  entries: SessionAdvisorMaturityBreakdown[]
): SessionAdvisorMaturityBreakdown['regenRisk'] {
  if (entries.some((entry) => entry.regenRisk === 'unknown-high')) return 'unknown-high';
  if (entries.some((entry) => entry.regenRisk === 'unknown-medium')) return 'unknown-medium';
  if (entries.some((entry) => entry.regenRisk === 'unknown-low')) return 'unknown-low';
  return 'known';
}

function weightedAverage(
  entries: CreatureEntry[],
  weights: number[],
  readValue: (entry: CreatureEntry) => number | null | undefined
): number | undefined {
  let weightedTotal = 0;
  let weightTotal = 0;

  entries.forEach((entry, index) => {
    const value = readValue(entry);
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    weightedTotal += value * weights[index];
    weightTotal += weights[index];
  });

  return weightTotal > 0 ? weightedTotal / weightTotal : undefined;
}

function chooseRepresentativeEntry(
  entries: CreatureEntry[],
  mode: 'median' | 'risk-weighted' = 'median'
): {
  selected?: CreatureEntry;
  hpRange?: { min: number; median: number; max: number };
  aggregationMode: 'single' | 'median' | 'risk-weighted';
} {
  const withHp = entries.filter((entry) => entry.hp > 0).sort((a, b) => a.hp - b.hp);
  if (withHp.length === 0) {
    return { selected: entries[0], aggregationMode: entries.length <= 1 ? 'single' : mode };
  }

  const medianEntry = withHp[Math.floor((withHp.length - 1) / 2)];
  const median = withHp[Math.floor((withHp.length - 1) / 2)].hp;
  const hpRange = {
    min: withHp[0].hp,
    median,
    max: withHp[withHp.length - 1].hp,
  };

  if (mode === 'risk-weighted' && withHp.length > 1) {
    const weights = withHp.map((_, index) => (index + 1) * (index + 1));
    const weightedHp = weightedAverage(withHp, weights, (entry) => entry.hp) ?? median;
    const weightedRegenDps =
      weightedAverage(withHp, weights, (entry) => calculateDamageNeededToBeatRegen(entry)) ?? 0;
    const weightedLevel = weightedAverage(withHp, weights, (entry) => entry.level);
    const weightedAttacksPerMinute = weightedAverage(
      withHp,
      weights,
      (entry) => entry.attacksPerMinute
    );

    return {
      selected: {
        ...withHp[withHp.length - 1],
        maturity: `Weighted (${withHp.length} selected)`,
        hp: weightedHp,
        regenInterval: weightedRegenDps > 0 ? 1 : null,
        regenAmount: weightedRegenDps > 0 ? weightedRegenDps : null,
        level: weightedLevel ?? null,
        attacksPerMinute: weightedAttacksPerMinute ?? null,
      },
      hpRange,
      aggregationMode: 'risk-weighted',
    };
  }

  return {
    selected: withHp.length === 1 ? withHp[0] : medianEntry,
    hpRange,
    aggregationMode: withHp.length === 1 ? 'single' : 'median',
  };
}

function weightedAverageFromBreakdown(
  breakdown: SessionAdvisorMaturityBreakdown[],
  readValue: (entry: SessionAdvisorMaturityBreakdown) => number | undefined
): number | undefined {
  let weightedTotal = 0;
  let weightTotal = 0;

  breakdown.forEach((entry) => {
    const value = readValue(entry);
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    weightedTotal += value * entry.weight;
    weightTotal += entry.weight;
  });

  return weightTotal > 0 ? weightedTotal / weightTotal : undefined;
}

function estimateHistoricalCostPerKill(
  sessions: HuntSession[],
  creatureName: string,
  maturityBreakdown: SessionAdvisorMaturityBreakdown[]
): {
  costPerKill?: number;
  samples: number;
  source: 'maturity-history';
} | null {
  const matchingCreatureKills = sessions
    .filter(
      (session) => session.status === 'completed' && matchesCreatureName(session.creature, creatureName)
    )
    .flatMap((session) =>
      session.kills.filter(
        (kill) => matchesCreatureName(kill.creatureName, creatureName) && kill.cost > 0
      )
    );

  if (matchingCreatureKills.length === 0) return null;

  const selectedMaturities = new Set(
    maturityBreakdown.map((entry) => normalizeMaturity(entry.maturity))
  );
  const matchingMaturityKills = matchingCreatureKills.filter(
    (kill) => kill.maturity && selectedMaturities.has(normalizeMaturity(kill.maturity))
  );

  if (matchingMaturityKills.length >= MIN_HISTORY_KILLS_FOR_COST) {
    const maturityAverages = new Map<string, { cost: number; count: number }>();
    matchingMaturityKills.forEach((kill) => {
      const maturity = normalizeMaturity(kill.maturity);
      const current = maturityAverages.get(maturity) ?? { cost: 0, count: 0 };
      current.cost += kill.cost;
      current.count += 1;
      maturityAverages.set(maturity, current);
    });

    const weightedCost = weightedAverageFromBreakdown(maturityBreakdown, (entry) => {
      const average = maturityAverages.get(normalizeMaturity(entry.maturity));
      return average && average.count > 0 ? average.cost / average.count : undefined;
    });

    if (weightedCost) {
      return {
        costPerKill: weightedCost,
        samples: matchingMaturityKills.length,
        source: 'maturity-history',
      };
    }
  }

  return null;
}

function scoreDpsAndRegen(metrics: SessionAdvisorMetrics): SessionAdvisorFactor {
  const {
    effectiveDps,
    regenDps,
    failedRegenMaturities,
    weakestRegenMaturity,
    weakestRegenRatio,
    maturityAggregationMode,
    regenRisk,
  } = metrics;
  if (!effectiveDps || effectiveDps <= 0) {
    return {
      id: 'dps-regen',
      label: 'DPS vs regen',
      points: 5,
      detail: 'Weapon speed is missing, so Orion cannot estimate DPS against regen.',
      formula: `5 / ${HUNTABILITY_POINTS}`,
    };
  }

  if (failedRegenMaturities.length > 0) {
    const shownMaturities = failedRegenMaturities.slice(0, 3).join(', ');
    const remaining = failedRegenMaturities.length > 3 ? '...' : '';
    return {
      id: 'dps-regen',
      label: 'DPS vs regen',
      points: 0,
      detail: `Estimated DPS does not beat listed regen for ${shownMaturities}${remaining}. This is a hard stop for the plan.`,
      formula:
        typeof weakestRegenRatio === 'number'
          ? `weakest regen ratio: ${weakestRegenMaturity} at ${formatNumber(weakestRegenRatio, 2)}x`
          : 'DPS must be greater than regen DPS',
    };
  }

  if (regenRisk === 'unknown-high') {
    return {
      id: 'dps-regen',
      label: 'DPS vs regen',
      points: 4,
      detail:
        'Regen values are missing for a selected maturity over 150 HP. Orion treats this as very high risk until regen data is known.',
      formula: `missing regen + HP > 150: 4 / ${HUNTABILITY_POINTS}`,
    };
  }

  if (regenRisk === 'unknown-medium') {
    return {
      id: 'dps-regen',
      label: 'DPS vs regen',
      points: 14,
      detail:
        'Regen values are missing for a selected maturity over 50 HP. Orion treats this as medium risk.',
      formula: `missing regen + HP >= 50: 14 / ${HUNTABILITY_POINTS}`,
    };
  }

  if (regenDps <= 0) {
    if (regenRisk === 'unknown-low') {
      return {
        id: 'dps-regen',
        label: 'DPS vs regen',
        points: 28,
        detail:
          'Regen values are missing, but the selected maturity is under 50 HP, so Orion treats regen as insignificant.',
        formula: `missing regen + HP < 50: 28 / ${HUNTABILITY_POINTS}`,
      };
    }

    return {
      id: 'dps-regen',
      label: 'DPS vs regen',
      points: HUNTABILITY_POINTS,
      detail: `No regen is listed for the scored maturity. Estimated DPS is ${formatNumber(effectiveDps)}.`,
      formula: `${HUNTABILITY_POINTS} / ${HUNTABILITY_POINTS}`,
    };
  }

  const ratio = weakestRegenRatio ?? effectiveDps / regenDps;
  let points = 0;
  if (ratio >= 10) points = HUNTABILITY_POINTS;
  else if (ratio >= 5) points = 31;
  else if (ratio >= 3) points = 25;
  else if (ratio >= 1.5) points = 18;
  else if (ratio > 1) points = 8;

  return {
    id: 'dps-regen',
    label: 'DPS vs regen',
    points,
    detail:
      maturityAggregationMode === 'risk-weighted'
        ? `Estimated DPS is ${formatNumber(effectiveDps)} against ${formatDps(regenDps)} risk-weighted regen DPS. Worst selected maturity is ${weakestRegenMaturity ?? 'N/A'}.`
        : `Estimated DPS is ${formatNumber(effectiveDps)} against ${formatDps(regenDps)} regen DPS.`,
    formula: `${formatNumber(effectiveDps)} / ${formatDps(regenDps)} = ${formatNumber(ratio)}x; ${points} / ${HUNTABILITY_POINTS}`,
  };
}

function scoreKillPace(metrics: SessionAdvisorMetrics): SessionAdvisorFactor {
  const { estimatedKillSeconds, estimatedShotsToKill, canBeatRegen, regenRisk } = metrics;

  if (canBeatRegen === false) {
    return {
      id: 'kill-pace',
      label: 'Kill pace',
      points: 0,
      detail:
        'At least one scored maturity cannot be beaten after regen, so this plan cannot produce a stable kill-time estimate.',
      formula: `DPS must be greater than regen DPS; 0 / ${KILL_PACE_POINTS}`,
    };
  }

  if (!estimatedShotsToKill || estimatedShotsToKill <= 0) {
    return {
      id: 'kill-pace',
      label: 'Kill pace',
      points: 4,
      detail: 'Missing damage or HP data, so kill pace cannot be estimated.',
      formula: `4 / ${KILL_PACE_POINTS}`,
    };
  }

  if (!estimatedKillSeconds) {
    const points = estimatedShotsToKill <= 5 ? 12 : estimatedShotsToKill <= 15 ? 8 : 3;
    return {
      id: 'kill-pace',
      label: 'Kill pace',
      points,
      detail: `Estimated ${formatNumber(estimatedShotsToKill)} shots per kill. Weapon speed is missing, so time-to-kill is not scored directly.`,
      formula: `HP / effective damage per shot; ${points} / ${KILL_PACE_POINTS}`,
    };
  }

  let secondsPoints = 0;
  if (estimatedKillSeconds <= 5) secondsPoints = 12;
  else if (estimatedKillSeconds <= 10) secondsPoints = 9;
  else if (estimatedKillSeconds <= 20) secondsPoints = 5;
  else if (estimatedKillSeconds <= 30) secondsPoints = 2;

  let shotPoints = 0;
  if (estimatedShotsToKill <= 5) shotPoints = 8;
  else if (estimatedShotsToKill <= 10) shotPoints = 6;
  else if (estimatedShotsToKill <= 20) shotPoints = 3;
  else if (estimatedShotsToKill <= 35) shotPoints = 1;

  const points = secondsPoints + shotPoints;
  const regenQualifier =
    regenRisk === 'known'
      ? ''
      : ' Regen is unknown, so this is a raw pace estimate before the regen-risk penalty.';

  return {
    id: 'kill-pace',
    label: 'Kill pace',
    points,
    detail: `Estimated kill time is ${formatNumber(estimatedKillSeconds)}s over about ${formatNumber(estimatedShotsToKill)} shots.${regenQualifier}`,
    formula:
      regenRisk === 'known'
        ? `HP / (DPS - regen DPS); ${points} / ${KILL_PACE_POINTS}`
        : `HP / DPS before regen risk; ${points} / ${KILL_PACE_POINTS}`,
  };
}

function scoreDamageToHpFit(metrics: SessionAdvisorMetrics): SessionAdvisorFactor {
  const { maxDamagePerShot, planningDamagePerShot, overkillRatio, overkillMaturity, creatureEntry } =
    metrics;

  if (!maxDamagePerShot || !planningDamagePerShot || !creatureEntry?.hp || !overkillRatio) {
    return {
      id: 'damage-hp-fit',
      label: 'Weapon size',
      points: 3,
      detail: 'Missing weapon damage or maturity HP data, so damage fit cannot be estimated.',
      formula: `3 / ${WEAPON_FIT_POINTS}`,
    };
  }

  let points = 4;
  let detail = `Planning damage is ${formatNumber(planningDamagePerShot)} per shot against ${formatNumber(creatureEntry.hp, 0)} scored HP.`;

  if (overkillRatio >= 4) {
    points = 0;
    detail = `Severe overkill risk: max damage is ${formatNumber(overkillRatio, 1)}x the HP of ${overkillMaturity ?? 'a selected maturity'}.`;
  } else if (overkillRatio >= 2.5) {
    points = 1;
    detail = `High overkill risk: max damage is ${formatNumber(overkillRatio, 1)}x the HP of ${overkillMaturity ?? 'a selected maturity'}.`;
  } else if (overkillRatio >= 1.25) {
    points = 3;
    detail = `One-shot or near one-shot kills create meaningful overkill risk on ${overkillMaturity ?? 'the scored maturity'}.`;
  } else if (overkillRatio >= 0.25) {
    points = WEAPON_FIT_POINTS;
    detail = `Damage per shot is well matched to the scored HP without obvious overkill.`;
  } else if (overkillRatio >= 0.12) {
    points = 7;
    detail = `Damage per shot is conservative for the scored HP; kill time carries the remaining risk.`;
  }

  return {
    id: 'damage-hp-fit',
    label: 'Weapon size',
    points,
    detail,
    formula: `${formatNumber(maxDamagePerShot)} max damage / ${formatNumber(creatureEntry.hp, 0)} HP = ${formatNumber(maxDamagePerShot / creatureEntry.hp, 2)}x scored HP; ${points} / ${WEAPON_FIT_POINTS}`,
  };
}

function scoreAmplifierFit(loadout: Loadout, metrics: SessionAdvisorMetrics): SessionAdvisorFactor {
  const { amplifierMaxDamage, usableAmplifierDamage, wastedAmplifierDamage, weaponMaxDamage } =
    metrics;

  if (!loadout.amplifier || !amplifierMaxDamage || amplifierMaxDamage <= 0) {
    return {
      id: 'amplifier-fit',
      label: 'Amplifier fit',
      points: AMPLIFIER_POINTS,
      detail: 'No amplifier damage is selected, so overamping is not scored.',
      formula: `${AMPLIFIER_POINTS} / ${AMPLIFIER_POINTS}`,
    };
  }

  if (!weaponMaxDamage || weaponMaxDamage <= 0) {
    return {
      id: 'amplifier-fit',
      label: 'Amplifier fit',
      points: 1,
      detail: 'Amplifier damage is present but weapon damage is missing, so Orion cannot verify the amp fit.',
      formula: `1 / ${AMPLIFIER_POINTS}`,
    };
  }

  const cap = weaponMaxDamage * 0.5;
  const wastedRatio =
    wastedAmplifierDamage && amplifierMaxDamage > 0 ? wastedAmplifierDamage / amplifierMaxDamage : 0;

  if (wastedAmplifierDamage && wastedAmplifierDamage > 0) {
    let points = 2;
    if (wastedRatio >= 0.5) points = 0;
    else if (wastedRatio >= 0.25) points = 1;

    return {
      id: 'amplifier-fit',
      label: 'Amplifier fit',
      points,
      detail: `${formatNumber(wastedAmplifierDamage)} of ${formatNumber(amplifierMaxDamage)} amp damage is above the 50% weapon-damage cap.`,
      formula: `weapon ${formatNumber(weaponMaxDamage)} damage, amp cap ${formatNumber(cap)}, usable amp ${formatNumber(usableAmplifierDamage ?? 0)}; ${points} / ${AMPLIFIER_POINTS}`,
    };
  }

  return {
    id: 'amplifier-fit',
    label: 'Amplifier fit',
    points: AMPLIFIER_POINTS,
    detail: `Amplifier damage fits within the 50% weapon-damage cap.`,
    formula: `weapon ${formatNumber(weaponMaxDamage)} damage, amp cap ${formatNumber(cap)}, amp ${formatNumber(amplifierMaxDamage)}; ${AMPLIFIER_POINTS} / ${AMPLIFIER_POINTS}`,
  };
}

function scoreArmor(loadout: Loadout): SessionAdvisorFactor {
  const armor = loadout.armor?.trim();

  if (armor) {
    return {
      id: 'armor',
      label: 'Armor drag',
      points: 1,
      detail: `${armor} is selected. Orion treats armor as extra defensive decay risk before the hunt proves otherwise.`,
      formula: `armor selected: 1 / ${ARMOR_POINTS}`,
    };
  }

  return {
    id: 'armor',
    label: 'Armor drag',
    points: ARMOR_POINTS,
    detail:
      'No armor is selected. This avoids armor decay if the player can safely survive the mob.',
    formula: `no armor: ${ARMOR_POINTS} / ${ARMOR_POINTS}`,
  };
}

function scoreBankroll(
  metrics: SessionAdvisorMetrics,
  bankroll?: number | null
): SessionAdvisorFactor {
  if (!bankroll || bankroll <= 0) {
    return {
      id: 'bankroll',
      label: 'Bankroll depth',
      points: 10,
      detail: 'Optional bankroll was not entered, so Orion applies a neutral bankroll score.',
      formula: `not entered: 10 / ${BANKROLL_POINTS}`,
    };
  }

  const { estimatedCostPerKill } = metrics;
  if (!estimatedCostPerKill || estimatedCostPerKill <= 0) {
    return {
      id: 'bankroll',
      label: 'Bankroll depth',
      points: 5,
      detail: 'Bankroll was entered, but estimated cost per kill is unavailable.',
      formula: `5 / ${BANKROLL_POINTS}`,
    };
  }

  const kills = bankroll / estimatedCostPerKill;
  let points = 3;
  if (kills >= 1000) points = BANKROLL_POINTS;
  else if (kills >= 500) points = 17;
  else if (kills >= 100) points = 12;
  else if (kills >= 50) points = 7;
  const source =
    metrics.costEstimateSource === 'maturity-history'
      ? `${metrics.historicalKillSamples} matching maturity kills`
      : 'combat-adjusted theory';

  return {
    id: 'bankroll',
    label: 'Bankroll depth',
    points,
    detail: `${formatNumber(bankroll, 0)} PED covers about ${formatNumber(kills, 0)} estimated kills using ${source}.`,
    formula: `Run depth: <50 fragile, 50-99 thin, 100-499 workable, 500-999 strong, 1000+ deep; ${points} / ${BANKROLL_POINTS}`,
  };
}

function scoreEconomy(loadout: Loadout, metrics: SessionAdvisorMetrics): SessionAdvisorFactor {
  const dpp = metrics.advisorDpp || loadout.dpp || 0;
  const efficiency = loadout.efficiency || 0;

  let dppPoints = 0;
  if (dpp >= 3) dppPoints = 2;
  else if (dpp >= 2.85) dppPoints = 1.5;
  else if (dpp >= 2.6) dppPoints = 1;

  let efficiencyPoints = 0;
  if (efficiency >= 65) efficiencyPoints = 1;
  else if (efficiency >= 55) efficiencyPoints = 0.75;
  else if (efficiency >= 45) efficiencyPoints = 0.5;

  const points = clamp(dppPoints + efficiencyPoints, 0, ECONOMY_POINTS);

  return {
    id: 'economy',
    label: 'Economy',
    points,
    detail: `DPP ${formatNumber(dpp, 2)} and efficiency ${formatNumber(efficiency)}%.`,
    formula: `DPP uses overamp-capped damage. DPP ${formatNumber(dppPoints, 1)} / 2, efficiency ${formatNumber(efficiencyPoints, 1)} / 1; ${formatNumber(points, 1)} / ${ECONOMY_POINTS}`,
  };
}

function scorePersonalHistory(
  sessions: HuntSession[],
  creatureName: string
): { factor: SessionAdvisorFactor; metrics: Partial<SessionAdvisorMetrics> } {
  const matching = sessions.filter(
    (session) =>
      session.status === 'completed' &&
      matchesCreatureName(session.creature, creatureName) &&
      totalCost(session) > 0
  );

  if (matching.length === 0) {
    return {
      factor: {
        id: 'history',
        label: 'Personal history',
        points: 2,
        detail: 'No completed Orion sessions for this creature yet, so Orion applies a mostly neutral history score.',
        formula: `no creature history: 2 / ${PERSONAL_HISTORY_POINTS}`,
      },
      metrics: { personalSessions: 0 },
    };
  }

  const cost = matching.reduce((sum, session) => sum + totalCost(session), 0);
  const ttLoot = matching.reduce((sum, session) => sum + totalTtLoot(session), 0);
  const adjustedLoot = matching.reduce((sum, session) => sum + totalAdjustedLoot(session), 0);
  const adjustedReturn = cost > 0 ? (adjustedLoot / cost) * 100 : 0;
  const ttReturn = cost > 0 ? (ttLoot / cost) * 100 : 0;
  const sessionReturns = matching.map(
    (session) => (totalAdjustedLoot(session) / totalCost(session)) * 100
  );
  const meanReturn =
    sessionReturns.reduce((sum, value) => sum + value, 0) / Math.max(1, sessionReturns.length);
  const cv = meanReturn > 0 ? standardDeviation(sessionReturns) / meanReturn : 0;

  const neutralPoints = 2;
  const confidenceMultiplier = matching.length >= 3 ? 1 : 0.5;
  let returnPoints = 0;
  if (adjustedReturn >= 100) returnPoints = PERSONAL_HISTORY_POINTS;
  else if (adjustedReturn >= 95) returnPoints = 2.5;
  else if (adjustedReturn >= 90) returnPoints = 2;
  else if (adjustedReturn >= 80) returnPoints = 1;

  let volatilityPoints = 0;
  if (matching.length >= 3 && cv <= 0.12) volatilityPoints = 0.25;
  else if (matching.length >= 3 && cv > 0.35) volatilityPoints = -0.75;
  else if (matching.length >= 3 && cv > 0.25) volatilityPoints = -0.5;
  const evidencePoints = clamp(returnPoints + volatilityPoints, 0, PERSONAL_HISTORY_POINTS);
  const scoredPoints = Number(
    (neutralPoints + (evidencePoints - neutralPoints) * confidenceMultiplier).toFixed(1)
  );

  return {
    factor: {
      id: 'history',
      label: 'Personal history',
      points: scoredPoints,
      detail: `${matching.length} matching sessions: adjusted return ${formatNumber(adjustedReturn, 2)}%, TT return ${formatNumber(ttReturn, 2)}%.`,
      formula:
        matching.length >= 3
          ? `100%+ perfect, 95%+ good, <80% very bad; ${formatNumber(scoredPoints, 1)} / ${PERSONAL_HISTORY_POINTS}`
          : `low sample confidence blends ${formatNumber(evidencePoints, 1)} toward neutral ${neutralPoints}; ${formatNumber(scoredPoints, 1)} / ${PERSONAL_HISTORY_POINTS}`,
    },
    metrics: {
      personalSessions: matching.length,
      personalAdjustedReturnPercent: adjustedReturn,
      personalTtReturnPercent: ttReturn,
      personalReturnCv: cv,
    },
  };
}

function matchesLoadout(session: HuntSession, loadout: Loadout): boolean {
  return (
    (!!session.loadoutId && session.loadoutId === loadout.id) ||
    (!!session.loadoutNameSnapshot &&
      normalize(session.loadoutNameSnapshot) === normalize(loadout.name))
  );
}

function scoreSameLoadoutHistory(
  sessions: HuntSession[],
  creatureName: string,
  loadout: Loadout
): { factor: SessionAdvisorFactor; metrics: Partial<SessionAdvisorMetrics> } {
  const matching = sessions.filter(
    (session) =>
      session.status === 'completed' &&
      matchesCreatureName(session.creature, creatureName) &&
      matchesLoadout(session, loadout) &&
      totalCost(session) > 0
  );

  if (matching.length === 0) {
    return {
      factor: {
        id: 'same-loadout-history',
        label: 'Same loadout history',
        points: 1,
        detail: 'No completed sessions found for this creature with this exact loadout, so Orion applies a neutral loadout-history score.',
        formula: `no exact loadout history: 1 / ${SAME_LOADOUT_HISTORY_POINTS}`,
      },
      metrics: { sameLoadoutSessions: 0 },
    };
  }

  const cost = matching.reduce((sum, session) => sum + totalCost(session), 0);
  const ttLoot = matching.reduce((sum, session) => sum + totalTtLoot(session), 0);
  const adjustedLoot = matching.reduce((sum, session) => sum + totalAdjustedLoot(session), 0);
  const adjustedReturn = cost > 0 ? (adjustedLoot / cost) * 100 : 0;
  const ttReturn = cost > 0 ? (ttLoot / cost) * 100 : 0;
  const neutralPoints = 1;
  const confidenceMultiplier = matching.length >= 3 ? 1 : 0.5;

  let evidencePoints = 0;
  if (adjustedReturn >= 100) evidencePoints = SAME_LOADOUT_HISTORY_POINTS;
  else if (adjustedReturn >= 95) evidencePoints = 1.5;
  else if (adjustedReturn >= 90) evidencePoints = 1;
  else if (adjustedReturn >= 80) evidencePoints = 0.5;
  const points = Number(
    (neutralPoints + (evidencePoints - neutralPoints) * confidenceMultiplier).toFixed(1)
  );

  return {
    factor: {
      id: 'same-loadout-history',
      label: 'Same loadout history',
      points,
      detail: `${matching.length} matching loadout session${matching.length === 1 ? '' : 's'}: adjusted return ${formatNumber(adjustedReturn, 2)}%, TT return ${formatNumber(ttReturn, 2)}%.`,
      formula:
        matching.length >= 3
          ? `100%+ perfect, 95%+ good, <80% very bad; ${formatNumber(points, 1)} / ${SAME_LOADOUT_HISTORY_POINTS}`
          : `low sample confidence blends ${formatNumber(evidencePoints, 1)} toward neutral ${neutralPoints}; ${formatNumber(points, 1)} / ${SAME_LOADOUT_HISTORY_POINTS}`,
    },
    metrics: {
      sameLoadoutSessions: matching.length,
      sameLoadoutAdjustedReturnPercent: adjustedReturn,
      sameLoadoutTtReturnPercent: ttReturn,
    },
  };
}

function scoreMobPressure(metrics: SessionAdvisorMetrics): SessionAdvisorFactor {
  const level = metrics.creatureEntry?.level;
  const attacksPerMinute = metrics.creatureEntry?.attacksPerMinute;

  const parts: string[] = [];

  if (typeof level === 'number') {
    parts.push(`level ${formatNumber(level, 0)}`);
  }

  if (typeof attacksPerMinute === 'number') {
    parts.push(`${formatNumber(attacksPerMinute, 0)} attacks/min`);
  }

  return {
    id: 'mob-pressure',
    label: 'Mob pressure',
    points: 0,
    detail:
      parts.length > 0
        ? `Representative maturity has ${parts.join(' and ')}. Orion shows this as context because player HP and protection match are assumptions.`
        : 'No level or attack-rate data is available for this representative maturity.',
    formula: 'context only: 0 score points',
  };
}

function scoreMaturityConfidence(metrics: SessionAdvisorMetrics): SessionAdvisorFactor {
  const {
    creatureMatches,
    hpRange,
    maturitySelectionMode,
    scoredMaturities,
    maturityAggregationMode,
  } = metrics;
  if (maturitySelectionMode === 'selected') {
    return {
      id: 'data-confidence',
      label: 'Maturity confidence',
      points: 0,
      detail:
        maturityAggregationMode === 'risk-weighted'
          ? `Scoring uses a risk-weighted average of the selected maturities: ${scoredMaturities.join(', ')}. Higher HP maturities carry more weight.`
          : `Scoring uses the selected maturity: ${scoredMaturities.join(', ')}.`,
      formula:
        maturityAggregationMode === 'risk-weighted'
          ? 'selected maturities, HP-rank weighted; context only'
          : 'selected maturity; context only',
    };
  }

  if (creatureMatches <= 1 || !hpRange || hpRange.min <= 0) {
    return {
      id: 'data-confidence',
      label: 'Maturity confidence',
      points: 0,
      detail: 'Single or incomplete maturity data; no confidence adjustment applied.',
      formula: 'context only: 0 score points',
    };
  }

  const spread = hpRange.max / hpRange.min;
  if (spread >= 3) {
    return {
      id: 'data-confidence',
      label: 'Maturity confidence',
      points: 0,
      detail: `No expected maturities were selected. This creature has a wide HP range (${formatNumber(hpRange.min, 0)}-${formatNumber(hpRange.max, 0)} HP), so the median fallback may be misleading.`,
      formula: `HP spread ${formatNumber(spread)}x; context only`,
    };
  }

  return {
    id: 'data-confidence',
    label: 'Maturity confidence',
    points: 0,
    detail: `HP range is fairly tight for this creature (${formatNumber(hpRange.min, 0)}-${formatNumber(hpRange.max, 0)} HP).`,
    formula: `HP spread ${formatNumber(spread)}x; context only`,
  };
}

function labelForScore(score: number): { label: string; summary: string } {
  if (score >= 80) return { label: 'Strong fit', summary: 'This plan looks well matched.' };
  if (score >= 65) return { label: 'Good fit', summary: 'This plan looks workable.' };
  if (score >= 45) return { label: 'Caution', summary: 'This plan has visible tradeoffs.' };
  return { label: 'Risky', summary: 'This plan has several warning signs.' };
}

function advisorGate(
  metrics: SessionAdvisorMetrics,
  rawScore: number,
  loadout: Loadout
): SessionAdvisorFactor | null {
  let maxScore: number | null = null;
  let detail = '';
  let formula = '';
  let label = 'Huntability gate';

  if (metrics.failedRegenMaturities.length > 0) {
    maxScore = 34;
    detail =
      'Huntability gate: at least one selected maturity cannot be beaten after regen, so the advisor stays red.';
    formula = 'known regen failure caps score at 34';
  } else if (metrics.regenRisk === 'unknown-high') {
    maxScore = 44;
    detail =
      'Huntability gate: regen data is missing for a selected maturity over 150 HP, so the advisor cannot rate this above risky/caution.';
    formula = 'unknown high-HP regen caps score at 44';
  } else if (metrics.regenRisk === 'unknown-medium') {
    maxScore = 64;
    detail =
      'Huntability gate: regen data is missing for a selected maturity over 50 HP, so the advisor cannot rate this as a good fit.';
    formula = 'unknown medium-HP regen caps score at 64';
  } else if (
    (metrics.estimatedKillSeconds !== undefined && metrics.estimatedKillSeconds >= 30) ||
    (metrics.estimatedShotsToKill !== undefined && metrics.estimatedShotsToKill >= 30)
  ) {
    label = 'Kill pace gate';
    maxScore = 44;
    detail =
      'Huntability gate: this setup kills too slowly for the selected maturity, so the advisor stays red even if regen is mathematically beaten.';
    formula = '30s+ or 30+ shots per kill caps score at 44';
  } else if (
    (metrics.estimatedKillSeconds !== undefined && metrics.estimatedKillSeconds >= 20) ||
    (metrics.estimatedShotsToKill !== undefined && metrics.estimatedShotsToKill >= 20)
  ) {
    label = 'Kill pace gate';
    maxScore = 64;
    detail =
      'Huntability gate: kill pace is slow enough that the plan cannot rate as a good fit.';
    formula = '20s+ or 20+ shots per kill caps score at 64';
  } else if (metrics.bankrollKills !== undefined && metrics.bankrollKills < 50) {
    label = 'Bankroll gate';
    maxScore = 54;
    detail =
      'Bankroll gate: the entered bankroll covers fewer than 50 estimated kills, so the advisor treats the plan as a caution even when the combat fit is strong.';
    formula = '<50 estimated kills caps score at 54';
  } else if (metrics.bankrollKills !== undefined && metrics.bankrollKills < 100) {
    label = 'Bankroll gate';
    maxScore = 64;
    detail =
      'Bankroll gate: the entered bankroll covers fewer than 100 estimated kills, so the advisor cannot rate this as a good fit.';
    formula = '50-99 estimated kills caps score at 64';
  } else if (metrics.overkillRatio !== undefined && metrics.overkillRatio >= 4) {
    label = 'Overkill gate';
    maxScore = 64;
    detail =
      'Combat-fit gate: severe overkill means this setup cannot rate as a good fit for the selected maturity.';
    formula = 'max damage >= 4x selected maturity HP caps score at 64';
  } else if (metrics.overkillRatio !== undefined && metrics.overkillRatio >= 2.5) {
    label = 'Overkill gate';
    maxScore = 72;
    detail =
      'Combat-fit gate: high overkill limits the score even if the weapon can kill the creature quickly.';
    formula = 'max damage >= 2.5x selected maturity HP caps score at 72';
  } else if (loadout.armor?.trim()) {
    label = 'Armor ceiling';
    maxScore = 96;
    detail =
      'Armor is selected, so Orion leaves room for defensive decay risk unless session history proves it is worth it.';
    formula = 'armor selected caps score at 96';
  }

  if (maxScore === null || rawScore <= maxScore) return null;

  return {
    id: 'huntability-gate',
    label,
    points: maxScore - rawScore,
    detail,
    formula,
  };
}

export function calculateSessionAdvisor({
  loadout,
  creatureName,
  creatureEntries,
  bankroll,
  plannedMaturities = [],
  sessions,
}: SessionAdvisorInput): SessionAdvisorResult {
  const matches = findCreatureEntries(creatureEntries, creatureName);
  const selectedMatches = filterEntriesByMaturity(matches, plannedMaturities);
  const entriesForScoring = selectedMatches.length > 0 ? selectedMatches : matches;
  const maturitySelectionMode = selectedMatches.length > 0 ? 'selected' : 'fallback';
  const { selected, hpRange, aggregationMode: maturityAggregationMode } = chooseRepresentativeEntry(
    entriesForScoring,
    maturitySelectionMode === 'selected' ? 'risk-weighted' : 'median'
  );
  const usesPerMinute =
    typeof loadout?.weapon?.Properties?.UsesPerMinute === 'number'
      ? loadout.weapon.Properties.UsesPerMinute
      : undefined;
  const combatDamage = calculateCombatDamage(loadout);
  const effectiveDamage = combatDamage.planningDamagePerShot;
  const effectiveDps =
    effectiveDamage && usesPerMinute ? (effectiveDamage * usesPerMinute) / 60 : undefined;
  const regenDps = selected ? calculateDamageNeededToBeatRegen(selected) : 0;
  const entriesForRisk =
    selectedMatches.length > 0 ? selectedMatches : selected ? [selected] : [];
  const riskEntriesWithHp = entriesForRisk
    .filter((entry) => entry.hp > 0)
    .sort((a, b) => a.hp - b.hp);
  const riskWeights = riskEntriesWithHp.map((_, index) =>
    maturitySelectionMode === 'selected' && riskEntriesWithHp.length > 1
      ? (index + 1) * (index + 1)
      : 1
  );
  const riskWeightTotal = riskWeights.reduce((sum, weight) => sum + weight, 0) || 1;
  const maturityBreakdown: SessionAdvisorMaturityBreakdown[] = riskEntriesWithHp.map(
    (entry, index) => {
      const entryRegenDps = calculateDamageNeededToBeatRegen(entry);
      const regenRisk = regenRiskForEntry(entry);
      const regenRatio =
        effectiveDps && entryRegenDps > 0 && regenRisk === 'known'
          ? effectiveDps / entryRegenDps
          : undefined;
      return {
        maturity: entry.maturity,
        hp: entry.hp,
        regenDps: entryRegenDps,
        regenRisk,
        weight: riskWeights[index] / riskWeightTotal,
        regenRatio,
        canBeatRegen:
          effectiveDps !== undefined
            ? regenRisk === 'unknown-medium' || regenRisk === 'unknown-high'
              ? undefined
              : entryRegenDps <= 0 || effectiveDps > entryRegenDps
            : undefined,
      };
    }
  );
  const regenRisk = worstRegenRisk(maturityBreakdown);
  const failedRegenMaturities = maturityBreakdown
    .filter((entry) => entry.canBeatRegen === false)
    .map((entry) => entry.maturity);
  const weakestRegenEntry = maturityBreakdown
    .filter((entry) => typeof entry.regenRatio === 'number')
    .sort(
      (a, b) =>
        (a.regenRatio ?? Number.POSITIVE_INFINITY) -
        (b.regenRatio ?? Number.POSITIVE_INFINITY)
    )[0];
  const overkillEntry =
    combatDamage.maxDamagePerShot && riskEntriesWithHp.length > 0
      ? riskEntriesWithHp
          .map((entry) => ({
            maturity: entry.maturity,
            ratio: combatDamage.maxDamagePerShot! / entry.hp,
          }))
          .sort((a, b) => b.ratio - a.ratio)[0]
      : undefined;
  const netDps = effectiveDps !== undefined ? effectiveDps - regenDps : undefined;
  const canBeatRegen =
    failedRegenMaturities.length > 0
      ? false
      : regenRisk === 'unknown-medium' || regenRisk === 'unknown-high'
        ? undefined
        : effectiveDps !== undefined
          ? regenDps <= 0 || effectiveDps > regenDps
          : undefined;
  const dpsForKillEstimate =
    canBeatRegen === false
      ? undefined
      : regenRisk === 'known'
        ? netDps
        : effectiveDps;
  const estimatedKillSeconds =
    selected && dpsForKillEstimate !== undefined && dpsForKillEstimate > 0
      ? selected.hp / dpsForKillEstimate
        : undefined;
  const estimatedShotsToKill =
    selected && effectiveDamage && canBeatRegen !== false
      ? estimatedKillSeconds && usesPerMinute
        ? (estimatedKillSeconds * usesPerMinute) / 60 + FINISHING_SHOT_BUFFER
        : selected.hp / effectiveDamage + FINISHING_SHOT_BUFFER
      : undefined;
  const theoreticalCostPerKill =
    estimatedShotsToKill && loadout?.costPerShot
      ? estimatedShotsToKill * loadout.costPerShot
      : undefined;
  const historicalCostEstimate = estimateHistoricalCostPerKill(
    sessions,
    creatureName,
    maturityBreakdown
  );
  const estimatedCostPerKill =
    historicalCostEstimate?.costPerKill && historicalCostEstimate.samples >= MIN_HISTORY_KILLS_FOR_COST
      ? historicalCostEstimate.costPerKill
      : theoreticalCostPerKill;

  const metrics: SessionAdvisorMetrics = {
    creatureEntry: selected,
    creatureMatches: matches.length,
    hpRange,
    effectiveDamage,
    maxDamagePerShot: combatDamage.maxDamagePerShot,
    planningDamagePerShot: combatDamage.planningDamagePerShot,
    usesPerMinute,
    effectiveDps,
    advisorDpp: combatDamage.advisorDpp,
    regenDps,
    canBeatRegen,
    estimatedKillSeconds,
    estimatedShotsToKill,
    estimatedCostPerKill,
    theoreticalCostPerKill,
    historicalCostPerKill: historicalCostEstimate?.costPerKill,
    historicalKillSamples: historicalCostEstimate?.samples ?? 0,
    costEstimateSource:
      historicalCostEstimate?.costPerKill &&
      historicalCostEstimate.samples >= MIN_HISTORY_KILLS_FOR_COST
        ? historicalCostEstimate.source
        : 'theoretical',
    bankrollKills:
      bankroll && estimatedCostPerKill && estimatedCostPerKill > 0
        ? bankroll / estimatedCostPerKill
        : undefined,
    personalSessions: 0,
    sameLoadoutSessions: 0,
    plannedMaturities,
    scoredMaturities:
      selectedMatches.length > 0
        ? selectedMatches.map((entry) => entry.maturity)
        : selected
          ? [selected.maturity]
          : [],
    maturitySelectionMode,
    maturityAggregationMode,
    maturityBreakdown,
    failedRegenMaturities,
    weakestRegenMaturity: weakestRegenEntry?.maturity,
    weakestRegenRatio: weakestRegenEntry?.regenRatio,
    overkillRatio: overkillEntry?.ratio,
    overkillMaturity: overkillEntry?.maturity,
    regenRisk,
    weaponMaxDamage: combatDamage.weaponMaxDamage,
    amplifierMaxDamage: combatDamage.amplifierMaxDamage,
    usableAmplifierDamage: combatDamage.usableAmplifierDamage,
    wastedAmplifierDamage: combatDamage.wastedAmplifierDamage,
  };

  if (!loadout || !selected) {
    return {
      score: null,
      label: 'Incomplete',
      summary: !loadout
        ? 'Select a loadout to score this plan.'
        : 'Select a known creature to score this plan.',
      factors: [],
      metrics,
      assumptions: [
        'Advisor scoring starts after both a loadout and a known creature are selected.',
        'The score is a planning aid, not a loot prediction.',
      ],
    };
  }

  const history = scorePersonalHistory(sessions, creatureName);
  const sameLoadoutHistory = scoreSameLoadoutHistory(sessions, creatureName, loadout);
  Object.assign(metrics, history.metrics);
  Object.assign(metrics, sameLoadoutHistory.metrics);

  const factors: SessionAdvisorFactor[] = [
    scoreDpsAndRegen(metrics),
    scoreDamageToHpFit(metrics),
    scoreKillPace(metrics),
    scoreAmplifierFit(loadout, metrics),
    scoreArmor(loadout),
    scoreBankroll(metrics, bankroll),
    scoreEconomy(loadout, metrics),
    history.factor,
    sameLoadoutHistory.factor,
    scoreMobPressure(metrics),
    scoreMaturityConfidence(metrics),
  ];

  const rawScore = BASE_SCORE + factors.reduce((sum, factor) => sum + factor.points, 0);
  const gateFactor = advisorGate(metrics, rawScore, loadout);
  if (gateFactor) factors.push(gateFactor);

  const score = Math.round(
    clamp(
      BASE_SCORE + factors.reduce((sum, factor) => sum + factor.points, 0),
      BASE_SCORE,
      SCORE_MAX
    )
  );
  const label = labelForScore(score);

  return {
    score,
    ...label,
    factors,
    metrics,
    assumptions: [
      'The score is a 100-point weighted rubric: huntability/regen 35, kill pace 20, weapon size 10, bankroll 20, setup friction 10, and personal history 5.',
      'A perfect setup can reach 100, but hard gates can cap the final score when regen, kill pace, bankroll, or overkill create a major warning.',
      'Advisor priority is huntability first, then kill pace and weapon fit, then bankroll depth, then setup friction, then your own return history.',
      'Weapon is assumed to be maxed for the player; Orion does not currently know profession levels.',
      'Player is assumed to have enough HP and healing capacity to survive the scored maturity.',
      maturitySelectionMode === 'selected'
        ? 'When multiple maturities are selected, Orion uses a HP-rank weighted average for HP/regen, with higher HP maturities carrying more weight. Any selected maturity that fails regen makes the plan risky.'
        : 'No expected maturities were selected, so Orion falls back to a median maturity for this creature.',
      'If regen values are missing, Orion assumes under 50 HP is low regen risk, 50-150 HP is medium risk, and over 150 HP is very high risk.',
      'Known regen failure caps the score red; missing regen on higher-HP mobs caps the score by uncertainty.',
      'DPS uses maxed average hit damage, expected hit rate, usable amplifier damage, and weapon uses per minute; overkill uses max damage versus maturity HP.',
      'Creature HP, regen, level, and attack-rate data come from the local Entropia Nexus creature data.',
      'Bankroll is scored by estimated kills covered: under 50 is fragile, 50-99 is thin, 100-499 is workable, 500-999 is strong, and 1000+ is deep.',
      'When enough matching kills are logged, estimated cost per kill uses your history; otherwise it uses combat-adjusted theory with a finishing-shot buffer.',
      'Return history adds context from your own logs: 95%+ is encouraging, 100%+ is excellent, and under 80% means the setup deserves extra caution.',
      'Weights follow the hunting-planning themes from community/forum guidance: avoid regen drag, avoid overkill, survive variance, and judge ROI with markup history.',
      'History uses your completed Orion sessions for the same creature and favors markup-adjusted return.',
      'Armor is treated as defensive decay risk because Orion does not know protection match, armor decay, or whether the mob can be hunted naked by this avatar.',
      'Orion does not know tax, spawn quality, overkill from finisher choices, deaths, or current market depth.',
    ],
  };
}
