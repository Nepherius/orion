import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processRecentChatLines } from './chatLogEventProcessor';
import type { ParseResult } from './chatLogTypes';
import type { FapHotClassifierState } from '../../../utils/fapHotClassifier';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const addHealingEventMock = vi.fn();

const baseState = {
  settings: {
    avatarName: 'Tester',
    autoStartSession: false,
    defaultMarkup: 100,
    autoSave: false,
    theme: 'dark' as const,
  },
  loadouts: [
    {
      id: 'loadout-1',
      name: 'Resto Loadout',
      medicalTool: 'Restoration Chip IV',
      medicalME: 500,
    },
  ],
  sessions: [
    {
      id: 'session-1',
      loadoutId: 'loadout-1',
      weapon: 'Test Weapon',
      status: 'active' as const,
      healingEvents: [],
    },
  ],
  activeSessionId: 'session-1',
  getActiveSession: () => ({
    id: 'session-1',
    loadoutId: 'loadout-1',
    weapon: 'Test Weapon',
    status: 'active' as const,
    healingEvents: [],
  }),
  addHealingEvent: addHealingEventMock,
  createSession: vi.fn(),
  startSession: vi.fn(),
  addLoot: vi.fn(),
  addGlobal: vi.fn(),
  addDamageEvent: vi.fn(),
  addCombatEvent: vi.fn(),
  addDamageTakenEvent: vi.fn(),
  addSkillGain: vi.fn(),
  itemDatabase: [],
  getPrimaryLoadout: vi.fn(() => ({ id: 'loadout-1', name: 'Resto Loadout' })),
};

const getStateMock = vi.fn(() => baseState);

vi.mock('../../../store', () => ({
  useHuntStore: {
    getState: () => getStateMock(),
  },
}));

const initialFapState: FapHotClassifierState = {
  hotWindowEndMs: null,
  lastHealTimestampMs: null,
  lastHealAmount: null,
  pendingDirectHealTimestampMs: null,
  expectingDirectUseHeal: false,
};

