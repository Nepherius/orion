import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';
import { MetricTile, Panel } from '../../common/Panel';
import { AdvancedCreatureStats } from '../../../types';
import { CreatureHuntLogModal } from '../CreatureHuntLogModal';

interface CreatureProjectionsPanelProps {
  creatureList: string[];
  selectedCreature: string;
  onSelectedCreatureChange: (creature: string) => void;
}

export default function CreatureProjectionsPanel({
  creatureList,
  selectedCreature,
  onSelectedCreatureChange,
}: CreatureProjectionsPanelProps) {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);
  const [stats, setStats] = useState<AdvancedCreatureStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHuntLog, setShowHuntLog] = useState(false);
  const huntLogFilters = useMemo(
    () => ({
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      tags: selectedTags,
    }),
    [timeRange.startTime, timeRange.endTime, selectedTags]
  );

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

  const formatBankrollRuns = (runs: number | null, returnPercent: number) => {
    if (returnPercent >= 100) return 'Does not deplete';
    if (runs === null) return 'Unknown';
    return `${runs.toLocaleString()} runs`;
  };

  const formatMarkupExtension = () => {
    if (!stats) return 'N/A';
    if (stats.trueReturnPercent < 100 && stats.returnWithMarkupPercent >= 100) {
      return 'Avoids depletion';
    }
    if (stats.bankrollRunsAtTt === null || stats.bankrollRunsWithMarkup === null) {
      return 'No finite change';
    }

    const difference = stats.bankrollRunsWithMarkup - stats.bankrollRunsAtTt;
    return `${difference >= 0 ? '+' : ''}${difference.toLocaleString()} runs`;
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
              <span className="font-semibold text-primary-400">selected filtered </span> data.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-72">
            <label className="text-xs text-muted font-bold">SELECT CREATURE</label>
            <select
              className="input-field bg-surface-hover"
              value={selectedCreature}
              onChange={(e) => onSelectedCreatureChange(e.target.value)}
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
            <button
              type="button"
              onClick={() => setShowHuntLog(true)}
              disabled={!selectedCreature}
              className="btn-secondary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-400" />
              View Hunting Log
            </button>
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
              tooltip="Lifetime TT return on this creature before markup or fixed-value sale uplift."
              value={`${stats.trueReturnPercent.toFixed(2)}%`}
              valueClassName={stats.trueReturnPercent >= 100 ? 'text-green-400' : 'text-red-400'}
              detail={`TT-only · ${stats.dataPoints} included sessions`}
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

          <div className="flex items-start gap-2 rounded border border-border bg-surface px-4 py-3">
            <InfoTooltip tooltip="Single-creature sessions use authoritative full-session totals. Mixed-creature sessions use loot-to-kill links only when every loot row is linked; their kill-cost proportions are normalized to the session total. Incomplete mixed sessions are excluded." />
            <p className="text-xs text-muted">
              Hybrid allocation:{' '}
              <span className="text-white">
                {stats.allocationCoverage.linkedMixedSessions} linked mixed
              </span>
              {' · '}
              <span className="text-white">
                {stats.allocationCoverage.fullSessionFallbacks} full-session
              </span>
              {' · '}
              <span
                className={
                  stats.allocationCoverage.excludedMixedSessions > 0
                    ? 'text-yellow-400'
                    : 'text-white'
                }
              >
                {stats.allocationCoverage.excludedMixedSessions} incomplete mixed excluded
              </span>
            </p>
          </div>

          <Panel
            title="1,000 PED Recycling Projection"
            tooltip="Each modeled run recycles the entire remaining bankroll. The estimate stops at 100 PED, a 90% depletion threshold. It assumes lifetime return repeats exactly; actual returns vary."
          >
            <p className="text-xs text-muted mb-4">
              Estimated full-bankroll runs before 1,000 PED falls to 100 PED. The markup case uses
              recorded item valuation estimates; actual sale prices and liquidity may differ.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="TT-only Runs"
                tooltip="Compounds the selected creature's lifetime TT return until the bankroll reaches 100 PED."
                value={formatBankrollRuns(stats.bankrollRunsAtTt, stats.trueReturnPercent)}
                valueClassName="text-blue-400"
                detail={`${stats.trueReturnPercent.toFixed(2)}% return per modeled run`}
              />
              <MetricTile
                label="Runs With Markup"
                tooltip="Uses TT return plus the configured markup and fixed-value estimates recorded on this creature's loot."
                value={formatBankrollRuns(
                  stats.bankrollRunsWithMarkup,
                  stats.returnWithMarkupPercent
                )}
                valueClassName="text-green-400"
                detail={`${stats.returnWithMarkupPercent.toFixed(2)}% effective return`}
              />
              <MetricTile
                label="Recorded Effective Markup"
                tooltip="Weighted sale value divided by TT loot value. 101% means recorded markup added roughly 1% to TT loot value."
                value={
                  stats.effectiveMarkupPercent > 0
                    ? `${stats.effectiveMarkupPercent.toFixed(2)}%`
                    : 'N/A'
                }
                valueClassName="text-yellow-400"
                detail={`${stats.totalMarkupGain.toFixed(2)} PED potential lifetime uplift`}
              />
              <MetricTile
                label="Markup Extension"
                tooltip="Additional full-bankroll runs supplied by recorded markup before reaching the 100 PED threshold."
                value={formatMarkupExtension()}
                valueClassName={
                  stats.returnWithMarkupPercent >= stats.trueReturnPercent
                    ? 'text-green-400'
                    : 'text-red-400'
                }
                detail="Compared with selling all loot at TT"
              />
            </div>
          </Panel>

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

            {/* Loot event volume comparison */}
            <Panel
              title="Loot Event Volume Analysis"
              contentClassName="flex h-full flex-col justify-between"
            >
              <div>
                <p className="text-xs text-muted mb-6">
                  Are smaller creature-kill bursts associated with better TT return than sessions
                  with more loot events?
                </p>

                <div className="flex flex-col items-center justify-center py-6 text-center">
                  {!stats.eventVolumeAnalysis.available ? (
                    <>
                      <Activity className="w-12 h-12 text-muted mb-3" />
                      <h4 className="font-bold text-lg">Not enough event-volume variation.</h4>
                      <p className="text-sm text-muted mt-2 max-w-sm">
                        Track at least four completed {selectedCreature} sessions with different
                        kill counts to compare smaller and larger hunting bursts.
                      </p>
                    </>
                  ) : stats.eventVolumeAnalysis.differencePercentPoints > 5 ? (
                    <>
                      <TrendingDown className="w-12 h-12 text-red-400 mb-3" />
                      <h4 className="font-bold text-lg text-red-400">
                        Smaller bursts returned more.
                      </h4>
                      <p className="text-sm text-muted mt-2 max-w-sm">
                        Lower-volume sessions averaged{' '}
                        <span className="text-white font-bold">
                          {stats.eventVolumeAnalysis.lowReturnPercent.toFixed(1)}%
                        </span>{' '}
                        TT return versus{' '}
                        <span className="text-white font-bold">
                          {stats.eventVolumeAnalysis.highReturnPercent.toFixed(1)}%
                        </span>{' '}
                        for higher-volume sessions—a{' '}
                        {stats.eventVolumeAnalysis.differencePercentPoints.toFixed(1)} percentage
                        point advantage.
                      </p>
                    </>
                  ) : stats.eventVolumeAnalysis.differencePercentPoints < -5 ? (
                    <>
                      <TrendingUp className="w-12 h-12 text-green-400 mb-3" />
                      <h4 className="font-bold text-lg text-green-400">
                        Larger bursts returned more.
                      </h4>
                      <p className="text-sm text-muted mt-2 max-w-sm">
                        Higher-volume sessions averaged{' '}
                        <span className="text-white font-bold">
                          {stats.eventVolumeAnalysis.highReturnPercent.toFixed(1)}%
                        </span>{' '}
                        TT return versus{' '}
                        <span className="text-white font-bold">
                          {stats.eventVolumeAnalysis.lowReturnPercent.toFixed(1)}%
                        </span>{' '}
                        for lower-volume sessions—a{' '}
                        {Math.abs(stats.eventVolumeAnalysis.differencePercentPoints).toFixed(1)}{' '}
                        percentage point advantage.
                      </p>
                    </>
                  ) : (
                    <>
                      <Activity className="w-12 h-12 text-blue-400 mb-3" />
                      <h4 className="font-bold text-lg">No meaningful observed difference.</h4>
                      <p className="text-sm text-muted mt-2 max-w-sm">
                        Lower-volume sessions returned{' '}
                        {stats.eventVolumeAnalysis.lowReturnPercent.toFixed(1)}% versus{' '}
                        {stats.eventVolumeAnalysis.highReturnPercent.toFixed(1)}% for higher-volume
                        sessions, a difference of only{' '}
                        {Math.abs(stats.eventVolumeAnalysis.differencePercentPoints).toFixed(1)}{' '}
                        percentage points.
                      </p>
                    </>
                  )}
                </div>

                {stats.eventVolumeAnalysis.available && (
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded bg-surface p-3">
                      <div className="text-xs text-muted">Lower-volume group</div>
                      <div className="font-mono font-bold">
                        {stats.eventVolumeAnalysis.lowAverageEvents.toFixed(1)} events/session
                      </div>
                    </div>
                    <div className="rounded bg-surface p-3">
                      <div className="text-xs text-muted">Higher-volume group</div>
                      <div className="font-mono font-bold">
                        {stats.eventVolumeAnalysis.highAverageEvents.toFixed(1)} events/session
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-surface-hover/50 rounded flex gap-2">
                <InfoTooltip tooltip="Sorts completed selected-creature sessions by tracked kills, then compares the lowest 50% with the highest 50% using TT return. If the count is odd, the middle session is omitted." />
                <span className="text-xs text-muted">
                  This shows association, not proof that session size causes the return difference.
                </span>
              </div>
            </Panel>
          </div>
        </>
      )}

      {showHuntLog && selectedCreature && (
        <CreatureHuntLogModal
          creature={selectedCreature}
          sessions={sessions}
          filters={huntLogFilters}
          onClose={() => setShowHuntLog(false)}
        />
      )}
    </div>
  );
}
