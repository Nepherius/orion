import { describe, expect, it } from 'vitest';
import { classifyFapHealingFromLogLines, getHealToolProfile } from './fapHotClassifier';

describe('classifyFapHealingFromLogLines', () => {
  it('marks first heal after EoT as direct for Vivo S10, then later heals can be HoT ticks', () => {
    const vivoProfile = getHealToolProfile('Vivo S10');
    const content = [
      '2026-03-03 10:00:00 [System] [] You healed yourself 30.0 points',
      '2026-03-03 10:00:01 [System] [] Received Effect Over Time: Heal',
      '2026-03-03 10:00:02 [System] [] You healed yourself 5.0 points',
      '2026-03-03 10:00:03 [System] [] You healed yourself 1.0 points',
    ].join('\n');

    const result = classifyFapHealingFromLogLines(
      content,
      undefined,
      vivoProfile.windowDurationMs,
      vivoProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(3);
    expect(result.healingEvents[0]).toMatchObject({ amount: 30, isDirectUse: true }); // Direct Use #1
    expect(result.healingEvents[1]).toMatchObject({ amount: 5, isDirectUse: true }); // Direct Use #2 (First heal after EOT)
    expect(result.healingEvents[2]).toMatchObject({ amount: 1, isDirectUse: false }); // Tick
  });

  it('does refresh Vivo S10 HoT window when a Direct Use occurs inside', () => {
    const vivoProfile = getHealToolProfile('Vivo S10');
    const initial = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:00 [System] [] You healed yourself 30.0 points',
        '2026-03-03 10:00:01 [System] [] Received Effect Over Time: Heal',
        '2026-03-03 10:00:02 [System] [] You healed yourself 30.0 points',
      ].join('\n'),
      undefined,
      vivoProfile.windowDurationMs,
      vivoProfile.hotMode
    );

    const refreshed = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:07 [System] [] You healed yourself 22.0 points',
        '2026-03-03 10:00:11 [System] [] You healed yourself 4.0 points',
        '2026-03-03 10:00:13 [System] [] You healed yourself 8.0 points',
      ].join('\n'),
      initial.nextState,
      vivoProfile.windowDurationMs,
      vivoProfile.hotMode
    );

    expect(refreshed.healingEvents).toHaveLength(3);
    // 22.0 is > 30% of 30.0, so it's considered an active heal! This refreshes the timer to 10:00:17
    expect(refreshed.healingEvents[0]).toMatchObject({ amount: 22, isDirectUse: true });
    // Wait, 4.0 is < 30% of 22.0 (which is 6.6), so it's a TICK.
    expect(refreshed.healingEvents[1]).toMatchObject({ amount: 4, isDirectUse: false });

    // Because 22.0 was a direct use, the window was extended to 10:00:17.
    // So 10:00:13 is a TICK again! 8.0 is > 30% of 22 (6.6), so actually 8.0 is a direct use!
    expect(refreshed.healingEvents[2]).toMatchObject({ amount: 8, isDirectUse: true });
  });

  it('resets Vivo S10 HoT duration when a new EoT marker appears', () => {
    const vivoProfile = getHealToolProfile('Vivo S10');
    const result = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:00 [System] [] Received Effect Over Time: Heal',
        '2026-03-03 10:00:01 [System] [] You healed yourself 30.0 points',
        '2026-03-03 10:00:09 [System] [] You healed yourself 2.0 points',
        '2026-03-03 10:00:10 [System] [] Received Effect Over Time: Heal',
        '2026-03-03 10:00:11 [System] [] You healed yourself 25.0 points',
        '2026-03-03 10:00:20 [System] [] You healed yourself 2.0 points',
        '2026-03-03 10:00:22 [System] [] You healed yourself 2.0 points',
      ].join('\n'),
      undefined,
      vivoProfile.windowDurationMs,
      vivoProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(5);
    expect(result.healingEvents[0]).toMatchObject({ amount: 30, isDirectUse: true }); // First after EoT = only activation cost
    expect(result.healingEvents[1]).toMatchObject({ amount: 2, isDirectUse: false }); // Within 10s window from 10:00:01
    expect(result.healingEvents[2]).toMatchObject({ amount: 25, isDirectUse: true }); // Second EOT + heal
    expect(result.healingEvents[3]).toMatchObject({ amount: 2, isDirectUse: false }); // Within 10s window from 10:00:11
    expect(result.healingEvents[4]).toMatchObject({ amount: 2, isDirectUse: false }); // Still within 10s window from 10:00:11 (10:00:11 + 10s = 10:00:21, grace makes it 10:00:22)
  });

  it('classifies real Vivo S10 session with 10s HoT window', () => {
    const vivoProfile = getHealToolProfile('Vivo S10');
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

    const result = classifyFapHealingFromLogLines(
      realLog,
      undefined,
      vivoProfile.windowDurationMs,
      vivoProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(13);
    expect(result.healingEvents[0]).toMatchObject({ amount: 13.1, isDirectUse: true }); // Direct Use base
    expect(result.healingEvents[1]).toMatchObject({ amount: 0.3, isDirectUse: false }); // Tick
    expect(result.healingEvents[2]).toMatchObject({ amount: 12.3, isDirectUse: true }); // > 30% of 13.1, Direct Use! Refreshes timer.
    expect(result.healingEvents[3]).toMatchObject({ amount: 1.0, isDirectUse: false }); // Tick
    expect(result.healingEvents[4]).toMatchObject({ amount: 14.7, isDirectUse: true }); // > 30% of 12.3, Direct Use! Refreshes timer.
    expect(result.healingEvents[5]).toMatchObject({ amount: 1.4, isDirectUse: false }); // Tick
    expect(result.healingEvents[6]).toMatchObject({ amount: 1.4, isDirectUse: false }); // Tick
    expect(result.healingEvents[7]).toMatchObject({ amount: 15.0, isDirectUse: true }); // > 30% of 14.7, Direct Use! Refreshes timer.
    expect(result.healingEvents[8]).toMatchObject({ amount: 1.5, isDirectUse: false }); // Tick

    // Active heal at 20:13:46 refreshed window to 20:13:56.
    expect(result.healingEvents[9]).toMatchObject({ amount: 1.5, isDirectUse: false }); // Tick
    expect(result.healingEvents[10]).toMatchObject({ amount: 1.5, isDirectUse: false }); // Tick
    expect(result.healingEvents[11]).toMatchObject({ amount: 1.5, isDirectUse: false }); // Tick
    expect(result.healingEvents[12]).toMatchObject({ amount: 1.5, isDirectUse: false }); // Tick
  });

  it('uses 30s HoT window for restoration chip (always HoT)', () => {
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
    expect(result.healingEvents[2]).toMatchObject({ amount: 2, isDirectUse: false });
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

  it('restoration chip with EoT marker classifies first heal as direct, rest as ticks', () => {
    const restorationProfile = getHealToolProfile('Restoration Chip IV');

    const result = classifyFapHealingFromLogLines(
      [
        '2026-03-07 20:38:54 [System] [] Received Effect Over Time: Heal',
        '2026-03-07 20:38:54 [System] [] You healed yourself 3.0 points',
        '2026-03-07 20:38:55 [System] [] You healed yourself 2.7 points',
        '2026-03-07 20:38:56 [System] [] You healed yourself 3.5 points',
        '2026-03-07 20:38:57 [System] [] You healed yourself 3.6 points',
        '2026-03-07 20:39:25 [System] [] You healed yourself 3.0 points',
      ].join('\n'),
      undefined,
      restorationProfile.windowDurationMs,
      restorationProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(5);
    expect(result.healingEvents[0]).toMatchObject({ amount: 3.0, isDirectUse: true }); // First after EoT = only activation cost
    expect(result.healingEvents[1]).toMatchObject({ amount: 2.7, isDirectUse: false }); // Tick (no decay)
    expect(result.healingEvents[2]).toMatchObject({ amount: 3.5, isDirectUse: false }); // Tick (no decay)
    expect(result.healingEvents[3]).toMatchObject({ amount: 3.6, isDirectUse: false }); // Tick (no decay)
    expect(result.healingEvents[4]).toMatchObject({ amount: 3.0, isDirectUse: false }); // No new EoT marker => no new activation cost
  });

  it('classifies dense restoration-chip HoT sequence as one direct use and remaining ticks', () => {
    const restorationProfile = getHealToolProfile('Restoration Chip IV');

    const result = classifyFapHealingFromLogLines(
      [
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
      undefined,
      restorationProfile.windowDurationMs,
      restorationProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(14);
    expect(result.healingEvents[0]).toMatchObject({ amount: 3.0, isDirectUse: true });
    for (let i = 1; i < result.healingEvents.length; i++) {
      expect(result.healingEvents[i].isDirectUse).toBe(false);
    }
  });

  it('classifies massive ticks for Refurbished HEART as passive HoT ticks', () => {
    const heartProfile = getHealToolProfile('Refurbished H.E.A.R.T. Rank VIII');
    // Rank 8 minimum (31.5) -> HPS bonus: 6.00 × 2 sec = 12.00 pts + HoT from direct: 31.5 × 150% = 47.25 pts.
    // Ticks over 5 seconds: 6.0, 6.0, 15.75, 15.75, 15.75

    const result = classifyFapHealingFromLogLines(
      [
        '2026-03-03 10:00:00 [System] [] Received Effect Over Time: Heal',
        '2026-03-03 10:00:00 [System] [] You healed yourself 31.5 points',
        '2026-03-03 10:00:01 [System] [] You healed yourself 6.0 points',
        '2026-03-03 10:00:02 [System] [] You healed yourself 6.0 points',
        '2026-03-03 10:00:03 [System] [] You healed yourself 15.75 points',
        '2026-03-03 10:00:04 [System] [] You healed yourself 15.75 points',
        '2026-03-03 10:00:05 [System] [] You healed yourself 15.75 points',
      ].join('\n'),
      undefined,
      heartProfile.windowDurationMs,
      heartProfile.hotMode
    );

    expect(result.healingEvents).toHaveLength(6);
    expect(result.healingEvents[0]).toMatchObject({ amount: 31.5, isDirectUse: false }); // First heal after EOT marker is direct
    // All subsequent ticks inside the 5 second window should be passive, EVEN THOUGH they are > 20% of base heal
    expect(result.healingEvents[1]).toMatchObject({ amount: 6.0, isDirectUse: false });
    expect(result.healingEvents[2]).toMatchObject({ amount: 6.0, isDirectUse: false });
    expect(result.healingEvents[3]).toMatchObject({ amount: 15.75, isDirectUse: false });
    expect(result.healingEvents[4]).toMatchObject({ amount: 15.75, isDirectUse: false });
    expect(result.healingEvents[5]).toMatchObject({ amount: 15.75, isDirectUse: false });
  });
});
