import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { DataTable, DataTableColumn } from '../../common/DataTable';
import { Panel } from '../../common/Panel';
import { CreatureAnalytics } from '../CreatureAnalytics';
import { KillTrackingAnalytics } from '../KillTrackingAnalytics';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

export default function CreatureAnalysisPanel() {
  const creatureAnalysis = useHuntStore((state) => state.analyticsData.advanced?.creatureAnalysis);
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (s.tags || []).includes(t)))
        return false;
      return true;
    });
  }, [sessions, timeRange.startTime, timeRange.endTime, selectedTags]);

  const creatureColumns: Array<DataTableColumn<NonNullable<typeof creatureAnalysis>[number]>> = [
    {
      key: 'creature',
      header: 'Creature',
      render: (creature) => (
        <span className="block truncate font-semibold">{creature.creature}</span>
      ),
    },
    { key: 'sessions', header: 'Sessions', align: 'right', render: (creature) => creature.count },
    {
      key: 'returnRate',
      header: 'Return %',
      align: 'right',
      render: (creature) => (
        <span className={creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}>
          {creature.returnRate.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (creature) => (
        <span className={creature.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
          {creature.profit >= 0 ? '+' : ''}
          {creature.profit.toFixed(2)}
        </span>
      ),
    },
    { key: 'kills', header: 'Kills', align: 'right', render: (creature) => creature.totalKills },
    {
      key: 'globals',
      header: 'Globals',
      align: 'right',
      render: (creature) => <span className="text-yellow-400">{creature.totalGlobals}</span>,
    },
  ];

  return (
    <>
      {/* Creature Analysis Table */}
      {creatureAnalysis && creatureAnalysis.length > 0 ? (
        <Panel title="Creature Analysis" tooltip="Profitability and frequency by creature type">
          <DataTable
            columns={creatureColumns}
            rows={creatureAnalysis}
            getRowKey={(creature) => creature.creature}
            maxHeightClassName="max-h-80 overflow-y-auto"
          />
        </Panel>
      ) : (
        <AnalyticsEmptyState
          title="Creature Analysis"
          message="Add creatures to completed sessions to compare their profitability."
        />
      )}

      {/* Kill Tracking Analytics */}
      {filteredSessions.length > 0 && <KillTrackingAnalytics sessions={filteredSessions} />}

      {/* Detailed Creature Analytics */}
      {filteredSessions.length > 0 && <CreatureAnalytics sessions={filteredSessions} />}
    </>
  );
}
