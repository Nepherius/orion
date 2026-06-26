import { useMemo, useState } from 'react';
import { Calculator, X } from 'lucide-react';
import type { CreatureEntry, HuntSession, Loadout } from '../../types';
import {
  calculateSessionAdvisor,
  parseOptionalBankroll,
  type SessionAdvisorFactor,
  type SessionAdvisorResult,
} from '../../utils/sessionAdvisor';

interface SessionAdvisorProps {
  loadout?: Loadout | null;
  creature: string;
  creatureEntries: CreatureEntry[];
  sessions: HuntSession[];
  bankroll: string;
  onBankrollChange: (value: string) => void;
  expectedMaturities: string[];
  onExpectedMaturitiesChange: (value: string[]) => void;
}

const formatNumber = (value: number | undefined, digits = 1): string =>
  typeof value === 'number'
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : 'N/A';

const formatDps = (value: number | undefined): string =>
  typeof value === 'number' ? formatNumber(value, value > 0 && value < 0.01 ? 4 : 2) : 'N/A';

const scoreTone = (score: number | null): string => {
  if (score === null) return 'text-muted';
  if (score >= 80) return 'text-green-400';
  if (score >= 65) return 'text-lime-400';
  if (score >= 45) return 'text-yellow-400';
  return 'text-red-400';
};

const pointTone = (points: number): string => {
  if (points > 0) return 'text-green-400';
  if (points < 0) return 'text-red-400';
  return 'text-muted';
};

const regenLabel = (entry: { regenDps: number; regenRisk: string }): string => {
  if (entry.regenRisk === 'unknown-low') return 'Unknown low';
  if (entry.regenRisk === 'unknown-medium') return 'Unknown medium';
  if (entry.regenRisk === 'unknown-high') return 'Unknown high';
  return formatDps(entry.regenDps);
};

const costSourceLabel = (source: SessionAdvisorResult['metrics']['costEstimateSource']): string => {
  if (source === 'maturity-history') return 'Maturity history';
  return 'Theory';
};

const normalizeName = (value: string): string => value.replace(/\s+/g, ' ').trim().toLowerCase();

function creatureMatches(entry: CreatureEntry, creature: string): boolean {
  const target = normalizeName(creature);
  const entryName = normalizeName(entry.name);
  const entryBaseName = entryName.replace(/\s*\([^)]*\)\s*$/u, '');
  const entryWithMaturity = normalizeName(`${entry.name} ${entry.maturity}`);

  return (
    Boolean(target) &&
    (entryName === target || entryBaseName === target || entryWithMaturity === target)
  );
}

function FactorRow({ factor }: { factor: SessionAdvisorFactor }) {
  const displayPoints = Number.isInteger(factor.points)
    ? factor.points.toString()
    : factor.points.toFixed(1);

  return (
    <div className="rounded border border-border bg-white/[0.03] px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-body">{factor.label}</div>
          <div className="mt-1 text-xs text-muted">{factor.detail}</div>
          {factor.formula && <div className="mt-1 text-xs text-gray-400">{factor.formula}</div>}
        </div>
        <div className={`shrink-0 font-mono text-sm font-bold ${pointTone(factor.points)}`}>
          {displayPoints}
        </div>
      </div>
    </div>
  );
}

