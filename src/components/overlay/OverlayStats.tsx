import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppSettings, HuntSession, Loadout, OverlayStatId } from '../../types';
import { formatSmallNumber } from '../../utils/formatters';
import { normalizeOverlayStatIds } from '../../utils/overlayStats';
import { getSessionActiveDurationMs } from '../../utils/sessionTiming';
import { LiveTimer } from '../layout/LiveTimer';

type OverlayMetricTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent' | 'muted';

interface OverlayMetric {
  id: OverlayStatId;
  label: string;
  value: ReactNode;
  title?: string;
  tone?: OverlayMetricTone;
  width?: 'normal' | 'wide';
}

interface OverlayStatsProps {
  activeSession: HuntSession;
  loadouts: Loadout[];
  settings: AppSettings;
  now: number;
  isVerticalOverlay: boolean;
}

const metricToneClass: Record<OverlayMetricTone, string> = {
  neutral: 'text-gray-200',
  positive: 'text-green-400',
  negative: 'text-red-400',
  warning: 'text-yellow-400',
  accent: 'text-blue-400',
  muted: 'text-muted',
};

const formatPed = (value: number, options: { showSign?: boolean } = {}) =>
  `${options.showSign && value >= 0 ? '+' : ''}${value.toFixed(2)} PED`;

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function OverlayStats({
  activeSession,
  loadouts,
  settings,
  now,
  isVerticalOverlay,
}: OverlayStatsProps) {
  const statStripRef = useRef<HTMLDivElement | null>(null);
  const [rowStartMetricIds, setRowStartMetricIds] = useState<Set<OverlayStatId>>(() => new Set());

  useEffect(() => {
    const statStrip = statStripRef.current;
    if (!statStrip) {
      setRowStartMetricIds(new Set());
      return;
    }

    let animationFrameId: number | undefined;

    const updateRowStartMetricIds = () => {
      const nextRowStartMetricIds = new Set<OverlayStatId>();
      let currentRowTop: number | null = null;

      for (const child of Array.from(statStrip.children)) {
        const element = child as HTMLElement;
        const metricId = element.dataset.metricId as OverlayStatId | undefined;
        if (!metricId) continue;

        if (currentRowTop === null || Math.abs(element.offsetTop - currentRowTop) > 1) {
          currentRowTop = element.offsetTop;
          nextRowStartMetricIds.add(metricId);
        }
      }

      setRowStartMetricIds((previousRowStartMetricIds) => {
        if (
          previousRowStartMetricIds.size === nextRowStartMetricIds.size &&
          Array.from(nextRowStartMetricIds).every((id) => previousRowStartMetricIds.has(id))
        ) {
          return previousRowStartMetricIds;
        }

        return nextRowStartMetricIds;
      });
    };

    const scheduleUpdate = () => {
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = window.requestAnimationFrame(updateRowStartMetricIds);
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(statStrip);
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [activeSession.id, isVerticalOverlay, settings.overlayStatIds]);

  const profit = activeSession.stats.adjustedProfit;
  const isProfitable = profit >= 0;
  const returns = activeSession.stats.adjustedReturns;
  const returnsPositive = returns >= 100;
  const ttReturnsPositive = activeSession.stats.ttReturns >= 100;
  const markupGain = activeSession.stats.totalMarkupGain + activeSession.stats.totalFixedGain;
  const loadout = activeSession.loadoutId
    ? loadouts.find((l) => l.id === activeSession.loadoutId)
    : loadouts.find((l) => l.name === activeSession.weapon);
  const loadoutName = loadout?.name || activeSession.weapon || 'No Loadout';
  const activeDurationMs = getSessionActiveDurationMs(activeSession, now);
  const activeDurationHours = activeDurationMs / 1000 / 60 / 60;
  const shotsFired = activeSession.stats.shotsFired;
  const landedHits = activeSession.stats.hits + activeSession.stats.criticalHits;
  const avgDamage = shotsFired > 0 ? activeSession.stats.damageDealt / shotsFired : 0;
  const critRate = shotsFired > 0 ? (activeSession.stats.criticalHits / shotsFired) * 100 : 0;
  const hitRate = shotsFired > 0 ? (landedHits / shotsFired) * 100 : 0;
  const missRate = shotsFired > 0 ? (activeSession.stats.misses / shotsFired) * 100 : 0;
  const evasionRate = shotsFired > 0 ? (activeSession.stats.enemyEvades / shotsFired) * 100 : 0;
  const dodgeRate = shotsFired > 0 ? (activeSession.stats.enemyDodges / shotsFired) * 100 : 0;
  const skillGains = activeSession.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
  const weaponDpp = loadout?.dpp ?? activeSession.dppSnapshot ?? 0;
  const costPerKill =
    activeSession.stats.kills > 0 ? activeSession.stats.totalCost / activeSession.stats.kills : 0;
  const adjustedLootPerKill =
    activeSession.stats.kills > 0
      ? activeSession.stats.totalAdjustedLoot / activeSession.stats.kills
      : 0;
  const adjustedLootPerPed =
    activeSession.stats.totalCost > 0
      ? activeSession.stats.totalAdjustedLoot / activeSession.stats.totalCost
      : 0;
  const killsPerPed =
    activeSession.stats.totalCost > 0
      ? activeSession.stats.kills / activeSession.stats.totalCost
      : 0;
  const killsPerHour =
    activeDurationHours > 0 ? activeSession.stats.kills / activeDurationHours : 0;
  const shotsPerKill =
    activeSession.stats.kills > 0 ? activeSession.stats.shotsFired / activeSession.stats.kills : 0;
  const adjustedLootPerHour =
    activeDurationHours > 0 ? activeSession.stats.totalAdjustedLoot / activeDurationHours : 0;
  const spendPerHour =
    activeDurationHours > 0 ? activeSession.stats.totalCost / activeDurationHours : 0;
  const skillsPerHour = activeDurationHours > 0 ? skillGains / activeDurationHours : 0;
  const damagePerHour =
    activeDurationHours > 0 ? activeSession.stats.damageDealt / activeDurationHours : 0;

  const overlayMetricsById: Record<OverlayStatId, OverlayMetric> = {
    time: {
      id: 'time',
      label: 'Time',
      value: (
        <LiveTimer
          startTime={activeSession.startTime}
          isRunning={activeSession.status === 'active'}
          pausedAt={activeSession.pausedAt}
          pausedDurationMs={activeSession.totalPausedMs || 0}
          className="font-mono text-xs font-bold"
        />
      ),
    },
    loadout: {
      id: 'loadout',
      label: 'Loadout',
      value: loadoutName,
      title: `${loadoutName} (Ctrl+Left/Right, Ctrl+1..9 to switch)`,
      width: 'wide',
    },
    creature: {
      id: 'creature',
      label: 'Creature',
      value: activeSession.creature || 'Unknown',
      title: activeSession.creature || 'Unknown',
      width: 'wide',
    },
    totalCost: {
      id: 'totalCost',
      label: 'Spend',
      value: formatPed(activeSession.stats.totalCost),
      tone: 'negative',
    },
    ttLoot: {
      id: 'ttLoot',
      label: 'TT Loot',
      value: formatPed(activeSession.stats.totalTtLoot),
      tone: 'accent',
    },
    adjustedLoot: {
      id: 'adjustedLoot',
      label: 'Adj Loot',
      value: formatPed(activeSession.stats.totalAdjustedLoot),
      tone: 'positive',
    },
    adjustedProfit: {
      id: 'adjustedProfit',
      label: 'Adj P/L',
      value: formatPed(profit, { showSign: true }),
      tone: isProfitable ? 'positive' : 'negative',
    },
    adjustedReturn: {
      id: 'adjustedReturn',
      label: 'Adj Ret',
      value: formatPercent(returns),
      tone: returnsPositive ? 'positive' : 'negative',
    },
    ttReturn: {
      id: 'ttReturn',
      label: 'TT Ret',
      value: formatPercent(activeSession.stats.ttReturns),
      tone: ttReturnsPositive ? 'positive' : 'negative',
    },
    markupGain: {
      id: 'markupGain',
      label: 'MU/Fixed',
      value: formatPed(markupGain, { showSign: true }),
      tone: markupGain >= 0 ? 'positive' : 'negative',
    },
    costPerKill: {
      id: 'costPerKill',
      label: 'Cost/Kill',
      value: formatPed(costPerKill),
      tone: activeSession.stats.kills > 0 ? 'negative' : 'neutral',
    },
    adjustedLootPerKill: {
      id: 'adjustedLootPerKill',
      label: 'Adj/Kill',
      value: formatPed(adjustedLootPerKill),
      title: 'Adj Loot/Kill',
      tone: adjustedLootPerKill > 0 ? 'positive' : 'neutral',
    },
    adjustedLootPerPed: {
      id: 'adjustedLootPerPed',
      label: 'Adj/PED',
      value: adjustedLootPerPed.toFixed(3),
      title: 'Adj Loot/PED',
      tone: adjustedLootPerPed >= 1 ? 'positive' : 'negative',
    },
    adjustedLootPerHour: {
      id: 'adjustedLootPerHour',
      label: 'Loot/Hr',
      value: `${formatSmallNumber(adjustedLootPerHour)} PED`,
      title: 'Adj Loot/Hour',
      tone: adjustedLootPerHour > 0 ? 'positive' : 'neutral',
      width: 'wide',
    },
    kills: {
      id: 'kills',
      label: 'Kills',
      value: activeSession.stats.kills,
      tone: 'warning',
    },
    lootEvents: {
      id: 'lootEvents',
      label: 'Loots',
      value: activeSession.stats.lootEvents,
    },
    globals: {
      id: 'globals',
      label: 'Globals',
      value:
        activeSession.stats.hofs > 0
          ? `${activeSession.stats.globals}/${activeSession.stats.hofs}`
          : activeSession.stats.globals,
      title: 'Globals / HoFs',
      tone: activeSession.stats.hofs > 0 ? 'warning' : 'neutral',
    },
    avgDps: {
      id: 'avgDps',
      label: 'Avg Dmg',
      value: avgDamage.toFixed(1),
      title: 'Avg Dmg/Hit',
      tone: 'accent',
    },
    weaponDpp: {
      id: 'weaponDpp',
      label: 'DPP',
      value: weaponDpp > 0 ? weaponDpp.toFixed(2) : 'N/A',
      tone: weaponDpp > 0 ? 'accent' : 'muted',
    },
    killsPerPed: {
      id: 'killsPerPed',
      label: 'Kills/PED',
      value: killsPerPed.toFixed(2),
      tone: killsPerPed > 0 ? 'accent' : 'neutral',
    },
    killsPerHour: {
      id: 'killsPerHour',
      label: 'Kills/Hr',
      value: killsPerHour.toFixed(1),
      title: 'Kills/Hour',
      tone: killsPerHour > 0 ? 'accent' : 'neutral',
    },
    shotsPerKill: {
      id: 'shotsPerKill',
      label: 'Shots/Kill',
      value: shotsPerKill.toFixed(1),
      tone: shotsPerKill > 0 ? 'accent' : 'neutral',
    },
    evasionRate: {
      id: 'evasionRate',
      label: 'Evade',
      value: formatPercent(evasionRate),
      title: 'Target evasion rate',
      tone: evasionRate > 0 ? 'warning' : 'neutral',
    },
    dodgeRate: {
      id: 'dodgeRate',
      label: 'Dodge',
      value: formatPercent(dodgeRate),
      title: 'Target dodge rate',
      tone: dodgeRate > 0 ? 'warning' : 'neutral',
    },
    critRate: {
      id: 'critRate',
      label: 'Crit',
      value: formatPercent(critRate),
      tone: critRate > 0 ? 'warning' : 'neutral',
    },
    hitRate: {
      id: 'hitRate',
      label: 'Hit',
      value: formatPercent(hitRate),
      tone: hitRate >= 80 ? 'positive' : 'warning',
    },
    missRate: {
      id: 'missRate',
      label: 'Miss',
      value: formatPercent(missRate),
      tone: missRate > 10 ? 'warning' : 'neutral',
    },
    ammoCost: {
      id: 'ammoCost',
      label: 'Ammo',
      value: formatPed(activeSession.ammoCost),
      tone: 'negative',
    },
    spendPerHour: {
      id: 'spendPerHour',
      label: 'Spend/Hr',
      value: `${formatSmallNumber(spendPerHour)} PED`,
      title: 'Spend/Hour',
      tone: spendPerHour > 0 ? 'negative' : 'neutral',
      width: 'wide',
    },
    weaponDecay: {
      id: 'weaponDecay',
      label: 'Decay',
      value: formatPed(activeSession.weaponDecay),
      tone: 'negative',
    },
    healingCost: {
      id: 'healingCost',
      label: 'Heal/FAP',
      value: formatPed(activeSession.healingCost),
      tone: activeSession.healingCost > 0 ? 'negative' : 'neutral',
    },
    otherCosts: {
      id: 'otherCosts',
      label: 'Other',
      value: formatPed(activeSession.otherCosts),
      tone: activeSession.otherCosts > 0 ? 'negative' : 'neutral',
    },
    skillGains: {
      id: 'skillGains',
      label: 'Skills',
      value: skillGains.toFixed(4),
      tone: skillGains > 0 ? 'positive' : 'neutral',
    },
    skillsPerHour: {
      id: 'skillsPerHour',
      label: 'Skills/Hr',
      value: formatSmallNumber(skillsPerHour),
      title: 'Skills/Hour',
      tone: skillsPerHour > 0 ? 'positive' : 'neutral',
    },
    damagePerHour: {
      id: 'damagePerHour',
      label: 'Dmg/Hr',
      value: formatSmallNumber(damagePerHour),
      title: 'Dmg/Hour',
      tone: damagePerHour > 0 ? 'accent' : 'neutral',
    },
  };
  const selectedOverlayMetrics = normalizeOverlayStatIds(settings.overlayStatIds).map(
    (id) => overlayMetricsById[id]
  );

  return (
    <div
      ref={statStripRef}
      className={
        isVerticalOverlay
          ? 'grid min-h-0 flex-1 grid-cols-2 content-start items-start gap-y-1 overflow-hidden py-2'
          : 'flex min-w-0 flex-1 flex-wrap content-center items-center gap-y-1 overflow-hidden py-1'
      }
    >
      {selectedOverlayMetrics.map((metric, index) => (
        <div
          key={metric.id}
          data-metric-id={metric.id}
          className={
            isVerticalOverlay
              ? `flex w-full min-w-0 flex-col items-center border-l px-2 py-0.5 leading-none ${
                  index % 2 === 0 ? 'border-transparent' : 'border-surface'
                }`
              : `flex flex-none flex-col items-center border-l px-2 leading-none ${
                  metric.width === 'wide' ? 'w-[118px]' : 'w-[90px]'
                } ${
                  rowStartMetricIds.size === 0 || rowStartMetricIds.has(metric.id)
                    ? 'border-transparent'
                    : 'border-surface'
                }`
          }
        >
          <span className="text-muted text-[10px] text-center whitespace-nowrap">
            {metric.label}
          </span>
          <span
            className={`w-full truncate text-center text-xs font-bold whitespace-nowrap ${metricToneClass[metric.tone || 'neutral']}`}
            title={metric.title || (typeof metric.value === 'string' ? metric.value : undefined)}
          >
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  );
}
