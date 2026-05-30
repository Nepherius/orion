import { useState } from 'react';
import { useHuntStore } from '../../store';
import { HuntSession } from '../../types';
import { DollarSign, Edit2, Save } from 'lucide-react';
import { Panel } from '../common/Panel';

interface CostsPanelProps {
  session: HuntSession;
}

export function CostsPanel({ session }: CostsPanelProps) {
  const updateSession = useHuntStore((state) => state.updateSession);
  const [isEditing, setIsEditing] = useState(false);
  const [costs, setCosts] = useState({
    ammoCost: session.ammoCost,
    weaponDecay: session.weaponDecay,
    healingCost: session.healingCost,
    otherCosts: session.otherCosts,
  });

  const handleSave = () => {
    updateSession(session.id, costs);
    setIsEditing(false);
  };

  const totalCost = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

  return (
    <Panel
      title="Costs"
      action={
        isEditing ? (
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        )
      }
    >
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <DollarSign className="h-4 w-4 text-red-400" />
        Session cost breakdown
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg p-3 border border-border">
          <label className="label text-xs">Ammo Cost</label>
          {isEditing ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={costs.ammoCost}
              onChange={(e) => setCosts({ ...costs, ammoCost: Number(e.target.value) })}
              className="input w-full"
            />
          ) : (
            <div className="text-lg font-semibold">{costs.ammoCost.toFixed(2)} PED</div>
          )}
        </div>

        <div className="bg-surface rounded-lg p-3 border border-border">
          <label className="label text-xs">Weapon decay</label>
          {isEditing ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={costs.weaponDecay}
              onChange={(e) => setCosts({ ...costs, weaponDecay: Number(e.target.value) })}
              className="input w-full"
            />
          ) : (
            <div className="text-lg font-semibold">{costs.weaponDecay.toFixed(2)} PED</div>
          )}
        </div>

        <div className="bg-surface rounded-lg p-3 border border-border">
          <label className="label text-xs">Healing Cost</label>
          {isEditing ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={costs.healingCost}
              onChange={(e) => setCosts({ ...costs, healingCost: Number(e.target.value) })}
              className="input w-full"
            />
          ) : (
            <div className="text-lg font-semibold">{costs.healingCost.toFixed(2)} PED</div>
          )}
        </div>

        <div className="bg-surface rounded-lg p-3 border border-border">
          <label className="label text-xs">Other Costs</label>
          {isEditing ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={costs.otherCosts}
              onChange={(e) => setCosts({ ...costs, otherCosts: Number(e.target.value) })}
              className="input w-full"
            />
          ) : (
            <div className="text-lg font-semibold">{costs.otherCosts.toFixed(2)} PED</div>
          )}
        </div>

        <div className="bg-red-900 bg-opacity-30 rounded-lg p-3 border border-red-500/50">
          <label className="label text-xs">Total Cost</label>
          <div className="text-xl font-bold text-red-400">{totalCost.toFixed(2)} PED</div>
        </div>
      </div>
    </Panel>
  );
}
