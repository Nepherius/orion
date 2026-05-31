import { useEffect, useState } from 'react';
import { EQUIPMENT_ASSET_PATHS, loadAssetJson } from '../services/assetDataLoader';
import { loadCreatureNames } from '../services/creatureDataLoader';

interface PlanetData {
  planets?: string[];
}

export function useSessionAutocompleteData() {
  const [creatures, setCreatures] = useState<string[]>([]);
  const [planets, setPlanets] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      loadCreatureNames(),
      loadAssetJson<PlanetData>(EQUIPMENT_ASSET_PATHS.planets).then((data) => data.planets || []),
    ]).then(([creatureResult, planetResult]) => {
      if (!isMounted) {
        return;
      }

      if (creatureResult.status === 'fulfilled') {
        setCreatures(creatureResult.value);
      } else {
        console.error('Failed to load creature autocomplete data:', creatureResult.reason);
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

  return { creatures, planets };
}
