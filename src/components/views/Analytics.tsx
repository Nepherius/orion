import { useMemo, useState } from 'react';
import { useHuntStore } from '../../store';
import { BarChart3 } from 'lucide-react';
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

export function Analytics() {
  const sessions = useHuntStore((state) => state.sessions);
  const loadouts = useHuntStore((state) => state.loadouts);

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
        acc.repair += session.repairCost;
        acc.armor += session.armorDecay;
        acc.healing += session.healingCost;
        acc.other += session.otherCosts;
        return acc;
      },
      { ammo: 0, repair: 0, armor: 0, healing: 0, other: 0 }
    );

    return [
      { name: 'Ammo', value: costBreakdown.ammo, color: '#EF4444' },
      { name: 'Repair', value: costBreakdown.repair, color: '#F59E0B' },
      { name: 'Armor', value: costBreakdown.armor, color: '#3B82F6' },
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

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (sessions.length === 0) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center text-gray-400">
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
            className="input bg-gray-900 border-gray-700 text-sm py-1.5"
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
                className="input bg-gray-900 border-gray-700 text-sm py-1.5"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input bg-gray-900 border-gray-700 text-sm py-1.5"
              />
            </div>
          )}
        </div>
        <div className="text-sm text-gray-400">
          Across {lifetimeStats.totalSessions} session{lifetimeStats.totalSessions !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lifetime Stats Cards */}
      <div className="grid grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Total Loot</div>
          <div className="text-2xl font-bold text-green-400">
            {lifetimeStats.totalLoot.toFixed(2)} PED
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Total Cost</div>
          <div className="text-2xl font-bold text-red-400">
            {lifetimeStats.totalCost.toFixed(2)} PED
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Net Profit</div>
          <div
            className={`text-2xl font-bold ${lifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {lifetimeProfit >= 0 ? '+' : ''}
            {lifetimeProfit.toFixed(2)} PED
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Return Rate</div>
          <div
            className={`text-2xl font-bold ${lifetimeReturnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
          >
            {lifetimeReturnRate.toFixed(2)}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Total Kills</div>
          <div className="text-2xl font-bold text-white">
            {lifetimeStats.totalKills.toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Total Time</div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(lifetimeStats.totalDuration)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Globals</div>
          <div className="text-2xl font-bold text-yellow-400">{lifetimeStats.totalGlobals}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Hall of Fame</div>
          <div className="text-2xl font-bold text-purple-400">{lifetimeStats.totalHofs}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Hit Rate</div>
          <div className="text-2xl font-bold text-blue-400">{lifetimeHitRate.toFixed(2)}%</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-400 mb-1">Avg Kill Value</div>
          <div className="text-2xl font-bold text-white">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
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

      {/* Two column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sessions by Location */}
        {locationData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Performance by Location</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 text-xs font-bold text-gray-400 pb-2 border-b border-gray-700">
                <div>Location</div>
                <div className="text-right">Sessions</div>
                <div className="text-right">Return %</div>
                <div className="text-right">Profit</div>
                <div className="text-right">Globals</div>
              </div>
              {locationData.map((loc) => (
                <div
                  key={loc.location}
                  className="grid grid-cols-5 gap-2 text-sm py-1 hover:bg-gray-750"
                >
                  <div className="truncate" title={loc.location}>
                    {loc.location}
                  </div>
                  <div className="text-right text-gray-400">{loc.sessions}</div>
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
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="weapon" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Bar dataKey="returnRate" fill="#10B981" name="Return Rate %" />
              <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Loadout Performance */}
      {loadoutData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Loadout Performance</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-gray-400 pb-2 border-b border-gray-700">
              <div>Loadout</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Profit</div>
              <div className="text-right">Avg Kills</div>
            </div>
            {loadoutData.map((loadout) => (
              <div
                key={loadout.name}
                className="grid grid-cols-5 gap-2 text-sm py-2 hover:bg-gray-750"
              >
                <div className="font-semibold truncate" title={loadout.name}>
                  {loadout.name}
                </div>
                <div className="text-right text-gray-400">{loadout.sessions}</div>
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

      {/* Top Globals */}
      {allGlobals.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">
            Top Globals {allGlobals.some((g) => g.isHoF) && '& Hall of Fame'}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-gray-400 pb-2 border-b border-gray-700 sticky top-0 bg-gray-800">
              <div>Creature</div>
              <div className="text-right">Value</div>
              <div>Session</div>
              <div>Location</div>
              <div className="text-right">Date</div>
            </div>
            {allGlobals.map((global) => (
              <div
                key={global.id}
                className={`grid grid-cols-5 gap-2 text-sm py-2 hover:bg-gray-750 ${global.isHoF ? 'bg-purple-900/20' : ''}`}
              >
                <div className="font-semibold text-yellow-400 flex items-center gap-1">
                  {global.isHoF && <span className="text-purple-400">★</span>}
                  {global.creature}
                </div>
                <div className="text-right font-bold text-green-400">
                  {global.value.toFixed(2)} PED
                </div>
                <div className="truncate text-gray-400" title={global.sessionName}>
                  {global.sessionName}
                </div>
                <div className="truncate text-gray-400" title={global.location || 'Unknown'}>
                  {global.location || 'Unknown'}
                </div>
                <div className="text-right text-gray-400">
                  {format(global.timestamp, 'MM/dd/yy')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Loot Items */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4">Top Loot Items by Value</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-5 gap-2 text-xs font-bold text-gray-400 pb-2 border-b border-gray-700">
            <div className="col-span-2">Item Name</div>
            <div className="text-right">Total Value</div>
            <div className="text-right">Drops</div>
            <div className="text-right">Avg/Drop</div>
          </div>
          {topLootItems.map((item) => (
            <div key={item.name} className="grid grid-cols-5 gap-2 text-sm py-1 hover:bg-gray-750">
              <div className="col-span-2 truncate" title={item.name}>
                {item.name}
              </div>
              <div className="text-right font-semibold text-green-400">
                {item.totalValue.toFixed(2)} PED
              </div>
              <div className="text-right text-gray-400">{item.drops}</div>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={150} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => value.toFixed(4)}
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
            <div className="grid grid-cols-4 gap-2 text-xs font-bold text-gray-400 pb-2 border-b border-gray-700">
              <div>Armor</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Avg Damage Taken</div>
            </div>
            {armorData.map((armor) => (
              <div
                key={armor.armor}
                className="grid grid-cols-4 gap-2 text-sm py-2 hover:bg-gray-750"
              >
                <div className="truncate" title={armor.armor}>
                  {armor.armor}
                </div>
                <div className="text-right text-gray-400">{armor.sessions}</div>
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
    </div>
  );
}
