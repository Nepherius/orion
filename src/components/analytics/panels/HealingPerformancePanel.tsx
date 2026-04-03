import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { Heart } from 'lucide-react';
import { InfoTooltip } from '../../common/InfoTooltip';

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
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <Heart className="w-5 h-5 text-green-400" />
        Healing Performance
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted mb-1">Total Healing</div>
          <div className="text-2xl font-bold text-green-400">{stats.totalHealing.toFixed(0)}</div>
        </div>
        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted flex items-center gap-2 mb-1">
            Heals Used
            <InfoTooltip tooltip="Direct uses only (for decay/cost). Passive ticks not counted." />
          </div>
          <div className="text-2xl font-bold text-body">{stats.healsUsed}</div>
        </div>
        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted mb-1">Total Cost</div>
          <div className="text-2xl font-bold text-red-400">{stats.healingCost.toFixed(2)} PED</div>
        </div>
        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted mb-1 flex items-center gap-1">
            vs Damage Taken
            <InfoTooltip tooltip="Total healing divided by total damage taken. >= 1x means you completely healed the damage." />
          </div>
          <div
            className={`text-2xl font-bold ${stats.healingToDamageRatio >= 1 ? 'text-green-400' : 'text-yellow-400'}`}
          >
            {stats.healingToDamageRatio.toFixed(2)}x
          </div>
        </div>

        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted mb-1">Avg Heal Amount</div>
          <div className="text-2xl font-bold text-body">
            {stats.avgHealAmount.toFixed(1)}{' '}
            <span className="text-base font-normal text-muted">HP</span>
          </div>
        </div>
        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted flex items-center gap-2 mb-1">
            Cost per Heal
            <InfoTooltip tooltip="Healing cost divided by direct uses (decay is per use, not per tick)" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {stats.costPerHeal.toFixed(4)}{' '}
            <span className="text-base font-normal text-muted">PED</span>
          </div>
        </div>
        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted flex items-center gap-2 mb-1">
            Healing Efficiency
            <InfoTooltip tooltip="Amount healed per PED spent on healing. Higher is better." />
          </div>
          <div
            className={`text-2xl font-bold ${stats.healingEfficiency > 1 ? 'text-green-400' : 'text-body'}`}
          >
            {stats.healingEfficiency.toFixed(1)}{' '}
            <span className="text-base font-normal text-muted">HP/PED</span>
          </div>
        </div>
        <div className="p-4 bg-surface rounded">
          <div className="text-sm text-muted flex items-center gap-2 mb-1">
            % of Total Cost
            <InfoTooltip tooltip="The percentage of your total session costs spent solely on healing." />
          </div>
          <div className="text-2xl font-bold text-body">
            {stats.costPercentage.toFixed(1)}{' '}
            <span className="text-base font-normal text-muted">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
