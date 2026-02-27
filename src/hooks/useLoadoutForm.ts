import { useEffect, useMemo, useState } from 'react';
import { useHuntStore } from '../store';
import { EquipmentItem, Loadout, LoadoutEnhancers } from '../types';
import { calculateLoadoutStats } from '../utils/loadoutCalculations';

export function useLoadoutForm(editLoadout?: Loadout) {
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
    Promise.all([
      fetch('/assets/items/weapons.json').then((r) => r.json()),
      fetch('/assets/items/amps.json').then((r) => r.json()),
      fetch('/assets/items/scopes.json').then((r) => r.json()),
      fetch('/assets/items/sights.json').then((r) => r.json()),
      fetch('/assets/items/absorbers.json').then((r) => r.json()),
    ]).then(([weaponsData, ampsData, scopesData, sightsData, absorbersData]) => {
      setWeapons(weaponsData);
      setAmps(ampsData);
      setScopes(scopesData);
      setSights(sightsData);
      setAbsorbers(absorbersData);
    });
  }, []);

  const stats = useMemo(
    () => calculateLoadoutStats(weapon, amplifier, scope, enhancers),
    [weapon, amplifier, scope, enhancers]
  );

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
  };

  return {
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
  };
}
