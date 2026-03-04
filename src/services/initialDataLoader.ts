/**
 * Initial Equipment Data Loader
 * Fetches equipment data from Entropia Nexus API on fresh install
 */

import { writeTextFile, readTextFile, BaseDirectory, mkdir } from '@tauri-apps/plugin-fs';
import { fetchAllEquipmentData } from './entropiaNexusApi';

const EQUIPMENT_PATHS = {
  weapons: 'assets/items/weapons.json',
  amplifiers: 'assets/items/amps.json',
  scopes: 'assets/items/scopes.json',
  sights: 'assets/items/sights.json',
  absorbers: 'assets/items/absorbers.json',
  armor: 'assets/armor/armor.json',
  items: 'assets/items/entropia-items.json',
};

export interface ProgressUpdate {
  fileName: string;
  current: number;
  total: number;
  message: string;
}

function hasValidDataPayload(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }

  const wrapped = parsed as { data?: unknown; lastUpdateAt?: unknown };
  if (wrapped.data !== undefined) {
    if (Array.isArray(wrapped.data)) {
      return wrapped.data.length > 0;
    }
    if (typeof wrapped.data === 'object' && wrapped.data !== null) {
      return Object.keys(wrapped.data).length > 0;
    }
    return Boolean(wrapped.data);
  }

  if (Array.isArray(parsed)) {
    return parsed.length > 0;
  }

  return Object.keys(parsed).length > 0;
}

/**
 * Check if equipment data has already been downloaded
 */
export async function hasEquipmentData(): Promise<boolean> {
  const requiredFiles = [
    EQUIPMENT_PATHS.weapons,
    EQUIPMENT_PATHS.amplifiers,
    EQUIPMENT_PATHS.scopes,
    EQUIPMENT_PATHS.sights,
    EQUIPMENT_PATHS.absorbers,
    EQUIPMENT_PATHS.armor,
    EQUIPMENT_PATHS.items,
  ];

  let validFileCount = 0;
  let timestampedFileCount = 0;

  for (const path of requiredFiles) {
    try {
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppData });
      const parsed = JSON.parse(content) as { lastUpdateAt?: number } | unknown;

      if (!hasValidDataPayload(parsed)) {
        // eslint-disable-next-line no-console
        console.warn('[InitialDataLoader] Invalid/empty equipment payload:', path);
        continue;
      }

      validFileCount += 1;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'lastUpdateAt' in parsed &&
        typeof parsed.lastUpdateAt === 'number'
      ) {
        timestampedFileCount += 1;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[InitialDataLoader] Equipment file check failed:', path, error);
    }
  }

  // If any file has a valid timestamped payload, treat data as initialized.
  // This avoids unnecessary refetches when one optional file is missing/corrupt.
  if (timestampedFileCount > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[InitialDataLoader] Equipment data detected via timestamped files: ${timestampedFileCount}/${requiredFiles.length}`
    );
    return true;
  }

  // Legacy format support (valid payloads without wrapper timestamps)
  if (validFileCount === requiredFiles.length) {
    // eslint-disable-next-line no-console
    console.log('[InitialDataLoader] Equipment data detected via legacy payload format');
    return true;
  }

  return false;
}

export async function loadInitialEquipmentData(
  onProgress?: (update: ProgressUpdate) => void
): Promise<void> {
  try {
    onProgress?.({
      fileName: 'Entropia Nexus',
      current: 0,
      total: 8,
      message: 'Fetching equipment data...',
    });
    const data = await fetchAllEquipmentData();

    // Create directories in AppData
    await mkdir('assets/items', { baseDir: BaseDirectory.AppData, recursive: true }).catch(
      () => {}
    );
    await mkdir('assets/armor', { baseDir: BaseDirectory.AppData, recursive: true }).catch(
      () => {}
    );

    const now = Date.now();
    const files = [
      { name: 'weapons', data: data.weapons, label: 'Weapons' },
      { name: 'amplifiers', data: data.amplifiers, label: 'Amplifiers' },
      { name: 'scopes', data: data.scopes, label: 'Scopes' },
      { name: 'sights', data: data.sights, label: 'Sights' },
      { name: 'absorbers', data: data.absorbers, label: 'Absorbers' },
      { name: 'armor', data: { armor: data.armor }, label: 'Armor' },
      { name: 'items', data: data.items, label: 'Items Database' },
    ];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress: ProgressUpdate = {
        fileName: file.label,
        current: i + 1,
        total: files.length + 1,
        message: `Saving ${file.label}...`,
      };
      onProgress?.(progress);

      const path =
        file.name === 'armor'
          ? EQUIPMENT_PATHS.armor
          : EQUIPMENT_PATHS[file.name as keyof typeof EQUIPMENT_PATHS];

      // Wrap data with timestamp
      const wrappedData = {
        data: file.data,
        lastUpdateAt: now,
      };

      await writeTextFile(path, JSON.stringify(wrappedData, null, 2), {
        baseDir: BaseDirectory.AppData,
      });
    }

    onProgress?.({
      fileName: 'Complete',
      current: files.length + 1,
      total: files.length + 1,
      message: 'Equipment data loaded successfully!',
    });
    // eslint-disable-next-line no-console
    console.log('[InitialDataLoader] All equipment data written successfully');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error('[InitialDataLoader] Failed to load equipment data:', errorMsg);
    throw new Error(`Equipment data loader failed: ${errorMsg}. Will retry on next restart.`);
  }
}
