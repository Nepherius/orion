import { Loadout } from '../../types';
import { calculateHealingCostPerUse } from '../../utils/healingCost';
import { MetricTile } from '../common/Panel';

interface LoadoutStatsPanelProps {
  loadout: Loadout;
}

export function LoadoutStatsPanel({ loadout }: LoadoutStatsPanelProps) {
  // Calculate cost per heal if medical tool is configured
  const hasMedicalTool = !!loadout.medicalTool;
  const isFapType = loadout.medicalTool?.toLowerCase().includes('fap') || false;
  const costPerHeal = hasMedicalTool
    ? calculateHealingCostPerUse({
        medicalDecay: loadout.medicalDecay || 0,
        medicalMarkup: loadout.medicalMarkup || 100,
        medicalME: loadout.medicalME || 0,
        medicalMEMarkup: loadout.medicalMEMarkup || 100,
        isFapType,
      })
    : 0;

  return (
    <div className="space-y-4">
      {/* Cost per Shot and Cost per Heal */}
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          label="Cost/Shot"
          value={`${loadout.costPerShot.toFixed(4)} PED`}
          valueClassName="text-blue-400"
          size="sm"
        />
        <MetricTile
          label="Cost/Heal"
          value={hasMedicalTool ? `${costPerHeal.toFixed(4)} PED` : 'N/A'}
          valueClassName={hasMedicalTool ? 'text-green-400' : 'text-muted'}
          size="sm"
        />
      </div>

      {/* Offense Statistics */}
      <div>
        <div className="text-xs font-bold text-blue-400 uppercase mb-2">Offense</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Total Damage</span>
            <span>{loadout.totalDamage.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Range</span>
            <span>{loadout.range.toFixed(1)}m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Critical Chance</span>
            <span>{loadout.criticalChance.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Hit Rate</span>
            <span className="text-green-400">{loadout.hitRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Effective Damage</span>
            <span>{loadout.effectiveDamage.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Economy Statistics */}
      <div>
        <div className="text-xs font-bold text-blue-400 uppercase mb-2">Economy</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Efficiency</span>
            <span>{loadout.efficiency.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Decay</span>
            <span>{loadout.decay.toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Ammo Burn</span>
            <span>{(loadout.ammoBurn / 100).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Total Uses</span>
            <span>{loadout.totalUses || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div>
        <div className="text-xs font-bold text-blue-400 uppercase mb-2">Cost Breakdown</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Weapon</span>
            <span>{(loadout.weapon?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Amplifier</span>
            <span>{(loadout.amplifier?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Scope</span>
            <span>{(loadout.scope?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Sight</span>
            <span>{(loadout.sight?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Sight 2</span>
            <span>{(loadout.sight2?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Absorber</span>
            <span>{(loadout.absorber?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 mt-1 font-bold">
            <span>Total/Shot</span>
            <span className="text-blue-400">{loadout.costPerShot.toFixed(4)} PED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
