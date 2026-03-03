import { useEffect, useMemo, useState } from 'react';
import { readTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { useHuntStore } from '../store';
import { EquipmentItem, Loadout } from '../types';
import { calculateLoadoutStats } from '../utils/loadoutCalculations';
import { calculateHealingCostPerUse } from '../utils/healingCost';

interface MedicalToolEntry {
  name: string;
  type: string | null;
  tt: number | null;
  markup: number | null;
  decay: number | null;
  me: number | null;
  mecost?: number | null;
}

/**
 * Load equipment data from AppData first (fresh install downloads),
 * fall back to bundled public assets
 */
async function loadEquipmentData(relativePath: string): Promise<unknown> {
  try {
    // Try loading from AppData first (fresh install downloaded data)
    const appDataContent = await readTextFile(relativePath, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(appDataContent);
    // New format: { data: [...], lastUpdateAt: timestamp }
    return parsed.data || parsed;
  } catch {
    // Fall back to bundled public assets (old format: direct array)
    const response = await fetch(`/assets/${relativePath}`);
    return response.json();
  }
}

export function useLoadoutForm(editLoadout?: Loadout) {
  const { createLoadout, updateLoadout } = useHuntStore();

  const [name, setName] = useState(editLoadout?.name || '');
  const [hotkey, setHotkey] = useState<number | undefined>(editLoadout?.hotkey);
  const [weapon, setWeapon] = useState<EquipmentItem | undefined>(editLoadout?.weapon);
  const [amplifier, setAmplifier] = useState<EquipmentItem | undefined>(editLoadout?.amplifier);
  const [scope, setScope] = useState<EquipmentItem | undefined>(editLoadout?.scope);
  const [sight, setSight] = useState<EquipmentItem | undefined>(editLoadout?.sight);
  const [sight2, setSight2] = useState<EquipmentItem | undefined>(editLoadout?.sight2);
  const [absorber, setAbsorber] = useState<EquipmentItem | undefined>(editLoadout?.absorber);
  const [armor, setArmor] = useState(editLoadout?.armor || '');
  const [medicalTool, setMedicalTool] = useState(editLoadout?.medicalTool || '');
  const [medicalTT, setMedicalTT] = useState(editLoadout?.medicalTT || 0);
  const [medicalMarkup, setMedicalMarkup] = useState(editLoadout?.medicalMarkup || 100);
  const [medicalDecay, setMedicalDecay] = useState(editLoadout?.medicalDecay || 0);
  const [medicalME, setMedicalME] = useState(editLoadout?.medicalME || 0);
  const [medicalMEMarkup, setMedicalMEMarkup] = useState(editLoadout?.medicalMEMarkup || 120);

  const [weapons, setWeapons] = useState<EquipmentItem[]>([]);
  const [amps, setAmps] = useState<EquipmentItem[]>([]);
  const [scopes, setScopes] = useState<EquipmentItem[]>([]);
  const [sights, setSights] = useState<EquipmentItem[]>([]);
  const [armorItems, setArmorItems] = useState<string[]>([]);
  const [medicalTools, setMedicalTools] = useState<MedicalToolEntry[]>([]);
  const [absorbers, setAbsorbers] = useState<EquipmentItem[]>([]);

  useEffect(() => {
    Promise.all([
      loadEquipmentData('items/weapons.json'),
      loadEquipmentData('items/amps.json'),
      loadEquipmentData('items/scopes.json'),
      loadEquipmentData('items/sights.json'),
      loadEquipmentData('items/absorbers.json'),
      loadEquipmentData('armor/armor.json'),
      loadEquipmentData('medical/medicaltool.json'),
    ]).then(
      ([weaponsData, ampsData, scopesData, sightsData, absorbersData, armorData, medicalData]) => {
        setWeapons(weaponsData as EquipmentItem[]);
        setAmps(ampsData as EquipmentItem[]);
        setScopes(scopesData as EquipmentItem[]);
        setSights(sightsData as EquipmentItem[]);
        setAbsorbers(absorbersData as EquipmentItem[]);
        setArmorItems((armorData as { armor?: string[] })?.armor || []);
        setMedicalTools((medicalData as { medicalTools?: MedicalToolEntry[] })?.medicalTools || []);
      }
    );
  }, []);

  useEffect(() => {
    if (!medicalTool) {
      setMedicalTT(0);
      setMedicalMarkup(100);
      setMedicalDecay(0);
      setMedicalME(0);
      return;
    }

    const selectedTool = medicalTools.find((tool) => tool.name === medicalTool);
    setMedicalTT(selectedTool?.tt ?? 0);
    setMedicalMarkup(selectedTool?.markup ?? 100);
    setMedicalDecay(selectedTool?.decay ?? 0);
    setMedicalME(selectedTool?.me ?? 0);
  }, [medicalTool, medicalTools]);

  const stats = useMemo(
    () => calculateLoadoutStats(weapon, amplifier, scope, sight, sight2, absorber),
    [weapon, amplifier, scope, sight, sight2, absorber]
  );

  const handleSave = () => {
    const selectedMedicalTool = medicalTools.find((tool) => tool.name === medicalTool);
    const isFapType = selectedMedicalTool?.type === 'fap';

    const calculatedMECost = calculateHealingCostPerUse({
      medicalDecay,
      medicalMarkup,
      medicalME,
      medicalMEMarkup,
      isFapType,
    });

    const loadoutData = {
      name: name || 'Unnamed Loadout',
      hotkey,
      isPrimary: editLoadout ? editLoadout.isPrimary : false,
      favorite: editLoadout ? editLoadout.favorite : false,
      weapon,
      amplifier,
      scope,
      sight,
      sight2,
      absorber,
      armor,
      medicalTool,
      medicalTT,
      medicalMarkup,
      medicalDecay,
      medicalME,
      medicalMEMarkup,
      medicalMECost: calculatedMECost,
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
    hotkey,
    setHotkey,
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
  };
}
