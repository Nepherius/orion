import { useMemo, useState } from 'react';
import { useHuntStore } from '../../store';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { BarChart3, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { LootPerformanceSection } from './analytics/LootPerformanceSection';
import { PerformancePanelsSection } from './analytics/PerformancePanelsSection';
import { AdvancedAnalyticsSection } from './analytics/AdvancedAnalyticsSection';
import { CorrelationAnalytics } from '../analytics/CorrelationAnalytics';
import { StatisticalInsights } from '../analytics/StatisticalInsights';
import {
  calculateAverageDropValue,
  getLargestDrop,
  calculateMinutesPerLootEvent,
  calculateSkillsByLocation,
  calculateSkillsByWeapon,
  calculateSkillGainVariance,
  calculateSkillValuePerCost,
  calculateProjectedLifetimeProfit,
  calculateSessionsToBreakEven,
  getBestGlobal,
  calculateProfitableSessionStreaks,
  calculateWinRate,
  calculateCreatureStats,
  calculateStdDev,
  calculateLifetimeAttributeGains,
  getAllSkillNames,
} from '../../utils/analyticsCalculations';

export function Analytics() {
  const sessions = useHuntStore((state) => state.sessions);
  const loadouts = useHuntStore((state) => state.loadouts);
  const isPageVisible = usePageVisibility();

  const [timeRange, setTimeRange] = useState<
    '24h' | '7d' | '1m' | '3m' | '1y' | 'lifetime' | 'custom'
  >('lifetime');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const filteredSessions = useMemo(() => {
    if (timeRange === 'lifetime') return sessions;

    const now = Date.now();
    let startTime = 0;

    switch (timeRange) {
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '1m':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '3m':
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case '1y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case 'custom': {
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate).getTime() + 86399999 : now; // Includes end of day
        return sessions.filter((s) => s.startTime >= start && s.startTime <= end);
      }
    }

    return sessions.filter((s) => s.startTime >= startTime);
  }, [sessions, timeRange, customStartDate, customEndDate]);

  // Calculate lifetime stats
  const lifetimeStats = useMemo(
    () =>
      filteredSessions.reduce(
        (acc, session) => {
          acc.totalLoot += session.stats.totalLoot;
          acc.totalCost += session.stats.totalCost;
          acc.totalKills += session.stats.kills;
          acc.totalGlobals += session.stats.globals;
          acc.totalHofs += session.stats.hofs;
          acc.totalDamage += session.stats.damageDealt;
          acc.totalShotsFired += session.stats.shotsFired;
          acc.totalDuration += session.stats.duration;
          acc.totalSessions += 1;
          return acc;
        },
        {
          totalLoot: 0,
          totalCost: 0,
          totalKills: 0,
          totalGlobals: 0,
          totalHofs: 0,
          totalDamage: 0,
          totalShotsFired: 0,
          totalDuration: 0,
          totalSessions: 0,
        }
      ),
    [filteredSessions]
  );

  const lifetimeProfit = lifetimeStats.totalLoot - lifetimeStats.totalCost;
  const lifetimeReturnRate =
    lifetimeStats.totalCost > 0 ? (lifetimeStats.totalLoot / lifetimeStats.totalCost) * 100 : 0;
  const lifetimeHitRate = useMemo(() => {
    return lifetimeStats.totalShotsFired > 0
      ? (filteredSessions.reduce(
        (sum, s) => sum + (s.stats.hits || 0) + (s.stats.criticalHits || 0),
        0
      ) /
        lifetimeStats.totalShotsFired) *
      100
      : 0;
  }, [filteredSessions, lifetimeStats.totalShotsFired]);

  // Sessions by location
  const locationData = useMemo(() => {
    const sessionsByLocation = filteredSessions.reduce(
      (acc, session) => {
        const location = session.location || 'Unknown';
        if (!acc[location]) {
          acc[location] = {
            count: 0,
            totalLoot: 0,
            totalCost: 0,
            totalKills: 0,
            totalGlobals: 0,
          };
        }
        acc[location].count += 1;
        acc[location].totalLoot += session.stats.totalLoot;
        acc[location].totalCost += session.stats.totalCost;
        acc[location].totalKills += session.stats.kills;
        acc[location].totalGlobals += session.stats.globals;
        return acc;
      },
      {} as Record<
        string,
        {
          count: number;
          totalLoot: number;
          totalCost: number;
          totalKills: number;
          totalGlobals: number;
        }
      >
    );

    return Object.entries(sessionsByLocation)
      .map(([location, data]) => ({
        location,
        sessions: data.count,
        loot: data.totalLoot,
        cost: data.totalCost,
        profit: data.totalLoot - data.totalCost,
        returnRate: data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0,
        kills: data.totalKills,
        globals: data.totalGlobals,
      }))
      .sort((a, b) => b.loot - a.loot);
  }, [filteredSessions]);

  // All globals with creatures
  const allGlobals = useMemo(() => {
    return filteredSessions
      .flatMap((s) => s.globals.map((g) => ({ ...g, sessionName: s.name, location: s.location })))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // Top 50 globals
  }, [filteredSessions]);

  // Weapon performance
  const weaponData = useMemo(() => {
    const weaponPerformance = filteredSessions.reduce(
      (acc, session) => {
        // Use weapon name from loadout if available, otherwise fall back to session.weapon
        let weapon = 'Unknown';
        if (session.loadoutId) {
          const loadout = loadouts.find((l) => l.id === session.loadoutId);
          weapon = loadout?.weapon?.Name || session.weapon || 'Unknown';
        } else {
          weapon = session.weapon || 'Unknown';
        }

        if (!acc[weapon]) {
          acc[weapon] = {
            sessions: 0,
            totalLoot: 0,
            totalCost: 0,
            totalKills: 0,
            totalDamage: 0,
          };
        }
        acc[weapon].sessions += 1;
        acc[weapon].totalLoot += session.stats.totalLoot;
        acc[weapon].totalCost += session.stats.totalCost;
        acc[weapon].totalKills += session.stats.kills;
        acc[weapon].totalDamage += session.stats.damageDealt;
        return acc;
      },
      {} as Record<
        string,
        {
          sessions: number;
          totalLoot: number;
          totalCost: number;
          totalKills: number;
          totalDamage: number;
        }
      >
    );

    return Object.entries(weaponPerformance)
      .map(([weapon, data]) => ({
        weapon,
        sessions: data.sessions,
        returnRate: data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0,
        totalLoot: data.totalLoot,
        totalCost: data.totalCost,
        avgDamage: data.totalKills > 0 ? data.totalDamage / data.totalKills : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);
  }, [filteredSessions, loadouts]);

  // Armor performance
  const armorData = useMemo(() => {
    const armorPerformance = filteredSessions.reduce(
      (acc, session) => {
        const armor = session.armor || 'None';
        if (!acc[armor]) {
          acc[armor] = {
            sessions: 0,
            totalLoot: 0,
            totalCost: 0,
            damageTaken: 0,
          };
        }
        acc[armor].sessions += 1;
        acc[armor].totalLoot += session.stats.totalLoot;
        acc[armor].totalCost += session.stats.totalCost;
        acc[armor].damageTaken += session.stats.damageTaken || 0;
        return acc;
      },
      {} as Record<
        string,
        { sessions: number; totalLoot: number; totalCost: number; damageTaken: number }
      >
    );

    return Object.entries(armorPerformance)
      .map(([armor, data]) => ({
        armor,
        sessions: data.sessions,
        returnRate: data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0,
        avgDamageTaken: data.sessions > 0 ? data.damageTaken / data.sessions : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
  }, [filteredSessions]);

  // Loadout performance
  const loadoutData = useMemo(() => {
    const loadoutPerformance: Record<
      string,
      { sessions: Set<string>; totalLoot: number; totalCost: number; totalKills: number }
    > = {};

    // Aggregate by individual kills with loadoutId
    filteredSessions.forEach((session) => {
      session.kills.forEach((kill) => {
        if (!kill.loadoutId) return;

        const loadout = loadouts.find((l) => l.id === kill.loadoutId);
        const loadoutName = loadout?.name || 'Unknown';

        if (!loadoutPerformance[loadoutName]) {
          loadoutPerformance[loadoutName] = {
            sessions: new Set(),
            totalLoot: 0,
            totalCost: 0,
            totalKills: 0,
          };
        }

        loadoutPerformance[loadoutName].sessions.add(session.id);
        loadoutPerformance[loadoutName].totalLoot += kill.lootValue;
        loadoutPerformance[loadoutName].totalCost += kill.cost;
        loadoutPerformance[loadoutName].totalKills += 1;
      });
    });

    return Object.entries(loadoutPerformance)
      .map(([name, data]) => ({
        name,
        sessions: data.sessions.size,
        returnRate: data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0,
        profit: data.totalLoot - data.totalCost,
        avgKills: data.sessions.size > 0 ? data.totalKills / data.sessions.size : 0,
      }))
      .sort((a, b) => b.returnRate - a.returnRate);
  }, [filteredSessions, loadouts]);

  // Top loot items
  const topLootItems = useMemo(() => {
    const allLootItems = filteredSessions.flatMap((s) => s.loot);
    const lootByName = allLootItems.reduce(
      (acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            totalValue: 0,
            quantity: 0,
            count: 0,
          };
        }
        acc[item.name].totalValue += item.totalValue;
        acc[item.name].quantity += item.quantity;
        acc[item.name].count += 1;
        return acc;
      },
      {} as Record<string, { totalValue: number; quantity: number; count: number }>
    );

    return Object.entries(lootByName)
      .map(([name, data]) => ({
        name,
        totalValue: data.totalValue,
        quantity: data.quantity,
        drops: data.count,
        avgValue: data.count > 0 ? data.totalValue / data.count : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 20);
  }, [filteredSessions]);

  // Skills gained
  const topSkills = useMemo(() => {
    const allSkills = filteredSessions.flatMap((s) => s.skills);
    const skillsByName = allSkills.reduce(
      (acc, skill) => {
        if (!acc[skill.skillName]) {
          acc[skill.skillName] = 0;
        }
        acc[skill.skillName] += skill.gainAmount;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(skillsByName)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [filteredSessions]);

  // Cost breakdown
  const costData = useMemo(() => {
    const costBreakdown = filteredSessions.reduce(
      (acc, session) => {
        acc.ammo += session.ammoCost;
        acc.weaponDecay += session.weaponDecay;
        acc.healing += session.healingCost;
        acc.other += session.otherCosts;
        return acc;
      },
      { ammo: 0, weaponDecay: 0, healing: 0, other: 0 }
    );

    return [
      { name: 'Ammo', value: costBreakdown.ammo, color: '#EF4444' },
      { name: 'Weapon Decay', value: costBreakdown.weaponDecay, color: '#F59E0B' },
      { name: 'Healing', value: costBreakdown.healing, color: '#10B981' },
      { name: 'Other', value: costBreakdown.other, color: '#6B7280' },
    ].filter((item) => item.value > 0);
  }, [filteredSessions]);

  // Sessions over time (last 30)
  const recentSessions = useMemo(() => {
    return filteredSessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => a.startTime - b.startTime)
      .slice(-30)
      .map((s) => ({
        date: format(s.startTime, 'MM/dd'),
        returnRate: s.stats.returns,
        profit: s.stats.totalLoot - s.stats.totalCost,
        loot: s.stats.totalLoot,
      }));
  }, [filteredSessions]);

  // Category 2: Loot Quality & Consistency
  const avgLootValue = useMemo(() => {
    return filteredSessions.length > 0
      ? filteredSessions.reduce((sum, s) => sum + calculateAverageDropValue(s), 0) /
      filteredSessions.length
      : 0;
  }, [filteredSessions]);

  const largestDropValue = useMemo(() => {
    return filteredSessions.length > 0
      ? Math.max(...filteredSessions.map((s) => getLargestDrop(s)))
      : 0;
  }, [filteredSessions]);

  const avgMinutesPerLoot = useMemo(() => {
    return filteredSessions.length > 0
      ? filteredSessions.reduce((sum, s) => sum + calculateMinutesPerLootEvent(s), 0) /
      filteredSessions.length
      : 0;
  }, [filteredSessions]);

  const overallLootStdDev = useMemo(() => {
    const lootValues = filteredSessions.flatMap((session) =>
      session.loot.map((lootItem) => lootItem.totalValue)
    );
    return calculateStdDev(lootValues);
  }, [filteredSessions]);

  // Category 3: Global/HoF Analysis
  const totalGlobalsCount = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + s.globals.length, 0);
  }, [filteredSessions]);

  const totalHoFsCount = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + s.globals.filter((g) => g.isHoF).length, 0);
  }, [filteredSessions]);

  const avgGlobalValue = useMemo(() => {
    const allGlobals = filteredSessions.flatMap((s) => s.globals);
    return allGlobals.length > 0
      ? allGlobals.reduce((sum, g) => sum + g.value, 0) / allGlobals.length
      : 0;
  }, [filteredSessions]);

  const bestGlobalValue = useMemo(() => {
    return filteredSessions.length > 0
      ? Math.max(...filteredSessions.map((s) => getBestGlobal(s)))
      : 0;
  }, [filteredSessions]);

  const globalDropRatePerKill = useMemo(() => {
    const totalKills = filteredSessions.reduce((sum, s) => sum + s.stats.kills, 0);
    return totalKills > 0 ? totalGlobalsCount / totalKills : 0;
  }, [filteredSessions, totalGlobalsCount]);

  const globalDropRatePerHour = useMemo(() => {
    let totalHours = 0;
    filteredSessions.forEach((s) => {
      if (s.status === 'completed') {
        totalHours += Math.max(0, Number(s.stats.duration) || 0) / 3600;
        return;
      }

      const now = Date.now();
      const pausedMs =
        (s.totalPausedMs || 0) + (s.status === 'paused' && s.pausedAt ? now - s.pausedAt : 0);
      const duration = Math.max(0, now - s.startTime - pausedMs);
      totalHours += duration / 1000 / 60 / 60;
    });
    return totalHours > 0 ? totalGlobalsCount / totalHours : 0;
  }, [filteredSessions, totalGlobalsCount]);

  // Category 4: Session Reliability & Streaks
  const profitableStreaks = useMemo(() => {
    const sorted = [...filteredSessions].sort((a, b) => b.startTime - a.startTime);
    return calculateProfitableSessionStreaks(sorted);
  }, [filteredSessions]);

  const sessionWinRate = useMemo(() => {
    return calculateWinRate(filteredSessions);
  }, [filteredSessions]);

  // Category 7: Creature Analysis
  const creatureAnalysis = useMemo(() => {
    const stats = calculateCreatureStats(filteredSessions);
    return Object.entries(stats)
      .map(([creature, data]) => ({
        creature,
        ...data,
        returnRate: data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.totalLoot - a.totalLoot);
  }, [filteredSessions]);

  // Category 10: Skill Efficiency
  const skillsByLocation = useMemo(() => {
    const data = calculateSkillsByLocation(filteredSessions);
    return Object.entries(data)
      .map(([location, gains]) => ({ location, skillGains: gains }))
      .sort((a, b) => b.skillGains - a.skillGains);
  }, [filteredSessions]);

  const skillsByWeapon = useMemo(() => {
    const data = calculateSkillsByWeapon(filteredSessions);
    return Object.entries(data)
      .map(([weapon, gains]) => ({ weapon, skillGains: gains }))
      .sort((a, b) => b.skillGains - a.skillGains);
  }, [filteredSessions]);

  const skillGainVariance = useMemo(() => {
    return calculateSkillGainVariance(filteredSessions);
  }, [filteredSessions]);

  const skillValuePerCost = useMemo(() => {
    return calculateSkillValuePerCost(filteredSessions);
  }, [filteredSessions]);

  const lifetimeAttributeGains = useMemo(() => {
    return calculateLifetimeAttributeGains(filteredSessions);
  }, [filteredSessions]);

  const allSkillNames = useMemo(() => {
    return getAllSkillNames(filteredSessions);
  }, [filteredSessions]);

  const totalLootEvents = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + s.loot.length, 0);
  }, [filteredSessions]);

  // Category 12: Predictive Metrics
  const projectedLifetimeProfit = useMemo(() => {
    return calculateProjectedLifetimeProfit(filteredSessions);
  }, [filteredSessions]);

  const sessionsToBreakEven = useMemo(() => {
    return calculateSessionsToBreakEven(filteredSessions);
  }, [filteredSessions]);

  // Category 8: Comparative Analytics
  const bestWeapon = useMemo(() => {
    if (weaponData.length === 0) return null;
    return [...weaponData].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [weaponData]);

  const bestLocation = useMemo(() => {
    const candidates = locationData.filter((loc) => loc.sessions >= 2);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [locationData]);

  const bestLoadout = useMemo(() => {
    const candidates = loadoutData.filter((loadout) => loadout.sessions >= 2);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [loadoutData]);

  // Category 11: Temporal Analytics
  const temporalInsights = useMemo(() => {
    if (filteredSessions.length === 0) {
      return {
        avgSessionHours: 0,
        bestHourLabel: 'N/A',
        bestHourReturnRate: 0,
        avgGapHours: 0,
      };
    }

    const avgSessionHours =
      filteredSessions.reduce((sum, s) => sum + s.stats.duration / 3600, 0) /
      filteredSessions.length;

    const byHour: Record<number, { sessions: number; returnTotal: number }> = {};
    for (const session of filteredSessions) {
      const hour = new Date(session.startTime).getHours();
      if (!byHour[hour]) {
        byHour[hour] = { sessions: 0, returnTotal: 0 };
      }
      byHour[hour].sessions += 1;
      byHour[hour].returnTotal += session.stats.returns;
    }

    let bestHour = -1;
    let bestHourReturnRate = 0;
    for (const [hourStr, data] of Object.entries(byHour)) {
      const avgReturn = data.returnTotal / data.sessions;
      if (avgReturn > bestHourReturnRate) {
        bestHour = Number(hourStr);
        bestHourReturnRate = avgReturn;
      }
    }

    const sortedByTime = [...filteredSessions].sort((a, b) => a.startTime - b.startTime);
    let totalGapMs = 0;
    let gapCount = 0;
    for (let i = 1; i < sortedByTime.length; i++) {
      const gapMs = sortedByTime[i].startTime - sortedByTime[i - 1].startTime;
      if (gapMs > 0) {
        totalGapMs += gapMs;
        gapCount += 1;
      }
    }

    const avgGapHours = gapCount > 0 ? totalGapMs / gapCount / (1000 * 60 * 60) : 0;

    return {
      avgSessionHours,
      bestHourLabel: bestHour >= 0 ? `${bestHour}:00-${bestHour}:59` : 'N/A',
      bestHourReturnRate,
      avgGapHours,
    };
  }, [filteredSessions]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!isPageVisible) {
    return (
      <div className="card p-8 text-center text-muted">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>Analytics is paused while the app is in the background.</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center text-muted">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No session data available. Complete some hunting sessions to see analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(
                e.target.value as '24h' | '7d' | '1m' | '3m' | '1y' | 'lifetime' | 'custom'
              )
            }
            className="input bg-surface-active border-border text-sm py-1.5"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="1m">Last 30 Days</option>
            <option value="3m">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="lifetime">Lifetime</option>
            <option value="custom">Custom Range</option>
          </select>
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input bg-surface-active border-border text-sm py-1.5"
              />
              <span className="text-muted">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input bg-surface-active border-border text-sm py-1.5"
              />
            </div>
          )}
        </div>
        <div className="text-sm text-muted">
          Across {lifetimeStats.totalSessions} session{lifetimeStats.totalSessions !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lifetime Stats Cards */}
      <div className="grid grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Total Loot</div>
          <div className="text-2xl font-bold text-green-400">
            {lifetimeStats.totalLoot.toFixed(2)} PED
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Total Cost</div>
          <div className="text-2xl font-bold text-red-400">
            {lifetimeStats.totalCost.toFixed(2)} PED
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Net Profit</div>
          <div
            className={`text-2xl font-bold ${lifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {lifetimeProfit >= 0 ? '+' : ''}
            {lifetimeProfit.toFixed(2)} PED
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Return Rate</div>
          <div
            className={`text-2xl font-bold ${lifetimeReturnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
          >
            {lifetimeReturnRate.toFixed(2)}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Total Kills</div>
          <div className="text-2xl font-bold text-body">
            {lifetimeStats.totalKills.toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Total Time</div>
          <div className="text-2xl font-bold text-body">
            {formatDuration(lifetimeStats.totalDuration)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Globals</div>
          <div className="text-2xl font-bold text-yellow-400">{lifetimeStats.totalGlobals}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Hall of Fame</div>
          <div className="text-2xl font-bold text-purple-400">{lifetimeStats.totalHofs}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Hit Rate</div>
          <div className="text-2xl font-bold text-blue-400">{lifetimeHitRate.toFixed(2)}%</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Avg Kill Value</div>
          <div className="text-2xl font-bold text-body">
            {lifetimeStats.totalKills > 0
              ? (lifetimeStats.totalLoot / lifetimeStats.totalKills).toFixed(2)
              : '0.00'}{' '}
            PED
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Situation Summary</h3>
            <p className="text-sm text-muted mt-1">
              Quick read of current hunting health before drilling into details.
            </p>
          </div>
          <div
            className={`text-sm px-3 py-1 rounded-full border ${lifetimeReturnRate >= 100
              ? 'text-green-300 border-green-400/30 bg-green-500/10'
              : 'text-red-300 border-red-400/30 bg-red-500/10'
              }`}
          >
            {lifetimeReturnRate >= 100 ? 'Profitable' : 'Under 100% Return'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Current Direction</div>
            <div
              className={`text-xl font-bold ${lifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {lifetimeProfit >= 0 ? 'Positive' : 'Negative'}
            </div>
            <div className="text-xs text-muted mt-1">{lifetimeProfit.toFixed(2)} PED net</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Session Consistency</div>
            <div className="text-xl font-bold text-blue-400">{sessionWinRate.toFixed(1)}%</div>
            <div className="text-xs text-muted mt-1">Profitable sessions</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Best Setup Snapshot</div>
            <div className="text-sm font-semibold truncate" title={bestWeapon?.weapon || 'N/A'}>
              Weapon: {bestWeapon?.weapon || 'N/A'}
            </div>
            <div
              className="text-sm font-semibold truncate mt-1"
              title={bestLocation?.location || 'N/A'}
            >
              Location: {bestLocation?.location || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <LootPerformanceSection
        avgLootValue={avgLootValue}
        overallLootStdDev={overallLootStdDev}
        largestDropValue={largestDropValue}
        avgMinutesPerLoot={avgMinutesPerLoot}
        totalLootEvents={totalLootEvents}
        totalGlobalsCount={totalGlobalsCount}
        totalHoFsCount={totalHoFsCount}
        globalDropRatePerKill={globalDropRatePerKill}
        globalDropRatePerHour={globalDropRatePerHour}
        avgGlobalValue={avgGlobalValue}
        bestGlobalValue={bestGlobalValue}
        topLootItems={topLootItems}
        allGlobals={allGlobals}
      />

      <PerformancePanelsSection
        recentSessions={recentSessions}
        loadoutData={loadoutData}
        locationData={locationData}
        costData={costData}
        weaponData={weaponData}
        topSkills={topSkills}
        armorData={armorData}
      />

      <AdvancedAnalyticsSection
        sessionWinRate={sessionWinRate}
        profitableStreaks={profitableStreaks}
        bestWeapon={bestWeapon}
        bestLocation={bestLocation}
        bestLoadout={bestLoadout}
        temporalInsights={temporalInsights}
        creatureAnalysis={creatureAnalysis}
        filteredSessions={filteredSessions}
        skillsByLocation={skillsByLocation}
        skillsByWeapon={skillsByWeapon}
        lifetimeAttributeGains={lifetimeAttributeGains}
        allSkillNames={allSkillNames}
        skillGainVariance={skillGainVariance}
        skillValuePerCost={skillValuePerCost}
        projectedLifetimeProfit={projectedLifetimeProfit}
        sessionsToBreakEven={sessionsToBreakEven}
      />

      <CorrelationAnalytics filteredSessions={filteredSessions} />

      <StatisticalInsights filteredSessions={filteredSessions} />
    </div>
  );
}
