import {
  LootPerformanceSection,
  TopLootItem,
  GlobalEntry,
} from '../views/analytics/LootPerformanceSection';
import {
  PerformancePanelsSection,
  RecentSession,
  LoadoutData,
  LocationData,
  CostDatum,
  WeaponData,
  TopSkill,
  ArmorData,
} from '../views/analytics/PerformancePanelsSection';

export interface AnalyticsPerformanceTabProps {
  avgLootValue: number;
  overallLootStdDev: number;
  largestDropValue: number;
  avgMinutesPerLoot: number;
  totalLootEvents: number;
  totalGlobalsCount: number;
  totalHoFsCount: number;
  globalDropRatePerKill: number;
  globalDropRatePerHour: number;
  avgGlobalValue: number;
  bestGlobalValue: number;
  topLootItems: TopLootItem[];
  allGlobals: GlobalEntry[];
  recentSessions: RecentSession[];
  loadoutData: LoadoutData[];
  locationData: LocationData[];
  costData: CostDatum[];
  weaponData: WeaponData[];
  topSkills: TopSkill[];
  armorData: ArmorData[];
}

export function AnalyticsPerformanceTab(props: AnalyticsPerformanceTabProps) {
  return (
    <div className="space-y-6">
      <LootPerformanceSection
        avgLootValue={props.avgLootValue}
        overallLootStdDev={props.overallLootStdDev}
        largestDropValue={props.largestDropValue}
        avgMinutesPerLoot={props.avgMinutesPerLoot}
        totalLootEvents={props.totalLootEvents}
        totalGlobalsCount={props.totalGlobalsCount}
        totalHoFsCount={props.totalHoFsCount}
        globalDropRatePerKill={props.globalDropRatePerKill}
        globalDropRatePerHour={props.globalDropRatePerHour}
        avgGlobalValue={props.avgGlobalValue}
        bestGlobalValue={props.bestGlobalValue}
        topLootItems={props.topLootItems}
        allGlobals={props.allGlobals}
      />

      <PerformancePanelsSection
        recentSessions={props.recentSessions}
        loadoutData={props.loadoutData}
        locationData={props.locationData}
        costData={props.costData}
        weaponData={props.weaponData}
        topSkills={props.topSkills}
        armorData={props.armorData}
      />
    </div>
  );
}

export default AnalyticsPerformanceTab;
