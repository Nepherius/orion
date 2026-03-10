// Store re-exports and initialization helpers
// Provides hooks and async setup for Zustand store
import { useHuntStore } from './store/createStore';
import {
  initializeStoreFromDb as initializeStoreFromDbInternal,
  setupStoreSync as setupStoreSyncInternal,
} from './store/lifecycle';

export { useHuntStore };

/**
 * Initialize Zustand store from database
 */
export async function initializeStoreFromDb() {
  return initializeStoreFromDbInternal(useHuntStore);
}

/**
 * Setup store sync with optional delay
 */
export async function setupStoreSync(delayBroadcastMs = 0) {
  return setupStoreSyncInternal(useHuntStore, delayBroadcastMs);
}
