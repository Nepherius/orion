import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { Heart } from 'lucide-react';
import { MetricTile, Panel } from '../../common/Panel';

export default function HealingPerformancePanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  const stats = useMemo(() => {
    let totalHealing = 0;
    let healsUsed = 0;
    let healingCost = 0;
    let damageTaken = 0;
    let totalCost = 0;
    let sessionCount = 0;

    for (const session of sessions) {
      if (timeRange.startTime !== null && session.startTime < timeRange.startTime) continue;
      if (timeRange.endTime !== null && session.startTime > timeRange.endTime) continue;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (session.tags || []).includes(t)))
        continue;

      sessionCount++;
      totalHealing += session.stats.totalHealing || 0;
      healsUsed += session.stats.healsUsed || 0;
      healingCost += session.healingCost || 0;
      damageTaken += session.stats.damageTaken || 0;
      totalCost += session.stats.totalCost || 0;
    }

    const avgHealAmount = healsUsed > 0 ? totalHealing / healsUsed : 0;
    const costPerHeal = healsUsed > 0 ? healingCost / healsUsed : 0;
    const healingEfficiency = healingCost > 0 ? totalHealing / healingCost : 0;
    const healingToDamageRatio = damageTaken > 0 ? totalHealing / damageTaken : 0;
    const costPercentage = totalCost > 0 ? (healingCost / totalCost) * 100 : 0;

    return {
      sessionCount,
      totalHealing,
      healsUsed,
      healingCost,
      damageTaken,
      avgHealAmount,
      costPerHeal,
      healingEfficiency,
      healingToDamageRatio,
      costPercentage,
    };
  }, [sessions, timeRange, selectedTags]);

  if (stats.sessionCount === 0 || stats.totalHealing === 0) {
    return null;
  }

  return (
    <Panel title="Healing Performance">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Total Healing"
          value={stats.totalHealing.toFixed(0)}
          icon={<Heart className="h-5 w-5" />}
          valueClassName="text-green-400"
        />
        <MetricTile
          label="Heals Used"
          tooltip="Direct uses only (for decay/cost). Passive ticks not counted."
          value={stats.healsUsed}
        />
        <MetricTile
          label="Total Cost"
          value={`${stats.healingCost.toFixed(2)} PED`}
          valueClassName="text-red-400"
        />
        <MetricTile
          label="vs Damage Taken"
          tooltip="Total healing divided by total damage taken. >= 1x means you completely healed the damage."
          value={`${stats.healingToDamageRatio.toFixed(2)}x`}
          valueClassName={stats.healingToDamageRatio >= 1 ? 'text-green-400' : 'text-yellow-400'}
        />
        <MetricTile label="Avg Heal Amount" value={`${stats.avgHealAmount.toFixed(1)} HP`} />
        <MetricTile
          label="Cost per Heal"
          tooltip="Healing cost divided by direct uses (decay is per use, not per tick)"
          value={`${stats.costPerHeal.toFixed(4)} PED`}
          valueClassName="text-blue-400"
        />
        <MetricTile
          label="Healing Efficiency"
          tooltip="Amount healed per PED spent on healing. Higher is better."
          value={`${stats.healingEfficiency.toFixed(1)} HP/PED`}
          valueClassName={stats.healingEfficiency > 1 ? 'text-green-400' : 'text-body'}
        />
        <MetricTile
          label="% of Total Cost"
          tooltip="The percentage of your total session costs spent solely on healing."
          value={`${stats.costPercentage.toFixed(1)}%`}
        />
      </div>
    </Panel>
  );
}
