/**
 * Initial Equipment Data Loader
 * Fetches equipment data from Entropia Nexus API on fresh install and refreshes it periodically.
 */

import { writeTextFile, readTextFile, BaseDirectory, mkdir } from '@tauri-apps/plugin-fs';
import { fetchAllEquipmentData, NexusMob } from './entropiaNexusApi';
import { EQUIPMENT_ASSET_PATHS, toAppDataAssetPath } from './assetDataLoader';

const MONTH_IN_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const EQUIPMENT_REFRESH_INTERVAL_MS = MONTH_IN_DAYS * DAY_IN_MS;

const REQUIRED_EQUIPMENT_ASSET_PATHS = [
  EQUIPMENT_ASSET_PATHS.weapons,
  EQUIPMENT_ASSET_PATHS.amplifiers,
  EQUIPMENT_ASSET_PATHS.scopes,
  EQUIPMENT_ASSET_PATHS.sights,
  EQUIPMENT_ASSET_PATHS.absorbers,
  EQUIPMENT_ASSET_PATHS.armor,
  EQUIPMENT_ASSET_PATHS.items,
  EQUIPMENT_ASSET_PATHS.creatures,
] as const;

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

export interface EquipmentDataStatus {
  exists: boolean;
  needsRefresh: boolean;
  oldestUpdateAt: number | null;
  fileCount: number;
  requiredFileCount: number;
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
  const status = await getEquipmentDataStatus();
  return status.exists;
}

export async function getEquipmentDataStatus(
  now: number = Date.now()
): Promise<EquipmentDataStatus> {
  let timestampedFileCount = 0;
  let oldestUpdateAt: number | null = null;

  for (const assetPath of REQUIRED_EQUIPMENT_ASSET_PATHS) {
    const path = toAppDataAssetPath(assetPath);
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
        oldestUpdateAt =
          oldestUpdateAt === null
            ? parsed.lastUpdateAt
            : Math.min(oldestUpdateAt, parsed.lastUpdateAt);
      }
    } catch (error) {
      console.warn('[InitialDataLoader] Equipment file check failed:', path, error);
    }
  }

  const exists = timestampedFileCount === REQUIRED_EQUIPMENT_ASSET_PATHS.length;
  const needsRefresh =
    !exists || oldestUpdateAt === null || now - oldestUpdateAt >= EQUIPMENT_REFRESH_INTERVAL_MS;

  if (exists) {
    // eslint-disable-next-line no-console
    console.log(
      `[InitialDataLoader] Equipment data detected via timestamped files: ${timestampedFileCount}/${REQUIRED_EQUIPMENT_ASSET_PATHS.length}`
    );
  }

  return {
    exists,
    needsRefresh,
    oldestUpdateAt,
    fileCount: timestampedFileCount,
    requiredFileCount: REQUIRED_EQUIPMENT_ASSET_PATHS.length,
  };
}

export async function loadInitialEquipmentData(
  onProgress?: (update: ProgressUpdate) => void,
  reason: 'initial' | 'refresh' = 'initial'
): Promise<void> {
  try {
    onProgress?.({
      fileName: 'Entropia Nexus',
      current: 0,
      total: 9,
      message:
        reason === 'refresh'
          ? 'Refreshing monthly equipment data...'
          : 'Fetching equipment data...',
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
      {
        path: EQUIPMENT_ASSET_PATHS.weapons,
        data: data.weapons,
        label: 'Weapons',
      },
      {
        path: EQUIPMENT_ASSET_PATHS.amplifiers,
        data: data.amplifiers,
        label: 'Amplifiers',
      },
      {
        path: EQUIPMENT_ASSET_PATHS.scopes,
        data: data.scopes,
        label: 'Scopes',
      },
      {
        path: EQUIPMENT_ASSET_PATHS.sights,
        data: data.sights,
        label: 'Sights',
      },
      {
        path: EQUIPMENT_ASSET_PATHS.absorbers,
        data: data.absorbers,
        label: 'Absorbers',
      },
      {
        path: EQUIPMENT_ASSET_PATHS.armor,
        data: { armor: data.armor },
        label: 'Armor',
      },
      {
        path: EQUIPMENT_ASSET_PATHS.items,
        data: data.items,
        label: 'Items Database',
      },
      {
        path: EQUIPMENT_ASSET_PATHS.creatures,
        data: extractCreaturesFromMobs(data.mobs),
        label: 'Creatures',
      },
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

      // Wrap API data with timestamp
      const wrappedData = {
        data: file.data,
        lastUpdateAt: now,
      };

      await writeTextFile(toAppDataAssetPath(file.path), JSON.stringify(wrappedData, null, 2), {
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
    console.log(
      reason === 'refresh'
        ? '[InitialDataLoader] Monthly equipment data refresh completed'
        : '[InitialDataLoader] All equipment data written successfully'
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.warn(
      '[InitialDataLoader] API unavailable, using existing/bundled assets. Will retry next restart:',
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
