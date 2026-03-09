import { lazy, Suspense } from 'react';
import PerformanceTrendPanel from './panels/PerformanceTrendPanel';
import TopSkillsPanel from './panels/TopSkillsPanel';

const LifetimeStatsPanel = lazy(() => import('./panels/LifetimeStatsPanel'));
const SecondaryStatsPanel = lazy(() => import('./panels/SecondaryStatsPanel'));
const SituationSummaryPanel = lazy(() => import('./panels/SituationSummaryPanel'));

const panelFallback = (
  <div className="h-32 flex items-center justify-center text-muted">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
  </div>
);

export function AnalyticsOverviewTab() {
  return (
    <div className="space-y-6">
      <Suspense fallback={panelFallback}>
        <LifetimeStatsPanel />
        <SecondaryStatsPanel />
        <SituationSummaryPanel />
        <PerformanceTrendPanel />
        <TopSkillsPanel />
      </Suspense>
    </div>
  );
}

export default AnalyticsOverviewTab;
