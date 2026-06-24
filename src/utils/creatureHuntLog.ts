import type { HuntSession, LootItem } from '../types';

export type CreatureHuntLogAllocation = 'Full session' | 'Linked mixed';

export interface CreatureHuntLogRun {
  number: number;
  sessionName: string;
  date: number;
  kills: number;
  ttCost: number;
  ttReturn: number;
  adjustedReturn: number;
  ttReturnPercent: number;
  durationHours: number;
  globals: number;
  hofs: number;
  allocation: CreatureHuntLogAllocation;
}

export interface CreatureHuntLogLootItem {
  name: string;
  quantity: number;
  ttValue: number;
  adjustedValue: number;
}

export interface CreatureHuntLog {
  creature: string;
  runs: CreatureHuntLogRun[];
  lootComposition: CreatureHuntLogLootItem[];
  summary: {
    sessionsIncluded: number;
    excludedMixedSessions: number;
    fullSessionFallbacks: number;
    linkedMixedSessions: number;
    startTime: number | null;
    endTime: number | null;
    kills: number;
    durationHours: number;
    globals: number;
    hofs: number;
    ammoCost: number;
    weaponDecay: number;
    healingCost: number;
    otherCosts: number;
    ttCost: number;
    ttReturn: number;
    adjustedReturn: number;
    ttProfit: number;
    adjustedProfit: number;
    ttReturnPercent: number;
    adjustedReturnPercent: number;
    locations: string[];
    maturities: string[];
    equipment: string[];
  };
}

const normalize = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? '';

const sessionNamesCreature = (session: HuntSession, creature: string) => {
  const target = normalize(creature);
  return normalize(session.creature) === target || normalize(session.name).includes(target);
};

const globalMatchesCreature = (globalCreature: string, creature: string) => {
  const globalName = normalize(globalCreature);
  const target = normalize(creature);
  return globalName === target || globalName.startsWith(`${target} `);
};

const ttValue = (item: LootItem) => item.value * item.quantity;

