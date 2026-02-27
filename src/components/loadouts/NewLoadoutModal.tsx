import { X } from 'lucide-react';
import { useLoadoutForm } from '../../hooks/useLoadoutForm';
import { Loadout } from '../../types';
import { EquipmentSelector } from '../common/EquipmentSelector';
import { EnhancerControls } from '../common/EnhancerControls';

interface NewLoadoutModalProps {
  onClose: () => void;
  editLoadout?: Loadout;
}

export function NewLoadoutModal({ onClose, editLoadout }: NewLoadoutModalProps) {
  const {
    name,
    setName,
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
    enhancers,
    setEnhancers,
    hitProfession,
    setHitProfession,
    dmgProfession,
    setDmgProfession,
    weapons,
    amps,
    scopes,
    sights,
    absorbers,
    stats,
    handleSave,
  } = useLoadoutForm(editLoadout);

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New Loadout"
            className="text-xl font-bold bg-transparent border-none outline-none text-white flex-1"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
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

          {/* Stats Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 uppercase mb-1">Cost/Shot</div>
              <div className="text-2xl font-bold text-blue-400">
                {stats.costPerShot.toFixed(4)} <span className="text-xs">PED</span>
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 uppercase mb-1">DPP</div>
              <div className="text-2xl font-bold text-green-400">{stats.dpp.toFixed(4)}</div>
            </div>
          </div>

          {/* Equipment Section */}
          <div className="space-y-3">
            <div className="text-sm font-bold text-gray-400 uppercase">Equipment</div>

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

          {/* Enhancers */}
          <EnhancerControls enhancers={enhancers} onUpdate={setEnhancers} />

          {/* Professions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Hit Profession</label>
              <input
                type="number"
                value={hitProfession}
                onChange={(e) => setHitProfession(Number(e.target.value))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Dmg Profession</label>
              <input
                type="number"
                value={dmgProfession}
                onChange={(e) => setDmgProfession(Number(e.target.value))}
                className="input w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
