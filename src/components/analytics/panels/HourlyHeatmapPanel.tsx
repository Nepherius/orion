import { Fragment, useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function interpolateColor(returnRate: number): string {
  // Red (bad) → neutral (grey) → green (good)
  // < 80% = deep red, 80-100% = red→grey gradient, 100-120% = grey→green gradient, >120% = deep green
  const clamped = Math.max(50, Math.min(150, returnRate));
  const normalised = (clamped - 50) / 100; // 0 to 1

  if (normalised < 0.5) {
    // Red to grey
    const t = normalised / 0.5;
    const r = Math.round(220 - t * 100);
    const g = Math.round(50 + t * 70);
    const b = Math.round(50 + t * 70);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Grey to green
    const t = (normalised - 0.5) / 0.5;
    const r = Math.round(120 - t * 90);
    const g = Math.round(120 + t * 80);
    const b = Math.round(120 - t * 80);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export default function HourlyHeatmapPanel() {
  const heatmapData = useHuntStore((state) => state.analyticsData.factors?.hourlyHeatmap);

  const grid = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return null;

    // Build a 7×24 lookup map
    const lookup = new Map<string, (typeof heatmapData)[0]>();
    for (const entry of heatmapData) {
      lookup.set(`${entry.dayOfWeek}-${entry.hour}`, entry);
    }

    return { lookup };
  }, [heatmapData]);

  if (!grid) return null;

  const cellSize = 32;
  const labelWidth = 40;
  const headerHeight = 24;

  return (
    <Panel
      title="Time-of-Day Heatmap"
      tooltip="Average return rate by day of week and hour. Greener = higher return, redder = lower return. Based on completed sessions within the selected time range."
    >
      <div className="overflow-x-auto">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${labelWidth}px repeat(24, ${cellSize}px)`,
            gridTemplateRows: `${headerHeight}px repeat(7, ${cellSize}px)`,
            gap: '2px',
          }}
        >
          {/* Top-left corner — empty */}
          <div />

          {/* Hour headers */}
          {HOURS.map((h) => (
            <div
              key={`h-${h}`}
              className="flex items-center justify-center text-xs text-muted"
              style={{ width: cellSize, height: headerHeight }}
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}

          {/* Day rows */}
          {DAY_LABELS.map((day, dayIdx) => (
            <Fragment key={day}>
              {/* Day label */}
              <div
                key={`d-${dayIdx}`}
                className="flex items-center text-xs text-muted font-semibold"
                style={{ width: labelWidth, height: cellSize }}
              >
                {day}
              </div>

              {/* Hour cells for this day */}
              {HOURS.map((hour) => {
                const entry = grid.lookup.get(`${dayIdx}-${hour}`);
                const hasData = entry && entry.sessions > 0;

                return (
                  <div
                    key={`c-${dayIdx}-${hour}`}
                    title={
                      hasData
                        ? `${day} ${hour.toString().padStart(2, '0')}:00\nSessions: ${entry.sessions}\nAvg Return: ${entry.avgReturnRate.toFixed(1)}%\nAvg Profit: ${entry.avgProfit >= 0 ? '+' : ''}${entry.avgProfit.toFixed(2)} PED`
                        : `${day} ${hour.toString().padStart(2, '0')}:00\nNo data`
                    }
                    className="rounded-sm transition-all cursor-default"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: hasData
                        ? interpolateColor(entry.avgReturnRate)
                        : 'var(--color-border)',
                      opacity: hasData ? 0.9 : 0.3,
                    }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted">
        <span>Low return</span>
        <div className="flex gap-0.5">
          {[50, 65, 80, 90, 100, 110, 120, 135, 150].map((v) => (
            <div
              key={v}
              className="rounded-sm"
              style={{
                width: 16,
                height: 12,
                backgroundColor: interpolateColor(v),
              }}
            />
          ))}
        </div>
        <span>High return</span>
      </div>
    </Panel>
  );
}
