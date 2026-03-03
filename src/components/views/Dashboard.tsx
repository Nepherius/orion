import { useState, useEffect } from 'react';
import { useHuntStore } from '../../store';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { ActiveSessionSidebar } from '../layout/ActiveSessionSidebar';
import { LiveTimer } from '../layout/LiveTimer';
import { StatCard } from '../common/StatCard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsModal } from '../analytics/AnalyticsModal';
import { PerformanceAnalytics } from '../analytics/PerformanceAnalytics';
import { EconomyAnalytics } from '../analytics/EconomyAnalytics';
import { EfficiencyAnalytics } from '../analytics/EfficiencyAnalytics';
import { SkillsAnalytics } from '../analytics/SkillsAnalytics';
import { CombatAnalytics } from '../analytics/CombatAnalytics';
import { HourlyRatesAnalytics } from '../analytics/HourlyRatesAnalytics';
import { GrindGoals } from '../analytics/GrindGoals';

export function Dashboard() {
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );
  const isPageVisible = usePageVisibility();

  type AnalyticsView =
    | 'performance'
    | 'economy'
    | 'efficiency'
    | 'skills'
    | 'combat'
    | 'hourly'
    | null;
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>(null);

  // Force a re-render every minute for live sessions to update hourly rates
  // Only update when the page is visible to avoid unnecessary re-renders
  const [, setTick] = useState(0);
  useEffect(() => {
    if (activeSession?.status !== 'active' || !isPageVisible) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [activeSession?.status, isPageVisible]);

  if (!activeSession) {
    return (
      <div className="card p-8 text-center text-muted">
        <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No active session. Start or resume a session to view the dashboard.</p>
      </div>
    );
  }

  const normalizeTimestampMs = (timestamp?: number) => {
    if (!timestamp) return undefined;
    return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  };

  const profit = activeSession.stats.totalLoot - activeSession.stats.totalCost;
  const now = Date.now();
  const startTimeMs = normalizeTimestampMs(activeSession.startTime) ?? now;
  const pausedAtMs = normalizeTimestampMs(activeSession.pausedAt);
  const endTimeMs = normalizeTimestampMs(activeSession.endTime);
  const elapsedReference = activeSession.status === 'completed' && endTimeMs ? endTimeMs : now;
  const pausedMs =
    (activeSession.totalPausedMs || 0) +
    (activeSession.status === 'paused' && pausedAtMs ? now - pausedAtMs : 0);
  const durationFromTimestamps = Math.max(0, elapsedReference - startTimeMs - pausedMs);
  const duration =
    activeSession.status === 'completed' && activeSession.stats.duration > 0
      ? activeSession.stats.duration * 1000
      : durationFromTimestamps;
  const durationMinutes = duration / 1000 / 60;
  const durationHours = durationMinutes / 60;

  // Calculate return rate over time
  const chartData = activeSession.loot.map((item, index) => {
    const cumulativeLoot = activeSession.loot
      .slice(0, index + 1)
      .reduce((sum, l) => sum + l.totalValue, 0);
    const returnRate =
      activeSession.stats.totalCost > 0
        ? (cumulativeLoot / activeSession.stats.totalCost) * 100
        : 0;
    return {
      name: `${index + 1}`,
      returnRate: Math.round(returnRate * 10) / 10, // Round to 1 decimal
      time: item.timestamp,
    };
  });

  // Combat calculations
  const totalHits = activeSession.stats.hits || 0;
  const totalCritHits = activeSession.stats.criticalHits || 0;
  const totalMisses = activeSession.stats.misses || 0;
  const totalDodges = activeSession.stats.dodges || 0;
  const totalEvades = activeSession.stats.evades || 0;
  const shotsFired = activeSession.stats.shotsFired || 0;
  const hitRate = shotsFired > 0 ? ((totalHits + totalCritHits) / shotsFired) * 100 : 0;
  const critRate = shotsFired > 0 ? (totalCritHits / shotsFired) * 100 : 0;
  const evasionRate =
    shotsFired + totalMisses > 0
      ? ((totalDodges + totalEvades) / (shotsFired + totalMisses)) * 100
      : 0;

  // Performance metrics
  const totalEvents = activeSession.stats.lootEvents;

  // Economy metrics
  const totalLoot = activeSession.stats.totalLoot;
  const totalSpend = activeSession.stats.totalCost;
  const costPerKill = activeSession.stats.kills > 0 ? totalSpend / activeSession.stats.kills : 0;
  const lootPerKill = activeSession.stats.kills > 0 ? totalLoot / activeSession.stats.kills : 0;
  const netPL = profit;
  const lootPerPED = totalSpend > 0 ? totalLoot / totalSpend : 0;

  // Efficiency metrics
  const dpp = activeSession.stats.kills > 0 ? totalSpend / activeSession.stats.kills : 0;
  const dps = durationMinutes > 0 ? totalSpend / durationMinutes : 0;
  const killsPerPED = totalSpend > 0 ? activeSession.stats.kills / totalSpend : 0;
  const killsPerHour = durationHours > 0 ? activeSession.stats.kills / durationHours : 0;
  const avgDmgPerHit =
    activeSession.stats.shotsFired > 0
      ? activeSession.stats.damageDealt / activeSession.stats.shotsFired
      : 0;
  const shotsPerKill =
    activeSession.stats.kills > 0 ? activeSession.stats.shotsFired / activeSession.stats.kills : 0;

  // Hourly rates
  const lootPerHour = durationHours > 0 ? totalLoot / durationHours : 0;
  const spendPerHour = durationHours > 0 ? totalSpend / durationHours : 0;
  const dmgPerHour = durationHours > 0 ? activeSession.stats.damageDealt / durationHours : 0;

  // Skill metrics
  const totalSkillGains = activeSession.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
  const totalSkillEvents = activeSession.skills.length;
  const skillsPerPed = totalSpend > 0 ? totalSkillGains / totalSpend : 0;
  const skillsPerHour = durationHours > 0 ? totalSkillGains / durationHours : 0;
  const skillsPerKill =
    activeSession.stats.kills > 0 ? totalSkillGains / activeSession.stats.kills : 0;
  const avgSkillValue = totalSkillEvents > 0 ? totalSkillGains / totalSkillEvents : 0;

  const formatSmallValue = (value: number, decimals: number = 2) => {
    const absolute = Math.abs(value);
    const threshold = Math.pow(10, -decimals);

    if (absolute === 0) {
      return value.toFixed(decimals);
    }

    if (absolute < threshold) {
      return `${value < 0 ? '-' : ''}<${threshold.toFixed(decimals)}`;
    }

    return value.toFixed(decimals);
  };

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-9 space-y-6">
          {/* Key Metrics */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">KEY METRICS</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="card p-6">
              <div className="text-sm text-muted mb-2">RETURN RATE</div>
              <div
                className={`text-4xl font-bold flex items-center gap-2 ${activeSession.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}`}
              >
                {activeSession.stats.returns >= 100 ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <TrendingDown className="w-6 h-6" />
                )}
                {activeSession.stats.returns.toFixed(1)}%
              </div>
            </div>
            <div className="card p-6">
              <div className="text-sm text-muted mb-2">PROFIT/LOSS</div>
              <div
                className={`text-4xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {profit >= 0 ? '+' : ''}
                {profit.toFixed(2)} PED
              </div>
            </div>
            <div className="card p-6">
              <div className="text-sm text-muted mb-2">TOTAL KILLS</div>
              <div className="text-4xl font-bold text-body">{activeSession.stats.kills}</div>
            </div>
          </div>

          {/* Return Rate Chart */}
          <div className="card p-6">
            <div className="text-xs text-muted uppercase mb-4">RETURN RATE OVER TIME</div>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted">
                No loot data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    label={{ value: 'Loot Event', position: 'insideBottomRight', offset: -5 }}
                    stroke="#9CA3AF"
                  />
                  <YAxis
                    label={{ value: 'Return Rate %', angle: -90, position: 'insideLeft' }}
                    stroke="#9CA3AF"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid #374151',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Return Rate']}
                    labelFormatter={(label) => `Event #${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="returnRate"
                    stroke={activeSession.stats.returns >= 100 ? '#22C55E' : '#EF4444'}
                    dot={{ fill: activeSession.stats.returns >= 100 ? '#22C55E' : '#EF4444', r: 4 }}
                    activeDot={{ r: 6 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Performance */}
            <div
              className="card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('performance')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-blue-400 uppercase">Performance</h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard
                  label="Return Rate"
                  value={`${activeSession.stats.returns.toFixed(1)}%`}
                  color={activeSession.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}
                />
                <StatCard
                  label="Profit/Loss"
                  value={`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} PED`}
                  color={profit >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <StatCard label="Skills/PED" value={skillsPerPed.toFixed(4)} />
                <StatCard
                  label="Hit Rate"
                  value={`${hitRate.toFixed(1)}%`}
                  color={hitRate >= 80 ? 'text-green-400' : 'text-yellow-400'}
                />
                <StatCard
                  label="Crit Rate"
                  value={`${critRate.toFixed(1)}%`}
                  color={critRate >= 5 ? 'text-yellow-400' : 'text-white'}
                />
                <StatCard label="Total Events" value={totalEvents} />
              </div>
            </div>

            {/* Economy */}
            <div
              className="card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('economy')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-blue-400 uppercase">Economy</h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard
                  label="Total Loot"
                  value={`${totalLoot.toFixed(2)} PED`}
                  color="text-green-400"
                />
                <StatCard
                  label="Total Spend"
                  value={`${totalSpend.toFixed(2)} PED`}
                  color="text-red-400"
                />
                <StatCard label="Cost/Kill" value={`${costPerKill.toFixed(2)} PED`} />
                <StatCard label="Loot/Kill" value={`${lootPerKill.toFixed(2)} PED`} />
                <StatCard
                  label="Net P/L"
                  value={`${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)} PED`}
                  color={netPL >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <StatCard label="Loot/PED" value={lootPerPED.toFixed(3)} />
              </div>
            </div>

            {/* Efficiency */}
            <div
              className="card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('efficiency')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-blue-400 uppercase">Efficiency</h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard label="DPP" value={dpp.toFixed(2)} />
                <StatCard label="DPS" value={dps.toFixed(2)} />
                <StatCard label="Kills/PED" value={killsPerPED.toFixed(2)} />
                <StatCard label="Kills/Hour" value={killsPerHour.toFixed(1)} />
                <StatCard label="Avg Dmg/Hit" value={avgDmgPerHit.toFixed(1)} />
                <StatCard label="Shots/Kill" value={shotsPerKill.toFixed(1)} />
              </div>
            </div>
          </div>

          {/* Bottom Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Skills */}
            <div
              className="card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('skills')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-blue-400 uppercase">Skills</h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard label="Total Gains" value={totalSkillGains.toFixed(4)} />
                <StatCard label="Skill Events" value={totalSkillEvents} />
                <StatCard label="Skills/PED" value={skillsPerPed.toFixed(4)} />
                <StatCard label="Skills/Hour" value={skillsPerHour.toFixed(4)} />
                <StatCard label="Skills/Kill" value={skillsPerKill.toFixed(4)} />
                <StatCard label="Avg Skill Value" value={avgSkillValue.toFixed(4)} />
              </div>
            </div>

            {/* Combat */}
            <div
              className="card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('combat')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-blue-400 uppercase">Combat</h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard label="Kills" value={activeSession.stats.kills} />
                <StatCard
                  label="Total Damage Out"
                  value={activeSession.stats.damageDealt.toFixed(0)}
                />
                <StatCard
                  label="Total Damage In"
                  value={(activeSession.stats.damageTaken || 0).toFixed(0)}
                  color="text-red-400"
                />
                <StatCard
                  label="Total Healing"
                  value={(activeSession.stats.totalHealing || 0).toFixed(0)}
                  color="text-green-400"
                />
                <StatCard label="Shots Fired" value={activeSession.stats.shotsFired} />
                <StatCard label="Hits" value={totalHits} color="text-green-400" />
                <StatCard
                  label="Critical Hits"
                  value={activeSession.stats.criticalHits || 0}
                  color="text-yellow-400"
                />
                <StatCard label="Misses" value={totalMisses} color="text-muted" />
                <StatCard label="Dodges" value={totalDodges} color="text-red-400" />
                <StatCard label="Evades" value={totalEvades} color="text-blue-400" />
                <StatCard
                  label="Hit Rate"
                  value={`${hitRate.toFixed(1)}%`}
                  color={hitRate >= 80 ? 'text-green-400' : 'text-yellow-400'}
                />
                <StatCard
                  label="Crit Rate"
                  value={`${critRate.toFixed(1)}%`}
                  color={critRate >= 5 ? 'text-yellow-400' : 'text-white'}
                />
                <StatCard
                  label="Evasion Rate"
                  value={`${evasionRate.toFixed(1)}%`}
                  color={evasionRate >= 20 ? 'text-green-400' : 'text-body'}
                />
              </div>
            </div>

            {/* Hourly Rates */}
            <div
              className="card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('hourly')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-blue-400 uppercase">Hourly Rates</h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard label="Loot/Hour" value={`${formatSmallValue(lootPerHour)} PED`} />
                <StatCard label="Spend/Hour" value={`${formatSmallValue(spendPerHour)} PED`} />
                <StatCard label="Skills/Hour" value={formatSmallValue(skillsPerHour)} />
                <StatCard label="Kills/Hour" value={killsPerHour.toFixed(1)} />
                <StatCard label="Dmg/Hour" value={formatSmallValue(dmgPerHour)} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted">Combat Time</div>
                  <div className="font-semibold text-body">
                    <LiveTimer
                      startTime={activeSession.startTime}
                      isRunning={activeSession.status === 'active'}
                      pausedAt={activeSession.pausedAt}
                      pausedDurationMs={activeSession.totalPausedMs || 0}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Session Sidebar */}
        <div className="col-span-3 flex flex-col pt-14">
          <div className="mb-6 flex flex-1 overflow-hidden min-h-[300px]">
            <GrindGoals />
          </div>
          <ActiveSessionSidebar />
        </div>
      </div>

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={!!analyticsView}
        onClose={() => setAnalyticsView(null)}
        title={
          analyticsView === 'performance'
            ? 'Performance Analytics'
            : analyticsView === 'economy'
              ? 'Economy Analytics'
              : analyticsView === 'efficiency'
                ? 'Efficiency Analytics'
                : analyticsView === 'skills'
                  ? 'Skills Analytics'
                  : analyticsView === 'combat'
                    ? 'Combat Analytics'
                    : analyticsView === 'hourly'
                      ? 'Hourly Rates Analytics'
                      : 'Analytics'
        }
      >
        {analyticsView === 'performance' && <PerformanceAnalytics session={activeSession} />}
        {analyticsView === 'economy' && <EconomyAnalytics session={activeSession} />}
        {analyticsView === 'efficiency' && <EfficiencyAnalytics session={activeSession} />}
        {analyticsView === 'skills' && <SkillsAnalytics session={activeSession} />}
        {analyticsView === 'combat' && <CombatAnalytics session={activeSession} />}
        {analyticsView === 'hourly' && <HourlyRatesAnalytics session={activeSession} />}
      </AnalyticsModal>
    </>
  );
}
