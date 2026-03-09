import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

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
    allSkillNames,
    skillGainVariance,
    skillValuePerCost,
    totalSkillGains,
  } = advanced;

  return (
    <>
      {/* Skill Efficiency: By Location & By Weapon */}
      <div className="grid grid-cols-2 gap-6">
        {skillsByLocation.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">Skills by Location</h3>
              <InfoTooltip tooltip="Total skill gains grouped by location" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByLocation.slice(0, 10).map((item) => (
                <div
                  key={item.location}
                  className="flex justify-between p-2 border-b border-border"
                >
                  <span className="text-gray-300 truncate">{item.location || 'Unknown'}</span>
                  <span className="font-semibold text-blue-400">{item.skillGains.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {skillsByWeapon.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">Skills by Weapon</h3>
              <InfoTooltip tooltip="Total skill gains grouped by weapon" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByWeapon.slice(0, 10).map((item) => (
                <div key={item.weapon} className="flex justify-between p-2 border-b border-border">
                  <span className="text-gray-300 truncate">{item.weapon}</span>
                  <span className="font-semibold text-purple-400">
                    {item.skillGains.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attributes Panel */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Attributes</h3>
          <InfoTooltip tooltip="Core character attributes advancement across all hunts. These are fundamental progression elements." />
        </div>
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
      </div>

      {/* All Skills Tracked */}
      <div className="card p-6 border-yellow-500/30">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-bold text-yellow-400">All Skills Tracked</h3>
          <InfoTooltip tooltip="Complete list of skill names in your data." />
        </div>
        <div className="text-xs text-muted space-y-1 max-h-32 overflow-y-auto">
          {allSkillNames.length === 0 ? (
            <span>No skills tracked</span>
          ) : (
            allSkillNames.map((skill) => (
              <div key={skill} className="p-1 bg-gray-700/20 rounded px-2">
                {skill}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Skill Metrics */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Skill Metrics</h3>
          <InfoTooltip tooltip="Overall skill efficiency and consistency" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Skill Gain Variance
              <InfoTooltip tooltip="Variability in skill gains per session. Lower = consistent" />
            </div>
            <div className="text-2xl font-bold text-body">{skillGainVariance.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Skills Per PED
              <InfoTooltip tooltip="Skill gains per PED spent. Efficiency metric" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{skillValuePerCost.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total Skill Gains</div>
            <div className="text-2xl font-bold text-green-400">{totalSkillGains.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