function AdvisorDetailsDialog({
  result,
  onClose,
}: {
  result: SessionAdvisorResult;
  onClose: () => void;
}) {
  const scoredMaturityLabel =
    result.metrics.maturityAggregationMode === 'risk-weighted'
      ? `${result.metrics.scoredMaturities.length} selected`
      : result.metrics.creatureEntry?.maturity;
  const scoredMaturityTitle =
    result.metrics.scoredMaturities.length > 0
      ? result.metrics.scoredMaturities.join(', ')
      : result.metrics.creatureEntry?.maturity;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Session Advisor Score</h3>
            <p className="mt-1 text-sm text-muted">
              Score {formatNumber(result.score ?? undefined, 0)} / 100
            </p>
            <p className="mt-1 max-w-xl text-xs text-muted">
              Weighted rubric: huntability 35, kill pace and weapon size 30, bankroll 20,
              setup friction 10, history 5. Hard gates can cap the final score.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-6">
          <div className="rounded border border-border bg-white/[0.03] p-2">
            <div className="text-muted">Scored Maturity</div>
            <div className="truncate font-semibold text-body" title={scoredMaturityTitle}>
              {scoredMaturityLabel ?? 'N/A'}
            </div>
          </div>
          <div className="rounded border border-border bg-white/[0.03] p-2">
            <div className="text-muted">Combat DPS</div>
            <div className="font-semibold text-body">
              {formatNumber(result.metrics.effectiveDps)}
            </div>
          </div>
          <div className="rounded border border-border bg-white/[0.03] p-2">
            <div className="text-muted">Regen DPS</div>
            <div className="font-semibold text-body">{formatDps(result.metrics.regenDps)}</div>
          </div>
          <div className="rounded border border-border bg-white/[0.03] p-2">
            <div className="text-muted">Kill Time</div>
            <div className="font-semibold text-body">
              {result.metrics.estimatedKillSeconds
                ? `${formatNumber(result.metrics.estimatedKillSeconds)}s`
                : 'N/A'}
            </div>
          </div>
          <div className="rounded border border-border bg-white/[0.03] p-2">
            <div className="text-muted">Cost/Kill</div>
            <div className="font-semibold text-body">
              {result.metrics.estimatedCostPerKill
                ? `${formatNumber(result.metrics.estimatedCostPerKill, 3)} PED`
                : 'N/A'}
            </div>
          </div>
          <div className="rounded border border-border bg-white/[0.03] p-2">
            <div className="text-muted">Cost Source</div>
            <div
              className="truncate font-semibold text-body"
              title={
                result.metrics.historicalKillSamples > 0
                  ? `${result.metrics.historicalKillSamples} logged kills`
                  : undefined
              }
            >
              {costSourceLabel(result.metrics.costEstimateSource)}
            </div>
          </div>
        </div>

        {result.metrics.maturityBreakdown.length > 1 && (
          <div className="mb-4 rounded border border-border bg-background/30 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Maturity Weighting
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
              <div className="text-muted">Maturity</div>
              <div className="text-right text-muted">HP</div>
              <div className="text-right text-muted">Regen</div>
              <div className="text-right text-muted">Weight</div>
              {result.metrics.maturityBreakdown.map((entry) => (
                <div key={entry.maturity} className="contents">
                  <div
                    className={
                      entry.canBeatRegen === false || entry.regenRisk === 'unknown-high'
                        ? 'text-red-400'
                        : entry.regenRisk === 'unknown-medium'
                          ? 'text-yellow-400'
                          : 'text-body'
                    }
                  >
                    {entry.maturity}
                  </div>
                  <div className="text-right text-body">{formatNumber(entry.hp, 0)}</div>
                  <div className="text-right text-body">{regenLabel(entry)}</div>
                  <div className="text-right text-body">{formatNumber(entry.weight * 100, 0)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {result.factors.length > 0 ? (
            result.factors.map((factor) => <FactorRow key={factor.id} factor={factor} />)
          ) : (
            <div className="rounded border border-border bg-white/[0.03] p-3 text-sm text-muted">
              Select a loadout and a known creature to calculate factor points.
            </div>
          )}
        </div>

        <div className="mt-4 rounded border border-border bg-background/30 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Assumptions
          </div>
          <div className="space-y-1 text-xs text-muted">
            {result.assumptions.map((assumption) => (
              <div key={assumption}>{assumption}</div>
            ))}
          </div>
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-4 w-full">
          Done
        </button>
      </div>
    </div>
  );
}

export function SessionAdvisor({
  loadout,
  creature,
  creatureEntries,
  sessions,
  bankroll,
  onBankrollChange,
  expectedMaturities,
  onExpectedMaturitiesChange,
}: SessionAdvisorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const parsedBankroll = parseOptionalBankroll(bankroll);
  const availableMaturities = useMemo(() => {
    const seen = new Set<string>();
    return creatureEntries
      .filter((entry) => creatureMatches(entry, creature))
      .filter((entry) => {
        if (!entry.maturity || seen.has(entry.maturity)) return false;
        seen.add(entry.maturity);
        return true;
      })
      .sort((a, b) => a.hp - b.hp)
      .map((entry) => entry.maturity);
  }, [creature, creatureEntries]);
  const result = useMemo(
    () =>
      calculateSessionAdvisor({
        loadout,
        creatureName: creature,
        creatureEntries,
        bankroll: parsedBankroll,
        plannedMaturities: expectedMaturities,
        sessions,
      }),
    [creature, creatureEntries, expectedMaturities, loadout, parsedBankroll, sessions]
  );
  const score = result.score;
  const markerLeft = score === null ? 0 : Math.max(0, Math.min(100, score));
  const strongestFactors = result.factors
    .filter((factor) => factor.points !== 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 2);
  const expectedMaturitySet = new Set(expectedMaturities);
  const toggleMaturity = (maturity: string) => {
    if (expectedMaturitySet.has(maturity)) {
      onExpectedMaturitiesChange(expectedMaturities.filter((item) => item !== maturity));
    } else {
      onExpectedMaturitiesChange([...expectedMaturities, maturity]);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-body">
            Session Advisor
          </div>
          <div className="mt-1 text-xs text-muted">{result.summary}</div>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="btn-secondary flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs"
        >
          <Calculator className="h-3.5 w-3.5" />
          Details
        </button>
      </div>

      <div className="mb-3">
        <label className="label">Bankroll (optional)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={bankroll}
            onChange={(event) => onBankrollChange(event.target.value)}
            placeholder="PED for this session"
            className="input w-full"
          />
          <span className="text-sm text-muted">PED</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="label mb-0">Expected Maturities</label>
          {availableMaturities.length > 0 && (
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className="text-primary-300 hover:text-primary-200"
                onClick={() => onExpectedMaturitiesChange(availableMaturities)}
              >
                All
              </button>
              <button
                type="button"
                className="text-muted hover:text-white"
                onClick={() => onExpectedMaturitiesChange([])}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {availableMaturities.length > 0 ? (
          <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded border border-border bg-background/20 p-2 text-sm md:grid-cols-3">
            {availableMaturities.map((maturity) => (
              <label
                key={maturity}
                className="flex min-w-0 items-center gap-2 rounded px-2 py-1 hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  checked={expectedMaturitySet.has(maturity)}
                  onChange={() => toggleMaturity(maturity)}
                  className="h-4 w-4 accent-primary-500"
                />
                <span className="truncate" title={maturity}>
                  {maturity}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="rounded border border-border bg-background/20 px-3 py-2 text-xs text-muted">
            Select a known creature to choose maturities.
          </div>
        )}

        {availableMaturities.length > 0 && expectedMaturities.length === 0 && (
          <div className="mt-1 text-xs text-yellow-400">
            No maturity selected; advisor falls back to median maturity.
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={`text-2xl font-bold ${scoreTone(score)}`}>
            {score === null ? '--' : score}
          </div>
          <div className="text-xs text-muted">{result.label}</div>
        </div>
        {result.metrics.bankrollKills && (
          <div className="text-right text-xs text-muted">
            ~{formatNumber(result.metrics.bankrollKills, 0)} kills covered
          </div>
        )}
      </div>

      <div
        className={`relative mt-3 h-3 rounded-full ${
          score === null
            ? 'bg-surface-hover'
            : 'bg-gradient-to-r from-red-500 via-yellow-400 to-green-500'
        }`}
      >
        {score !== null && (
          <div
            className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `calc(${markerLeft}% - 2px)` }}
          />
        )}
      </div>

      {strongestFactors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {strongestFactors.map((factor) => (
            <span
              key={factor.id}
              className={`rounded border border-border px-2 py-1 text-xs ${pointTone(factor.points)}`}
            >
              {factor.label} {Number.isInteger(factor.points) ? factor.points : factor.points.toFixed(1)}
            </span>
          ))}
        </div>
      )}

      {showDetails && (
        <AdvisorDetailsDialog result={result} onClose={() => setShowDetails(false)} />
      )}
    </div>
  );
}
