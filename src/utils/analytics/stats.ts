import { jStat } from 'jstat';

/**
 * Calculate standard deviation of an array of numbers
 */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate variance of an array of numbers
 */
export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate the Confidence Interval for the mean of an array of numbers.
 * @param values Array of numerical values
 * @param confidenceLevel Typically 0.95 for a 95% confidence interval
 * @returns [lowerBound, upperBound] of the mean
 */
export function calculateConfidenceInterval(
  values: number[],
  confidenceLevel = 0.95
): [number, number] {
  if (values.length < 2) return [0, 0];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  // Use sample standard deviation (N-1)
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  const sampleVariance = squareDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  const sampleStdDev = Math.sqrt(sampleVariance);

  const df = values.length - 1;
  const alpha = 1 - confidenceLevel;
  // critical t-value for two-tailed
  const t = Math.abs(jStat.studentt.inv(alpha / 2, df));

  const marginOfError = t * (sampleStdDev / Math.sqrt(values.length));

  return [mean - marginOfError, mean + marginOfError];
}

/**
 * Calculate the Coefficient of Variation (%) of an array of numbers.
 * Represents the ratio of the standard deviation to the mean.
 * High CV => high volatility. Low CV => high consistency.
 */
export function calculateCoefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0; // Avoid division by zero

  const stdDev = calculateStdDev(values);
  return (stdDev / Math.abs(mean)) * 100;
}
