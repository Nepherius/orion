import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { useHuntStore } from '../../../store';
import { calculatePearsonCorrelation } from '../../../utils/analytics/correlation';
import {
  calculateBankrollRisk,
  calculateConvergenceMetrics,
  calculateMultiplierDistributions,
  type TheoryKillEvent,
  type TheorySessionReturn,
} from '../../../utils/analytics/lootTheory';
import { MetricTile, Panel } from '../../common/Panel';
import { CorrelationAnalytics } from '../CorrelationAnalytics';
import { StatisticalInsights } from '../StatisticalInsights';
import { chartAxisProps, chartGridProps, chartTooltipProps } from '../chartStyles';

interface LootTheoryData {
  linkCoverage: {
    completedSessions: number;
    totalKills: number;
    killsWithLootLinks: number;
    totalLootRows: number;
    linkedLootRows: number;
    usableSessions: number;
    incompleteLinkSessions: number;
    costDriftSessions: number;
  };
  sessionReturns: TheorySessionReturn[];
  killEvents: TheoryKillEvent[];
}

function CorrelationTile({
  label,
  result,
  detail,
}: {
  label: string;
  result: { r: number; p: number } | null;
  detail: string;
}) {
  if (!result) {
    return (
      <MetricTile
        label={label}
        value="Not enough variation"
        detail={detail}
        valueClassName="text-muted"
        size="sm"
        truncateValue={false}
      />
    );
  }

  return (
    <MetricTile
      label={label}
      value={`r ${result.r.toFixed(3)}`}
      detail={`p ${result.p.toFixed(4)} · ${detail}`}
      valueClassName={result.p < 0.05 ? 'text-green-400' : 'text-blue-400'}
      size="sm"
    />
  );
}

interface LootTheoryLabPanelProps {
  selectedCreature: string;
}

