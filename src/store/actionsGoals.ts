import type { HuntStore, StoreSetState } from './storeTypes';
import { generateId, saveJsonSetting } from './shared';

export const createGoalActions = (
  set: StoreSetState
): Pick<HuntStore, 'addGoal' | 'updateGoal' | 'deleteGoal'> => ({
  addGoal: (goalData) => {
    set((state) => {
      const newGoal = {
        ...goalData,
        id: generateId(),
        createdAt: Date.now(),
      };
      const goals = [...(state.goals || []), newGoal];
      void saveJsonSetting('goals', goals);
      return { goals };
    });
  },

  updateGoal: (id, updates) => {
    set((state) => {
      const goals = (state.goals || []).map((g) => (g.id === id ? { ...g, ...updates } : g));
      void saveJsonSetting('goals', goals);
      return { goals };
    });
  },

  deleteGoal: (id) => {
    set((state) => {
      const goals = (state.goals || []).filter((g) => g.id !== id);
      void saveJsonSetting('goals', goals);
      return { goals };
    });
  },
});
