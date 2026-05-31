import type { EquipmentItem } from '../types';

export interface MedicalToolEntry {
  name: string;
  type: string | null;
  tt: number | null;
  markup: number | null;
  decay: number | null;
  me: number | null;
  mecost?: number | null;
}

export type EquipmentDataResponse = EquipmentItem[] | { data: EquipmentItem[] };
export type ArmorDataResponse = { armor?: string[] } | string[];
export type MedicalDataResponse = { medicalTools?: MedicalToolEntry[] } | MedicalToolEntry[];
export type LoadEquipmentData = unknown;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

const finiteNumberOrZero = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const nullableFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export function validateEquipmentItems(response: LoadEquipmentData): EquipmentItem[] {
  const rawItems = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.data)
      ? response.data
      : [];

  return rawItems
    .filter(isRecord)
    .filter((item) => typeof item.Name === 'string' && item.Name.length > 0)
    .map((item) => {
      const properties = isRecord(item.Properties) ? item.Properties : {};
      const economy = isRecord(properties.Economy) ? properties.Economy : {};
      const damage = isRecord(properties.Damage) ? properties.Damage : {};

      return {
        Id: finiteNumberOrZero(item.Id),
        ItemId: finiteNumberOrZero(item.ItemId),
        Name: item.Name as string,
        Properties: {
          ...properties,
          Economy: {
            ...economy,
            Decay: finiteNumberOrZero(economy.Decay),
            AmmoBurn: finiteNumberOrZero(economy.AmmoBurn),
            Efficiency: finiteNumberOrZero(economy.Efficiency),
            MaxTT: finiteNumberOrZero(economy.MaxTT),
          },
          Damage: {
            ...damage,
            Penetration: finiteNumberOrZero(damage.Penetration),
          },
          Range: finiteNumberOrZero(properties.Range),
        },
      };
    });
}

export function validateArmorItems(response: LoadEquipmentData): string[] {
  const rawItems = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.armor)
      ? response.armor
      : [];

  return rawItems.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function validateMedicalTools(response: LoadEquipmentData): MedicalToolEntry[] {
  const rawTools = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.medicalTools)
      ? response.medicalTools
      : [];

  return rawTools
    .filter(isRecord)
    .filter((tool) => typeof tool.name === 'string' && tool.name.length > 0)
    .map((tool) => ({
      name: tool.name as string,
      type: typeof tool.type === 'string' ? tool.type : null,
      tt: nullableFiniteNumber(tool.tt),
      markup: nullableFiniteNumber(tool.markup),
      decay: nullableFiniteNumber(tool.decay),
      me: nullableFiniteNumber(tool.me),
      mecost: nullableFiniteNumber(tool.mecost),
    }));
}
