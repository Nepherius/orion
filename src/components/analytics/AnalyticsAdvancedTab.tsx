import { AdvancedAnalyticsSection } from '../views/analytics/AdvancedAnalyticsSection';
import { CorrelationAnalytics } from './CorrelationAnalytics';
import { StatisticalInsights } from './StatisticalInsights';
import type { HuntSession } from '../../types';

export interface AnalyticsAdvancedTabProps {
  sessionWinRate: number;
  profitableStreaks: { currentStreak: number; longestStreak: number };
  bestWeapon: {
    weapon: string;
    returnRate: number;
    totalLoot: number;
    totalCost: number;
    avgDamage: number;
  } | null;
  bestLocation: { location: string; sessions: number; returnRate: number; profit: number } | null;
  bestLoadout: {
    name: string;
    sessions: number;
    returnRate: number;
    profit: number;
    avgKills: number;
  } | null;
  temporalInsights: {
    avgSessionHours: number;
    bestHourLabel: string;
    bestHourReturnRate: number;
    avgGapHours: number;
  };
  creatureAnalysis: {
    creature: string;
    count: number;
    returnRate: number;
    profit: number;
    totalKills: number;
    totalGlobals: number;
    totalLoot: number;
    totalCost: number;
  }[];
  filteredSessions: HuntSession[];
  skillsByLocation: { location: string; skillGains: number }[];
  skillsByWeapon: { weapon: string; skillGains: number }[];
  lifetimeAttributeGains: Record<string, { gains: number; count: number }>;
  allSkillNames: string[];
  skillGainVariance: number;
  skillValuePerCost: number;
  totalSkillGains: number;
  projectedLifetimeProfit: number;
  sessionsToBreakEven: number | null;
}

export function AnalyticsAdvancedTab(props: AnalyticsAdvancedTabProps) {
  return (
    <div className="space-y-6">
      <AdvancedAnalyticsSection
        sessionWinRate={props.sessionWinRate}
        profitableStreaks={props.profitableStreaks}
        bestWeapon={props.bestWeapon}
        bestLocation={props.bestLocation}
        bestLoadout={props.bestLoadout}
        temporalInsights={props.temporalInsights}
        creatureAnalysis={props.creatureAnalysis}
        filteredSessions={props.filteredSessions}
        skillsByLocation={props.skillsByLocation}
        skillsByWeapon={props.skillsByWeapon}
        lifetimeAttributeGains={props.lifetimeAttributeGains}
        allSkillNames={props.allSkillNames}
        skillGainVariance={props.skillGainVariance}
        skillValuePerCost={props.skillValuePerCost}
        totalSkillGains={props.totalSkillGains}
        projectedLifetimeProfit={props.projectedLifetimeProfit}
        sessionsToBreakEven={props.sessionsToBreakEven}
      />

      <CorrelationAnalytics filteredSessions={props.filteredSessions} />

      <StatisticalInsights filteredSessions={props.filteredSessions} />
    </div>
  );
}

export default AnalyticsAdvancedTab;
