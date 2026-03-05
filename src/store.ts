import { useHuntStore } from './store/createStore';
import {
  initializeStoreFromDb as initializeStoreFromDbInternal,
  setupStoreSync as setupStoreSyncInternal,
} from './store/lifecycle';

export { useHuntStore };

export async function initializeStoreFromDb() {
  return initializeStoreFromDbInternal(useHuntStore);
}

export async function setupStoreSync(delayBroadcastMs = 0) {
  return setupStoreSyncInternal(useHuntStore, delayBroadcastMs);
}
