/**
 * Hook to handle initial equipment data loading from Entropia Nexus API
 * Only runs once per app restart on fresh install
 */

import { useEffect, useState } from 'react';
import {
  loadInitialEquipmentData,
  hasEquipmentData,
  ProgressUpdate,
} from '../services/initialDataLoader';

export function useInitialDataLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Skip if already attempted once this session
      if (hasAttempted) {
        return;
      }

      // Check if equipment data already exists
      const dataExists = await hasEquipmentData();
      if (dataExists) {
        // eslint-disable-next-line no-console
        console.log('[InitialDataLoader] Equipment data already exists, skipping download');
        return;
      }

      setHasAttempted(true);
      // eslint-disable-next-line no-console
      console.log('[InitialDataLoader] First run detected, loading equipment data...');
      setIsLoading(true);
      setError(null);

      try {
        await loadInitialEquipmentData((update) => {
          // eslint-disable-next-line no-console
          console.log('[InitialDataLoader]', update.message);
          setProgress(update);
        });

        // eslint-disable-next-line no-console
        console.log('[InitialDataLoader] Equipment data loaded successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load equipment data';

        console.error('[InitialDataLoader] Error:', errorMessage);
        setError(errorMessage);
        // Don't mark as loaded on failure - will retry on next app restart
      } finally {
        setIsLoading(false);
        setProgress(null);
      }
    };

    loadData();
  }, [hasAttempted]);

  return {
    isLoading,
    progress,
    error,
  };
}
