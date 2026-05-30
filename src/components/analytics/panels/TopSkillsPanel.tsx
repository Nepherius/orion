// Panel showing a bar chart of top skills gained
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { chartAxisProps, chartGridProps, chartTooltipProps } from '../chartStyles';

/**
 * Displays a vertical bar chart of the top skills gained in recent sessions
 */
export default function TopSkillsPanel() {
  const topSkills = useHuntStore((state) => state.analyticsData.performance?.topSkills);

  if (!topSkills || topSkills.length === 0) return null;

  return (
    <Panel title="Top Skills Gained">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topSkills} layout="vertical">
          <CartesianGrid {...chartGridProps} />
          <XAxis type="number" {...chartAxisProps} />
          <YAxis dataKey="name" type="category" width={150} {...chartAxisProps} />
          <Tooltip {...chartTooltipProps} formatter={(value: number) => value.toFixed(2)} />
          <Bar dataKey="total" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