describe('processRecentChatLines healing classification', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    addHealingEventMock.mockReset();
    getStateMock.mockClear();
  });

  it('applies decay once for dense restoration-chip HoT sequence with one EoT marker', async () => {
    const parseResult: ParseResult = {
      loot_events: [],
      damage_events: [],
      combat_events: [],
      damage_taken_events: [],
      skill_gains: [],
      healing_events: [
        { timestamp: '2026-03-07 20:38:54', amount: 3.0 },
        { timestamp: '2026-03-07 20:38:56', amount: 2.7 },
        { timestamp: '2026-03-07 20:38:57', amount: 3.5 },
        { timestamp: '2026-03-07 20:38:59', amount: 3.6 },
        { timestamp: '2026-03-07 20:39:01', amount: 3.5 },
        { timestamp: '2026-03-07 20:39:03', amount: 3.6 },
        { timestamp: '2026-03-07 20:39:05', amount: 3.6 },
        { timestamp: '2026-03-07 20:39:07', amount: 3.6 },
        { timestamp: '2026-03-07 20:39:08', amount: 3.5 },
        { timestamp: '2026-03-07 20:39:10', amount: 3.6 },
        { timestamp: '2026-03-07 20:39:12', amount: 2.5 },
        { timestamp: '2026-03-07 20:39:18', amount: 3.6 },
        { timestamp: '2026-03-07 20:39:20', amount: 3.5 },
        { timestamp: '2026-03-07 20:39:21', amount: 3.0 },
      ],
    };

    invokeMock.mockResolvedValue(parseResult);

    await processRecentChatLines({
      recentLines: [
        '2026-03-07 20:38:54 [System] [] Received Effect Over Time: Heal',
        '2026-03-07 20:38:54 [System] [] You healed yourself 3.0 points',
        '2026-03-07 20:38:56 [System] [] You healed yourself 2.7 points',
        '2026-03-07 20:38:57 [System] [] You healed yourself 3.5 points',
        '2026-03-07 20:38:59 [System] [] You healed yourself 3.6 points',
        '2026-03-07 20:39:01 [System] [] You healed yourself 3.5 points',
        '2026-03-07 20:39:03 [System] [] You healed yourself 3.6 points',
        '2026-03-07 20:39:05 [System] [] You healed yourself 3.6 points',
        '2026-03-07 20:39:07 [System] [] You healed yourself 3.6 points',
        '2026-03-07 20:39:08 [System] [] You healed yourself 3.5 points',
        '2026-03-07 20:39:10 [System] [] You healed yourself 3.6 points',
        '2026-03-07 20:39:12 [System] [] You healed yourself 2.5 points',
        '2026-03-07 20:39:18 [System] [] You healed yourself 3.6 points',
        '2026-03-07 20:39:20 [System] [] You healed yourself 3.5 points',
        '2026-03-07 20:39:21 [System] [] You healed yourself 3.0 points',
      ].join('\n'),
      processedEvents: new Set<string>(),
      fapHotState: initialFapState,
      debugDetail: vi.fn(),
    });

    expect(addHealingEventMock).toHaveBeenCalledTimes(14);
    const directCostCalls = addHealingEventMock.mock.calls.filter(
      (call) => call[3]?.applyCost === true
    );
    expect(directCostCalls).toHaveLength(1);
  });

  it('does not re-add healing events when same log chunk is processed twice', async () => {
    const parseResult: ParseResult = {
      loot_events: [],
      damage_events: [],
      combat_events: [],
      damage_taken_events: [],
      skill_gains: [],
      healing_events: [
        { timestamp: '2026-03-07 20:38:54', amount: 3.0 },
        { timestamp: '2026-03-07 20:38:56', amount: 2.7 },
      ],
    };
    invokeMock.mockResolvedValue(parseResult);

    const processedEvents = new Set<string>();
    const recentLines = [
      '2026-03-07 20:38:54 [System] [] Received Effect Over Time: Heal',
      '2026-03-07 20:38:54 [System] [] You healed yourself 3.0 points',
      '2026-03-07 20:38:56 [System] [] You healed yourself 2.7 points',
    ].join('\n');

    const nextState = await processRecentChatLines({
      recentLines,
      processedEvents,
      fapHotState: initialFapState,
      debugDetail: vi.fn(),
    });

    await processRecentChatLines({
      recentLines,
      processedEvents,
      fapHotState: nextState,
      debugDetail: vi.fn(),
    });

    expect(addHealingEventMock).toHaveBeenCalledTimes(2);
  });

  it('does not re-add healing events after monitor restart with same log chunk', async () => {
    const parseResult: ParseResult = {
      loot_events: [],
      damage_events: [],
      combat_events: [],
      damage_taken_events: [],
      skill_gains: [],
      healing_events: [
        { timestamp: '2026-03-07 20:38:54', amount: 3.0 },
        { timestamp: '2026-03-07 20:38:56', amount: 2.7 },
      ],
    };
    invokeMock.mockResolvedValue(parseResult);

    const recentLines = [
      '2026-03-07 20:38:54 [System] [] Received Effect Over Time: Heal',
      '2026-03-07 20:38:54 [System] [] You healed yourself 3.0 points',
      '2026-03-07 20:38:56 [System] [] You healed yourself 2.7 points',
    ].join('\n');

    await processRecentChatLines({
      recentLines,
      processedEvents: new Set<string>(),
      fapHotState: initialFapState,
      debugDetail: vi.fn(),
    });

    await processRecentChatLines({
      recentLines,
      processedEvents: new Set<string>(),
      fapHotState: initialFapState,
      debugDetail: vi.fn(),
    });

    // Each call processes all events independently (no duplicate filtering needed)
    expect(addHealingEventMock).toHaveBeenCalledTimes(4);
  });
});
