import { lazy, Suspense } from 'react';
import TopSkillsPanel from './panels/TopSkillsPanel';
import SkillsTrackedPanel from './panels/SkillsTracked';

const SessionReliabilityPanel = lazy(() => import('./panels/SessionReliabilityPanel'));
const ComparativeAnalyticsPanel = lazy(() => import('./panels/ComparativeAnalyticsPanel'));
const TemporalAnalyticsPanel = lazy(() => import('./panels/TemporalAnalyticsPanel'));
const TimeAnalysisPanel = lazy(() => import('./panels/TimeAnalysisPanel'));
const HourlyHeatmapPanel = lazy(() => import('./panels/HourlyHeatmapPanel'));
const SessionLengthScatterPanel = lazy(() => import('./panels/SessionLengthScatterPanel'));
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
        <HourlyHeatmapPanel />
        <SessionLengthScatterPanel />
        <TimeToVariancePanel />
        <MarkupDependencyPanel />
        <SkillEfficiencyPanel />
        <TopSkillsPanel />
        <SkillsTrackedPanel />
      </Suspense>
    </div>
  );
}

export default AnalyticsSessionsTab;
