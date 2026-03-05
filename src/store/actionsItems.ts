import type { HuntStore, StoreSetState } from './storeTypes';
import { generateId, normalizeTemplateItemName, saveJsonSetting } from './shared';

export const createItemActions = (
  set: StoreSetState
): Pick<HuntStore, 'addItemTemplate' | 'updateItemTemplate' | 'deleteItemTemplate'> => ({
  addItemTemplate: (itemData) => {
    set((state) => {
      const normalizedIncomingName = normalizeTemplateItemName(itemData.name);
      const existing = state.itemDatabase.find(
        (item) => normalizeTemplateItemName(item.name) === normalizedIncomingName
      );

      const itemDatabase = existing
        ? state.itemDatabase.map((item) =>
            item.id === existing.id ? { ...item, ...itemData, id: item.id } : item
          )
        : [...state.itemDatabase, { ...itemData, id: generateId() }];

      void saveJsonSetting('itemDatabase', itemDatabase);
      return { itemDatabase };
    });
  },

  updateItemTemplate: (id, updates) => {
    set((state) => ({
      itemDatabase: (() => {
        const itemDatabase = state.itemDatabase.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        );
        void saveJsonSetting('itemDatabase', itemDatabase);
        return itemDatabase;
      })(),
    }));
  },

  deleteItemTemplate: (id) => {
    set((state) => ({
      itemDatabase: (() => {
        const itemDatabase = state.itemDatabase.filter((item) => item.id !== id);
        void saveJsonSetting('itemDatabase', itemDatabase);
        return itemDatabase;
      })(),
    }));
  },
});
