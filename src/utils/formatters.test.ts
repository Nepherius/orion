import { describe, expect, it } from 'vitest';
import {
  formatCompactDurationMs,
  formatDurationMinutes,
  formatDurationSeconds,
  formatSmallNumber,
} from './formatters';

describe('formatters', () => {
  it('formats durations consistently', () => {
    expect(formatDurationSeconds(3661)).toBe('1h 1m 1s');
    expect(formatDurationMinutes(3661)).toBe('1h 1m');
    expect(formatCompactDurationMs(3_900_000)).toBe('1h 5m');
  });

  it('formats tiny non-zero values without rounding them to zero', () => {
    expect(formatSmallNumber(0)).toBe('0.00');
    expect(formatSmallNumber(0.004)).toBe('<0.01');
    expect(formatSmallNumber(-0.004)).toBe('-<0.01');
    expect(formatSmallNumber(1.234)).toBe('1.23');
  });
});
