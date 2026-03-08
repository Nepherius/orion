import { classifyFapHealingFromLogLines, getHealToolProfile } from './src/utils/fapHotClassifier';

const heartProfile = getHealToolProfile('Refurbished H.E.A.R.T. Rank VIII');
console.log('Profile:', heartProfile);

const result = classifyFapHealingFromLogLines(
  [
    '2026-03-03 10:00:00 [System] [] Received Effect Over Time: Heal',
    '2026-03-03 10:00:00 [System] [] You healed yourself 31.5 points',
  ].join('\n'),
  undefined,
  heartProfile.windowDurationMs,
  heartProfile.hotMode
);

console.log('Result:', JSON.stringify(result.healingEvents, null, 2));
