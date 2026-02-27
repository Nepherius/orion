import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useHuntStore } from '../../store';
import { EquipmentItem, LoadoutEnhancers } from '../../types';
import { calculateLoadoutStats } from '../../utils/loadoutCalculations';
import { EquipmentSelector } from '../common/EquipmentSelector';
import { EnhancerControls } from '../common/EnhancerControls';

interface NewLoadoutModalProps {
  onClose: () => void;
  editLoadout?: any;
}

export function NewLoadoutModal({ onClose, editLoadout }: NewLoadoutModalProps) {
  const { createLoadout, updateLoadout } = useHuntStore();
  
  const [name, setName] = useState(editLoadout?.name || '');
  const [weapon, setWeapon] = useState<EquipmentItem | undefined>(editLoadout?.weapon);
  const [amplifier, setAmplifier] = useState<EquipmentItem | undefined>(editLoadout?.amplifier);
  const [scope, setScope] = useState<EquipmentItem | undefined>(editLoadout?.scope);
  const [sight, setSight] = useState<EquipmentItem | undefined>(editLoadout?.sight);
  const [sight2, setSight2] = useState<EquipmentItem | undefined>(editLoadout?.sight2);
  const [absorber, setAbsorber] = useState<EquipmentItem | undefined>(editLoadout?.absorber);
  const [enhancers, setEnhancers] = useState<LoadoutEnhancers>(
    editLoadout?.enhancers || { dmg: 0, acc: 0, rng: 0, eco: 0 }
  );
  const [hitProfession, setHitProfession] = useState(editLoadout?.hitProfession || 100);
  const [dmgProfession, setDmgProfession] = useState(editLoadout?.dmgProfession || 100);

  const [weapons, setWeapons] = useState<EquipmentItem[]>([]);
  const [amps, setAmps] = useState<EquipmentItem[]>([]);
  const [scopes, setScopes] = useState<EquipmentItem[]>([]);
  const [sights, setSights] = useState<EquipmentItem[]>([]);
  const [absorbers, setAbsorbers] = useState<EquipmentItem[]>([]);

  useEffect(() => {
    // Load equipment data
    Promise.all([
      fetch('/assets/items/weapons.json').then(r => r.json()),
      fetch('/assets/items/amps.json').then(r => r.json()),
      fetch('/assets/items/scopes.json').then(r => r.json()),
      fetch('/assets/items/sights.json').then(r => r.json()),
      fetch('/assets/items/absorbers.json').then(r => r.json()),
    ]).then(([weaponsData, ampsData, scopesData, sightsData, absorbersData]) => {
      setWeapons(weaponsData);
      setAmps(ampsData);
      setScopes(scopesData);
      setSights(sightsData);
      setAbsorbers(absorbersData);
    });
  }, []);

  const stats = calculateLoadoutStats(weapon, amplifier, scope, enhancers);

  const handleSave = () => {
    const loadoutData = {
      name: name || 'Unnamed Loadout',
      status: 'inactive' as const,
      favorite: false,
      weapon,
      amplifier,
      scope,
      sight,
      sight2,
      absorber,
      enhancers,
      hitProfession,
      dmgProfession,
      ...stats,
    };

    if (editLoadout) {
      updateLoadout(editLoadout.id, loadoutData);
    } else {
      createLoadout(loadoutData);
    }
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
            <button onClick={onClose} className="btn-secondary flex items-center justify-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary flex items-center justify-center gap-2">
              <span>💾</span>
              Save
            </button>
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 uppercase mb-1">Cost/Shot</div>
              <div className="text-2xl font-bold text-blue-400">{stats.costPerShot.toFixed(3)} <span className="text-xs">PEC</span></div>
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
