// Panel showing a line chart of recent session performance trends
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { chartAxisProps, chartGridProps, chartTooltipProps } from '../chartStyles';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

/**
 * Displays a line chart of adjusted return, profit, and loot for the last 30 sessions
 */
export default function PerformanceTrendPanel() {
  const recentSessionsRaw = useHuntStore(
    (state) => state.analyticsData.performance?.recentSessions
  );

  // Memoize and format session data for chart
  const recentSessions = useMemo(() => {
    if (!recentSessionsRaw) return [];
    return recentSessionsRaw.map((s) => ({
      date: format(s.startTime, 'MM/dd'),
      returnRate: s.returnRate,
      profit: s.profit,
      loot: s.loot,
    }));
  }, [recentSessionsRaw]);

  if (recentSessions.length === 0) {
    return (
      <AnalyticsEmptyState
        title="Performance Trend"
        message="Complete sessions with tracked costs and loot to build a performance trend."
      />
    );
  }

  return (
    <Panel
      title="Performance Trend"
      action={<span className="text-xs text-muted">Last 30 sessions</span>}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={recentSessions}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="date" {...chartAxisProps} />
          <YAxis {...chartAxisProps} />
          <Tooltip {...chartTooltipProps} formatter={(value: number) => value.toFixed(2)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="returnRate"
            stroke="#10B981"
            name="Adj Return %"
            strokeWidth={2}
          />
          <Line type="monotone" dataKey="loot" stroke="#3B82F6" name="Loot (PED)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}
