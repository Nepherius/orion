import { useEffect, useState } from 'react';
import { EQUIPMENT_ASSET_PATHS, loadAssetJson } from '../services/assetDataLoader';
import { loadCreatureEntries, loadCreatureNames } from '../services/creatureDataLoader';
import type { CreatureEntry } from '../types';

interface PlanetData {
  planets?: string[];
}

export function useSessionAutocompleteData() {
  const [creatures, setCreatures] = useState<string[]>([]);
  const [creatureEntries, setCreatureEntries] = useState<CreatureEntry[]>([]);
  const [planets, setPlanets] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      loadCreatureNames(),
      loadCreatureEntries(),
      loadAssetJson<PlanetData>(EQUIPMENT_ASSET_PATHS.planets).then((data) => data.planets || []),
    ]).then(([creatureResult, creatureEntriesResult, planetResult]) => {
      if (!isMounted) {
        return;
      }

      if (creatureResult.status === 'fulfilled') {
        setCreatures(creatureResult.value);
      } else {
        console.error('Failed to load creature autocomplete data:', creatureResult.reason);
      }

      if (creatureEntriesResult.status === 'fulfilled') {
        setCreatureEntries(creatureEntriesResult.value);
      } else {
        console.error('Failed to load creature advisor data:', creatureEntriesResult.reason);
      }

      if (planetResult.status === 'fulfilled') {
        setPlanets(planetResult.value);
      } else {
        console.error('Failed to load planet autocomplete data:', planetResult.reason);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { creatures, creatureEntries, planets };
}
