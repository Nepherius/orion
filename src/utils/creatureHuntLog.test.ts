import { describe, expect, it } from 'vitest';
import type { HuntSession, LootItem } from '../types';
import {
  buildCreatureHuntLog,
  createCreatureHuntLogCsv,
  createCreatureHuntLogMarkdown,
} from './creatureHuntLog';

const loot = (
  id: string,
  name: string,
  value: number,
  quantity: number,
  totalValue: number,
  killUuid?: string
): LootItem => ({
  id,
  name,
  value,
  quantity,
  markup: 100,
  totalValue,
  timestamp: 1,
  killUuid,
});

const session = (overrides: Partial<HuntSession>): HuntSession => ({
  id: 'session',
  name: 'Daikiba run',
  startTime: Date.UTC(2026, 0, 1),
  endTime: Date.UTC(2026, 0, 1, 1),
  status: 'completed',
  weapon: 'Test Rifle',
  location: 'Twin Peaks',
  creature: 'Daikiba',
  loot: [],
  skills: [],
  globals: [],
  kills: [],
  damageEvents: [],
  combatEvents: [],
  healingEvents: [],
  damageTakenEvents: [],
  notes: '',
  ammoCost: 80,
  weaponDecay: 15,
  healingCost: 3,
  otherCosts: 2,
  stats: {
    kills: 0,
    lootEvents: 0,
    globals: 0,
    hofs: 0,
    totalLoot: 0,
    totalCost: 100,
    returns: 0,
    duration: 3600,
    shotsFired: 0,
    damageDealt: 0,
    damageTaken: 0,
    healsUsed: 0,
    totalHealing: 0,
    misses: 0,
    dodges: 0,
    evades: 0,
    enemyMisses: 0,
    enemyEvades: 0,
    enemyDodges: 0,
    criticalHits: 0,
    hits: 0,
  },
  ...overrides,
});

