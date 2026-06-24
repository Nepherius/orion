import { describe, expect, it } from 'vitest';
import {
  calculateBankrollRisk,
  calculateConvergenceMetrics,
  calculateMultiplierDistributions,
  type TheoryKillEvent,
  type TheorySessionReturn,
} from './lootTheory';

const kill = (index: number, multiplier: number): TheoryKillEvent => ({
  killId: `kill-${index}`,
  sessionId: 'session',
  timestamp: index,
  creature: 'Test Creature',
  maturity: 'Young',
  cost: 1,
  ttLoot: multiplier,
  adjustedLoot: multiplier,
  itemRows: 1,
});

describe('loot theory analytics', () => {
  it('calculates observed convergence from cumulative kill returns', () => {
    const events = Array.from({ length: 1000 }, (_, index) => kill(index, index < 10 ? 0.5 : 1));
    const metrics = calculateConvergenceMetrics(events, 250);

    expect(metrics?.totalKills).toBe(1000);
    expect(metrics?.points).toHaveLength(4);
    expect(metrics?.longTermReturn).toBeCloseTo(99.5, 6);
    expect(metrics?.thresholds[0].kills).not.toBeNull();
  });

  it('produces deterministic empirical bankroll risk', () => {
    const sessions: TheorySessionReturn[] = Array.from({ length: 10 }, (_, index) => ({
      sessionId: `session-${index}`,
      startTime: index,
      creature: 'Test',
      totalCost: 100,
      ttLoot: index % 2 === 0 ? 80 : 110,
      adjustedLoot: index % 2 === 0 ? 80 : 110,
      shrapnelTt: 0,
      efficiency: null,
      dpp: null,
      loadoutName: null,
    }));

    const first = calculateBankrollRisk(sessions, 100, 10);
    const second = calculateBankrollRisk(sessions, 100, 10);
    expect(first).toEqual(second);
    expect(first?.probability10).toBeGreaterThan(0);
  });

  it('summarizes multiplier distributions by creature and maturity', () => {
    const events = Array.from({ length: 40 }, (_, index) => kill(index, 0.5 + index / 100));
    const distributions = calculateMultiplierDistributions(events, 30);

    expect(distributions).toHaveLength(1);
    expect(distributions[0].kills).toBe(40);
    expect(distributions[0].p90).toBeGreaterThan(distributions[0].p10);
  });
});
