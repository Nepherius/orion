import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHuntStore } from './store';
import { Loadout, HuntSession } from './types';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
    emit: Math.random() ? vi.fn() : vi.fn(), // Provide a mock for emit
    listen: vi.fn(() => Promise.resolve(() => { })), // Mock listen to return a promise with an unlisten fn
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
            repairCost: 0,
            stats: {} as any,
        };

        useHuntStore.setState({
            loadouts: [mockLoadout as Loadout],
            sessions: [mockSession as HuntSession]
        });

        return sessionId;
    };

    const playerAttackEvents = ['hit', 'crit', 'player_miss', 'enemy_dodge', 'enemy_evade'] as const;

    playerAttackEvents.forEach(eventType => {
        it(`should apply ammo and decay costs when event is ${eventType}`, () => {
            const sessionId = setupTestSession(10000, 50); // 1.0 ammo cost, 0.5 decay
            const { addCombatEvent } = useHuntStore.getState();

            addCombatEvent(sessionId, eventType as any);

            const session = useHuntStore.getState().sessions[0];
            expect(session.ammoCost).toBe(1);
            expect(session.repairCost).toBe(0.5);
            expect(session.combatEvents?.length).toBe(1);
            expect(session.combatEvents?.[0].type).toBe(eventType);
        });
    });

    const nonPlayerAttackEvents = ['enemy_miss'] as const;

    nonPlayerAttackEvents.forEach(eventType => {
        it(`should NOT apply ammo and decay costs when event is ${eventType}`, () => {
            const sessionId = setupTestSession(10000, 50);
            const { addCombatEvent } = useHuntStore.getState();

            addCombatEvent(sessionId, eventType as any);

            const session = useHuntStore.getState().sessions[0];
            expect(session.ammoCost).toBe(0);
            expect(session.repairCost).toBe(0);
            expect(session.combatEvents?.length).toBe(1);
            expect(session.combatEvents?.[0].type).toBe(eventType);
        });
    });
});
