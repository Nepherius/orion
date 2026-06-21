import { BarChart3 } from 'lucide-react';
import { useHuntStore } from '../../store';
import { Panel } from '../common/Panel';

interface AnalyticsEmptyStateProps {
  title: string;
  message: string;
  tooltip?: string;
}

export function AnalyticsEmptyState({ title, message, tooltip }: AnalyticsEmptyStateProps) {
  const isLoading = useHuntStore((state) => state.analyticsData.isLoading);
  const analyticsError = useHuntStore((state) => state.analyticsData.error);

  return (
    <Panel title={title} tooltip={tooltip} contentClassName="py-8 text-center text-muted">
      {isLoading ? (
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500 opacity-70" />
      ) : (
        <BarChart3 className="mx-auto mb-3 h-8 w-8 opacity-40" />
      )}
      <p className="text-sm">
        {isLoading
          ? 'Loading analytics…'
          : analyticsError
            ? 'This analytics data could not be loaded. Try changing filters or reopening Analytics.'
            : message}
      </p>
    </Panel>
  );
}
