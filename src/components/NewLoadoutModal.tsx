import { useState, useEffect } from 'react';
import { X, Search, Plus, Minus } from 'lucide-react';
import { useHuntStore } from '../store';
import { EquipmentItem, LoadoutEnhancers } from '../types';

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

  const [weaponSearch, setWeaponSearch] = useState('');
  const [ampSearch, setAmpSearch] = useState('');
  const [scopeSearch, setScopeSearch] = useState('');
  const [sightSearch, setSightSearch] = useState('');
  const [sight2Search, setSight2Search] = useState('');
  const [absorberSearch, setAbsorberSearch] = useState('');

  const [weapons, setWeapons] = useState<EquipmentItem[]>([]);
  const [amps, setAmps] = useState<EquipmentItem[]>([]);
  const [scopes, setScopes] = useState<EquipmentItem[]>([]);
  const [sights, setSights] = useState<EquipmentItem[]>([]);
  const [absorbers, setAbsorbers] = useState<EquipmentItem[]>([]);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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

  const calculateStats = () => {
    // Basic calculations (simplified for now)
    const weaponDecay = weapon?.Properties?.Economy?.Decay || 0;
    const ampDecay = amplifier?.Properties?.Economy?.Decay || 0;
    const scopeDecay = scope?.Properties?.Economy?.Decay || 0;
    const totalDecay = weaponDecay + ampDecay + scopeDecay;
    
    const ammoBurn = weapon?.Properties?.Economy?.AmmoBurn || 0;
    const costPerShot = (totalDecay + ammoBurn) / 100; // PEC to PED
    
    const weaponDamage = weapon?.Properties?.Damage?.Penetration || 0;
    const totalDamage = weaponDamage * (1 + enhancers.dmg * 0.01);
    
    const dpp = totalDamage > 0 && costPerShot > 0 ? totalDamage / costPerShot : 0;
    const range = weapon?.Properties?.Range || 0;
    const efficiency = weapon?.Properties?.Economy?.Efficiency || 0;
    
    return {
      costPerShot,
      dpp,
      totalDamage,
      range,
      criticalChance: 2.0,
      hitRate: 90.0,
      effectiveDamage: totalDamage * 0.9,
      efficiency,
      decay: totalDecay,
      ammoBurn,
      totalUses: weapon?.Properties?.Economy?.MaxTT ? Math.floor(weapon.Properties.Economy.MaxTT / totalDecay) : null,
    };
  };

  const stats = calculateStats();

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

  const filterItems = (items: EquipmentItem[], search: string) => {
    if (!search) return items.slice(0, 10);
    return items.filter(item => 
      item.Name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  };

  const renderDropdown = (
    items: EquipmentItem[],
    search: string,
    onSelect: (item: EquipmentItem) => void,
    dropdownId: string
  ) => {
    if (activeDropdown !== dropdownId) return null;
    
    const filtered = filterItems(items, search);
    if (filtered.length === 0) return null;

    return (
      <div className="absolute z-50 w-full mt-1 bg-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
        {filtered.map((item) => (
          <button
            key={item.Id}
            onClick={() => {
              onSelect(item);
              setActiveDropdown(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm transition-colors"
          >
            {item.Name}
          </button>
        ))}
      </div>
    );
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
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase">
              <X className="w-4 h-4" />
              Equipment
            </div>

            {/* Weapon */}
            <div className="relative">
              <label className="text-xs text-gray-400 uppercase block mb-1">Weapon</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={weapon?.Name || "Search weapons..."}
                  value={weaponSearch}
                  onChange={(e) => setWeaponSearch(e.target.value)}
                  onFocus={() => setActiveDropdown('weapon')}
                  className="input w-full pl-10"
                />
                {renderDropdown(weapons, weaponSearch, (item) => {
                  setWeapon(item);
                  setWeaponSearch('');
                }, 'weapon')}
              </div>
            </div>

            {/* Amplifier */}
            <div className="relative">
              <label className="text-xs text-gray-400 uppercase block mb-1">Amplifier</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={amplifier?.Name || "Search amps..."}
                  value={ampSearch}
                  onChange={(e) => setAmpSearch(e.target.value)}
                  onFocus={() => setActiveDropdown('amp')}
                  className="input w-full pl-10"
                />
                {renderDropdown(amps, ampSearch, (item) => {
                  setAmplifier(item);
                  setAmpSearch('');
                }, 'amp')}
              </div>
            </div>

            {/* Scope */}
            <div className="relative">
              <label className="text-xs text-gray-400 uppercase block mb-1">Scope</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={scope?.Name || "Search scopes..."}
                  value={scopeSearch}
                  onChange={(e) => setScopeSearch(e.target.value)}
                  onFocus={() => setActiveDropdown('scope')}
                  className="input w-full pl-10"
                />
                {renderDropdown(scopes, scopeSearch, (item) => {
                  setScope(item);
                  setScopeSearch('');
                }, 'scope')}
              </div>
            </div>

            {/* Sight */}
            <div className="relative">
              <label className="text-xs text-gray-400 uppercase block mb-1">Sight</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={sight?.Name || "Search sights..."}
                  value={sightSearch}
                  onChange={(e) => setSightSearch(e.target.value)}
                  onFocus={() => setActiveDropdown('sight')}
                  className="input w-full pl-10"
                />
                {renderDropdown(sights, sightSearch, (item) => {
                  setSight(item);
                  setSightSearch('');
                }, 'sight')}
              </div>
            </div>

            {/* Sight 2 */}
            <div className="relative">
              <label className="text-xs text-gray-400 uppercase block mb-1">Sight 2</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={sight2?.Name || "Search sights..."}
                  value={sight2Search}
                  onChange={(e) => setSight2Search(e.target.value)}
                  onFocus={() => setActiveDropdown('sight2')}
                  className="input w-full pl-10"
                />
                {renderDropdown(sights, sight2Search, (item) => {
                  setSight2(item);
                  setSight2Search('');
                }, 'sight2')}
              </div>
            </div>

            {/* Absorber */}
            <div className="relative">
              <label className="text-xs text-gray-400 uppercase block mb-1">Absorber</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={absorber?.Name || "Search absorbers..."}
                  value={absorberSearch}
                  onChange={(e) => setAbsorberSearch(e.target.value)}
                  onFocus={() => setActiveDropdown('absorber')}
                  className="input w-full pl-10"
                />
                {renderDropdown(absorbers, absorberSearch, (item) => {
                  setAbsorber(item);
                  setAbsorberSearch('');
                }, 'absorber')}
              </div>
            </div>
          </div>

          {/* Enhancers */}
          <div>
            <div className="text-xs text-gray-400 mb-2">Enhancers (0/{enhancers.dmg + enhancers.acc + enhancers.rng + enhancers.eco}0)</div>
            <div className="grid grid-cols-2 gap-2">
              {(['dmg', 'acc', 'rng', 'eco'] as const).map((type) => (
                <div key={type} className="bg-gray-700 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase text-gray-400">{type}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEnhancers(e => ({ ...e, [type]: Math.max(0, e[type] - 1) }))}
                        className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono w-6 text-center">{enhancers[type]}</span>
                      <button
                        onClick={() => setEnhancers(e => ({ ...e, [type]: e[type] + 1 }))}
                        className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          {/* Offense Stats */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-bold text-blue-400 uppercase mb-2">Offense</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Total Damage</span><span>{stats.totalDamage.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Range</span><span>{stats.range.toFixed(1)}m</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Critical Chance</span><span>{stats.criticalChance.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Hit Rate</span><span className="text-green-400">{stats.hitRate.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Effective Damage</span><span>{stats.effectiveDamage.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Economy Stats */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-bold text-blue-400 uppercase mb-2">Economy</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Efficiency</span><span>{stats.efficiency.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Decay</span><span>{stats.decay.toFixed(4)} PEC</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Ammo Burn</span><span>{stats.ammoBurn}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total Uses</span><span>{stats.totalUses || 'N/A'}</span></div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-bold text-blue-400 uppercase mb-2">Cost Breakdown</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Weapon</span><span>{(weapon?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Amplifier</span><span>{(amplifier?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Scope</span><span>{(scope?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Sight</span><span>{(sight?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Sight 2</span><span>{(sight2?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Absorber</span><span>0.0000 PEC</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Enhancers</span><span>0.0000 PEC</span></div>
              <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold"><span>Total/Shot</span><span className="text-blue-400">{stats.costPerShot.toFixed(4)} PEC</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
