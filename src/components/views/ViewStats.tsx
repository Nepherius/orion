import { useState } from 'react';
import { Dashboard } from './Dashboard';
import { Loot } from '../loot/Loot';

interface ViewStatsProps {
  sessionId: string | null;
  onSessionResumed?: () => void;
  showHeader?: boolean;
  showSidebar?: boolean;
}

type ViewStatsTab = 'metrics' | 'loot';

export function ViewStats({
  sessionId,
  onSessionResumed: _onSessionResumed,
  showHeader = true,
  showSidebar = true,
}: ViewStatsProps) {
  const [activeTab, setActiveTab] = useState<ViewStatsTab>('metrics');

  if (!sessionId) {
    return (
      <div className="card p-8 text-center text-muted">
        <p>Select a session from Sessions to open Overview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        {showHeader && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Overview</h2>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`btn ${activeTab === 'metrics' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('loot')}
            className={`btn ${activeTab === 'loot' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Loot
          </button>
        </div>
      </div>

      {activeTab === 'metrics' ? (
        <Dashboard sessionId={sessionId} showSidebar={showSidebar} />
      ) : (
        <Loot sessionId={sessionId} showSidebar={showSidebar} />
      )}
    </div>
  );
}
