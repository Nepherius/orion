import { EQUIPMENT_ASSET_PATHS, loadAssetJson } from './assetDataLoader';

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
  const parsed = await loadAssetJson<unknown>(EQUIPMENT_ASSET_PATHS.creatures);

  const names = toCreatureNames(parsed);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export async function loadCreatureEntries(): Promise<CreatureEntry[]> {
  const parsed = await loadAssetJson<unknown>(EQUIPMENT_ASSET_PATHS.creatures);

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

  // A maturity cannot be selected unless its HP is less than or equal to dealt damage.
  // Allow limited overkill up to +20% of that maturity HP.
  const candidates = matchingCreatures.filter((creature) => {
    const lowerBound = creature.hp;
    const upperBound = creature.hp * 1.2;
    return hpDealt >= lowerBound && hpDealt <= upperBound;
  });

  if (candidates.length === 0) {
    return undefined;
  }

  // Prefer the highest HP candidate that still fits the dealt damage.
  candidates.sort((a, b) => b.hp - a.hp);
  return candidates[0]?.maturity;
}
