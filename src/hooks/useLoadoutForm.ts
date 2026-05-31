import { useEffect, useMemo, useState } from 'react';
import { useHuntStore } from '../store';
import { EquipmentItem, Loadout } from '../types';
import { calculateLoadoutStats } from '../utils/loadoutCalculations';
import { calculateHealingCostPerUse } from '../utils/healingCost';
import { EQUIPMENT_ASSET_PATHS, loadAssetJson } from '../services/assetDataLoader';
import {
  LoadEquipmentData,
  MedicalToolEntry,
  validateArmorItems,
  validateEquipmentItems,
  validateMedicalTools,
} from '../services/assetValidation';

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
      loadAssetJson<LoadEquipmentData>(EQUIPMENT_ASSET_PATHS.weapons),
      loadAssetJson<LoadEquipmentData>(EQUIPMENT_ASSET_PATHS.amplifiers),
      loadAssetJson<LoadEquipmentData>(EQUIPMENT_ASSET_PATHS.scopes),
      loadAssetJson<LoadEquipmentData>(EQUIPMENT_ASSET_PATHS.sights),
      loadAssetJson<LoadEquipmentData>(EQUIPMENT_ASSET_PATHS.absorbers),
      loadAssetJson<LoadEquipmentData>(EQUIPMENT_ASSET_PATHS.armor),
      loadAssetJson<LoadEquipmentData>(EQUIPMENT_ASSET_PATHS.medicalTools),
    ]).then(
      ([weaponsData, ampsData, scopesData, sightsData, absorbersData, armorData, medicalData]) => {
        setWeapons(validateEquipmentItems(weaponsData));
        setAmps(validateEquipmentItems(ampsData));
        setScopes(validateEquipmentItems(scopesData));
        setSights(validateEquipmentItems(sightsData));
        setAbsorbers(validateEquipmentItems(absorbersData));
        setArmorItems(validateArmorItems(armorData));
        setMedicalTools(validateMedicalTools(medicalData));
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
