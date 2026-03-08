import { useState, useEffect } from 'react';
import { HuntSession } from '../../types';

import type { WorkerRequest, WorkerResponse } from '../../workers/analytics.worker';

interface CorrelationAnalyticsProps {
  filteredSessions: HuntSession[];
}

interface CorrelationData {
  n: number;
  durationVsLoot: { r: number; p: number };
  costVsLoot: { r: number; p: number };
  multiple: { r2: number; p: number };
}

export function CorrelationAnalytics({ filteredSessions }: CorrelationAnalyticsProps) {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const validSessions = filteredSessions.filter(
      (s) => s.status === 'completed' && s.stats.duration > 0 && s.stats.totalCost > 0
    );

    if (validSessions.length < 4) {
      setCorrelationData(null);
      return;
    }

    setIsCalculating(true);

    const durationHrs = validSessions.map((s) => s.stats.duration / 3600);
    const costPed = validSessions.map((s) => s.stats.totalCost);
    const lootPed = validSessions.map((s) => s.stats.totalLoot);

    const worker = new Worker(new URL('../../workers/analytics.worker.ts', import.meta.url), {
      type: 'module',
    });

    const runWorkerTask = <T extends WorkerResponse['data']>(
      type: WorkerRequest['type'],
      payload: Extract<WorkerRequest, { type: typeof type }>['payload']
    ): Promise<T> => {
      return new Promise((resolve, reject) => {
        const handler = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === `RESULT_${type.replace('CALC_', '')}`) {
            worker.removeEventListener('message', handler);
            resolve(e.data.data as T);
          } else if (e.data.type === 'ERROR') {
            worker.removeEventListener('message', handler);
            reject(new Error(e.data.error));
          }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ type, payload } as WorkerRequest);
      });
    };

    const processMath = async () => {
      try {
        const durationVsLoot = await runWorkerTask<{ r: number; p: number }>('CALC_CORRELATION', {
          x: durationHrs,
          y: lootPed,
        });
        const costVsLoot = await runWorkerTask<{ r: number; p: number }>('CALC_CORRELATION', { x: costPed, y: lootPed });
        const multipleR = await runWorkerTask<{ rSquared: number; p: number }>(
          'CALC_MULTIPLE_CORRELATION',
          {
            X: [durationHrs, costPed],
            y: lootPed,
          }
        );

        setCorrelationData({
          n: validSessions.length,
          durationVsLoot,
          costVsLoot,
          multiple: multipleR,
        });
      } catch (err) {
        console.error('Worker correlation failed:', err);
      } finally {
        setIsCalculating(false);
        worker.terminate();
      }
    };

    processMath();
  }, [filteredSessions]);

  if (isCalculating) {
    return (
      <div className="card p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted">Calculating correlation matrices...</p>
        </div>
      </div>
    );
  }

  if (!correlationData) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-2">Loot Correlation Analysis</h3>
        <p className="text-sm text-muted">
          Not enough completed sessions to calculate reliable correlation metrics. Need at least 4
          completed sessions.
        </p>
      </div>
    );
  }

  const { durationVsLoot, costVsLoot, multiple, n } = correlationData;

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
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold">Loot Factors Correlation</h3>
        <p className="text-sm text-muted mt-1">
          Statistical analysis of exactly what affects your total loot across {n} completed
          sessions.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2 font-medium">Session Duration vs. Loot</div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-xs text-muted">Pearson&apos;s r</div>
              <div className="text-xl font-bold font-mono">{durationVsLoot.r.toFixed(3)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Strength</div>
              <div className="text-sm font-semibold">
                {getCorrelationStrength(durationVsLoot.r)}
              </div>
            </div>
          </div>
          <div className="text-xs border-t border-border pt-2 mt-2 flex justify-between">
            <span className="text-muted">p-value: {durationVsLoot.p.toFixed(4)}</span>
            {getSignificanceLevel(durationVsLoot.p)}
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
          <div className="text-sm text-muted mb-2 font-medium">Combined Mix (Multiple R²)</div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-xs text-muted">Variance Explained</div>
              <div className="text-xl font-bold font-mono text-blue-400">
                {(multiple.r2 * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">R² Value</div>
              <div className="text-sm font-semibold">{multiple.r2.toFixed(3)}</div>
            </div>
          </div>
          <div className="text-xs border-t border-border pt-2 mt-2 flex justify-between">
            <span className="text-muted">Model p-value: {multiple.p.toFixed(4)}</span>
            {getSignificanceLevel(multiple.p)}
          </div>
        </div>
      </div>
    </div>
  );
}
