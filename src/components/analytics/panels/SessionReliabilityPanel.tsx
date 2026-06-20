import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';
import { MetricTile, Panel } from '../../common/Panel';

export default function SessionReliabilityPanel() {
  const { advanced, sessions, analyticsTimeRange, analyticsSelectedTags } = useHuntStore(
    (state) => ({
      advanced: state.analyticsData.advanced,
      sessions: state.sessions,
      analyticsTimeRange: state.analyticsTimeRange,
      analyticsSelectedTags: state.analyticsSelectedTags,
    })
  );

  const histogram = useMemo(() => {
    let under80 = 0;
    let b80_90 = 0;
    let b90_100 = 0;
    let b100_110 = 0;
    let over110 = 0;

    const filtered = sessions.filter((s) => {
      if (s.status !== 'completed') return false;
      if (analyticsTimeRange.startTime !== null && s.startTime < analyticsTimeRange.startTime)
        return false;
      if (analyticsTimeRange.endTime !== null && s.startTime > analyticsTimeRange.endTime)
        return false;
      if (analyticsSelectedTags.length > 0) {
        if (!s.tags || !analyticsSelectedTags.every((t) => s.tags!.includes(t))) return false;
      }
      return true;
    });

    filtered.forEach((session) => {
      const rate =
        session.stats.totalCost > 0 ? (session.stats.totalLoot / session.stats.totalCost) * 100 : 0;

      if (rate < 80) under80++;
      else if (rate < 90) b80_90++;
      else if (rate < 100) b90_100++;
      else if (rate < 110) b100_110++;
      else over110++;
    });

    const max = Math.max(under80, b80_90, b90_100, b100_110, over110) || 1; // Prevent division by zero

    return {
      under80: { count: under80, height: (under80 / max) * 100 },
      b80_90: { count: b80_90, height: (b80_90 / max) * 100 },
      b90_100: { count: b90_100, height: (b90_100 / max) * 100 },
      b100_110: { count: b100_110, height: (b100_110 / max) * 100 },
      over110: { count: over110, height: (over110 / max) * 100 },
      totalSessions: filtered.length,
    };
  }, [sessions, analyticsTimeRange, analyticsSelectedTags]);

  if (!advanced) return null;

  const { sessionWinRate, profitableStreaks } = advanced;
  const bars = [
    { label: '<80%', ...histogram.under80, color: 'bg-red-500' },
    { label: '80-90%', ...histogram.b80_90, color: 'bg-orange-400' },
    { label: '90-100%', ...histogram.b90_100, color: 'bg-yellow-400' },
    { label: '100-110%', ...histogram.b100_110, color: 'bg-green-400' },
    { label: '>110%', ...histogram.over110, color: 'bg-emerald-500' },
  ];

  return (
    <Panel title="Session Reliability" tooltip="Session profitability patterns and consistency">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          <MetricTile
            label="Win Rate"
            value={`${sessionWinRate.toFixed(1)}%`}
            tone="positive"
            tooltip="Percentage of profitable sessions"
            size="lg"
          />
          <MetricTile
            label="Current Streak"
            value={profitableStreaks.currentStreak}
            tone="accent"
            tooltip="Consecutive profitable sessions, most recent first"
            size="lg"
          />
          <MetricTile
            label="Longest Streak"
            value={profitableStreaks.longestStreak}
            tone="warning"
            tooltip="Best consecutive profitable sessions"
            size="lg"
          />
        </div>

        <div className="rounded-lg border border-border bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3 text-sm text-muted mb-4">
            <div className="flex items-center gap-1">
              Return Rate Volatility Histogram
              <InfoTooltip tooltip="Distribution of session returns across brackets" />
            </div>
            <span className="text-xs whitespace-nowrap">
              {histogram.totalSessions} session{histogram.totalSessions !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-end justify-between h-24 gap-2 mb-2">
            {bars.map((bar) => (
              <div
                key={bar.label}
                className="w-full h-full flex flex-col justify-end items-center group relative"
              >
                <div
                  className={`w-full rounded-t ${bar.color} opacity-80 group-hover:opacity-100 transition-opacity`}
                  style={{ height: `${bar.height}%`, minHeight: bar.count > 0 ? '4px' : '0' }}
                ></div>
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-surface border border-border rounded px-1.5 py-0.5 z-10 pointer-events-none">
                  {bar.count} session{bar.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted w-full gap-2">
            {bars.map((bar) => (
              <div key={bar.label} className="w-full min-w-0 text-center">
                <div className="truncate">{bar.label}</div>
                <div className="text-foreground font-medium">{bar.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
