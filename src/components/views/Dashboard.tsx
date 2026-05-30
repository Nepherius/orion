import { useState, useEffect } from 'react';
import { useHuntStore } from '../../store';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { ActiveSessionSidebar } from '../layout/ActiveSessionSidebar';
import { LiveTimer } from '../layout/LiveTimer';
import { StatCard } from '../common/StatCard';
import { AnalyticsModal } from '../analytics/AnalyticsModal';
import { PerformanceAnalytics } from '../analytics/PerformanceAnalytics';
import { EconomyAnalytics } from '../analytics/EconomyAnalytics';
import { EfficiencyAnalytics } from '../analytics/EfficiencyAnalytics';
import { SkillsAnalytics } from '../analytics/SkillsAnalytics';
import { CombatAnalytics } from '../analytics/CombatAnalytics';
import { HourlyRatesAnalytics } from '../analytics/HourlyRatesAnalytics';
import { HealingAnalytics } from '../analytics/HealingAnalytics';
import { GrindGoals } from '../analytics/GrindGoals';
import { ReturnRateChart } from '../analytics/ReturnRateChart';
import { getSessionActiveDurationMs } from '../../utils/sessionTiming';
import { formatSmallNumber } from '../../utils/formatters';
import { MetricTile, Panel } from '../common/Panel';

interface DashboardProps {
  sessionId?: string;
  showSidebar?: boolean;
}

