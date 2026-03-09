import { jStat } from 'jstat';

export function calculatePearsonCorrelation(x: number[], y: number[]): { r: number; p: number } {
  if (x.length !== y.length || x.length < 3) return { r: 0, p: 1 };

  const xMean = jStat.mean(x);
  const yMean = jStat.mean(y);

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    num += xDiff * yDiff;
    denX += xDiff * xDiff;
    denY += yDiff * yDiff;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return { r: 0, p: 1 };

  const r = num / den;
  const df = x.length - 2;
  const t = r * Math.sqrt(df / (1 - r * r + 1e-10));

  // 2-tailed p-value
  const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
  return { r, p };
}

export function calculateMultipleCorrelation(
  duration: number[],
  cost: number[],
  loot: number[]
): { rSquared: number; p: number } {
  if (duration.length < 4) return { rSquared: 0, p: 1 };

  // Calculate pairs
  const rxz = calculatePearsonCorrelation(duration, loot).r;
  const ryz = calculatePearsonCorrelation(cost, loot).r;
  const rxy = calculatePearsonCorrelation(duration, cost).r;

  // Multiple correlation coefficient R^2 formula for 2 predictors
  const den = 1 - Math.pow(rxy, 2);
  let rSquared = 0;
  if (den !== 0) {
    rSquared = (Math.pow(rxz, 2) + Math.pow(ryz, 2) - 2 * rxz * ryz * rxy) / den;
  }

  // Bound R2 between 0 and 1
  rSquared = Math.max(0, Math.min(1, rSquared));

  const n = duration.length;
  const k = 2; // Two predictors

  const df1 = k;
  const df2 = n - k - 1;

  let p = 1;
  if (rSquared < 1) {
    const f = rSquared / df1 / ((1 - rSquared) / df2);
    p = 1 - jStat.centralF.cdf(f, df1, df2);
  } else {
    p = 0;
  }

  return { rSquared, p };
}
