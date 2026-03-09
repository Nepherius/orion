import { lazy, Suspense } from 'react';

const LoadoutPerformancePanel = lazy(() => import('./panels/LoadoutPerformancePanel'));
const LocationPerformancePanel = lazy(() => import('./panels/LocationPerformancePanel'));
const CostBreakdownPanel = lazy(() => import('./panels/CostBreakdownPanel'));
const WeaponPerformancePanel = lazy(() => import('./panels/WeaponPerformancePanel'));
const TopSkillsPanel = lazy(() => import('./panels/TopSkillsPanel'));
const ArmorPerformancePanel = lazy(() => import('./panels/ArmorPerformancePanel'));
const HealingPerformancePanel = lazy(() => import('./panels/HealingPerformancePanel'));

const panelFallback = (
  <div className="h-32 flex items-center justify-center text-muted">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
  </div>
);

export function AnalyticsEquipmentTab() {
  return (
    <div className="space-y-6">
      <Suspense fallback={panelFallback}>
        <LoadoutPerformancePanel />
        <div className="grid grid-cols-2 gap-6">
          <LocationPerformancePanel />
          <CostBreakdownPanel />
        </div>
        <WeaponPerformancePanel />
        <TopSkillsPanel />
        <ArmorPerformancePanel />
        <HealingPerformancePanel />
      </Suspense>
    </div>
  );
}

export default AnalyticsEquipmentTab;