export function Dashboard({ sessionId, showSidebar = true }: DashboardProps = {}) {
  const sessionFromSelection = useHuntStore((state) =>
    sessionId ? state.sessions.find((s) => s.id === sessionId) || null : null
  );
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );
  const session = sessionId ? sessionFromSelection : activeSession;
  const isPageVisible = usePageVisibility();

  type AnalyticsView =
    | 'performance'
    | 'economy'
    | 'efficiency'
    | 'skills'
    | 'combat'
    | 'hourly'
    | 'healing'
    | null;
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>(null);

  // Force a re-render every minute for live sessions to update hourly rates
  // Only update when the page is visible to avoid unnecessary re-renders
  const [, setTick] = useState(0);
  useEffect(() => {
    if (session?.status !== 'active' || !isPageVisible) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [session?.status, isPageVisible]);

  if (!session) {
    return (
      <div className="card p-8 text-center text-muted">
        <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No session selected. Pick a session from Sessions or start one to view Hunt View.</p>
      </div>
    );
  }

  const profit = session.stats.totalLoot - session.stats.totalCost;
  const now = Date.now();
  const duration = getSessionActiveDurationMs(session, now);
  const durationMinutes = duration / 1000 / 60;
  const durationHours = durationMinutes / 60;

  // Combat calculations
  const totalHits = session.stats.hits || 0;
  const totalCritHits = session.stats.criticalHits || 0;
  const totalMisses = session.stats.misses || 0;
  const totalDodges = session.stats.dodges || 0;
  const totalEvades = session.stats.evades || 0;
  const shotsFired = session.stats.shotsFired || 0;
  const hitRate = shotsFired > 0 ? ((totalHits + totalCritHits) / shotsFired) * 100 : 0;
  const critRate = shotsFired > 0 ? (totalCritHits / shotsFired) * 100 : 0;
  const evasionRate =
    shotsFired + totalMisses > 0
      ? ((totalDodges + totalEvades) / (shotsFired + totalMisses)) * 100
      : 0;

  // Performance metrics
  const totalEvents = session.stats.lootEvents;

  // Economy metrics
  const totalLoot = session.stats.totalLoot;
  const totalSpend = session.stats.totalCost;
  const costPerKill = session.stats.kills > 0 ? totalSpend / session.stats.kills : 0;
  const lootPerKill = session.stats.kills > 0 ? totalLoot / session.stats.kills : 0;
  const netPL = profit;
  const lootPerPED = totalSpend > 0 ? totalLoot / totalSpend : 0;

  // Efficiency metrics
  const dpp = session.stats.kills > 0 ? totalSpend / session.stats.kills : 0;
  const dps = durationMinutes > 0 ? totalSpend / durationMinutes : 0;
  const killsPerPED = totalSpend > 0 ? session.stats.kills / totalSpend : 0;
  const killsPerHour = durationHours > 0 ? session.stats.kills / durationHours : 0;
  const avgDmgPerHit =
    session.stats.shotsFired > 0 ? session.stats.damageDealt / session.stats.shotsFired : 0;
  const shotsPerKill = session.stats.kills > 0 ? session.stats.shotsFired / session.stats.kills : 0;

  // Hourly rates
  const lootPerHour = durationHours > 0 ? totalLoot / durationHours : 0;
  const spendPerHour = durationHours > 0 ? totalSpend / durationHours : 0;
  const dmgPerHour = durationHours > 0 ? session.stats.damageDealt / durationHours : 0;

  // Skill metrics
  const totalSkillGains = session.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
  const totalSkillEvents = session.skills.length;
  const skillsPerPed = totalSpend > 0 ? totalSkillGains / totalSpend : 0;
  const skillsPerHour = durationHours > 0 ? totalSkillGains / durationHours : 0;
  const skillsPerKill = session.stats.kills > 0 ? totalSkillGains / session.stats.kills : 0;
  const avgSkillValue = totalSkillEvents > 0 ? totalSkillGains / totalSkillEvents : 0;

  // Healing metrics
  const totalHealing = session.stats.totalHealing || 0;
  const healsUsed = session.stats.healsUsed || 0;
  const healingCost = session.healingCost || 0;
  const avgHealAmount = healsUsed > 0 ? totalHealing / healsUsed : 0;
  const costPerHeal = healsUsed > 0 ? healingCost / healsUsed : 0;
  const healingEfficiency = healingCost > 0 ? totalHealing / healingCost : 0;

  const mainColumnSpanClass = showSidebar ? 'col-span-9' : 'col-span-12';

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className={`${mainColumnSpanClass} space-y-6`}>
          {/* Key Metrics */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Session Snapshot
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricTile
              label="Return Rate"
              value={`${session.stats.returns.toFixed(1)}%`}
              tone={session.stats.returns >= 100 ? 'positive' : 'negative'}
              icon={
                session.stats.returns >= 100 ? (
                  <TrendingUp className="h-5 w-5 shrink-0" />
                ) : (
                  <TrendingDown className="h-5 w-5 shrink-0" />
                )
              }
              size="lg"
            />
            <MetricTile
              label="Profit/Loss"
              value={`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} PED`}
              tone={profit >= 0 ? 'positive' : 'negative'}
              size="lg"
            />
            <MetricTile label="Total Kills" value={session.stats.kills} size="lg" />
          </div>

          {/* Return Rate Chart */}
          <Panel title="Return Rate Over Time">
            <ReturnRateChart session={session} emptyHeight="h-48" />
          </Panel>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Performance */}
            <div
              className="panel-compact cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('performance')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Performance
                </h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard
                  label="Return Rate"
                  value={`${session.stats.returns.toFixed(1)}%`}
                  color={session.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}
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
              className="panel-compact cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('economy')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Economy
                </h3>
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
              className="panel-compact cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('efficiency')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Efficiency
                </h3>
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
          <div className="grid grid-cols-4 gap-4">
            {/* Skills */}
            <div
              className="panel-compact cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('skills')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Skills</h3>
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

            {/* Healing */}
            <div
              className="panel-compact cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('healing')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Healing
                </h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard
                  label="Total Healing"
                  value={totalHealing.toFixed(0)}
                  color="text-green-400"
                />
                <StatCard label="Heals Used" value={healsUsed} />
                <StatCard label="Avg Heal Amount" value={avgHealAmount.toFixed(1)} />
                <StatCard label="Cost per Heal" value={costPerHeal.toFixed(2)} />
                <StatCard
                  label="Healing Efficiency"
                  value={healingEfficiency.toFixed(2)}
                  color={healingEfficiency > 1 ? 'text-green-400' : 'text-red-400'}
                />
                <StatCard
                  label="Healing Cost"
                  value={`${healingCost.toFixed(2)} PED`}
                  color="text-red-400"
                />
              </div>
            </div>

            {/* Combat */}
            <div
              className="panel-compact cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('combat')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Combat</h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard label="Kills" value={session.stats.kills} />
                <StatCard label="Total Damage Out" value={session.stats.damageDealt.toFixed(0)} />
                <StatCard
                  label="Total Damage In"
                  value={(session.stats.damageTaken || 0).toFixed(0)}
                  color="text-red-400"
                />
                <StatCard
                  label="Total Healing"
                  value={(session.stats.totalHealing || 0).toFixed(0)}
                  color="text-green-400"
                />
                <StatCard label="Shots Fired" value={session.stats.shotsFired} />
                <StatCard label="Hits" value={totalHits} color="text-green-400" />
                <StatCard
                  label="Critical Hits"
                  value={session.stats.criticalHits || 0}
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
              className="panel-compact cursor-pointer hover:bg-surface-hover transition-colors"
              onClick={() => setAnalyticsView('hourly')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Hourly Rates
                </h3>
                <span className="text-blue-400 text-xl">›</span>
              </div>
              <div className="space-y-3">
                <StatCard label="Loot/Hour" value={`${formatSmallNumber(lootPerHour)} PED`} />
                <StatCard label="Spend/Hour" value={`${formatSmallNumber(spendPerHour)} PED`} />
                <StatCard label="Skills/Hour" value={formatSmallNumber(skillsPerHour)} />
                <StatCard label="Kills/Hour" value={killsPerHour.toFixed(1)} />
                <StatCard label="Dmg/Hour" value={formatSmallNumber(dmgPerHour)} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted">Combat Time</div>
                  <div className="font-semibold text-body">
                    <LiveTimer
                      startTime={session.startTime}
                      isRunning={session.status === 'active'}
                      pausedAt={session.pausedAt}
                      pausedDurationMs={session.totalPausedMs || 0}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Session Sidebar */}
        {showSidebar && (
          <div className="col-span-3 flex flex-col pt-14">
            <div className="mb-6 flex flex-1 overflow-hidden min-h-[300px]">
              <GrindGoals />
            </div>
            <ActiveSessionSidebar />
          </div>
        )}
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
                    : analyticsView === 'healing'
                      ? 'Healing Analytics'
                      : analyticsView === 'hourly'
                        ? 'Hourly Rates Analytics'
                        : 'Analytics'
        }
      >
        {analyticsView === 'performance' && <PerformanceAnalytics session={session} />}
        {analyticsView === 'economy' && <EconomyAnalytics session={session} />}
        {analyticsView === 'efficiency' && <EfficiencyAnalytics session={session} />}
        {analyticsView === 'skills' && <SkillsAnalytics session={session} />}
        {analyticsView === 'combat' && <CombatAnalytics session={session} />}
        {analyticsView === 'healing' && <HealingAnalytics session={session} />}
        {analyticsView === 'hourly' && <HourlyRatesAnalytics session={session} />}
      </AnalyticsModal>
    </>
  );
}
