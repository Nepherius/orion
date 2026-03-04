import { useMemo, useState } from 'react';
import { useHuntStore } from '../../store';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { BarChart3, AlertCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { InfoTooltip } from '../common/InfoTooltip';
import { CreatureAnalytics } from '../analytics/CreatureAnalytics';
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
        const weapon = session.weapon || 'Unknown';
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
  }, [filteredSessions]);

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
    const loadoutPerformance = filteredSessions
      .filter((s) => s.loadoutId)
      .reduce(
        (acc, session) => {
          const loadout = loadouts.find((l) => l.id === session.loadoutId);
          const loadoutName = loadout?.name || 'Unknown';
          if (!acc[loadoutName]) {
            acc[loadoutName] = {
              sessions: 0,
              totalLoot: 0,
              totalCost: 0,
              totalKills: 0,
            };
          }
          acc[loadoutName].sessions += 1;
          acc[loadoutName].totalLoot += session.stats.totalLoot;
          acc[loadoutName].totalCost += session.stats.totalCost;
          acc[loadoutName].totalKills += session.stats.kills;
          return acc;
        },
        {} as Record<
          string,
          { sessions: number; totalLoot: number; totalCost: number; totalKills: number }
        >
      );

    return Object.entries(loadoutPerformance)
      .map(([name, data]) => ({
        name,
        sessions: data.sessions,
        returnRate: data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0,
        profit: data.totalLoot - data.totalCost,
        avgKills: data.sessions > 0 ? data.totalKills / data.sessions : 0,
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

  // Category 12: Predictive Metrics
  const projectedLifetimeProfit = useMemo(() => {
    return calculateProjectedLifetimeProfit(filteredSessions);
  }, [filteredSessions]);

  const sessionsToBreakEven = useMemo(() => {
    return calculateSessionsToBreakEven(filteredSessions);
  }, [filteredSessions]);

  // Category 8: Comparative Analytics
  const bestWeapon = useMemo(() => {
    return weaponData.length > 0 ? weaponData[0] : null;
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

      {/* Performance Over Time */}
      {recentSessions.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Performance Trend (Last 30 Sessions)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recentSessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="returnRate"
                stroke="#10B981"
                name="Return Rate %"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="loot"
                stroke="#3B82F6"
                name="Loot (PED)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Loadout Performance */}
      {loadoutData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Loadout Performance</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
              <div>Loadout</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Profit</div>
              <div className="text-right">Avg Kills</div>
            </div>
            {loadoutData.map((loadout) => (
              <div
                key={loadout.name}
                className="grid grid-cols-5 gap-2 text-sm py-2 hover:bg-surface-hover"
              >
                <div className="font-semibold truncate" title={loadout.name}>
                  {loadout.name}
                </div>
                <div className="text-right text-muted">{loadout.sessions}</div>
                <div
                  className={`text-right font-bold ${loadout.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {loadout.returnRate.toFixed(2)}%
                </div>
                <div
                  className={`text-right ${loadout.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {loadout.profit >= 0 ? '+' : ''}
                  {loadout.profit.toFixed(2)}
                </div>
                <div className="text-right">{loadout.avgKills.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sessions by Location */}
        {locationData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Performance by Location</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
                <div>Location</div>
                <div className="text-right">Sessions</div>
                <div className="text-right">Return %</div>
                <div className="text-right">Profit</div>
                <div className="text-right">Globals</div>
              </div>
              {locationData.map((loc) => (
                <div
                  key={loc.location}
                  className="grid grid-cols-5 gap-2 text-sm py-1 hover:bg-surface-hover"
                >
                  <div className="truncate" title={loc.location}>
                    {loc.location}
                  </div>
                  <div className="text-right text-muted">{loc.sessions}</div>
                  <div
                    className={`text-right font-semibold ${loc.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {loc.returnRate.toFixed(2)}%
                  </div>
                  <div
                    className={`text-right ${loc.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {loc.profit >= 0 ? '+' : ''}
                    {loc.profit.toFixed(2)}
                  </div>
                  <div className="text-right text-yellow-400">{loc.globals}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Cost Breakdown</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(2)} PED`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value: number) => `${value.toFixed(2)} PED`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weapon Performance */}
      {weaponData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Weapon Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weaponData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="weapon"
                stroke="var(--color-text-muted)"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Bar dataKey="returnRate" fill="#10B981" name="Return Rate %" />
              <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Globals */}
      {allGlobals.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">
            Top Globals {allGlobals.some((g) => g.isHoF) && '& Hall of Fame'}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border sticky top-0 bg-surface">
              <div>Creature</div>
              <div className="text-right">Value</div>
              <div>Session</div>
              <div>Location</div>
              <div className="text-right">Date</div>
            </div>
            {allGlobals.map((global) => (
              <div
                key={global.id}
                className={`grid grid-cols-5 gap-2 text-sm py-2 hover:bg-surface-hover ${global.isHoF ? 'bg-purple-900/20' : ''}`}
              >
                <div className="font-semibold text-yellow-400 flex items-center gap-1">
                  {global.isHoF && <span className="text-purple-400">★</span>}
                  {global.creature}
                </div>
                <div className="text-right font-bold text-green-400">
                  {global.value.toFixed(2)} PED
                </div>
                <div className="truncate text-muted" title={global.sessionName}>
                  {global.sessionName}
                </div>
                <div className="truncate text-muted" title={global.location || 'Unknown'}>
                  {global.location || 'Unknown'}
                </div>
                <div className="text-right text-muted">{format(global.timestamp, 'MM/dd/yy')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Loot Items */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4">Top Loot Items by Value</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
            <div className="col-span-2">Item Name</div>
            <div className="text-right">Total Value</div>
            <div className="text-right">Drops</div>
            <div className="text-right">Avg/Drop</div>
          </div>
          {topLootItems.map((item) => (
            <div
              key={item.name}
              className="grid grid-cols-5 gap-2 text-sm py-1 hover:bg-surface-hover"
            >
              <div className="col-span-2 truncate" title={item.name}>
                {item.name}
              </div>
              <div className="text-right font-semibold text-green-400">
                {item.totalValue.toFixed(2)} PED
              </div>
              <div className="text-right text-muted">{item.drops}</div>
              <div className="text-right">{item.avgValue.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Gained */}
      {topSkills.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Top Skills Gained</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topSkills} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" stroke="var(--color-text-muted)" />
              <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" width={150} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Bar dataKey="total" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Armor Performance */}
      {armorData.length > 0 && armorData.some((a) => a.armor !== 'None') && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Armor Performance</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
              <div>Armor</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Avg Damage Taken</div>
            </div>
            {armorData.map((armor) => (
              <div
                key={armor.armor}
                className="grid grid-cols-4 gap-2 text-sm py-2 hover:bg-surface-hover"
              >
                <div className="truncate" title={armor.armor}>
                  {armor.armor}
                </div>
                <div className="text-right text-muted">{armor.sessions}</div>
                <div
                  className={`text-right font-semibold ${armor.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {armor.returnRate.toFixed(1)}%
                </div>
                <div className="text-right">{armor.avgDamageTaken.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category 2: Loot Quality & Consistency */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Loot Quality & Consistency</h3>
          <InfoTooltip tooltip="Analyzes loot value distribution and drop frequency" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Average Drop Value</div>
            <div className="text-2xl font-bold text-green-400">{avgLootValue.toFixed(2)} PED</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Loot Consistency (Std Dev)
              <InfoTooltip tooltip="Std dev of all filtered loot values; lower means more consistent drops" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{overallLootStdDev.toFixed(1)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Largest Drop</div>
            <div className="text-2xl font-bold text-yellow-400">
              {largestDropValue.toFixed(2)} PED
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Minutes Per Loot
              <InfoTooltip tooltip="Average time between loot drops" />
            </div>
            <div className="text-2xl font-bold text-body">{avgMinutesPerLoot.toFixed(1)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total Loot Events</div>
            <div className="text-2xl font-bold text-purple-400">
              {filteredSessions.reduce((sum, s) => sum + s.loot.length, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Category 3: Global & HoF Analysis */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Global & Hall of Fame Analysis</h3>
          <InfoTooltip tooltip="Tracks global drop rates and HoF occurrences" />
        </div>
        <div className="grid grid-cols-6 gap-4">
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total Globals</div>
            <div className="text-2xl font-bold text-yellow-400">{totalGlobalsCount}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total HoFs</div>
            <div className="text-2xl font-bold text-purple-400">{totalHoFsCount}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Global/Kill
              <InfoTooltip tooltip="Number of globals per kill" />
            </div>
            <div className="text-2xl font-bold text-body">{globalDropRatePerKill.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Global/Hour
              <InfoTooltip tooltip="Globals per hour of hunting" />
            </div>
            <div className="text-2xl font-bold text-body">{globalDropRatePerHour.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Avg Global Value</div>
            <div className="text-2xl font-bold text-green-400">{avgGlobalValue.toFixed(2)} PED</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Best Global</div>
            <div className="text-2xl font-bold text-green-400">
              {bestGlobalValue.toFixed(2)} PED
            </div>
          </div>
        </div>
      </div>

      {/* Category 4: Session Reliability & Streaks */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Session Reliability & Streaks</h3>
          <InfoTooltip tooltip="Session profitability patterns and consistency" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Win Rate
              <InfoTooltip tooltip="Percentage of profitable sessions" />
            </div>
            <div className="text-3xl font-bold text-green-400">{sessionWinRate.toFixed(1)}%</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Current Streak
              <InfoTooltip tooltip="Consecutive profitable sessions (most recent first)" />
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {profitableStreaks.currentStreak}
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Longest Streak
              <InfoTooltip tooltip="Best consecutive profitable sessions" />
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {profitableStreaks.longestStreak}
            </div>
          </div>
        </div>
      </div>

      {/* Category 8: Comparative Analytics */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Comparative Analytics</h3>
          <InfoTooltip tooltip="Best performing setup comparisons" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Best Weapon
              <InfoTooltip tooltip="Highest return rate weapon with existing data" />
            </div>
            <div
              className="text-lg font-bold text-blue-400 truncate"
              title={bestWeapon?.weapon || 'N/A'}
            >
              {bestWeapon?.weapon || 'N/A'}
            </div>
            <div className="text-sm text-muted mt-1">
              {bestWeapon ? `${bestWeapon.returnRate.toFixed(1)}% return` : 'Not enough data'}
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Best Location
              <InfoTooltip tooltip="Highest return location with at least 2 sessions" />
            </div>
            <div
              className="text-lg font-bold text-green-400 truncate"
              title={bestLocation?.location || 'N/A'}
            >
              {bestLocation?.location || 'N/A'}
            </div>
            <div className="text-sm text-muted mt-1">
              {bestLocation ? `${bestLocation.returnRate.toFixed(1)}% return` : 'Need 2+ sessions'}
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Best Loadout
              <InfoTooltip tooltip="Highest return loadout with at least 2 sessions" />
            </div>
            <div
              className="text-lg font-bold text-purple-400 truncate"
              title={bestLoadout?.name || 'N/A'}
            >
              {bestLoadout?.name || 'N/A'}
            </div>
            <div className="text-sm text-muted mt-1">
              {bestLoadout ? `${bestLoadout.returnRate.toFixed(1)}% return` : 'Need 2+ sessions'}
            </div>
          </div>
        </div>
      </div>

      {/* Category 11: Temporal Analytics */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Temporal Analytics</h3>
          <InfoTooltip tooltip="Time-based behavior and performance patterns" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Avg Session Duration
              <InfoTooltip tooltip="Average active session length in hours" />
            </div>
            <div className="text-2xl font-bold text-body">
              {temporalInsights.avgSessionHours.toFixed(2)}h
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Peak Performance Window
              <InfoTooltip tooltip="Start-hour window with highest average return rate" />
            </div>
            <div className="text-lg font-bold text-green-400">{temporalInsights.bestHourLabel}</div>
            <div className="text-sm text-muted mt-1">
              {temporalInsights.bestHourReturnRate.toFixed(1)}% avg return
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Avg Cooldown Gap
              <InfoTooltip tooltip="Average hours between session starts" />
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {temporalInsights.avgGapHours.toFixed(2)}h
            </div>
          </div>
        </div>
      </div>

      {/* Category 7: Creature Analysis */}
      {creatureAnalysis.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Creature Analysis</h3>
            <InfoTooltip tooltip="Profitability and frequency by creature type" />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-6 gap-2 text-xs font-bold text-muted pb-2 border-b border-border sticky top-0 bg-surface">
              <div>Creature</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Profit</div>
              <div className="text-right">Kills</div>
              <div className="text-right">Globals</div>
            </div>
            {creatureAnalysis.map((creature) => (
              <div
                key={creature.creature}
                className="grid grid-cols-6 gap-2 text-sm py-2 hover:bg-surface-hover"
              >
                <div className="font-semibold truncate">{creature.creature}</div>
                <div className="text-right text-muted">{creature.count}</div>
                <div
                  className={`text-right ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creature.returnRate.toFixed(1)}%
                </div>
                <div
                  className={`text-right ${creature.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creature.profit >= 0 ? '+' : ''}
                  {creature.profit.toFixed(0)}
                </div>
                <div className="text-right">{creature.totalKills}</div>
                <div className="text-right text-yellow-400">{creature.totalGlobals}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category 7b: Detailed Creature Analytics */}
      {filteredSessions.length > 0 && <CreatureAnalytics sessions={filteredSessions} />}

      {/* Category 10: Skill Efficiency */}
      <div className="grid grid-cols-2 gap-6">
        {skillsByLocation.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">Skills by Location</h3>
              <InfoTooltip tooltip="Total skill gains grouped by location" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByLocation.slice(0, 10).map((item) => (
                <div
                  key={item.location}
                  className="flex justify-between p-2 border-b border-border"
                >
                  <span className="text-gray-300 truncate">{item.location || 'Unknown'}</span>
                  <span className="font-semibold text-blue-400">{item.skillGains.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {skillsByWeapon.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">Skills by Weapon</h3>
              <InfoTooltip tooltip="Total skill gains grouped by weapon" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByWeapon.slice(0, 10).map((item) => (
                <div key={item.weapon} className="flex justify-between p-2 border-b border-border">
                  <span className="text-gray-300 truncate">{item.weapon}</span>
                  <span className="font-semibold text-purple-400">
                    {item.skillGains.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attributes Panel */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Attributes</h3>
          <InfoTooltip tooltip="Core character attributes advancement across all hunts. These are fundamental progression elements." />
        </div>
        {Object.values(lifetimeAttributeGains).some((attr) => attr.gains > 0) ? (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(lifetimeAttributeGains)
              .map(([name, data]) => ({ name, ...data }))
              .sort((a, b) => b.gains - a.gains)
              .map((attr) => {
                const attributeDescriptions: Record<string, string> = {
                  Agility:
                    'Affects coordination, finesse, and grace; influences movement speed and is vital for many professions.',
                  Health: 'Determines how much damage your avatar can withstand before dying.',
                  Intelligence: 'Impacts actions involving the mind, memory, and reasoning.',
                  Psyche: 'Influences willpower, mental strength, and mindforce.',
                  Stamina: 'Affects bodily hardiness, constitution, and physical toughness.',
                  Strength: 'Governs raw muscle power, lifting capacity, and brute force.',
                };
                return (
                  <div key={attr.name} className="border border-border rounded p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-sm mb-1">{attr.name}</div>
                        <div className="text-xs text-muted mb-2">
                          {attributeDescriptions[attr.name]}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-border">
                      <div className="text-2xl font-bold text-cyan-400">
                        {attr.gains.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted">{attr.count} events</div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center text-muted py-8">No attribute gains recorded</div>
        )}
      </div>

      {/* Debug: Show all skill names for attribute identification */}
      <div className="card p-6 border-yellow-500/30">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-bold text-yellow-400">All Skills Tracked</h3>
          <InfoTooltip tooltip="Complete list of skill names in your data." />
        </div>
        <div className="text-xs text-muted space-y-1 max-h-32 overflow-y-auto">
          {allSkillNames.length === 0 ? (
            <span>No skills tracked</span>
          ) : (
            allSkillNames.map((skill) => (
              <div key={skill} className="p-1 bg-gray-700/20 rounded px-2">
                {skill}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Skill Metrics</h3>
          <InfoTooltip tooltip="Overall skill efficiency and consistency" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Skill Gain Variance
              <InfoTooltip tooltip="Variability in skill gains per session. Lower = consistent" />
            </div>
            <div className="text-2xl font-bold text-body">{skillGainVariance.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Skills Per PED
              <InfoTooltip tooltip="Skill gains per PED spent. Efficiency metric" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{skillValuePerCost.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total Skill Gains</div>
            <div className="text-2xl font-bold text-green-400">
              {filteredSessions
                .reduce((sum, s) => sum + s.skills.reduce((ss, sk) => ss + sk.gainAmount, 0), 0)
                .toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Category 12: Projections & Predictions */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Projections & Predictions</h3>
          <InfoTooltip tooltip="Based on recent session trends (last 10 sessions)" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Projected Lifetime Profit
              <InfoTooltip tooltip="Projection = all-time total + average recent trend" />
            </div>
            <div
              className={`text-2xl font-bold ${projectedLifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {projectedLifetimeProfit >= 0 ? '+' : ''}
              {projectedLifetimeProfit.toFixed(2)} PED
            </div>
          </div>
          {sessionsToBreakEven !== null && (
            <div className="border border-border rounded p-4">
              <div className="flex items-center gap-1 text-sm text-muted mb-2">
                Sessions to Break Even
                <InfoTooltip tooltip="Sessions needed at current avg profit to reach 0" />
              </div>
              <div className="text-2xl font-bold text-orange-400">{sessionsToBreakEven}</div>
            </div>
          )}
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Data Points
              <InfoTooltip tooltip="Number of sessions analyzed" />
            </div>
            <div className="text-2xl font-bold text-body">{filteredSessions.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
