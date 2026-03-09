import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

export default function GeneralProjectionsPanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const advanced = useHuntStore((state) => state.analyticsData.advanced);

  const projectedLifetimeProfit = advanced?.projectedLifetimeProfit ?? 0;
  const sessionsToBreakEven = advanced?.sessionsToBreakEven ?? null;
  const totalSessions = sessions.length;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">General Projections & Predictions</h3>
        <InfoTooltip tooltip="Based on recent session trends (last 10 sessions)" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Projected Lifetime Profit
            <InfoTooltip tooltip="Projection = all-time total + average recent trend" />
          </div>
          <div
            className={`text-2xl font-bold ${projectedLifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {projectedLifetimeProfit >= 0 ? '+' : ''}
            {projectedLifetimeProfit.toFixed(2)} PED
          </div>
        </div>
        {sessionsToBreakEven !== null && (
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Sessions to Break Even
              <InfoTooltip tooltip="Sessions needed at current avg profit to reach 0" />
            </div>
            <div className="text-2xl font-bold text-orange-400">{sessionsToBreakEven}</div>
          </div>
        )}
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Data Points Analyzed
            <InfoTooltip tooltip="Number of sessions analyzed for general projections" />
          </div>
          <div className="text-2xl font-bold text-body">{totalSessions}</div>
        </div>
      </div>
    </div>
  );
}
