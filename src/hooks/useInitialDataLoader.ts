/**
 * Hook to handle initial equipment data loading from Entropia Nexus API
 * Runs once per app session when data is missing or older than the refresh interval.
 */

import { useEffect, useState } from 'react';
import {
  loadInitialEquipmentData,
  getEquipmentDataStatus,
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

      setHasAttempted(true);

      const status = await getEquipmentDataStatus();
      if (status.exists && !status.needsRefresh) {
        // eslint-disable-next-line no-console
        console.log('[InitialDataLoader] Equipment data is current, skipping download');
        return;
      }

      // eslint-disable-next-line no-console
      console.log(
        status.exists
          ? '[InitialDataLoader] Monthly refresh due, updating equipment data...'
          : '[InitialDataLoader] First run detected, loading equipment data...'
      );
      setIsLoading(true);
      setError(null);

      try {
        await loadInitialEquipmentData(
          (update) => {
            // eslint-disable-next-line no-console
            console.log('[InitialDataLoader]', update.message);
            setProgress(update);
          },
          status.exists ? 'refresh' : 'initial'
        );

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
