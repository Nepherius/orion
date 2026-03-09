import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

export default function SessionReliabilityPanel() {
  const advanced = useHuntStore((state) => state.analyticsData.advanced);

  if (!advanced) return null;

  const { sessionWinRate, profitableStreaks } = advanced;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Session Reliability & Streaks</h3>
        <InfoTooltip tooltip="Session profitability patterns and consistency" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Win Rate
            <InfoTooltip tooltip="Percentage of profitable sessions" />
          </div>
          <div className="text-3xl font-bold text-green-400">{sessionWinRate.toFixed(1)}%</div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Current Streak
            <InfoTooltip tooltip="Consecutive profitable sessions (most recent first)" />
          </div>
          <div className="text-3xl font-bold text-blue-400">{profitableStreaks.currentStreak}</div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Longest Streak
            <InfoTooltip tooltip="Best consecutive profitable sessions" />
          </div>
          <div className="text-3xl font-bold text-yellow-400">
            {profitableStreaks.longestStreak}
          </div>
        </div>
      </div>
    </div>
  );
}
