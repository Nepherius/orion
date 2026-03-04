import { describe, expect, it } from 'vitest';
import { classifyFapHealingFromLogLines, getHealToolProfile } from './fapHotClassifier';

describe('classifyFapHealingFromLogLines', () => {
  it('marks first heal after EoT as direct, then later heals can be HoT ticks', () => {
    const content = [
      '2026-03-03 10:00:00 [System] [] You healed yourself 30.0 points',
      '2026-03-03 10:00:01 [System] [] Received Effect Over Time: Heal',
      '2026-03-03 10:00:02 [System] [] You healed yourself 5.0 points',
      '2026-03-03 10:00:03 [System] [] You healed yourself 2.0 points',
    ].join('\n');

    const result = classifyFapHealingFromLogLines(content);

    expect(result.healingEvents).toHaveLength(3);
    expect(result.healingEvents[0]).toMatchObject({ amount: 30, isDirectUse: true });
    expect(result.healingEvents[1]).toMatchObject({ amount: 5, isDirectUse: true });
    expect(result.healingEvents[2]).toMatchObject({ amount: 2, isDirectUse: false });
  });

  it('refreshes active FAP HoT to now+10s (not cumulative) on direct use without new EoT', () => {
    const initial = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:00 [System] [] You healed yourself 30.0 points',
        '2026-03-03 10:00:01 [System] [] Received Effect Over Time: Heal',
        '2026-03-03 10:00:02 [System] [] You healed yourself 5.0 points',
      ].join('\n')
    );

    const refreshed = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:07 [System] [] You healed yourself 22.0 points',
        '2026-03-03 10:00:15 [System] [] You healed yourself 4.0 points',
        '2026-03-03 10:00:19 [System] [] You healed yourself 8.0 points',
      ].join('\n'),
      initial.nextState
    );

    expect(refreshed.healingEvents).toHaveLength(3);
    expect(refreshed.healingEvents[0]).toMatchObject({ amount: 22, isDirectUse: true });
    expect(refreshed.healingEvents[1]).toMatchObject({ amount: 4, isDirectUse: false });

    // If refresh incorrectly added +10s to existing timer, this would still be in-window.
    // Expected behavior: expiry resets to 10:00:17, so 10:00:19 is direct use.
    expect(refreshed.healingEvents[2]).toMatchObject({ amount: 8, isDirectUse: true });
  });

  it('classifies real FAP session with multiple direct uses and ticks by amount jumps', () => {
    const realLog = [
      '2026-02-26 20:13:38 [System] [] Received Effect Over Time: Heal',
      '2026-02-26 20:13:38 [System] [] You healed yourself 13.1 points',
      '2026-02-26 20:13:38 [System] [] The attack missed you',
      '2026-02-26 20:13:39 [System] [] You healed yourself 0.3 points',
      '2026-02-26 20:13:40 [System] [] You healed yourself 12.3 points',
      '2026-02-26 20:13:41 [System] [] You healed yourself 1.0 points',
      '2026-02-26 20:13:42 [System] [] You healed yourself 14.7 points',
      '2026-02-26 20:13:42 [System] [] You healed yourself 1.4 points',
      '2026-02-26 20:13:44 [System] [] You Evaded the attack',
      '2026-02-26 20:13:44 [System] [] You healed yourself 1.4 points',
      '2026-02-26 20:13:46 [System] [] You healed yourself 15.0 points',
      '2026-02-26 20:13:46 [System] [] You healed yourself 1.5 points',
      '2026-02-26 20:13:48 [System] [] You healed yourself 1.5 points',
      '2026-02-26 20:13:50 [System] [] You healed yourself 1.5 points',
      '2026-02-26 20:13:52 [System] [] You healed yourself 1.5 points',
      '2026-02-26 20:13:53 [System] [] You healed yourself 1.5 points',
    ].join('\n');

    const result = classifyFapHealingFromLogLines(realLog);

    expect(result.healingEvents).toHaveLength(13);
    expect(result.healingEvents[0]).toMatchObject({ amount: 13.1, isDirectUse: true });
    expect(result.healingEvents[1]).toMatchObject({ amount: 0.3, isDirectUse: false });
    expect(result.healingEvents[2]).toMatchObject({ amount: 12.3, isDirectUse: true });
    expect(result.healingEvents[3]).toMatchObject({ amount: 1.0, isDirectUse: false });
    expect(result.healingEvents[4]).toMatchObject({ amount: 14.7, isDirectUse: true });
    expect(result.healingEvents[5]).toMatchObject({ amount: 1.4, isDirectUse: false });
    expect(result.healingEvents[6]).toMatchObject({ amount: 1.4, isDirectUse: false });
    expect(result.healingEvents[7]).toMatchObject({ amount: 15.0, isDirectUse: true });
    expect(result.healingEvents[8]).toMatchObject({ amount: 1.5, isDirectUse: false });

    // After 15.0 direct at 20:13:46, window extends to 20:13:56
    // Remaining 1.5 heals at 20:13:48, 20:13:50, 20:13:52, 20:13:53 are all ticks
    for (let i = 9; i < 13; i++) {
      expect(result.healingEvents[i]).toMatchObject({ amount: 1.5, isDirectUse: false });
    }
  });

  it('uses 30s HoT window for restoration chip', () => {
    const restorationProfile = getHealToolProfile('Restoration Chip IV');

    const result = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:00 [System] [] You healed yourself 20.0 points',
        '2026-03-03 10:00:20 [System] [] You healed yourself 2.0 points',
        '2026-03-03 10:00:31 [System] [] You healed yourself 2.0 points',
      ].join('\n'),
      undefined,
      restorationProfile.windowDurationMs,
      restorationProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(3);
    expect(result.healingEvents[0]).toMatchObject({ amount: 20, isDirectUse: true });
    expect(result.healingEvents[1]).toMatchObject({ amount: 2, isDirectUse: false });
    expect(result.healingEvents[2]).toMatchObject({ amount: 2, isDirectUse: true });
  });

  it('treats regeneration chip heals as direct uses (no HoT ticks)', () => {
    const regenerationProfile = getHealToolProfile('Regeneration Chip I');

    const result = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:00 [System] [] You healed yourself 10.0 points',
        '2026-03-03 10:00:01 [System] [] Received Effect Over Time: Heal',
        '2026-03-03 10:00:02 [System] [] You healed yourself 2.0 points',
      ].join('\n'),
      undefined,
      regenerationProfile.windowDurationMs,
      regenerationProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(2);
    expect(result.healingEvents[0]).toMatchObject({ amount: 10, isDirectUse: true });
    expect(result.healingEvents[1]).toMatchObject({ amount: 2, isDirectUse: true });
  });
});
