import { X } from 'lucide-react';
import { useLoadoutForm } from '../../hooks/useLoadoutForm';
import { Loadout } from '../../types';
import { EquipmentSelector } from '../common/EquipmentSelector';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { InfoTooltip } from '../common/InfoTooltip';
import { calculateHealingCostPerUse } from '../../utils/healingCost';

interface NewLoadoutModalProps {
  onClose: () => void;
  editLoadout?: Loadout;
}

export function NewLoadoutModal({ onClose, editLoadout }: NewLoadoutModalProps) {
  const {
    name,
    setName,
    hotkey,
    setHotkey,
    weapon,
    setWeapon,
    amplifier,
    setAmplifier,
    scope,
    setScope,
    sight,
    setSight,
    sight2,
    setSight2,
    absorber,
    setAbsorber,
    armor,
    setArmor,
    medicalTool,
    setMedicalTool,
    medicalTT,
    setMedicalTT,
    medicalMarkup,
    setMedicalMarkup,
    medicalDecay,
    setMedicalDecay,
    medicalME,
    setMedicalME,
    medicalMEMarkup,
    setMedicalMEMarkup,
    weapons,
    amps,
    scopes,
    sights,
    absorbers,
    armorItems,
    medicalTools,
    stats,
    handleSave,
  } = useLoadoutForm(editLoadout);

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
  };

  const weaponDecay = weapon?.Properties?.Economy?.Decay || 0;
  const amplifierDecay = amplifier?.Properties?.Economy?.Decay || 0;
  const scopeDecay = scope?.Properties?.Economy?.Decay || 0;
  const sightDecay = sight?.Properties?.Economy?.Decay || 0;
  const sight2Decay = sight2?.Properties?.Economy?.Decay || 0;
  const absorberDecay = absorber?.Properties?.Economy?.Decay || 0;
  const totalCostPerShotPec = stats.costPerShot * 100;

  const selectedMedicalTool = medicalTools.find((tool) => tool.name === medicalTool);
  const isFapType = selectedMedicalTool?.type === 'fap';
  const adjustedMedicalDecayPEC = medicalDecay * (medicalMarkup / 100);

  const adjustedMedicalCostPerHeal = calculateHealingCostPerUse({
    medicalDecay,
    medicalMarkup,
    medicalME,
    medicalMEMarkup,
    isFapType,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New Loadout"
            className="text-xl font-bold bg-transparent border-none outline-none text-white flex-1"
          />
          <button onClick={onClose} className="text-muted hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted uppercase block mb-1">Hotkey</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Hotkey:</span>
              <kbd className="px-2 py-1 rounded border border-border bg-surface text-xs font-semibold text-gray-200">
                CTRL
              </kbd>
              <span className="text-muted">+</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={hotkey?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^1-9]/g, '');
                  setHotkey(value ? Number(value) : undefined);
                }}
                placeholder="1-9"
                className="input w-20 text-center font-mono"
              />
              <span className="text-xs text-muted">Assign Ctrl+1 to Ctrl+9</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <span>💾</span>
              Save
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              {/* Equipment Section */}
              <div className="space-y-3">
                <div className="text-sm font-bold text-muted uppercase">Equipment</div>

                {/* Stats Display */}
                <div className="bg-surface rounded-lg p-3 text-center">
                  <div className="text-xs text-muted uppercase mb-1">Cost/Shot</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {stats.costPerShot.toFixed(4)} <span className="text-xs">PED</span>
                  </div>
                </div>

                <EquipmentSelector
                  label="Weapon"
                  items={weapons}
                  selected={weapon}
                  onSelect={setWeapon}
                  placeholder="Search weapons..."
                />

                <EquipmentSelector
                  label="Amplifier"
                  items={amps}
                  selected={amplifier}
                  onSelect={setAmplifier}
                  placeholder="Search amps..."
                />

                <EquipmentSelector
                  label="Scope"
                  items={scopes}
                  selected={scope}
                  onSelect={setScope}
                  placeholder="Search scopes..."
                />

                <EquipmentSelector
                  label="Sight"
                  items={sights}
                  selected={sight}
                  onSelect={setSight}
                  placeholder="Search sights..."
                />

                <EquipmentSelector
                  label="Sight 2"
                  items={sights}
                  selected={sight2}
                  onSelect={setSight2}
                  placeholder="Search sights..."
                />

                <EquipmentSelector
                  label="Absorber"
                  items={absorbers}
                  selected={absorber}
                  onSelect={setAbsorber}
                  placeholder="Search absorbers..."
                />
              </div>

              <div className="space-y-3">
                <div className="bg-surface rounded-lg border border-border p-4">
                  <div className="text-xs text-muted uppercase tracking-wider mb-3">Offense</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Total Damage</span>
                      <span className="text-white font-medium">{stats.totalDamage.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Range</span>
                      <span className="text-white font-medium">{stats.range.toFixed(1)}m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Critical Chance</span>
                      <span className="text-white font-medium">
                        {stats.criticalChance.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Hit Rate</span>
                      <span className="text-white font-medium">{stats.hitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Effective Damage</span>
                      <span className="text-blue-400 font-medium">
                        {stats.effectiveDamage.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface rounded-lg border border-border p-4">
                  <div className="text-xs text-muted uppercase tracking-wider mb-3">Economy</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Efficiency</span>
                      <span className="text-white font-medium">{stats.efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Decay</span>
                      <span className="text-white font-medium">{stats.decay.toFixed(4)} PEC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Ammo Burn</span>
                      <span className="text-white font-medium">{stats.ammoBurn}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Total Uses</span>
                      <span className="text-white font-medium">
                        {stats.totalUses !== null ? stats.totalUses : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface rounded-lg border border-border p-4">
                  <div className="text-xs text-muted uppercase tracking-wider mb-3">
                    Cost Breakdown
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Weapon</span>
                      <span className="text-white font-medium">{weaponDecay.toFixed(4)} PEC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Amplifier</span>
                      <span className="text-white font-medium">
                        {amplifierDecay.toFixed(4)} PEC
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Scope</span>
                      <span className="text-white font-medium">{scopeDecay.toFixed(4)} PEC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Sight</span>
                      <span className="text-white font-medium">{sightDecay.toFixed(4)} PEC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Sight 2</span>
                      <span className="text-white font-medium">{sight2Decay.toFixed(4)} PEC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Absorber</span>
                      <span className="text-white font-medium">{absorberDecay.toFixed(4)} PEC</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                      <span className="text-gray-300">Total/Shot</span>
                      <span className="text-blue-400 font-semibold">
                        {totalCostPerShotPec.toFixed(4)} PEC
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Defense & Healing Section */}
              <div className="space-y-3">
                <div className="text-sm font-bold text-muted uppercase">Defense & Healing</div>

                {/* Heal Metrics */}
                <div className="bg-surface rounded-lg p-3 text-center">
                  <div className="text-xs text-muted uppercase mb-1">Cost per Heal</div>
                  <div className="text-2xl font-bold text-green-400">
                    {adjustedMedicalCostPerHeal.toFixed(4)} <span className="text-xs">PED</span>
                  </div>
                </div>

                <AutocompleteInput
                  label="Armor"
                  value={armor}
                  onChange={setArmor}
                  options={armorItems}
                  placeholder="Search armor..."
                />
                <AutocompleteInput
                  label="Medical"
                  value={medicalTool}
                  onChange={setMedicalTool}
                  options={medicalTools.map((tool) => tool.name)}
                  placeholder="Search medical tools..."
                />
              </div>

              <div className="bg-surface rounded-lg border border-border p-4">
                <div className="text-xs text-muted uppercase tracking-wider mb-3">
                  Medical Stats
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted uppercase block mb-1">TT</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={medicalTT}
                      onChange={(e) =>
                        setMedicalTT(e.target.value === '' ? 0 : Number(e.target.value))
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase block mb-1 flex items-center gap-1">
                      Markup (%)
                      <InfoTooltip tooltip="100% = TT value. If you paid more than TT, update the TT value and leave markup at 100% or update the markup value to reflect the actual markup you paid." />
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={medicalMarkup}
                      onChange={(e) =>
                        setMedicalMarkup(e.target.value === '' ? 0 : Number(e.target.value))
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase block mb-1">
                      Decay (Base PEC)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={medicalDecay}
                      onChange={(e) =>
                        setMedicalDecay(e.target.value === '' ? 0 : Number(e.target.value))
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase block mb-1">
                      Decay (w/ Markup)
                    </label>
                    <div className="bg-surface-hover rounded px-3 py-2 text-sm text-white font-medium">
                      {adjustedMedicalDecayPEC.toFixed(4)} PEC
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase block mb-1">ME</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={medicalME}
                      onChange={(e) =>
                        setMedicalME(e.target.value === '' ? 0 : Number(e.target.value))
                      }
                      disabled={isFapType}
                      className={`input w-full ${isFapType ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase block mb-1">ME Markup (%)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={medicalMEMarkup}
                      onChange={(e) =>
                        setMedicalMEMarkup(e.target.value === '' ? 100 : Number(e.target.value))
                      }
                      disabled={isFapType}
                      className={`input w-full ${isFapType ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase block mb-1">
                      Cost / 1 ME (Calculated)
                    </label>
                    <div className="bg-surface-hover rounded px-3 py-2 text-sm text-blue-400 font-medium">
                      {adjustedMedicalCostPerHeal.toFixed(4)} PED
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
