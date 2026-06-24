import { useMemo, useState, lazy, Suspense, useEffect } from 'react';
import { TagInput } from '../common/TagInput';
import { useHuntStore } from '../../store';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { BarChart3, AlertCircle, Trash2 } from 'lucide-react';
import { Panel } from '../common/Panel';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  analyzeSessionDataQuality,
  getCompletedSessionsWithCostOrLootAndNoDuration,
} from '../../utils/dataQuality';
import { AnalyticsMetricNotes } from '../analytics/AnalyticsMetricNotes';

const AnalyticsOverviewTab = lazy(() => import('../analytics/AnalyticsOverviewTab'));
const AnalyticsSessionsTab = lazy(() => import('../analytics/AnalyticsSessionsTab'));
const AnalyticsEquipmentTab = lazy(() => import('../analytics/AnalyticsEquipmentTab'));
const AnalyticsLootTab = lazy(() => import('../analytics/AnalyticsLootTab'));
const AnalyticsCreaturesTab = lazy(() => import('../analytics/AnalyticsCreaturesTab'));
const AnalyticsProjectionsTab = lazy(() => import('../analytics/ProjectionsTab'));

export function Analytics() {
  const sessions = useHuntStore((state) => state.sessions);
  const deleteSessions = useHuntStore((state) => state.deleteSessions);
  const isPageVisible = usePageVisibility();
  const lifetimeStats = useHuntStore((state) => state.analyticsLifetimeStats);
  const fetchAnalyticsData = useHuntStore((state) => state.fetchAnalyticsData);
  const fetchLifetimeStats = useHuntStore((state) => state.fetchLifetimeStats);
  const setAnalyticsTimeRange = useHuntStore((state) => state.setAnalyticsTimeRange);
  const tagFilter = useHuntStore((state) => state.analyticsSelectedTags);
  const setTagFilter = useHuntStore((state) => state.setAnalyticsSelectedTags);
  // Gather all unique tags from sessions for suggestions
  const tagSuggestions = useMemo(
    () => Array.from(new Set(sessions.flatMap((s) => s.tags || []))).sort(),
    [sessions]
  );
  const dataQualityIssues = useMemo(() => analyzeSessionDataQuality(sessions), [sessions]);
  const noDurationSessions = useMemo(
    () => getCompletedSessionsWithCostOrLootAndNoDuration(sessions),
    [sessions]
  );
  const noDurationSessionCount = noDurationSessions.length;

  const [timeRange, setTimeRange] = useState<
    '24h' | '7d' | '1m' | '3m' | '1y' | 'lifetime' | 'custom'
  >('lifetime');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sessions' | 'equipment' | 'loot' | 'creatures' | 'projections'
  >('overview');
  const [showDeleteNoDurationConfirm, setShowDeleteNoDurationConfirm] = useState(false);

  const statsRange = useMemo(() => {
    if (timeRange === 'lifetime') {
      return { start_time: null as number | null, end_time: null as number | null };
    }

    const now = Date.now();
    let startTime = 0;

    switch (timeRange) {
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '1m':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '3m':
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case '1y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case 'custom':
        return {
          start_time: customStartDate ? new Date(customStartDate).getTime() : 0,
          end_time: customEndDate ? new Date(customEndDate).getTime() + 86399999 : now,
        };
    }

    return { start_time: startTime, end_time: now };
  }, [timeRange, customStartDate, customEndDate]);

  // Sync time range to Zustand store so all panels can filter independently
  useEffect(() => {
    setAnalyticsTimeRange(statsRange.start_time, statsRange.end_time);
  }, [statsRange.start_time, statsRange.end_time, setAnalyticsTimeRange]);

  // Fetch analytics data and lifetime stats when time range changes
  useEffect(() => {
    fetchAnalyticsData(statsRange.start_time, statsRange.end_time, tagFilter);
    fetchLifetimeStats(statsRange.start_time, statsRange.end_time, tagFilter);
  }, [
    statsRange.start_time,
    statsRange.end_time,
    tagFilter,
    fetchAnalyticsData,
    fetchLifetimeStats,
  ]);

  const handleDeleteNoDurationSessions = async () => {
    const sessionIds = noDurationSessions.map((session) => session.id);
    if (sessionIds.length === 0) return;

    await deleteSessions(sessionIds);
    setShowDeleteNoDurationConfirm(false);
    await Promise.all([
      fetchAnalyticsData(statsRange.start_time, statsRange.end_time, tagFilter),
      fetchLifetimeStats(statsRange.start_time, statsRange.end_time, tagFilter),
    ]);
  };

  if (!isPageVisible) {
    return (
      <Panel contentClassName="py-4 text-center text-muted">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>Analytics is paused while the app is in the background.</p>
      </Panel>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-6">
        <Panel contentClassName="py-4 text-center text-muted">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No session data available. Complete some hunting sessions to see analytics.</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(
                e.target.value as '24h' | '7d' | '1m' | '3m' | '1y' | 'lifetime' | 'custom'
              )
            }
            className="input bg-surface-active border-border text-sm py-1.5"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="1m">Last 30 Days</option>
            <option value="3m">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="lifetime">Lifetime</option>
            <option value="custom">Custom Range</option>
          </select>
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input bg-surface-active border-border text-sm py-1.5"
              />
              <span className="text-muted">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input bg-surface-active border-border text-sm py-1.5"
              />
            </div>
          )}
          <div className="min-w-[220px] max-w-xs">
            <TagInput
              label="Filter by tags"
              value={tagFilter}
              onChange={setTagFilter}
              suggestions={tagSuggestions}
              maxTags={5}
              allowNewTags={false}
              placeholder="Select tags..."
            />
          </div>
        </div>
        <div className="text-sm text-muted">
          Across {lifetimeStats.totalSessions} session
          {lifetimeStats.totalSessions !== 1 ? 's' : ''}
        </div>
      </div>

      {dataQualityIssues.length > 0 && (
        <Panel title="Data Quality" className="border-yellow-700 bg-yellow-950/20">
          <div className="space-y-2 text-sm text-yellow-100/90">
            {dataQualityIssues.map((issue) => {
              const canDeleteNoDurationSessions =
                issue.code === 'completed-no-duration' && noDurationSessionCount > 0;

              return (
                <div
                  key={issue.code}
                  className="flex flex-col gap-2 rounded-lg border border-yellow-700/40 bg-yellow-950/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    {issue.count} {issue.message}.
                  </span>
                  {canDeleteNoDurationSessions && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteNoDurationConfirm(true)}
                      className="btn-danger inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete {issue.count}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <ConfirmModal
        isOpen={showDeleteNoDurationConfirm}
        onClose={() => setShowDeleteNoDurationConfirm(false)}
        onConfirm={() => void handleDeleteNoDurationSessions()}
        variant="danger"
        title="Delete zero-duration sessions?"
        message={`Delete ${noDurationSessionCount} completed session${noDurationSessionCount === 1 ? '' : 's'} with cost or loot but no duration?`}
        detail="This permanently removes each matching session and its linked loot, kills, skills, combat, healing, and global records. Sessions without cost/loot are not included."
        confirmText={`Delete ${noDurationSessionCount} Session${noDurationSessionCount === 1 ? '' : 's'}`}
        cancelText="Cancel"
      />

      <AnalyticsMetricNotes />

      {/* Tab Navigation */}
      <div className="flex border-b border-border overflow-x-auto pb-1 no-scrollbar">
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-muted hover:text-body'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'sessions'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-muted hover:text-body'
          }`}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'equipment'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-muted hover:text-body'
          }`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'loot'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-muted hover:text-body'
          }`}
          onClick={() => setActiveTab('loot')}
        >
          Loot
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'creatures'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-muted hover:text-body'
          }`}
          onClick={() => setActiveTab('creatures')}
        >
          Creatures
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'projections'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-muted hover:text-body'
          }`}
          onClick={() => setActiveTab('projections')}
        >
          Projections & Predictions
        </button>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        }
      >
        {activeTab === 'overview' && <AnalyticsOverviewTab />}

        {activeTab === 'sessions' && <AnalyticsSessionsTab />}

        {activeTab === 'equipment' && <AnalyticsEquipmentTab />}

        {activeTab === 'loot' && <AnalyticsLootTab />}

        {activeTab === 'creatures' && <AnalyticsCreaturesTab />}

        {activeTab === 'projections' && <AnalyticsProjectionsTab />}
      </Suspense>
    </div>
  );
}
