import { ensureSingleLoadoutPrimary } from '../core/sessionCore';
import type { Loadout } from '../types';
import type { HuntStore, StoreGetState, StoreSetState } from './storeTypes';
import { generateId, saveJsonSetting } from './shared';

export const createLoadoutActions = (
  set: StoreSetState,
  get: StoreGetState
): Pick<
  HuntStore,
  | 'createLoadout'
  | 'updateLoadout'
  | 'deleteLoadout'
  | 'duplicateLoadout'
  | 'toggleLoadoutFavorite'
  | 'setPrimaryLoadout'
  | 'getPrimaryLoadout'
> => ({
  createLoadout: (loadoutData) => {
    const newLoadout: Loadout = {
      ...loadoutData,
      id: generateId(),
    };
    set((state) => {
      const loadouts = ensureSingleLoadoutPrimary([newLoadout, ...state.loadouts]);
      void saveJsonSetting('loadouts', loadouts);
      return { loadouts };
    });
  },

  updateLoadout: (id, updates) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = state.loadouts.map((loadout) =>
          loadout.id === id ? { ...loadout, ...updates } : loadout
        );
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  deleteLoadout: (id) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = ensureSingleLoadoutPrimary(
          state.loadouts.filter((loadout) => loadout.id !== id)
        );
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  duplicateLoadout: (id) => {
    const loadout = get().loadouts.find((l) => l.id === id);
    if (loadout) {
      const duplicate: Loadout = {
        ...loadout,
        id: generateId(),
        name: `${loadout.name} (Copy)`,
        isPrimary: false,
      };
      set((state) => {
        const loadouts = [duplicate, ...state.loadouts];
        void saveJsonSetting('loadouts', loadouts);
        return { loadouts };
      });
    }
  },

  toggleLoadoutFavorite: (id) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = state.loadouts.map((loadout) =>
          loadout.id === id ? { ...loadout, favorite: !loadout.favorite } : loadout
        );
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  setPrimaryLoadout: (id) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = state.loadouts.map((loadout) => ({
          ...loadout,
          isPrimary: loadout.id === id,
        }));
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  getPrimaryLoadout: () => {
    const state = get();
    return state.loadouts.find((l) => l.isPrimary) || null;
  },
});
