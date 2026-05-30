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

    Promise.all([
      loadCreatureNames(),
      loadAssetJson<PlanetData>(EQUIPMENT_ASSET_PATHS.planets).then((data) => data.planets || []),
    ])
      .then(([creatureNames, planetNames]) => {
        if (!isMounted) {
          return;
        }
        setCreatures(creatureNames);
        setPlanets(planetNames);
      })
      .catch((error) => {
        console.error('Failed to load autocomplete data:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { creatures, planets };
}
