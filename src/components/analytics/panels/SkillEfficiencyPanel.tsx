import { useHuntStore } from '../../../store';
import { MetricTile, Panel } from '../../common/Panel';
import { StatCard } from '../../common/StatCard';

const attributeDescriptions: Record<string, string> = {
  Agility:
    'Affects coordination, finesse, and grace; influences movement speed and is vital for many professions.',
  Health: 'Determines how much damage your avatar can withstand before dying.',
  Intelligence: 'Impacts actions involving the mind, memory, and reasoning.',
  Psyche: 'Influences willpower, mental strength, and mindforce.',
  Stamina: 'Affects bodily hardiness, constitution, and physical toughness.',
  Strength: 'Governs raw muscle power, lifting capacity, and brute force.',
};

export default function SkillEfficiencyPanel() {
  const advanced = useHuntStore((state) => state.analyticsData.advanced);

  if (!advanced) return null;

  const {
    skillsByLocation,
    skillsByWeapon,
    lifetimeAttributeGains,
    skillGainVariance,
    skillValuePerCost,
    totalSkillGains,
  } = advanced;

  return (
    <>
      {/* Skill Efficiency: By Location & By Weapon */}
      <div className="grid grid-cols-2 gap-6">
        {skillsByLocation.length > 0 && (
          <Panel title="Skills by Location" tooltip="Total skill gains grouped by location">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByLocation.slice(0, 10).map((item) => (
                <StatCard
                  key={item.location}
                  label={item.location || 'Unknown'}
                  value={item.skillGains.toFixed(2)}
                  color="text-blue-400"
                />
              ))}
            </div>
          </Panel>
        )}

        {skillsByWeapon.length > 0 && (
          <Panel title="Skills by Weapon" tooltip="Total skill gains grouped by weapon">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByWeapon.slice(0, 10).map((item) => (
                <StatCard
                  key={item.weapon}
                  label={item.weapon}
                  value={item.skillGains.toFixed(2)}
                  color="text-purple-400"
                />
              ))}
            </div>
          </Panel>
        )}
      </div>

      {/* Skill Metrics */}
      <Panel title="Skill Metrics" tooltip="Overall skill efficiency and consistency">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricTile
            label="Skill Gain Variance"
            value={skillGainVariance.toFixed(2)}
            tooltip="Variability in skill gains per session. Lower = consistent"
          />
          <MetricTile
            label="Skills Per PED"
            value={skillValuePerCost.toFixed(2)}
            tone="accent"
            tooltip="Skill gains per PED spent. Efficiency metric"
          />
          <MetricTile
            label="Total Skill Gains"
            value={totalSkillGains.toFixed(2)}
            tone="positive"
          />
        </div>
      </Panel>

      {/* Attributes Panel */}
      <Panel
        title="Attributes"
        tooltip="Core character attributes advancement across all hunts. These are fundamental progression elements."
      >
        {Object.values(lifetimeAttributeGains).some((attr) => attr.gains > 0) ? (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(lifetimeAttributeGains)
              .map(([name, data]) => ({ name, ...data }))
              .sort((a, b) => b.gains - a.gains)
              .map((attr) => (
                <div key={attr.name} className="border border-border rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-sm mb-1">{attr.name}</div>
                      <div className="text-xs text-muted mb-2">
                        {attributeDescriptions[attr.name]}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-border">
                    <div className="text-2xl font-bold text-cyan-400">{attr.gains.toFixed(2)}</div>
                    <div className="text-xs text-muted">{attr.count} events</div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center text-muted py-8">No attribute gains recorded</div>
        )}
      </Panel>
    </>
  );
}
