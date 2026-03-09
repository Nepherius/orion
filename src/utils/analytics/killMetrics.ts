import { HuntSession } from '../../types';

/**
 * Calculate statistics from tracked kills
 */
export function calculateKillStats(sessions: HuntSession[]): Record<
  string,
  {
    totalKills: number;
    totalProfit: number;
    totalCost: number;
    totalLoot: number;
    averageProfitPerKill: number;
    averageCostPerKill: number;
    averageLootPerKill: number;
    averageHPDealt: number;
    maturities: Record<string, number>; // maturity -> count
  }
> {
  const stats: Record<
    string,
    {
      totalKills: number;
      totalProfit: number;
      totalCost: number;
      totalLoot: number;
      averageProfitPerKill: number;
      averageCostPerKill: number;
      averageLootPerKill: number;
      averageHPDealt: number;
      maturities: Record<string, number>;
    }
  > = {};
  const hpSamples: Record<string, number> = {};

  const ensureCreatureStats = (creatureName: string) => {
    if (!stats[creatureName]) {
      stats[creatureName] = {
        totalKills: 0,
        totalProfit: 0,
        totalCost: 0,
        totalLoot: 0,
        averageProfitPerKill: 0,
        averageCostPerKill: 0,
        averageLootPerKill: 0,
        averageHPDealt: 0,
        maturities: {},
      };
      hpSamples[creatureName] = 0;
    }
  };

  for (const session of sessions) {
    const trackedKills = session.kills || [];

    for (const kill of trackedKills) {
      const creatureName = kill.creatureName || 'Unknown';
      ensureCreatureStats(creatureName);

      stats[creatureName].totalKills += 1;
      stats[creatureName].totalCost += kill.cost;
      stats[creatureName].totalLoot += kill.lootValue;
      stats[creatureName].totalProfit += kill.lootValue - kill.cost;
      stats[creatureName].averageHPDealt += kill.hpDealt;
      hpSamples[creatureName] += 1;

      if (kill.maturity) {
        const sanitizedMaturity = kill.maturity || 'Unknown';
        stats[creatureName].maturities[sanitizedMaturity] =
          (stats[creatureName].maturities[sanitizedMaturity] || 0) + 1;
      }
    }
  }

  // Calculate averages
  for (const creatureName in stats) {
    const data = stats[creatureName];
    if (data.totalKills > 0) {
      data.averageProfitPerKill = data.totalProfit / data.totalKills;
      data.averageCostPerKill = data.totalCost / data.totalKills;
      data.averageLootPerKill = data.totalLoot / data.totalKills;
      data.averageHPDealt =
        hpSamples[creatureName] > 0 ? data.averageHPDealt / hpSamples[creatureName] : 0;
    }
  }

  return stats;
}

/**
 * Calculate maturity distribution for kills
 */
export function calculateMaturityDistribution(
  sessions: HuntSession[]
): Record<string, { creature: string; maturity: string; kills: number }[]> {
  const distribution: Record<string, { creature: string; maturity: string; kills: number }[]> = {};

  const addToDistribution = (creatureName: string, maturityName: string, count: number) => {
    if (count <= 0) return;
    if (!distribution[creatureName]) {
      distribution[creatureName] = [];
    }

    const existing = distribution[creatureName].find((m) => m.maturity === maturityName);
    if (existing) {
      existing.kills += count;
    } else {
      distribution[creatureName].push({
        creature: creatureName,
        maturity: maturityName,
        kills: count,
      });
    }
  };

  for (const session of sessions) {
    const trackedKills = session.kills || [];
    for (const kill of trackedKills) {
      const creatureName = kill.creatureName || 'Unknown';
      const maturityName = kill.maturity || 'Unknown';
      addToDistribution(creatureName, maturityName, 1);
    }
  }

  // Sort by kills descending
  for (const creature in distribution) {
    distribution[creature].sort((a, b) => b.kills - a.kills);
  }

  return distribution;
}
