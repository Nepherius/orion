import { useHuntStore } from '../../../store';
import { MetricTile, Panel } from '../../common/Panel';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

export default function LootQualityPanel() {
  const performance = useHuntStore((state) => state.analyticsData.performance);

  if (!performance) {
    return (
      <AnalyticsEmptyState
        title="Loot Quality & Consistency"
        message="Loot analytics are not available for the selected filters."
      />
    );
  }

  return (
    <Panel title="Loot Quality & Consistency">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <MetricTile
          label="Average Drop Value"
          value={`${performance.avgLootValue.toFixed(2)} PED`}
          tone="positive"
        />
        <MetricTile
          label="Loot Consistency"
          value={performance.overallLootStdDev.toFixed(1)}
          tone="accent"
          detail="Std dev"
        />
        <MetricTile
          label="Largest Drop"
          value={`${performance.largestDropValue.toFixed(2)} PED`}
          tone="warning"
        />
        <MetricTile label="Minutes Per Loot" value={performance.avgMinutesPerLoot.toFixed(1)} />
        <MetricTile label="Total Loot Events" value={performance.totalLootEvents} tone="accent" />
      </div>
    </Panel>
  );
}
