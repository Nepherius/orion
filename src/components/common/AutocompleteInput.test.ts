import { describe, expect, it } from 'vitest';
import { normalizeAutocompleteOptions } from './AutocompleteInput';

describe('normalizeAutocompleteOptions', () => {
  it('keeps valid string options and drops malformed entries', () => {
    expect(normalizeAutocompleteOptions(['Armor', null, undefined, 42, '', 'Medical'])).toEqual([
      'Armor',
      'Medical',
    ]);
  });
});
