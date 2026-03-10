import { lazy, Suspense } from 'react';

const CreatureAnalysisPanel = lazy(() => import('./panels/CreatureAnalysisPanel'));
const MaturityReturnPanel = lazy(() => import('./panels/MaturityReturnPanel'));
const KillEfficiencyScatterPanel = lazy(() => import('./panels/KillEfficiencyScatterPanel'));

const panelFallback = (
  <div className="h-32 flex items-center justify-center text-muted">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
  </div>
);

export function AnalyticsCreaturesTab() {
  return (
    <div className="space-y-6">
      <Suspense fallback={panelFallback}>
        <CreatureAnalysisPanel />
        <MaturityReturnPanel />
        <KillEfficiencyScatterPanel />
      </Suspense>
    </div>
  );
}

export default AnalyticsCreaturesTab;
