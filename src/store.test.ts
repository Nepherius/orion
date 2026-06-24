import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useHuntStore } from './store';
import { Loadout, HuntSession, SessionStats, CombatEvent, ItemTemplate, Goal } from './types';
import { safeInvoke } from './store/shared';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  emit: Math.random() ? vi.fn() : vi.fn(), // Provide a mock for emit
  listen: vi.fn(() => Promise.resolve(() => {})), // Mock listen to return a promise with an unlisten fn
}));

describe('HuntStore - addCombatEvent Costs', () => {
  beforeEach(() => {
    // Reset store state before each test
    useHuntStore.setState({
      sessions: [],
      loadouts: [],
      activeSessionId: null,
    });
  });

  const setupTestSession = (ammoBurn: number, decay: number) => {
    const sessionId = 'test-session-1';
    const loadoutId = 'test-loadout-1';

    // Partial mock of loadout
    const mockLoadout: Partial<Loadout> = {
      id: loadoutId,
      name: 'Test Weapon',
      ammoBurn,
      decay,
    };

    // Partial mock of session
    const mockSession: Partial<HuntSession> = {
      id: sessionId,
      name: 'Test Session',
      loadoutId,
      weapon: 'Test Weapon',
      combatEvents: [],
      damageEvents: [],
      healingEvents: [],
      damageTakenEvents: [],
      loot: [],
      globals: [],
      ammoCost: 0,
      weaponDecay: 0,
      stats: {} as SessionStats,
    };

    useHuntStore.setState({
      loadouts: [mockLoadout as Loadout],
      sessions: [mockSession as HuntSession],
    });

    return sessionId;
  };

  const playerAttackEvents = ['hit', 'crit', 'player_miss', 'enemy_dodge', 'enemy_evade'] as const;

  playerAttackEvents.forEach((eventType) => {
    it(`should apply ammo and decay costs when event is ${eventType}`, () => {
      const sessionId = setupTestSession(10000, 50); // 1.0 ammo cost, 0.5 decay
      const { addCombatEvent } = useHuntStore.getState();

      addCombatEvent(sessionId, eventType as CombatEvent['type']);

      const session = useHuntStore.getState().sessions[0];
      expect(session.ammoCost).toBe(1.0);
      expect(session.weaponDecay).toBe(0.5);
      expect(session.combatEvents?.length).toBe(1);
      expect(session.combatEvents?.[0].type).toBe(eventType);
    });
  });

  const nonPlayerAttackEvents = ['enemy_miss'] as const;

  nonPlayerAttackEvents.forEach((eventType) => {
    it(`should NOT apply ammo and decay costs when event is ${eventType}`, () => {
      const sessionId = setupTestSession(10000, 50);
      const { addCombatEvent } = useHuntStore.getState();

      addCombatEvent(sessionId, eventType as CombatEvent['type']);

      const session = useHuntStore.getState().sessions[0];
      expect(session.ammoCost).toBe(0);
      expect(session.weaponDecay).toBe(0);
      expect(session.combatEvents?.length).toBe(1);
      expect(session.combatEvents?.[0].type).toBe(eventType);
    });
  });
});

