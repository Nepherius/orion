import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';

export const EQUIPMENT_ASSET_PATHS = {
  weapons: 'items/weapons.json',
  amplifiers: 'items/amps.json',
  scopes: 'items/scopes.json',
  sights: 'items/sights.json',
  absorbers: 'items/absorbers.json',
  armor: 'armor/armor.json',
  medicalTools: 'medical/medicaltool.json',
  items: 'items/entropia-items.json',
  creatures: 'creatures/creatures.json',
  planets: 'creatures/planets.json',
} as const;

type WrappedAssetData<T> = {
  data: T;
  lastUpdateAt?: number;
};

export const normalizeAssetPath = (relativePath: string): string =>
  relativePath.replace(/^\/?assets\//, '').replace(/^\/+/, '');

export const toAppDataAssetPath = (relativePath: string): string =>
  `assets/${normalizeAssetPath(relativePath)}`;

export function unwrapAssetData<T>(parsed: unknown): T {
  if (
    parsed &&
    typeof parsed === 'object' &&
    'data' in parsed &&
    (parsed as WrappedAssetData<T>).data !== undefined
  ) {
    return (parsed as WrappedAssetData<T>).data;
  }

  return parsed as T;
}

export async function loadAssetJson<T>(relativePath: string): Promise<T> {
  const normalizedPath = normalizeAssetPath(relativePath);
  const appDataPath = toAppDataAssetPath(normalizedPath);

  try {
    const content = await readTextFile(appDataPath, { baseDir: BaseDirectory.AppData });
    return unwrapAssetData<T>(JSON.parse(content));
  } catch {
    const response = await fetch(`/assets/${normalizedPath}`);
    if (!response.ok) {
      throw new Error(
        `Failed to load asset ${normalizedPath}: ${response.status} ${response.statusText}`
      );
    }

    return unwrapAssetData<T>(await response.json());
  }
}
