import { useHuntStore } from '../../../store';

export default function ArmorPerformancePanel() {
  const armorData = useHuntStore((state) => state.analyticsData.performance?.armorData);

  if (!armorData || armorData.length === 0 || !armorData.some((a) => a.armor !== 'None'))
    return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Armor Performance</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
          <div>Armor</div>
          <div className="text-right">Sessions</div>
          <div className="text-right">Return %</div>
          <div className="text-right">Avg Damage Taken</div>
        </div>
        {armorData.map((armor) => (
          <div
            key={armor.armor}
            className="grid grid-cols-4 gap-2 text-sm py-2 hover:bg-surface-hover"
          >
            <div className="truncate" title={armor.armor}>
              {armor.armor}
            </div>
            <div className="text-right text-muted">{armor.sessions}</div>
            <div
              className={`text-right font-semibold ${armor.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
            >
              {armor.returnRate.toFixed(1)}%
            </div>
            <div className="text-right">{armor.avgDamageTaken.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