describe('HuntStore - session lifecycle persistence', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    useHuntStore.setState({
      sessions: [],
      loadouts: [],
      activeSessionId: null,
    });
  });

  const createSession = (overrides: Partial<HuntSession>): HuntSession => ({
    id: overrides.id ?? 'session-1',
    name: overrides.name ?? 'Session',
    startTime: overrides.startTime ?? 1699999990000,
    status: overrides.status ?? 'active',
    pausedAt: overrides.pausedAt,
    totalPausedMs: overrides.totalPausedMs ?? 0,
    weapon: overrides.weapon ?? 'Weapon',
    armor: overrides.armor,
    location: overrides.location,
    creature: overrides.creature ?? 'Creature',
    loot: [],
    skills: [],
    globals: [],
    kills: [],
    damageEvents: [],
    combatEvents: [],
    healingEvents: [],
    damageTakenEvents: [],
    notes: overrides.notes ?? '',
    loadoutId: overrides.loadoutId,
    ammoCost: overrides.ammoCost ?? 0,
    weaponDecay: overrides.weaponDecay ?? 0,
    healingCost: overrides.healingCost ?? 0,
    otherCosts: overrides.otherCosts ?? 0,
    stats: {} as SessionStats,
  });

  it('persists displaced active sessions as paused when creating a new active session', () => {
    useHuntStore.setState({
      sessions: [createSession({ id: 'old-active', status: 'active' })],
      activeSessionId: 'old-active',
    });

    useHuntStore.getState().createSession({
      name: 'New Active',
      weapon: 'Weapon',
      creature: 'Creature',
      startTime: 1700000000000,
      status: 'active',
      ammoCost: 0,
      weaponDecay: 0,
      healingCost: 0,
      otherCosts: 0,
      notes: '',
    });

    expect(invoke).toHaveBeenCalledWith(
      'db_update_session',
      expect.objectContaining({
        params: expect.objectContaining({
          uuid: 'old-active',
          status: 'paused',
          paused_at: 1700000000000,
        }),
      })
    );
  });

  it('snapshots loadout efficiency and DPP when creating a session', () => {
    useHuntStore.setState({
      loadouts: [
        {
          id: 'loadout-1',
          name: 'Snapshot Loadout',
          efficiency: 72.5,
          dpp: 3.14,
        } as Loadout,
      ],
    });

    useHuntStore.getState().createSession({
      name: 'Snapshot Session',
      weapon: 'Weapon',
      creature: 'Creature',
      loadoutId: 'loadout-1',
      startTime: 1700000000000,
      status: 'active',
      ammoCost: 0,
      weaponDecay: 0,
      healingCost: 0,
      otherCosts: 0,
      notes: '',
    });

    const session = useHuntStore.getState().sessions[0];
    expect(session.weaponEfficiencySnapshot).toBe(72.5);
    expect(session.dppSnapshot).toBe(3.14);
    expect(session.loadoutNameSnapshot).toBe('Snapshot Loadout');
    expect(invoke).toHaveBeenCalledWith(
      'db_create_session',
      expect.objectContaining({
        params: expect.objectContaining({
          weapon_efficiency_snapshot: 72.5,
          dpp_snapshot: 3.14,
          loadout_name_snapshot: 'Snapshot Loadout',
        }),
      })
    );
  });

  it('persists start time and clears stale paused_at when starting a session', () => {
    useHuntStore.setState({
      sessions: [
        createSession({ id: 'old-active', status: 'active' }),
        createSession({ id: 'next-session', status: 'paused', pausedAt: 1699999995000 }),
      ],
      activeSessionId: 'old-active',
    });

    useHuntStore.getState().startSession('next-session');

    expect(invoke).toHaveBeenCalledWith(
      'db_update_session',
      expect.objectContaining({
        params: expect.objectContaining({
          uuid: 'next-session',
          status: 'active',
          start_time: 1700000000000,
          clear_paused_at: true,
          total_paused_ms: 0,
        }),
      })
    );
    expect(invoke).toHaveBeenCalledWith(
      'db_update_session',
      expect.objectContaining({
        params: expect.objectContaining({
          uuid: 'old-active',
          status: 'paused',
          paused_at: 1700000000000,
        }),
      })
    );
  });
});

describe('HuntStore - persistence failures', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    useHuntStore.setState({
      persistenceError: null,
      sessions: [],
      loadouts: [],
      itemDatabase: [],
      goals: [],
      activeSessionId: null,
    });
  });

  it('surfaces failed database writes in store state', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('disk is read-only'));

    await safeInvoke('db_add_loot', { params: {} });

    expect(useHuntStore.getState().persistenceError).toMatchObject({
      command: 'db_add_loot',
      message: 'disk is read-only',
    });
  });

  it('does not label read failures as unsaved changes', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('query failed'));

    await safeInvoke('db_get_session_loot', { sessionUuid: 'session-1' });

    expect(useHuntStore.getState().persistenceError).toBeNull();
  });

  it('clears persisted and in-memory user data together', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    useHuntStore.setState({
      sessions: [{ id: 'session-1' } as HuntSession],
      activeSessionId: 'session-1',
      loadouts: [{ id: 'loadout-1' } as Loadout],
      itemDatabase: [{ id: 'item-1' } as ItemTemplate],
      goals: [{ id: 'goal-1' } as Goal],
    });

    const cleared = await useHuntStore.getState().clearAllData();
    const state = useHuntStore.getState();

    expect(cleared).toBe(true);
    expect(invoke).toHaveBeenCalledWith('db_clear_all_data', undefined);
    expect(state.sessions).toEqual([]);
    expect(state.activeSessionId).toBeNull();
    expect(state.loadouts).toEqual([]);
    expect(state.itemDatabase).toEqual([]);
    expect(state.goals).toEqual([]);
  });
});
