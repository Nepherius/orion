import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';
import { CreatureAnalytics } from '../CreatureAnalytics';
import { KillTrackingAnalytics } from '../KillTrackingAnalytics';

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

  return (
    <>
      {/* Creature Analysis Table */}
      {creatureAnalysis && creatureAnalysis.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Creature Analysis</h3>
            <InfoTooltip tooltip="Profitability and frequency by creature type" />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-6 gap-2 text-xs font-bold text-muted pb-2 border-b border-border sticky top-0 bg-surface">
              <div>Creature</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Profit</div>
              <div className="text-right">Kills</div>
              <div className="text-right">Globals</div>
            </div>
            {creatureAnalysis.map((creature) => (
              <div
                key={creature.creature}
                className="grid grid-cols-6 gap-2 text-sm py-2 hover:bg-surface-hover"
              >
                <div className="font-semibold truncate">{creature.creature}</div>
                <div className="text-right text-muted">{creature.count}</div>
                <div
                  className={`text-right ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creature.returnRate.toFixed(2)}%
                </div>
                <div
                  className={`text-right ${creature.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creature.profit >= 0 ? '+' : ''}
                  {creature.profit.toFixed(2)}
                </div>
                <div className="text-right">{creature.totalKills}</div>
                <div className="text-right text-yellow-400">{creature.totalGlobals}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kill Tracking Analytics */}
      {filteredSessions.length > 0 && <KillTrackingAnalytics sessions={filteredSessions} />}

      {/* Detailed Creature Analytics */}
      {filteredSessions.length > 0 && <CreatureAnalytics sessions={filteredSessions} />}
    </>
  );
}
