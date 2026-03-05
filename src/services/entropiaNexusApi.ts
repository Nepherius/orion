/**
 * Entropia Nexus API Service
 * Fetches equipment data from api.entropianexus.com
 * Used only on fresh installs to populate item databases
 */

const API_BASE = 'https://api.entropianexus.com';
const USER_AGENT = 'Orion-Loot-Tracker/1.1.0';

export interface NexusItem {
  Id: number;
  ItemId: number;
  Name: string;
  Properties: {
    Description?: string | null;
    Weight?: number;
    Type?: string;
    Category?: string;
    Class?: string;
    UsesPerMinute?: number;
    Range?: number;
    Economy?: {
      Efficiency?: number;
      MaxTT?: number;
      MinTT?: number;
      Decay?: number;
      AmmoBurn?: number;
    };
    Damage?: {
      Stab?: number | null;
      Cut?: number | null;
      Impact?: number | null;
      Penetration?: number | null;
      Shrapnel?: number | null;
      Burn?: number | null;
      Cold?: number | null;
      Acid?: number | null;
      Electric?: number | null;
    };
    [key: string]: unknown;
  };
  EffectsOnEquip?: unknown[];
  Links?: unknown;
}

  export interface NexusMob {
    Id: number;
    ClassId?: number | null;
    Name: string;
    Type: string;
    Properties: {
      Description?: string | null;
      AttackRange?: number | null;
      AggressionRange?: number | null;
      AggressionTimer?: number | null;
      AttacksPerMinute?: number | null;
      IsSweatable?: boolean;
    };
    Maturities: Array<{
      Id: number;
      Name: string;
      Properties: {
        Health: number;
        Level?: number;
        AttacksPerMinute?: number | null;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    Planet?: {
      Name: string;
      [key: string]: unknown;
    };
    Species?: {
      Name: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

async function fetchWithHeaders<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'X-Client-Name': 'Orion',
        'X-Client-Version': '1.1.0',
      },
    });

    if (!response.ok) {
      const statusText = response.statusText || 'Unknown Error';
      const message = `API request failed: ${response.status} ${statusText} (${endpoint})`;
      console.error(`[EntropiaNexus] ${message}`);
      throw new Error(message);
    }

    return (await response.json()) as T;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(`[EntropiaNexus] Failed to fetch ${endpoint}: ${errorMsg}`);
    throw error;
  }
}

export async function fetchWeapons(): Promise<NexusItem[]> {
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Fetching weapons...');
  return fetchWithHeaders<NexusItem[]>('/weapons');
}

export async function fetchAmplifiers(): Promise<NexusItem[]> {
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Fetching amplifiers...');
  return fetchWithHeaders<NexusItem[]>('/weaponamplifiers');
}

export async function fetchScopes(): Promise<NexusItem[]> {
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Fetching scopes/sights...');
  return fetchWithHeaders<NexusItem[]>('/weaponvisionattachments');
}

export async function fetchSights(): Promise<NexusItem[]> {
  // Sights are included in weaponvisionattachments, so return empty
  // to avoid duplicates (scopes are already fetched from that endpoint)
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Sights included in scopes endpoint');
  return [];
}

export async function fetchAbsorbers(): Promise<NexusItem[]> {
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Fetching absorbers...');
  return fetchWithHeaders<NexusItem[]>('/absorbers');
}

export async function fetchArmor(): Promise<string[]> {
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Fetching armor...');
  return fetchWithHeaders<string[]>('/armors');
}

export async function fetchAllItems(): Promise<NexusItem[]> {
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Fetching all items...');
  return fetchWithHeaders<NexusItem[]>('/items');
}

  export async function fetchMobs(): Promise<NexusMob[]> {
    // eslint-disable-next-line no-console
    console.log('[EntropiaNexus] Fetching mobs...');
    return fetchWithHeaders<NexusMob[]>('/mobs');
  }

/**
 * Fetches all equipment data from Entropia Nexus API
 * Returns a map of categories to their data
 */
export async function fetchAllEquipmentData(): Promise<{
  weapons: NexusItem[];
  amplifiers: NexusItem[];
  scopes: NexusItem[];
  sights: NexusItem[];
  absorbers: NexusItem[];
  armor: string[];
  items: NexusItem[];
  mobs: NexusMob[];
}> {
  // eslint-disable-next-line no-console
  console.log('[EntropiaNexus] Starting batch fetch of all equipment data...');

  try {
    // Test with first endpoint - if it fails, no point trying the rest
    // eslint-disable-next-line no-console
    console.log('[EntropiaNexus] Testing API connectivity with weapons endpoint...');
    const weapons = await fetchWeapons();

    // API connectivity confirmed, fetch remaining equipment data in parallel
    // Note: scopes and sights come from same endpoint (weaponvisionattachments)
    const [amplifiers, scopesAndSights, absorbers, armor, items, mobs] = await Promise.all([
      fetchAmplifiers(),
      fetchScopes(),
      fetchAbsorbers(),
      fetchArmor(),
      fetchAllItems(),
      fetchMobs(),
    ]);

    // eslint-disable-next-line no-console
    console.log('[EntropiaNexus] Batch fetch complete:', {
      weapons: weapons.length,
      amplifiers: amplifiers.length,
      scopes: scopesAndSights.length,
      sights: scopesAndSights.length,
      absorbers: absorbers.length,
      armor: armor.length,
      items: items.length,
      mobs: mobs.length,
    });

    return {
      weapons,
      amplifiers,
      scopes: scopesAndSights,
      sights: scopesAndSights,
      absorbers,
      armor,
      items,
      mobs,
    };
  } catch (error) {
    console.error('[EntropiaNexus] Batch fetch failed:', error);
    throw error;
  }
}
