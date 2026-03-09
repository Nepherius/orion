import { lazy, Suspense } from 'react';

const LootQualityPanel = lazy(() => import('./panels/LootQualityPanel'));
const GlobalAnalysisPanel = lazy(() => import('./panels/GlobalAnalysisPanel'));
const TopLootItemsPanel = lazy(() => import('./panels/TopLootItemsPanel'));
const TopGlobalsPanel = lazy(() => import('./panels/TopGlobalsPanel'));
const LootDistributionPanel = lazy(() => import('./panels/LootDistributionPanel'));

const panelFallback = (
  <div className="h-32 flex items-center justify-center text-muted">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
  </div>
);

export function AnalyticsLootTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Loot Performance</h2>
        <span className="text-sm text-muted">Value quality, globals, and item distribution</span>
      </div>
      <Suspense fallback={panelFallback}>
        <LootQualityPanel />
        <GlobalAnalysisPanel />
        <TopLootItemsPanel />
        <LootDistributionPanel />
        <TopGlobalsPanel />
      </Suspense>
    </div>
  );
}

export default AnalyticsLootTab;
