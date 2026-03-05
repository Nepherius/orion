import type {
  CombatEvent,
  DamageEvent,
  DamageTakenEvent,
  Global,
  HealingEvent,
  SkillGain,
} from '../types';
import type { HuntStore, StoreGetState, StoreSetState } from './storeTypes';
import { calculateStats, generateId, safeInvoke, updateSessionInDb } from './shared';
import { pendingKillFlag, pendingKillStartTime } from './killTracking';

export const createEventActions = (
  set: StoreSetState,
  get: StoreGetState
): Pick<
  HuntStore,
  | 'addSkillGain'
  | 'addGlobal'
  | 'addDamageEvent'
  | 'addCombatEvent'
  | 'addHealingEvent'
  | 'addDamageTakenEvent'
> => ({
  addSkillGain: (sessionId, skillData) => {
    const newSkill: SkillGain = {
      ...skillData,
      id: generateId(),
      timestamp: skillData.timestamp || Date.now(),
    };

    get().updateSession(sessionId, {
      skills: [...(get().sessions.find((s) => s.id === sessionId)?.skills || []), newSkill],
    });

    void safeInvoke('db_add_skill', {
      uuid: newSkill.id,
      sessionUuid: sessionId,
      skillName: newSkill.skillName,
      gainAmount: newSkill.gainAmount,
      timestamp: newSkill.timestamp,
    });
  },

  addGlobal: (sessionId, globalData) => {
    const newGlobal: Global = {
      ...globalData,
      id: generateId(),
      timestamp: globalData.timestamp || Date.now(),
    };

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === sessionId) {
          const updated = { ...session, globals: [...session.globals, newGlobal] };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return session;
      }),
    }));

    void safeInvoke('db_add_global', {
      uuid: newGlobal.id,
      sessionUuid: sessionId,
      creature: newGlobal.creature,
      value: newGlobal.value,
      isHof: newGlobal.isHoF,
      timestamp: newGlobal.timestamp,
    });
  },

  addDamageEvent: (sessionId, damage, isCritical = false, timestamp?: number) => {
    const newDamageEvent: DamageEvent = {
      id: generateId(),
      damage,
      timestamp: timestamp || Date.now(),
      isCritical,
    };

    if (!pendingKillFlag.get(sessionId)) {
      pendingKillFlag.set(sessionId, true);
      pendingKillStartTime.set(sessionId, newDamageEvent.timestamp);
    }

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          const updated = {
            ...s,
            damageEvents: [...(s.damageEvents || []), newDamageEvent],
          };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return s;
      }),
    }));

    void safeInvoke('db_add_damage_event', {
      uuid: newDamageEvent.id,
      sessionUuid: sessionId,
      damage: newDamageEvent.damage,
      isCritical: newDamageEvent.isCritical,
      timestamp: newDamageEvent.timestamp,
    });
  },

  addCombatEvent: (sessionId, eventType, timestamp?: number) => {
    const newCombatEvent: CombatEvent = {
      id: generateId(),
      type: eventType,
      timestamp: timestamp || Date.now(),
    };

    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        console.warn('Session not found:', sessionId);
        return state;
      }

      const loadout = session.loadoutId
        ? state.loadouts.find((l) => l.id === session.loadoutId)
        : state.loadouts.find(
            (l) => l.weapon?.Name === session.weapon || l.name === session.weapon
          );

      const isPlayerAttack = ['hit', 'crit', 'player_miss', 'enemy_dodge', 'enemy_evade'].includes(
        eventType
      );
      const ammoCostPerShot = isPlayerAttack ? (loadout?.ammoBurn || 0) / 10000 : 0;
      const decayCostPerShot = isPlayerAttack ? (loadout?.decay || 0) / 100 : 0;

      return {
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            const updated = {
              ...s,
              combatEvents: [...(s.combatEvents || []), newCombatEvent],
              ammoCost: s.ammoCost + ammoCostPerShot,
              weaponDecay: s.weaponDecay + decayCostPerShot,
            };
            updated.stats = calculateStats(updated);
            return updated;
          }
          return s;
        }),
      };
    });

    void safeInvoke('db_add_combat_event', {
      uuid: newCombatEvent.id,
      sessionUuid: sessionId,
      eventType: newCombatEvent.type,
      timestamp: newCombatEvent.timestamp,
    });

    const updatedSession = get().sessions.find((s) => s.id === sessionId);
    if (updatedSession) {
      void updateSessionInDb(sessionId, {
        ammoCost: updatedSession.ammoCost,
        weaponDecay: updatedSession.weaponDecay,
      });
    }
  },

  addHealingEvent: (sessionId, amount, timestamp?: number, options?) => {
    const applyCost = options?.applyCost ?? true;
    const isDirectUse = options?.isDirectUse ?? applyCost;

    const newHealingEvent: HealingEvent = {
      id: generateId(),
      amount,
      timestamp: timestamp || Date.now(),
      isDirectUse,
    };

    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        return state;
      }

      const loadout = session.loadoutId
        ? state.loadouts.find((l) => l.id === session.loadoutId)
        : state.loadouts.find(
            (l) => l.weapon?.Name === session.weapon || l.name === session.weapon
          );
      const healCostPerUse = loadout?.medicalMECost || 0;
      const healingCostDelta = applyCost ? healCostPerUse : 0;

      return {
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            const updated = {
              ...s,
              healingEvents: [...(s.healingEvents || []), newHealingEvent],
              healingCost: s.healingCost + healingCostDelta,
            };
            updated.stats = calculateStats(updated);
            return updated;
          }
          return s;
        }),
      };
    });

    void safeInvoke('db_add_healing_event', {
      uuid: newHealingEvent.id,
      sessionUuid: sessionId,
      amount: newHealingEvent.amount,
      timestamp: newHealingEvent.timestamp,
    });

    const updatedSession = get().sessions.find((s) => s.id === sessionId);
    if (updatedSession) {
      void updateSessionInDb(sessionId, {
        healingCost: updatedSession.healingCost,
      });
    }
  },

  addDamageTakenEvent: (sessionId, damage, isCritical = false, timestamp?: number) => {
    const newDamageTakenEvent: DamageTakenEvent = {
      id: generateId(),
      damage,
      timestamp: timestamp || Date.now(),
      isCritical,
    };

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          const updated = {
            ...s,
            damageTakenEvents: [...(s.damageTakenEvents || []), newDamageTakenEvent],
          };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return s;
      }),
    }));

    void safeInvoke('db_add_damage_taken_event', {
      uuid: newDamageTakenEvent.id,
      sessionUuid: sessionId,
      damage: newDamageTakenEvent.damage,
      isCritical: newDamageTakenEvent.isCritical,
      timestamp: newDamageTakenEvent.timestamp,
    });
  },
});