export default function LootTheoryLabPanel({ selectedCreature }: LootTheoryLabPanelProps) {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);
  const [data, setData] = useState<LootTheoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    invoke<LootTheoryData>('db_get_loot_theory_data', {
      params: {
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
        tags: selectedTags,
      },
    })
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err) => {
        console.error('Failed to load loot theory data:', err);
        if (mounted) {
          setData(null);
          setError('Unable to load loot theory analytics.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [sessions.length, timeRange.startTime, timeRange.endTime, selectedTags]);

  const convergence = useMemo(
    () => (data ? calculateConvergenceMetrics(data.killEvents) : null),
    [data]
  );
  const bankrollRisk = useMemo(
    () => (data ? calculateBankrollRisk(data.sessionReturns) : null),
    [data]
  );
  const distributions = useMemo(
    () => (data ? calculateMultiplierDistributions(data.killEvents) : []),
    [data]
  );

  const equipment = useMemo(() => {
    if (!data) return null;

    const correlationFor = (
      rows: TheorySessionReturn[],
      x: (row: TheorySessionReturn) => number,
      y: (row: TheorySessionReturn) => number
    ) => {
      if (rows.length < 4) return null;
      const xValues = rows.map(x);
      if (new Set(xValues.map((value) => value.toFixed(6))).size < 2) return null;
      return calculatePearsonCorrelation(xValues, rows.map(y));
    };

    const efficiencyRows = data.sessionReturns.filter(
      (row) => row.efficiency !== null && row.totalCost > 0
    );
    const dppRows = data.sessionReturns.filter(
      (row) => row.dpp !== null && row.dpp > 0 && row.ttLoot > 0
    );
    const ttReturn = (row: TheorySessionReturn) => (row.ttLoot / row.totalCost) * 100;

    return {
      snapshotSessions: data.sessionReturns.filter(
        (row) => row.efficiency !== null || row.dpp !== null
      ).length,
      efficiency: correlationFor(efficiencyRows, (row) => row.efficiency ?? 0, ttReturn),
      dppShrapnel: correlationFor(
        dppRows,
        (row) => row.dpp ?? 0,
        (row) => (row.shrapnelTt / row.ttLoot) * 100
      ),
      dppMarkup: correlationFor(
        dppRows,
        (row) => row.dpp ?? 0,
        (row) => ((row.adjustedLoot - row.ttLoot) / row.ttLoot) * 100
      ),
    };
  }, [data]);

  const temporal = useMemo(() => {
    if (!data) return null;
    const events = selectedCreature
      ? data.killEvents.filter((event) => event.creature === selectedCreature)
      : data.killEvents;
    const valid = events.filter((event) => event.cost > 0);
    if (valid.length === 0) {
      return {
        buckets: [],
        phaseBuckets: [],
        bestHour: null,
        bestPhase: null,
        events: 0,
      };
    }

    const multipliers = valid.map((event) => event.ttLoot / event.cost).sort((a, b) => a - b);
    const highThreshold = multipliers[Math.floor((multipliers.length - 1) * 0.9)];
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      events: 0,
      multiplierTotal: 0,
      highEvents: 0,
    }));
    const phaseBuckets = Array.from({ length: 12 }, (_, phase) => ({
      phase,
      label: `${(phase * 5).toString().padStart(2, '0')}–${(phase * 5 + 4)
        .toString()
        .padStart(2, '0')}m`,
      events: 0,
      multiplierTotal: 0,
      highEvents: 0,
    }));

    for (const event of valid) {
      const timestamp =
        event.timestamp < 1_000_000_000_000 ? event.timestamp * 1000 : event.timestamp;
      const date = new Date(timestamp);
      const bucket = buckets[date.getHours()];
      const phaseBucket = phaseBuckets[Math.floor(date.getMinutes() / 5)];
      const multiplier = event.ttLoot / event.cost;
      bucket.events += 1;
      bucket.multiplierTotal += multiplier;
      if (multiplier >= highThreshold) bucket.highEvents += 1;
      phaseBucket.events += 1;
      phaseBucket.multiplierTotal += multiplier;
      if (multiplier >= highThreshold) phaseBucket.highEvents += 1;
    }

    const chartBuckets = buckets.map((bucket) => ({
      hour: bucket.label,
      events: bucket.events,
      avgReturn: bucket.events > 0 ? (bucket.multiplierTotal / bucket.events) * 100 : 0,
      highRate: bucket.events > 0 ? (bucket.highEvents / bucket.events) * 100 : 0,
    }));
    const chartPhaseBuckets = phaseBuckets.map((bucket) => ({
      phase: bucket.label,
      events: bucket.events,
      avgReturn: bucket.events > 0 ? (bucket.multiplierTotal / bucket.events) * 100 : 0,
      highRate: bucket.events > 0 ? (bucket.highEvents / bucket.events) * 100 : 0,
    }));
    const eligible = chartBuckets.filter((bucket) => bucket.events >= 30);
    const eligiblePhases = chartPhaseBuckets.filter((bucket) => bucket.events >= 30);
    const bestHour =
      eligible.length > 0
        ? eligible.reduce((best, bucket) => (bucket.avgReturn > best.avgReturn ? bucket : best))
        : null;
    const bestPhase =
      eligiblePhases.length > 0
        ? eligiblePhases.reduce((best, bucket) =>
            bucket.avgReturn > best.avgReturn ? bucket : best
          )
        : null;

    return {
      buckets: chartBuckets,
      phaseBuckets: chartPhaseBuckets,
      bestHour,
      bestPhase,
      events: valid.length,
    };
  }, [data, selectedCreature]);

  if (loading) {
    return (
      <Panel contentClassName="flex min-h-48 items-center justify-center text-muted">
        Calculating loot theory models...
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Loot Theory Lab">
        <p className="text-sm text-red-400">{error ?? 'No theory data available.'}</p>
      </Panel>
    );
  }

  const coveragePercent =
    data.linkCoverage.totalLootRows > 0
      ? (data.linkCoverage.linkedLootRows / data.linkCoverage.totalLootRows) * 100
      : 0;

  return (
    <div className="space-y-6">
      <Panel title="Loot Theory Lab" className="border-yellow-800 bg-yellow-950/10">
        <details className="group rounded-lg border border-yellow-800/70 bg-yellow-950/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-semibold text-yellow-100">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Terms, assumptions & limitations
            </span>
            <span className="text-xs font-normal text-yellow-300 group-open:hidden">Expand</span>
            <span className="hidden text-xs font-normal text-yellow-300 group-open:inline">
              Collapse
            </span>
          </summary>

          <div className="grid gap-5 border-t border-yellow-800/60 p-4 text-xs leading-relaxed text-yellow-100/80 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wide text-yellow-200">
                Return and loot terms
              </h4>
              <dl className="space-y-2">
                <div>
                  <dt className="font-semibold text-white">TT return</dt>
                  <dd>Trade-terminal loot divided by authoritative session cost.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Adjusted return</dt>
                  <dd>
                    Loot valued with configured markup or fixed-value estimates. It is not proof of
                    a realized sale.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Loot event</dt>
                  <dd>One tracked creature kill, potentially containing several item rows.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Multiplier</dt>
                  <dd>TT loot from one kill divided by that kill&apos;s normalized cost.</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wide text-yellow-200">
                Links, allocation and drift
              </h4>
              <dl className="space-y-2">
                <div>
                  <dt className="font-semibold text-white">Loot-to-kill link</dt>
                  <dd>
                    The same kill ID is stored on every item row dropped by one creature, joining
                    multiple items into one event.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Incomplete links</dt>
                  <dd>
                    Can occur in legacy data, manual edits, parser timing gaps, crashes, or when the
                    app closes before kill finalization. Incomplete sessions are excluded from
                    kill-level models.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Cost drift</dt>
                  <dd>
                    Kill costs are estimates made during a hunt. Later decay or cost changes can
                    make their sum differ from final session cost, so usable kill costs are
                    normalized back to that authoritative total.
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wide text-yellow-200">
                Equipment and statistics
              </h4>
              <dl className="space-y-2">
                <div>
                  <dt className="font-semibold text-white">Efficiency and DPP</dt>
                  <dd>
                    Snapshotted when a new session starts. Existing sessions without snapshots are
                    not guessed. DPP means damage per PEC.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Pearson&apos;s r</dt>
                  <dd>
                    Direction and strength of a linear association, from −1 to +1. It does not
                    establish causation.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">p-value</dt>
                  <dd>
                    Measures compatibility with no linear relationship. Testing many theories
                    increases the chance of accidental significance.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">pp</dt>
                  <dd>Percentage points; for example, 90% to 95% is +5 pp.</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wide text-yellow-200">
                Model assumptions
              </h4>
              <ul className="list-disc space-y-1 pl-4">
                <li>Session cost is the financial source of truth.</li>
                <li>Kill-level models require complete links for the entire session.</li>
                <li>Convergence describes the recorded path, not a guaranteed sample size.</li>
                <li>
                  Bankroll risk resamples historical sessions and assumes they remain
                  representative.
                </li>
                <li>Small samples and large outliers can dominate every result.</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wide text-yellow-200">
                Temporal caveats
              </h4>
              <ul className="list-disc space-y-1 pl-4">
                <li>Event timestamps use your local clock.</li>
                <li>
                  Hourly patterns can reflect schedule, creature, location, equipment, or events.
                </li>
                <li>
                  The five-minute view only tests wall-clock phases; another server interval or
                  phase remains invisible.
                </li>
                <li>One avatar&apos;s history cannot prove a server-wide loot wave.</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wide text-yellow-200">
                Interpretation rule
              </h4>
              <p>
                Treat the Lab as a hypothesis generator. A pattern becomes more credible when it
                survives additional data, creature and equipment controls, and a test chosen before
                examining the result.
              </p>
            </div>
          </div>
        </details>
      </Panel>

      <Panel title="Loot-to-Kill Link Coverage" tooltip="Coverage available to kill-level models.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Linked Loot Rows"
            value={`${coveragePercent.toFixed(1)}%`}
            detail={`${data.linkCoverage.linkedLootRows.toLocaleString()} / ${data.linkCoverage.totalLootRows.toLocaleString()} rows`}
            valueClassName={coveragePercent >= 95 ? 'text-green-400' : 'text-yellow-400'}
          />
          <MetricTile
            label="Usable Linked Sessions"
            value={data.linkCoverage.usableSessions}
            detail="Used by kill-level models"
            valueClassName="text-blue-400"
          />
          <MetricTile
            label="Incomplete Link Sessions"
            value={data.linkCoverage.incompleteLinkSessions}
            detail="Excluded from kill-level models"
            valueClassName={
              data.linkCoverage.incompleteLinkSessions > 0 ? 'text-yellow-400' : 'text-green-400'
            }
          />
          <MetricTile
            label="Cost Drift Sessions"
            value={data.linkCoverage.costDriftSessions}
            tooltip="Kill-cost sum differs from final session cost by more than 5%."
            detail="Kill-cost sum differs by >5%"
            valueClassName={
              data.linkCoverage.costDriftSessions > 0 ? 'text-yellow-400' : 'text-green-400'
            }
          />
        </div>
      </Panel>

      <Panel
        title="Fixed-Cycle Expected-Value Convergence"
        tooltip="Cumulative TT return sampled every 500 linked kills."
      >
        {convergence && convergence.totalKills >= 100 ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Observed Long-Term TT"
                value={`${convergence.longTermReturn.toFixed(2)}%`}
                detail={`${convergence.totalKills.toLocaleString()} kills · ${convergence.totalPed.toFixed(0)} PED`}
                valueClassName="text-blue-400"
              />
              {convergence.thresholds.map((point) => (
                <MetricTile
                  key={point.threshold}
                  label={`Stayed Within ±${point.threshold} pp`}
                  value={
                    point.kills !== null ? `${point.kills.toLocaleString()} kills` : 'Not reached'
                  }
                  detail={point.ped !== null ? `${point.ped.toFixed(0)} PED cycled` : undefined}
                  valueClassName={point.kills !== null ? 'text-green-400' : 'text-muted'}
                />
              ))}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={convergence.points}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="kills" {...chartAxisProps} />
                <YAxis {...chartAxisProps} domain={['auto', 'auto']} unit="%" />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number, name: string) =>
                    name === 'Cumulative TT Return' ? `${value.toFixed(2)}%` : value
                  }
                  labelFormatter={(kills) => `${Number(kills).toLocaleString()} kills`}
                />
                <Line
                  dataKey="returnRate"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Cumulative TT Return"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-sm text-muted">
            At least 100 kills from completely linked sessions are required.
          </p>
        )}
      </Panel>

      <Panel
        title="Empirical Bankroll & Drawdown Risk"
        tooltip="Historical bootstrap of 3,000 twenty-session bankroll paths."
      >
        {bankrollRisk ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricTile
              label="Median Max Drawdown"
              value={`${bankrollRisk.medianMaxDrawdown.toFixed(1)}%`}
              valueClassName="text-yellow-400"
            />
            <MetricTile
              label="Chance of 10% Drawdown"
              value={`${bankrollRisk.probability10.toFixed(1)}%`}
            />
            <MetricTile
              label="Chance of 25% Drawdown"
              value={`${bankrollRisk.probability25.toFixed(1)}%`}
            />
            <MetricTile
              label="Chance of 50% Drawdown"
              value={`${bankrollRisk.probability50.toFixed(1)}%`}
            />
            <MetricTile
              label="Chance Below 100 PED"
              value={`${bankrollRisk.probabilityBelow100.toFixed(1)}%`}
              detail={`Within ${bankrollRisk.horizon} modeled sessions`}
              valueClassName="text-red-400"
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            At least five completed sessions with TT cost and loot are required.
          </p>
        )}
      </Panel>

      <Panel
        title="Creature & Maturity Multiplier Distributions"
        tooltip="Kill-level TT multiplier percentiles by creature and maturity."
      >
        {distributions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>
                  <th className="p-2">Creature</th>
                  <th className="p-2">Maturity</th>
                  <th className="p-2 text-right">Kills</th>
                  <th className="p-2 text-right">Mean</th>
                  <th className="p-2 text-right">Median</th>
                  <th className="p-2 text-right">P10</th>
                  <th className="p-2 text-right">P90</th>
                  <th className="p-2 text-right">Range</th>
                </tr>
              </thead>
              <tbody>
                {distributions.slice(0, 20).map((row) => (
                  <tr key={`${row.creature}-${row.maturity}`} className="border-t border-border">
                    <td className="p-2">{row.creature}</td>
                    <td className="p-2 text-muted">{row.maturity}</td>
                    <td className="p-2 text-right font-mono">{row.kills.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">{row.mean.toFixed(3)}x</td>
                    <td className="p-2 text-right font-mono">{row.median.toFixed(3)}x</td>
                    <td className="p-2 text-right font-mono">{row.p10.toFixed(3)}x</td>
                    <td className="p-2 text-right font-mono">{row.p90.toFixed(3)}x</td>
                    <td className="p-2 text-right font-mono">
                      {row.minimum.toFixed(2)}–{row.maximum.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No creature/maturity group has 30 kills from completely linked sessions yet.
          </p>
        )}
      </Panel>

      <Panel
        title="Equipment Theory Tests"
        tooltip="Correlation tests using session-start equipment snapshots."
      >
        <div className="mb-4 flex items-center gap-2 text-sm text-muted">
          <FlaskConical className="h-4 w-4 text-cyan-400" />
          {equipment?.snapshotSessions ?? 0} sessions contain historical equipment snapshots.
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CorrelationTile
            label="Weapon Efficiency vs TT Return"
            result={equipment?.efficiency ?? null}
            detail="Tests TT return, not markup profit"
          />
          <CorrelationTile
            label="DPP vs Shrapnel Share"
            result={equipment?.dppShrapnel ?? null}
            detail="Negative r means higher DPP aligned with less shrapnel"
          />
          <CorrelationTile
            label="DPP vs Markup Uplift"
            result={equipment?.dppMarkup ?? null}
            detail="Tests loot composition rather than TT return"
          />
        </div>
      </Panel>

      <Panel
        title="Temporal Loot-Wave Exploration"
        tooltip="Exploratory timing patterns from linked kill timestamps."
      >
        {temporal && temporal.events > 0 ? (
          <>
            <div className="mb-4 text-xs text-muted">
              {temporal.events.toLocaleString()} linked {selectedCreature || 'all-creature'} loot
              events.
              {temporal.bestHour
                ? ` Highest eligible hourly average: ${temporal.bestHour.hour} (${temporal.bestHour.avgReturn.toFixed(1)}% TT, n=${temporal.bestHour.events}).`
                : ' No hour has the minimum 30 events needed for a highlighted result.'}
              {temporal.bestPhase
                ? ` Strongest five-minute clock phase: ${temporal.bestPhase.phase} (${temporal.bestPhase.avgReturn.toFixed(1)}% TT, n=${temporal.bestPhase.events}).`
                : ''}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={temporal.buckets}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="hour" {...chartAxisProps} interval={1} />
                <YAxis yAxisId="events" {...chartAxisProps} />
                <YAxis yAxisId="return" orientation="right" {...chartAxisProps} unit="%" />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number, name: string) =>
                    name === 'Events' ? value : `${value.toFixed(1)}%`
                  }
                />
                <Legend />
                <Bar
                  yAxisId="events"
                  dataKey="events"
                  fill="#3B82F6"
                  name="Events"
                  opacity={0.65}
                />
                <Line
                  yAxisId="return"
                  dataKey="avgReturn"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Avg TT Return"
                />
                <Line
                  yAxisId="return"
                  dataKey="highRate"
                  stroke="#EAB308"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Top-10% Event Rate"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
              Five-minute phase within each clock hour
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={temporal.phaseBuckets}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="phase" {...chartAxisProps} />
                <YAxis yAxisId="events" {...chartAxisProps} />
                <YAxis yAxisId="return" orientation="right" {...chartAxisProps} unit="%" />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number, name: string) =>
                    name === 'Events' ? value : `${value.toFixed(1)}%`
                  }
                />
                <Legend />
                <Bar
                  yAxisId="events"
                  dataKey="events"
                  fill="#6366F1"
                  name="Events"
                  opacity={0.65}
                />
                <Line
                  yAxisId="return"
                  dataKey="avgReturn"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Avg TT Return"
                />
                <Line
                  yAxisId="return"
                  dataKey="highRate"
                  stroke="#EAB308"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Top-10% Event Rate"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="mt-3 text-xs text-muted">
              The phase chart only tests patterns aligned to the wall clock. A real server cycle
              could use another interval or phase and remain invisible here.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Completely linked kill events are required for timestamp analysis.
          </p>
        )}
      </Panel>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-body">
          Related correlation tests
        </h3>
        <div className="space-y-6">
          <CorrelationAnalytics />
          <StatisticalInsights />
        </div>
      </div>
    </div>
  );
}
