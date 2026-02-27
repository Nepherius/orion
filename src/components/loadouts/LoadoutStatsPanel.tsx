import { Loadout } from '../../types';

interface LoadoutStatsPanelProps {
  loadout: Loadout;
}

export function LoadoutStatsPanel({ loadout }: LoadoutStatsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Cost and DPP */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-700 rounded p-3 text-center">
          <div className="text-xs text-gray-400 uppercase mb-1">Cost/Shot</div>
          <div className="text-xl font-bold text-blue-400">
            {loadout.costPerShot.toFixed(4)} <span className="text-xs">PED</span>
          </div>
        </div>
        <div className="bg-gray-700 rounded p-3 text-center">
          <div className="text-xs text-gray-400 uppercase mb-1">DPP</div>
          <div className="text-xl font-bold text-green-400">{loadout.dpp.toFixed(4)}</div>
        </div>
      </div>

      {/* Offense Statistics */}
      <div>
        <div className="text-xs font-bold text-blue-400 uppercase mb-2">Offense</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Damage</span>
            <span>{loadout.totalDamage.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Range</span>
            <span>{loadout.range.toFixed(1)}m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Critical Chance</span>
            <span>{loadout.criticalChance.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Hit Rate</span>
            <span className="text-green-400">{loadout.hitRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Effective Damage</span>
            <span>{loadout.effectiveDamage.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Economy Statistics */}
      <div>
        <div className="text-xs font-bold text-blue-400 uppercase mb-2">Economy</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Efficiency</span>
            <span>{loadout.efficiency.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Decay</span>
            <span>{loadout.decay.toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Ammo Burn</span>
            <span>{(loadout.ammoBurn / 100).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Uses</span>
            <span>{loadout.totalUses || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div>
        <div className="text-xs font-bold text-blue-400 uppercase mb-2">Cost Breakdown</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Weapon</span>
            <span>{(loadout.weapon?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Amplifier</span>
            <span>{(loadout.amplifier?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Scope</span>
            <span>{(loadout.scope?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Sight</span>
            <span>{(loadout.sight?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Sight 2</span>
            <span>{(loadout.sight2?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Absorber</span>
            <span>0.0000 PEC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Enhancers</span>
            <span>0.0000 PEC</span>
          </div>
          <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold">
            <span>Total/Shot</span>
            <span className="text-blue-400">{loadout.costPerShot.toFixed(4)} PED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