describe('creature hunting log', () => {
  it('uses TT values rather than adjusted loot values for return', () => {
    const report = buildCreatureHuntLog(
      [
        session({
          loot: [loot('loot-1', 'Daikiba Skin', 2, 10, 30)],
          kills: [
            {
              id: 'kill-1',
              creatureName: 'Daikiba',
              maturity: 'Young',
              hpDealt: 40,
              cost: 100,
              lootValue: 30,
              timestamp: 1,
            },
          ],
        }),
      ],
      'Daikiba'
    );

    expect(report.summary.ttReturn).toBe(20);
    expect(report.summary.adjustedReturn).toBe(30);
    expect(report.summary.ttReturnPercent).toBe(20);
    expect(report.lootComposition[0]).toMatchObject({
      name: 'Daikiba Skin',
      quantity: 10,
      ttValue: 20,
    });
  });

  it('allocates completely linked mixed sessions and excludes incomplete ones', () => {
    const mixedKills = [
      {
        id: 'daikiba-kill',
        creatureName: 'Daikiba',
        maturity: 'Young',
        hpDealt: 40,
        cost: 40,
        lootValue: 38,
        timestamp: 1,
      },
      {
        id: 'exarosaur-kill',
        creatureName: 'Exarosaur',
        maturity: 'Young',
        hpDealt: 60,
        cost: 60,
        lootValue: 55,
        timestamp: 2,
      },
    ];
    const complete = session({
      id: 'complete',
      creature: 'Mixed',
      name: 'Mixed run',
      kills: mixedKills,
      loot: [
        loot('loot-1', 'Animal Hide', 38, 1, 38, 'daikiba-kill'),
        loot('loot-2', 'Shrapnel', 55, 1, 55, 'exarosaur-kill'),
      ],
    });
    const incomplete = session({
      id: 'incomplete',
      creature: 'Mixed',
      name: 'Mixed run 2',
      kills: mixedKills,
      loot: [loot('loot-3', 'Animal Hide', 38, 1, 38)],
    });

    const report = buildCreatureHuntLog([complete, incomplete], 'Daikiba');

    expect(report.summary.sessionsIncluded).toBe(1);
    expect(report.summary.linkedMixedSessions).toBe(1);
    expect(report.summary.excludedMixedSessions).toBe(1);
    expect(report.summary.ttCost).toBe(40);
    expect(report.summary.ttReturn).toBe(38);
    expect(report.summary.durationHours).toBeCloseTo(0.4);
  });

  it('respects time range and tag filters', () => {
    const includedStart = Date.UTC(2026, 0, 10);
    const included = session({
      id: 'included',
      startTime: includedStart,
      endTime: includedStart + 3600000,
      tags: ['team'],
      kills: [
        {
          id: 'included-kill',
          creatureName: 'Daikiba',
          maturity: 'Young',
          hpDealt: 40,
          cost: 100,
          lootValue: 80,
          timestamp: 1,
        },
      ],
      loot: [loot('included-loot', 'Animal Hide', 80, 1, 80)],
    });
    const outOfRange = session({
      id: 'old',
      startTime: Date.UTC(2025, 11, 31),
      endTime: Date.UTC(2025, 11, 31, 1),
      tags: ['team'],
      kills: [
        {
          id: 'old-kill',
          creatureName: 'Daikiba',
          maturity: 'Young',
          hpDealt: 40,
          cost: 100,
          lootValue: 80,
          timestamp: 1,
        },
      ],
      loot: [loot('old-loot', 'Animal Hide', 80, 1, 80)],
    });
    const wrongTag = session({
      id: 'solo',
      startTime: Date.UTC(2026, 0, 11),
      endTime: Date.UTC(2026, 0, 11, 1),
      tags: ['solo'],
      kills: [
        {
          id: 'solo-kill',
          creatureName: 'Daikiba',
          maturity: 'Young',
          hpDealt: 40,
          cost: 100,
          lootValue: 80,
          timestamp: 1,
        },
      ],
      loot: [loot('solo-loot', 'Animal Hide', 80, 1, 80)],
    });

    const report = buildCreatureHuntLog([included, outOfRange, wrongTag], 'Daikiba', {
      startTime: Date.UTC(2026, 0, 1),
      endTime: Date.UTC(2026, 0, 31),
      tags: ['team'],
    });

    expect(report.summary.sessionsIncluded).toBe(1);
    expect(report.runs[0].sessionName).toBe('Daikiba run');
    expect(report.summary.startTime).toBe(includedStart);
  });

  it('includes tracked skill gains in reports and exports', () => {
    const report = buildCreatureHuntLog(
      [
        session({
          skills: [
            { id: 'skill-1', skillName: 'Rifle', gainAmount: 0.5, timestamp: 1 },
            { id: 'skill-2', skillName: 'Aim', gainAmount: 0.25, timestamp: 2 },
          ],
          loot: [loot('loot-1', 'Animal Hide', 95, 1, 100)],
          kills: [
            {
              id: 'kill-1',
              creatureName: 'Daikiba',
              maturity: 'Young',
              hpDealt: 40,
              cost: 100,
              lootValue: 100,
              timestamp: 1,
            },
          ],
        }),
      ],
      'Daikiba'
    );

    expect(report.summary.totalSkillGains).toBeCloseTo(0.75);
    expect(report.runs[0].skillGains).toBeCloseTo(0.75);
    expect(report.skillGains).toEqual([
      { name: 'Rifle', gainAmount: 0.5, events: 1 },
      { name: 'Aim', gainAmount: 0.25, events: 1 },
    ]);
    expect(createCreatureHuntLogCsv(report)).toContain('"Skill gains","0.75"');
    expect(createCreatureHuntLogMarkdown(report)).toContain('| Skill gains | 0.75 |');
    expect(createCreatureHuntLogMarkdown(report)).toContain('| Rifle | 0.50 | 1 |');
  });

  it('creates spreadsheet and forum-ready exports', () => {
    const report = buildCreatureHuntLog(
      [
        session({
          loot: [loot('loot-1', 'Animal Hide', 95, 1, 100)],
          kills: [
            {
              id: 'kill-1',
              creatureName: 'Daikiba',
              maturity: 'Young',
              hpDealt: 40,
              cost: 100,
              lootValue: 100,
              timestamp: 1,
            },
          ],
        }),
      ],
      'Daikiba'
    );

    expect(createCreatureHuntLogCsv(report)).toContain('"TT return (%)","95.00"');
    expect(createCreatureHuntLogMarkdown(report)).toContain(
      '| Total |  | 1 | 100.00 | 95.00 | 95.00% |'
    );
    expect(createCreatureHuntLogMarkdown(report)).toMatch(
      /\nLog tracked and generated by \[ORION]\(https:\/\/github\.com\/Nepherius\/orion\/releases\/latest\)$/
    );
  });
});
