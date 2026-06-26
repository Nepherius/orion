import { useState, useEffect, useMemo } from 'react';
import { useHuntStore } from '../../store';
import { Panel } from '../common/Panel';

import type { WorkerRequest, WorkerResponse } from '../../workers/analytics.worker';

interface CorrelationData {
  n: number;
  eventsVsLoot: { r: number; p: number };
  costVsLoot: { r: number; p: number };
  multiple: { rSquared: number; p: number };
}

type WorkerSuccessResponse = Exclude<WorkerResponse, { type: 'ERROR' }>;
type WorkerResultMap = {
  CALC_CORRELATION_ANALYTICS: {
    eventsVsLoot: { r: number; p: number };
    costVsLoot: { r: number; p: number };
    multiple: { rSquared: number; p: number };
  };
};
type WorkerTaskType = keyof WorkerResultMap;

export function CorrelationAnalytics() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (s.tags || []).includes(t)))
        return false;
      return true;
    });
  }, [sessions, timeRange.startTime, timeRange.endTime, selectedTags]);

  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validSessions = filteredSessions.filter(
      (s) => s.status === 'completed' && s.stats.kills > 0 && s.stats.totalCost > 0
    );

    if (validSessions.length < 4) {
      setCorrelationData(null);
      setError(null);
      return;
    }

    setIsCalculating(true);
    setError(null);

    const lootEvents = validSessions.map((s) => s.stats.kills);
    const costPed = validSessions.map((s) => s.stats.totalCost);
    const lootPed = validSessions.map((s) => s.stats.totalAdjustedLoot);

    const worker = new Worker(new URL('../../workers/analytics.worker.ts', import.meta.url), {
      type: 'module',
    });
    let cancelled = false;

    const runWorkerTask = <T extends WorkerTaskType>(
      type: T,
      payload: Extract<WorkerRequest, { type: T }>['payload']
    ): Promise<WorkerResultMap[T]> => {
      return new Promise((resolve, reject) => {
        const resultType = `RESULT_${type.replace('CALC_', '')}` as WorkerSuccessResponse['type'];
        const handler = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === 'ERROR') {
            worker.removeEventListener('message', handler);
            reject(new Error(e.data.error));
            return;
          }

          if (e.data.type === resultType && 'data' in e.data) {
            worker.removeEventListener('message', handler);
            resolve(e.data.data as WorkerResultMap[T]);
          }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ type, payload } as WorkerRequest);
      });
    };

    const processMath = async () => {
      try {
        const { eventsVsLoot, costVsLoot, multiple } = await runWorkerTask(
          'CALC_CORRELATION_ANALYTICS',
          {
            lootEvents,
            costPed,
            lootPed,
          }
        );

        if (!cancelled) {
          setCorrelationData({
            n: validSessions.length,
            eventsVsLoot,
            costVsLoot,
            multiple,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Worker correlation failed:', err);
          setCorrelationData(null);
          setError('Unable to calculate correlation metrics.');
        }
      } finally {
        if (!cancelled) {
          setIsCalculating(false);
        }
        worker.terminate();
      }
    };

    processMath();

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [filteredSessions]);

  if (isCalculating) {
    return (
      <Panel contentClassName="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted">Calculating correlation matrices...</p>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Loot Correlation Analysis">
        <p className="text-sm text-red-400">{error}</p>
      </Panel>
    );
  }

  if (!correlationData) {
    return (
      <Panel title="Loot Correlation Analysis">
        <p className="text-sm text-muted">
          Not enough completed sessions to calculate reliable correlation metrics. Need at least 4
          completed sessions with tracked creature kills.
        </p>
      </Panel>
    );
  }

  const { eventsVsLoot, costVsLoot, multiple, n } = correlationData;

  const getSignificanceLevel = (p: number) => {
    if (p < 0.001)
      return <span className="text-green-400 font-bold">Highly Significant (p &lt; 0.001)</span>;
    if (p < 0.01)
      return <span className="text-green-400 font-semibold">Very Significant (p &lt; 0.01)</span>;
    if (p < 0.05) return <span className="text-green-400">Significant (p &lt; 0.05)</span>;
    if (p < 0.1)
      return <span className="text-yellow-400">Marginally Significant (p &lt; 0.10)</span>;
    return <span className="text-muted">Not Significant (p ≥ 0.10)</span>;
  };

  const getCorrelationStrength = (r: number) => {
    const abs = Math.abs(r);
    if (abs >= 0.8) return 'Very Strong';
    if (abs >= 0.6) return 'Strong';
    if (abs >= 0.4) return 'Moderate';
    if (abs >= 0.2) return 'Weak';
    return 'Very Weak / None';
  };

  return (
    <Panel title="Loot Factors Correlation">
      <div className="mb-4">
        <p className="text-sm text-muted mt-1">
          Statistical analysis of exactly what affects your total loot across {n} completed
          sessions. One loot event represents one tracked creature kill, including all items dropped
          by that creature.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2 font-medium">Creature Loot Events vs. Loot</div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-xs text-muted">Pearson&apos;s r</div>
              <div className="text-xl font-bold font-mono">{eventsVsLoot.r.toFixed(3)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Strength</div>
              <div className="text-sm font-semibold">{getCorrelationStrength(eventsVsLoot.r)}</div>
            </div>
          </div>
          <div className="text-xs border-t border-border pt-2 mt-2 flex justify-between">
            <span className="text-muted">p-value: {eventsVsLoot.p.toFixed(4)}</span>
            {getSignificanceLevel(eventsVsLoot.p)}
          </div>
        </div>

        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2 font-medium">PED Cycled (Cost) vs. Loot</div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-xs text-muted">Pearson&apos;s r</div>
              <div className="text-xl font-bold font-mono">{costVsLoot.r.toFixed(3)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Strength</div>
              <div className="text-sm font-semibold">{getCorrelationStrength(costVsLoot.r)}</div>
            </div>
          </div>
          <div className="text-xs border-t border-border pt-2 mt-2 flex justify-between">
            <span className="text-muted">p-value: {costVsLoot.p.toFixed(4)}</span>
            {getSignificanceLevel(costVsLoot.p)}
          </div>
        </div>

        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2 font-medium">
            Loot Events + Cost (Multiple R²)
          </div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-xs text-muted">Variance Explained</div>
              <div className="text-xl font-bold font-mono text-blue-400">
                {(multiple.rSquared * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">R² Value</div>
              <div className="text-sm font-semibold">{multiple.rSquared.toFixed(3)}</div>
            </div>
          </div>
          <div className="text-xs border-t border-border pt-2 mt-2 flex justify-between">
            <span className="text-muted">Model p-value: {multiple.p.toFixed(4)}</span>
            {getSignificanceLevel(multiple.p)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