export function buildCreatureHuntLog(sessions: HuntSession[], creature: string): CreatureHuntLog {
  const runs: CreatureHuntLogRun[] = [];
  const lootByName = new Map<string, CreatureHuntLogLootItem>();
  const locations = new Set<string>();
  const maturities = new Set<string>();
  const equipment = new Set<string>();
  let excludedMixedSessions = 0;
  let fullSessionFallbacks = 0;
  let linkedMixedSessions = 0;
  let ammoCost = 0;
  let weaponDecay = 0;
  let healingCost = 0;
  let otherCosts = 0;
  let lastIncludedTime: number | null = null;

  const completedSessions = sessions
    .filter((session) => session.status === 'completed')
    .sort((a, b) => a.startTime - b.startTime);

  for (const session of completedSessions) {
    const selectedKills = session.kills.filter(
      (kill) => normalize(kill.creatureName) === normalize(creature)
    );
    const totalKills = session.kills.length;
    const selectedKillIds = new Set(selectedKills.map((kill) => kill.id));
    const knownKillIds = new Set(session.kills.map((kill) => kill.id));
    const linkedLootRows = session.loot.filter(
      (item) => item.killUuid && knownKillIds.has(item.killUuid)
    ).length;
    const totalKillCost = session.kills.reduce((sum, kill) => sum + kill.cost, 0);
    const selectedKillCost = selectedKills.reduce((sum, kill) => sum + kill.cost, 0);
    const isFullSession =
      (selectedKills.length > 0 && selectedKills.length === totalKills) ||
      (totalKills === 0 && sessionNamesCreature(session, creature));
    const isLinkedMixed =
      selectedKills.length > 0 &&
      totalKills > selectedKills.length &&
      session.loot.length === linkedLootRows &&
      totalKillCost > 0;

    if (!isFullSession && !isLinkedMixed) {
      if (selectedKills.length > 0 || sessionNamesCreature(session, creature)) {
        excludedMixedSessions += 1;
      }
      continue;
    }

    const costShare = isLinkedMixed
      ? Math.min(1, Math.max(0, selectedKillCost / totalKillCost))
      : 1;
    const includedLoot = isLinkedMixed
      ? session.loot.filter((item) => item.killUuid && selectedKillIds.has(item.killUuid))
      : session.loot;
    const runTtReturn = includedLoot.reduce((sum, item) => sum + ttValue(item), 0);
    const runAdjustedReturn = includedLoot.reduce((sum, item) => sum + item.totalValue, 0);
    const runAmmoCost = session.ammoCost * costShare;
    const runWeaponDecay = session.weaponDecay * costShare;
    const runHealingCost = session.healingCost * costShare;
    const runOtherCosts = session.otherCosts * costShare;
    const runTtCost = runAmmoCost + runWeaponDecay + runHealingCost + runOtherCosts;
    const selectedGlobals = isFullSession
      ? session.globals
      : session.globals.filter((global) => globalMatchesCreature(global.creature, creature));

    ammoCost += runAmmoCost;
    weaponDecay += runWeaponDecay;
    healingCost += runHealingCost;
    otherCosts += runOtherCosts;
    if (isLinkedMixed) linkedMixedSessions += 1;
    else fullSessionFallbacks += 1;
    lastIncludedTime = Math.max(lastIncludedTime ?? 0, session.endTime ?? session.startTime);

    if (session.location?.trim()) locations.add(session.location.trim());
    const loadoutName = session.loadoutNameSnapshot?.trim() || session.weapon.trim();
    if (loadoutName) equipment.add(loadoutName);
    for (const kill of selectedKills) {
      if (kill.maturity?.trim() && normalize(kill.maturity) !== 'unknown') {
        maturities.add(kill.maturity.trim());
      }
    }

    for (const item of includedLoot) {
      const existing = lootByName.get(item.name);
      if (existing) {
        existing.quantity += item.quantity;
        existing.ttValue += ttValue(item);
        existing.adjustedValue += item.totalValue;
      } else {
        lootByName.set(item.name, {
          name: item.name,
          quantity: item.quantity,
          ttValue: ttValue(item),
          adjustedValue: item.totalValue,
        });
      }
    }

    runs.push({
      number: runs.length + 1,
      sessionName: session.name,
      date: session.startTime,
      kills: selectedKills.length || (isFullSession ? session.stats.kills : 0),
      ttCost: runTtCost,
      ttReturn: runTtReturn,
      adjustedReturn: runAdjustedReturn,
      ttReturnPercent: runTtCost > 0 ? (runTtReturn / runTtCost) * 100 : 0,
      durationHours: (session.stats.duration / 3600) * costShare,
      globals: selectedGlobals.filter((global) => !global.isHoF).length,
      hofs: selectedGlobals.filter((global) => global.isHoF).length,
      allocation: isLinkedMixed ? 'Linked mixed' : 'Full session',
    });
  }

  const totals = runs.reduce(
    (sum, run) => ({
      kills: sum.kills + run.kills,
      durationHours: sum.durationHours + run.durationHours,
      globals: sum.globals + run.globals,
      hofs: sum.hofs + run.hofs,
      ttCost: sum.ttCost + run.ttCost,
      ttReturn: sum.ttReturn + run.ttReturn,
      adjustedReturn: sum.adjustedReturn + run.adjustedReturn,
    }),
    {
      kills: 0,
      durationHours: 0,
      globals: 0,
      hofs: 0,
      ttCost: 0,
      ttReturn: 0,
      adjustedReturn: 0,
    }
  );

  return {
    creature,
    runs,
    lootComposition: Array.from(lootByName.values()).sort((a, b) => b.ttValue - a.ttValue),
    summary: {
      sessionsIncluded: runs.length,
      excludedMixedSessions,
      fullSessionFallbacks,
      linkedMixedSessions,
      startTime: runs[0]?.date ?? null,
      endTime: lastIncludedTime,
      kills: totals.kills,
      durationHours: totals.durationHours,
      globals: totals.globals,
      hofs: totals.hofs,
      ammoCost,
      weaponDecay,
      healingCost,
      otherCosts,
      ttCost: totals.ttCost,
      ttReturn: totals.ttReturn,
      adjustedReturn: totals.adjustedReturn,
      ttProfit: totals.ttReturn - totals.ttCost,
      adjustedProfit: totals.adjustedReturn - totals.ttCost,
      ttReturnPercent: totals.ttCost > 0 ? (totals.ttReturn / totals.ttCost) * 100 : 0,
      adjustedReturnPercent: totals.ttCost > 0 ? (totals.adjustedReturn / totals.ttCost) * 100 : 0,
      locations: Array.from(locations).sort(),
      maturities: Array.from(maturities).sort(),
      equipment: Array.from(equipment).sort(),
    },
  };
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const csvRow = (values: Array<string | number>) => values.map(csvCell).join(',');
const fixed = (value: number) => value.toFixed(2);
const dateLabel = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

export function createCreatureHuntLogCsv(report: CreatureHuntLog): string {
  const { summary } = report;
  const rows = [
    csvRow([`${report.creature} Hunting Log`]),
    csvRow(['Summary', 'Value']),
    csvRow(['Sessions included', summary.sessionsIncluded]),
    csvRow(['Kills', summary.kills]),
    csvRow(['Hours', fixed(summary.durationHours)]),
    csvRow(['Globals', summary.globals]),
    csvRow(['HoFs', summary.hofs]),
    csvRow(['Ammo cost (PED)', fixed(summary.ammoCost)]),
    csvRow(['Weapon decay (PED)', fixed(summary.weaponDecay)]),
    csvRow(['Healing cost (PED)', fixed(summary.healingCost)]),
    csvRow(['Other costs (PED)', fixed(summary.otherCosts)]),
    csvRow(['Total TT cost (PED)', fixed(summary.ttCost)]),
    csvRow(['TT return (PED)', fixed(summary.ttReturn)]),
    csvRow(['TT profit/loss (PED)', fixed(summary.ttProfit)]),
    csvRow(['TT return (%)', fixed(summary.ttReturnPercent)]),
    csvRow(['Adjusted return (PED)', fixed(summary.adjustedReturn)]),
    csvRow(['Adjusted return (%)', fixed(summary.adjustedReturnPercent)]),
    '',
    csvRow([
      'Number',
      'Date',
      'Session',
      'Kills',
      'TT Cost',
      'TT Return',
      'TT Return %',
      'Adjusted Return',
      'Hours',
      'Globals',
      'HoFs',
      'Allocation',
    ]),
    ...report.runs.map((run) =>
      csvRow([
        run.number,
        dateLabel(run.date),
        run.sessionName,
        run.kills,
        fixed(run.ttCost),
        fixed(run.ttReturn),
        fixed(run.ttReturnPercent),
        fixed(run.adjustedReturn),
        fixed(run.durationHours),
        run.globals,
        run.hofs,
        run.allocation,
      ])
    ),
    '',
    csvRow(['Loot Composition', 'Quantity', 'TT Value', 'Adjusted Value']),
    ...report.lootComposition.map((item) =>
      csvRow([item.name, item.quantity, fixed(item.ttValue), fixed(item.adjustedValue)])
    ),
  ];

  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

const markdownCell = (value: string | number) => String(value).replace(/\|/g, '\\|');
const markdownRow = (values: Array<string | number>) =>
  `| ${values.map(markdownCell).join(' | ')} |`;
const orionReleaseLink = 'https://github.com/Nepherius/orion/releases/latest';

export function createCreatureHuntLogMarkdown(report: CreatureHuntLog): string {
  const { summary } = report;
  const profitLabel = summary.ttProfit >= 0 ? 'TT Profit' : 'TT Loss';
  const summaryRows = [
    ['TT Spent Ammo', `${fixed(summary.ammoCost)} PED`],
    ['TT Spent Weapon Decay', `${fixed(summary.weaponDecay)} PED`],
    ['TT Spent Healing', `${fixed(summary.healingCost)} PED`],
    ['TT Spent Other', `${fixed(summary.otherCosts)} PED`],
    ['TT Spent', `${fixed(summary.ttCost)} PED`],
    ['TT Return', `${fixed(summary.ttReturn)} PED`],
    [profitLabel, `${fixed(Math.abs(summary.ttProfit))} PED`],
    ['TT Return %', `${fixed(summary.ttReturnPercent)}%`],
    ['Kills', summary.kills],
    ['Hours', fixed(summary.durationHours)],
    ['Globals', summary.globals],
    ['HoFs', summary.hofs],
  ];

  return [
    `## ${report.creature} Hunting Log`,
    '',
    summary.locations.length > 0 ? `Locations: ${summary.locations.join(', ')}` : '',
    summary.maturities.length > 0 ? `Maturities: ${summary.maturities.join(', ')}` : '',
    summary.equipment.length > 0 ? `Equipment: ${summary.equipment.join(', ')}` : '',
    '',
    '### Runs',
    '',
    markdownRow(['Number', 'Date', 'Kills', 'TT Cost', 'TT Return', 'TT Return %']),
    markdownRow(['---', '---', '---:', '---:', '---:', '---:']),
    ...report.runs.map((run) =>
      markdownRow([
        run.number,
        dateLabel(run.date),
        run.kills,
        fixed(run.ttCost),
        fixed(run.ttReturn),
        `${fixed(run.ttReturnPercent)}%`,
      ])
    ),
    markdownRow([
      'Total',
      '',
      summary.kills,
      fixed(summary.ttCost),
      fixed(summary.ttReturn),
      `${fixed(summary.ttReturnPercent)}%`,
    ]),
    '',
    '### All Together',
    '',
    markdownRow(['Metric', 'Value']),
    markdownRow(['---', '---:']),
    ...summaryRows.map(markdownRow),
    '',
    '### Loot Composition',
    '',
    markdownRow(['Name', 'Quantity', 'TT', 'Adjusted']),
    markdownRow(['---', '---:', '---:', '---:']),
    ...report.lootComposition.map((item) =>
      markdownRow([item.name, item.quantity, fixed(item.ttValue), fixed(item.adjustedValue)])
    ),
    markdownRow(['Total', '', fixed(summary.ttReturn), fixed(summary.adjustedReturn)]),
    '',
    `Log tracked and generated by [ORION](${orionReleaseLink})`,
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n')
    .trim();
}
