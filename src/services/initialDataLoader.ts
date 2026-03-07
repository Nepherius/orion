/**
 * Initial Equipment Data Loader
 * Fetches equipment data from Entropia Nexus API on fresh install
 */

import { writeTextFile, readTextFile, BaseDirectory, mkdir } from '@tauri-apps/plugin-fs';
import { fetchAllEquipmentData, NexusMob } from './entropiaNexusApi';

const EQUIPMENT_PATHS = {
  weapons: 'assets/items/weapons.json',
  amplifiers: 'assets/items/amps.json',
  scopes: 'assets/items/scopes.json',
  sights: 'assets/items/sights.json',
  absorbers: 'assets/items/absorbers.json',
  armor: 'assets/armor/armor.json',
  items: 'assets/items/entropia-items.json',
  creatures: 'assets/creatures/creatures.json',
};

interface CreatureSummary {
  name: string;
  maturity: string;
  hp: number;
}

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

function extractCreaturesFromMobs(mobs: NexusMob[]): CreatureSummary[] {
  const creatures: CreatureSummary[] = [];

  for (const mob of mobs) {
    if (!Array.isArray(mob.Maturities) || mob.Maturities.length === 0) {
      continue;
    }

    for (const maturity of mob.Maturities) {
      creatures.push({
        name: mob.Name,
        maturity: maturity.Name,
        hp: Number(maturity.Properties?.Health ?? 0),
      });
    }
  }

  creatures.sort((a, b) => {
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name);
    }
    return a.maturity.localeCompare(b.maturity);
  });

  return creatures;
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
    EQUIPMENT_PATHS.creatures,
  ];

  let timestampedFileCount = 0;

  for (const path of requiredFiles) {
    try {
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppData });
      const parsed = JSON.parse(content) as { lastUpdateAt?: number } | unknown;

      if (!hasValidDataPayload(parsed)) {
        console.warn('[InitialDataLoader] Invalid/empty equipment payload:', path);
        continue;
      }

      if (
        parsed &&
        typeof parsed === 'object' &&
        'lastUpdateAt' in parsed &&
        typeof parsed.lastUpdateAt === 'number'
      ) {
        timestampedFileCount += 1;
      }
    } catch (error) {
      console.warn('[InitialDataLoader] Equipment file check failed:', path, error);
    }
  }

  // Required files must exist and be timestamped.
  if (timestampedFileCount === requiredFiles.length) {
    // eslint-disable-next-line no-console
    console.log(
      `[InitialDataLoader] Equipment data detected via timestamped files: ${timestampedFileCount}/${requiredFiles.length}`
    );
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
      total: 9,
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
    await mkdir('assets/creatures', { baseDir: BaseDirectory.AppData, recursive: true }).catch(
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
      { name: 'creatures', data: extractCreaturesFromMobs(data.mobs), label: 'Creatures' },
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

      // Wrap API data with timestamp
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

    console.warn(
      '[InitialDataLoader] API unavailable, using bundled assets. Will retry next restart:',
      errorMsg
    );
    onProgress?.({
      fileName: 'Bundled Data',
      current: 0,
      total: 0,
      message: 'Using bundled data (API unavailable). Will retry on next launch.',
    });
  }
}
