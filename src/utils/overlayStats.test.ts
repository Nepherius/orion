import { describe, expect, it } from 'vitest';
import {
  defaultOverlayStatIds,
  normalizeOverlayStatIds,
  overlayProfiles,
  overlayStatDefinitions,
} from './overlayStats';

describe('overlayStats', () => {
  it('falls back to default overlay stats when none are configured', () => {
    expect(normalizeOverlayStatIds()).toEqual(defaultOverlayStatIds);
    expect(normalizeOverlayStatIds([])).toEqual(defaultOverlayStatIds);
  });

  it('keeps configured stats in order while dropping duplicates', () => {
    expect(normalizeOverlayStatIds(['kills', 'time', 'kills', 'ttReturn'])).toEqual([
      'kills',
      'time',
      'ttReturn',
    ]);
  });

  it('has a definition for every default stat', () => {
    const defined = new Set(overlayStatDefinitions.map((stat) => stat.id));

    expect(defaultOverlayStatIds.every((id) => defined.has(id))).toBe(true);
  });

  it('has a definition for every profile stat', () => {
    const defined = new Set(overlayStatDefinitions.map((stat) => stat.id));

    for (const profile of overlayProfiles) {
      for (const id of profile.statIds) {
        expect(defined.has(id)).toBe(true);
      }
    }
  });
});
