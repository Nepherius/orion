import { lazy, Suspense } from 'react';
import { CorrelationAnalytics } from './CorrelationAnalytics';
import { StatisticalInsights } from './StatisticalInsights';

const GeneralProjectionsPanel = lazy(() => import('./panels/GeneralProjectionsPanel'));
const CreatureProjectionsPanel = lazy(() => import('./panels/CreatureProjectionsPanel'));

const panelFallback = (
  <div className="h-32 flex items-center justify-center text-muted">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
  </div>
);

export function ProjectionsTab() {
  return (
    <div className="space-y-6">
      <Suspense fallback={panelFallback}>
        <GeneralProjectionsPanel />
        <CreatureProjectionsPanel />
      </Suspense>

      <CorrelationAnalytics />
      <StatisticalInsights />
    </div>
  );
}

export default ProjectionsTab;
