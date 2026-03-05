import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';

interface CreatureEntry {
  name: string;
  maturity: string;
  hp: number;
}

export type { CreatureEntry };

function normalizeCreatureName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function toCreatureNames(parsed: unknown): string[] {
  const payload =
    parsed && typeof parsed === 'object' && 'data' in parsed
      ? (parsed as { data?: unknown }).data
      : parsed;

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return [];
    }

    if (typeof payload[0] === 'string') {
      return payload
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeCreatureName)
        .filter(Boolean);
    }

    if (typeof payload[0] === 'object' && payload[0] !== null) {
      const entries = payload as CreatureEntry[];
      const uniqueNames = new Set<string>();

      entries.forEach((entry) => {
        const baseName = normalizeCreatureName(entry.name || '');
        if (baseName) {
          uniqueNames.add(baseName);
        }
      });

      return Array.from(uniqueNames);
    }

    return [];
  }

  if (payload && typeof payload === 'object' && 'creatures' in payload) {
    const creatures = (payload as { creatures?: unknown }).creatures;
    if (Array.isArray(creatures)) {
      return creatures
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeCreatureName)
        .filter(Boolean);
    }
  }

  return [];
}

function toCreatureEntries(parsed: unknown): CreatureEntry[] {
  const payload =
    parsed && typeof parsed === 'object' && 'data' in parsed
      ? (parsed as { data?: unknown }).data
      : parsed;

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return [];
    }

    if (typeof payload[0] === 'object' && payload[0] !== null) {
      const entries = payload as CreatureEntry[];
      return entries.filter(
        (entry) => entry.name && entry.maturity && typeof entry.hp === 'number'
      );
    }
  }

  return [];
}

export async function loadCreatureNames(): Promise<string[]> {
  let parsed: unknown;

  try {
    const content = await readTextFile('assets/creatures/creatures.json', {
      baseDir: BaseDirectory.AppData,
    });
    parsed = JSON.parse(content);
  } catch {
    const response = await fetch('/assets/creatures/creatures.json');
    if (!response.ok) {
      throw new Error(`Failed to load creatures.json: ${response.status} ${response.statusText}`);
    }
    parsed = await response.json();
  }

  const names = toCreatureNames(parsed);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export async function loadCreatureEntries(): Promise<CreatureEntry[]> {
  let parsed: unknown;

  try {
    const content = await readTextFile('assets/creatures/creatures.json', {
      baseDir: BaseDirectory.AppData,
    });
    parsed = JSON.parse(content);
  } catch {
    const response = await fetch('/assets/creatures/creatures.json');
    if (!response.ok) {
      throw new Error(`Failed to load creatures.json: ${response.status} ${response.statusText}`);
    }
    parsed = await response.json();
  }

  return toCreatureEntries(parsed);
}

/**
 * Infer creature maturity based on HP dealt
 * @param creatureName Base creature name (e.g., "Daikiba")
 * @param hpDealt Total HP damage dealt to kill the creature
 * @param creatures Full creature dataset with name/maturity/hp
 * @returns Maturity string or undefined if no close match found
 */
export function inferMaturity(
  creatureName: string,
  hpDealt: number,
  creatures: CreatureEntry[]
): string | undefined {
  // Filter to matching creature name
  const matchingCreatures = creatures.filter(
    (c) => normalizeCreatureName(c.name) === normalizeCreatureName(creatureName)
  );

  if (matchingCreatures.length === 0) {
    return undefined;
  }

  // Find closest HP match (within 20% tolerance)
  let bestMatch: CreatureEntry | undefined;
  let smallestDiff = Infinity;

  for (const creature of matchingCreatures) {
    const diff = Math.abs(creature.hp - hpDealt);
    const tolerance = creature.hp * 0.2; // 20% tolerance

    if (diff < smallestDiff && diff <= tolerance) {
      smallestDiff = diff;
      bestMatch = creature;
    }
  }

  return bestMatch?.maturity;
}
