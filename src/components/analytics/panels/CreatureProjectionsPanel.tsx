import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useHuntStore } from '../../../store';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { InfoTooltip } from '../../common/InfoTooltip';
import { MetricTile, Panel } from '../../common/Panel';
import { AdvancedCreatureStats } from '../../../types';

export default function CreatureProjectionsPanel() {
  const sessions = useHuntStore((state) => state.sessions);

  const creatureList = useMemo(() => {
    return Array.from(
      new Set(
        sessions.flatMap((s) => [s.creature || 'Unknown', ...s.kills.map((k) => k.creatureName)])
      )
    )
      .filter((c) => c && c !== 'Unknown')
      .sort();
  }, [sessions]);

  const [selectedCreature, setSelectedCreature] = useState<string>(
    creatureList.length > 0 ? creatureList[0] : ''
  );
  const [stats, setStats] = useState<AdvancedCreatureStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCreature) return;

    let mounted = true;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await invoke<AdvancedCreatureStats>('db_get_advanced_creature_stats', {
          params: { creature: selectedCreature },
        });
        if (mounted) {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch advanced creature stats:', err);
        if (mounted) {
          setStats(null);
          setError('Unable to load creature projections. Please try again.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      mounted = false;
    };
  }, [selectedCreature]);

  // Handle high/low volatility mapping
  const getVolatilityRisk = (cv: number) => {
    if (cv < 0.2)
      return {
        level: 'Low',
        color: 'text-green-400',
        desc: 'Return is very consistent across sessions.',
      };
    if (cv < 0.5)
      return { level: 'Moderate', color: 'text-yellow-400', desc: 'Expect standard daily swings.' };
    if (cv < 0.8)
      return {
        level: 'High',
        color: 'text-orange-400',
        desc: 'Spiky returns. Requires larger bankroll.',
      };
    return {
      level: 'Extreme',
      color: 'text-red-400',
      desc: 'Very inconsistent. Relies heavily on huge globals/HoFs to break even.',
    };
  };

  const getTrendColor = (trend: number, trueReturn: number) => {
    if (trend > trueReturn + 5) return 'text-green-400';
    if (trend < trueReturn - 5) return 'text-red-400';
    return 'text-yellow-400';
  };

  const formatCycleToStabilize = (cycleToStabilize: number) => {
    if (cycleToStabilize > 0 && cycleToStabilize < 1000000) {
      return `${cycleToStabilize.toLocaleString(undefined, { maximumFractionDigits: 0 })} PED`;
    }
    if (cycleToStabilize >= 1000000) {
      return '1,000,000+ PED';
    }
    return 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header / Select Creature */}
      <Panel>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              Creature Analytics
            </h2>
            <p className="text-sm text-muted mt-1">
              Advanced statistical modeling based on your{' '}
              <span className="font-semibold text-primary-400">entire lifetime</span> data (ignores
              the time range filter).
            </p>
          </div>

          <div className="flex flex-col gap-1 w-full md:w-64">
            <label className="text-xs text-muted font-bold">SELECT CREATURE</label>
            <select
              className="input-field bg-surface-hover"
              value={selectedCreature}
              onChange={(e) => setSelectedCreature(e.target.value)}
            >
              {creatureList.length === 0 ? (
                <option value="">No creatures tracked</option>
              ) : (
                creatureList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </Panel>

      {loading && !stats && (
        <Panel contentClassName="flex h-64 items-center justify-center text-muted">
          Calculating statistical models...
        </Panel>
      )}

      {!loading && error && (
        <Panel contentClassName="flex h-64 items-center justify-center text-red-400">{error}</Panel>
      )}

      {!loading && !error && !stats && selectedCreature && (
        <Panel contentClassName="flex h-64 items-center justify-center text-muted">
          Not enough data to model {selectedCreature}.
        </Panel>
      )}

      {stats && (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* True Return */}
            <MetricTile
              label="True Return"
              tooltip="Lifetime Return % on this creature over all recorded data"
              value={`${stats.trueReturnPercent.toFixed(2)}%`}
              valueClassName={stats.trueReturnPercent >= 100 ? 'text-green-400' : 'text-red-400'}
              detail={`Based on ${stats.dataPoints} sessions`}
              size="lg"
            />

            {/* Volatility Risk */}
            <MetricTile
              label="Volatility Risk"
              tooltip="Measures how much your return swings from session to session. (Coefficient of Variation)"
              value={getVolatilityRisk(stats.volatilityCv).level}
              icon={
                stats.volatilityCv > 0.5 ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )
              }
              valueClassName={getVolatilityRisk(stats.volatilityCv).color}
              detail={getVolatilityRisk(stats.volatilityCv).desc}
            />

            {/* Bankroll Cycle Estimate */}
            <MetricTile
              label="Cycle to Stabilize"
              tooltip="Estimated PED you need to cycle on this creature to hit a 95% confidence interval of your True Return."
              value={formatCycleToStabilize(stats.cycleToStabilize)}
              valueClassName="text-blue-400"
              detail="Required budget to absorb variance swings"
            />

            {/* Extrapolated Missing Deposit */}
            <MetricTile
              label="Monthly Deposit Needed"
              tooltip="Extrapolated estimate of USD deposit required per month if you ONLY hunted this mob, based on your loss rate."
              value={
                stats.depositPerMonthUSD > 0
                  ? `$${stats.depositPerMonthUSD.toFixed(2)} / mo`
                  : 'Profitable!'
              }
              valueClassName={stats.depositPerMonthUSD > 0 ? 'text-red-400' : 'text-green-400'}
              detail="Assuming ~20 hours hunting/month"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trend Analysis */}
            <Panel title="Trend Analysis" contentClassName="space-y-4">
              <p className="text-xs text-muted mb-6">Compare recent performance vs True Return.</p>

              <div className="space-y-4">
                {/* Liftime */}
                <div className="flex items-center justify-between p-3 bg-surface rounded">
                  <div>
                    <div className="font-semibold text-sm">Lifetime Average</div>
                    <div className="text-xs text-muted">All Time</div>
                  </div>
                  <div className="text-right font-bold text-lg">
                    {stats.trueReturnPercent.toFixed(2)}%
                  </div>
                </div>

                {/* Last 50 */}
                <div className="flex items-center justify-between p-3 bg-surface rounded hover:bg-surface-hover">
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      Trend (Last 50 Sessions)
                      {stats.trend50 > stats.trueReturnPercent ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="text-xs text-muted">Mid-term momentum</div>
                  </div>
                  <div
                    className={`text-right font-bold text-lg ${getTrendColor(stats.trend50, stats.trueReturnPercent)}`}
                  >
                    {stats.trend50 > 0 ? `${stats.trend50.toFixed(2)}%` : 'N/A'}
                  </div>
                </div>

                {/* Last 10 */}
                <div className="flex items-center justify-between p-3 bg-surface rounded hover:bg-surface-hover">
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      Trend (Last 10 Sessions)
                      {stats.trend10 > stats.trueReturnPercent ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="text-xs text-muted">Short-term momentum</div>
                  </div>
                  <div
                    className={`text-right font-bold text-lg ${getTrendColor(stats.trend10, stats.trueReturnPercent)}`}
                  >
                    {stats.trend10 > 0 ? `${stats.trend10.toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
              </div>
            </Panel>

            {/* Fatigue / Session Length Dropoff */}
            <Panel
              title="Fatigue Dropoff (Duration Analysis)"
              contentClassName="flex h-full flex-col justify-between"
            >
              <div>
                <p className="text-xs text-muted mb-6">
                  Are your short sessions better than your long marathon sessions?
                </p>

                <div className="flex flex-col items-center justify-center py-6 text-center">
                  {stats.fatigueDropoff > 5 ? (
                    <>
                      <TrendingDown className="w-12 h-12 text-red-400 mb-3" />
                      <h4 className="font-bold text-lg text-red-400">Yes, returns drop heavily.</h4>
                      <p className="text-sm text-muted mt-2 max-w-sm">
                        Your short sessions return{' '}
                        <span className="text-white font-bold">
                          {Math.abs(stats.fatigueDropoff).toFixed(1)}%
                        </span>{' '}
                        MORE than your long sessions. The system might have a dynamic cap hitting
                        you. Try hunting in smaller bursts.
                      </p>
                    </>
                  ) : stats.fatigueDropoff < -5 ? (
                    <>
                      <TrendingUp className="w-12 h-12 text-green-400 mb-3" />
                      <h4 className="font-bold text-lg text-green-400">
                        No, long sessions are better!
                      </h4>
                      <p className="text-sm text-muted mt-2 max-w-sm">
                        Your long sessions return{' '}
                        <span className="text-white font-bold">
                          {Math.abs(stats.fatigueDropoff).toFixed(1)}%
                        </span>{' '}
                        MORE than your short sessions. Keep grinding, you are building cycle
                        momentum.
                      </p>
                    </>
                  ) : (
                    <>
                      <Activity className="w-12 h-12 text-blue-400 mb-3" />
                      <h4 className="font-bold text-lg">No significant difference.</h4>
                      <p className="text-sm text-muted mt-2 max-w-sm">
                        Your returns between short bursts and long marathons are practically
                        identical (within {Math.abs(stats.fatigueDropoff).toFixed(1)}%). Play as
                        long as you want!
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 p-4 bg-surface-hover/50 rounded flex gap-2">
                <InfoTooltip tooltip="Analyzes returns of your shortest 50% sessions vs longest 50% sessions." />
                <span className="text-xs text-muted">
                  Note: A high Negative value means long sessions yield better returns.
                </span>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
