import { lazy, Suspense } from 'react';
import PerformanceTrendPanel from './panels/PerformanceTrendPanel';
import TopSkillsPanel from './panels/TopSkillsPanel';
import ContributionCalendarPanel from './panels/ContributionCalendarPanel';
import SessionReliabilityPanel from './panels/SessionReliabilityPanel';
import { useHuntStore } from '../../store';
import { AlertCircle } from 'lucide-react';

// Lazy-load heavy panels for performance
const LifetimeStatsPanel = lazy(() => import('./panels/LifetimeStatsPanel'));
const SecondaryStatsPanel = lazy(() => import('./panels/SecondaryStatsPanel'));
const SituationSummaryPanel = lazy(() => import('./panels/SituationSummaryPanel'));

// Fallback spinner for lazy panels
const panelFallback = (
  <div className="panel flex h-32 items-center justify-center text-muted">
    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary-500"></div>
  </div>
);

/**
 * Main analytics overview tab, showing all summary panels
 */
export function AnalyticsOverviewTab() {
  const analyticsError = useHuntStore((state) => state.analyticsData.error);

  return (
    <div className="space-y-6">
      {analyticsError && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Analytics data unavailable</div>
            <div className="mt-1 text-yellow-100/80">{analyticsError}</div>
          </div>
        </div>
      )}
      <Suspense fallback={panelFallback}>
        <LifetimeStatsPanel />
        <SecondaryStatsPanel />
        <SessionReliabilityPanel />
        <ContributionCalendarPanel />
        <SituationSummaryPanel />
        <PerformanceTrendPanel />
        <TopSkillsPanel />
      </Suspense>
    </div>
  );
}

export default AnalyticsOverviewTab;
