import { lazy, Suspense } from 'react';

const SessionReliabilityPanel = lazy(() => import('./panels/SessionReliabilityPanel'));
const ComparativeAnalyticsPanel = lazy(() => import('./panels/ComparativeAnalyticsPanel'));
const TemporalAnalyticsPanel = lazy(() => import('./panels/TemporalAnalyticsPanel'));
const TimeAnalysisPanel = lazy(() => import('./panels/TimeAnalysisPanel'));
const SkillEfficiencyPanel = lazy(() => import('./panels/SkillEfficiencyPanel'));
const TimeToVariancePanel = lazy(() => import('./panels/TimeToVariancePanel'));
const MarkupDependencyPanel = lazy(() => import('./panels/MarkupDependencyPanel'));

const panelFallback = (
  <div className="h-32 flex items-center justify-center text-muted">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
  </div>
);

export function AnalyticsSessionsTab() {
  return (
    <div className="space-y-6">
      <Suspense fallback={panelFallback}>
        <SessionReliabilityPanel />
        <ComparativeAnalyticsPanel />
        <TemporalAnalyticsPanel />
        <TimeAnalysisPanel />
        <TimeToVariancePanel />
        <MarkupDependencyPanel />
        <SkillEfficiencyPanel />
      </Suspense>
    </div>
  );
}

export default AnalyticsSessionsTab;
