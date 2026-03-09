import { InfoTooltip } from '../../common/InfoTooltip';
import { CreatureAnalytics } from '../../analytics/CreatureAnalytics';
import { KillTrackingAnalytics } from '../../analytics/KillTrackingAnalytics';
import type { HuntSession } from '../../../types';

interface AdvancedAnalyticsSectionProps {
  sessionWinRate: number;
  profitableStreaks: {
    currentStreak: number;
    longestStreak: number;
  };
  bestWeapon: {
    weapon: string;
    returnRate: number;
  } | null;
  bestLocation: {
    location: string;
    returnRate: number;
  } | null;
  bestLoadout: {
    name: string;
    returnRate: number;
  } | null;
  temporalInsights: {
    avgSessionHours: number;
    bestHourLabel: string;
    bestHourReturnRate: number;
    avgGapHours: number;
  };
  creatureAnalysis: Array<{
    creature: string;
    count: number;
    returnRate: number;
    profit: number;
    totalKills: number;
    totalGlobals: number;
  }>;
  filteredSessions: HuntSession[];
  skillsByLocation: Array<{
    location: string;
    skillGains: number;
  }>;
  skillsByWeapon: Array<{
    weapon: string;
    skillGains: number;
  }>;
  lifetimeAttributeGains: Record<string, { gains: number; count: number }>;
  allSkillNames: string[];
  skillGainVariance: number;
  skillValuePerCost: number;
  totalSkillGains: number;
  projectedLifetimeProfit: number;
  sessionsToBreakEven: number | null;
}

export function AdvancedAnalyticsSection({
  sessionWinRate,
  profitableStreaks,
  bestWeapon,
  bestLocation,
  bestLoadout,
  temporalInsights,
  creatureAnalysis,
  filteredSessions,
  skillsByLocation,
  skillsByWeapon,
  lifetimeAttributeGains,
  allSkillNames,
  skillGainVariance,
  skillValuePerCost,
  totalSkillGains,
  projectedLifetimeProfit,
  sessionsToBreakEven,
}: AdvancedAnalyticsSectionProps) {
  return (
    <>
      {/* Category 4: Session Reliability & Streaks */}
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
            <div className="text-3xl font-bold text-blue-400">
              {profitableStreaks.currentStreak}
            </div>
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

      {/* Category 8: Comparative Analytics */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Comparative Analytics</h3>
          <InfoTooltip tooltip="Best performing setup comparisons" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Best Weapon
              <InfoTooltip tooltip="Highest return rate weapon with existing data" />
            </div>
            <div
              className="text-lg font-bold text-blue-400 truncate"
              title={bestWeapon?.weapon || 'N/A'}
            >
              {bestWeapon?.weapon || 'N/A'}
            </div>
            <div className="text-sm text-muted mt-1">
              {bestWeapon ? `${bestWeapon.returnRate.toFixed(1)}% return` : 'Not enough data'}
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Best Location
              <InfoTooltip tooltip="Highest return location with at least 2 sessions" />
            </div>
            <div
              className="text-lg font-bold text-green-400 truncate"
              title={bestLocation?.location || 'N/A'}
            >
              {bestLocation?.location || 'N/A'}
            </div>
            <div className="text-sm text-muted mt-1">
              {bestLocation ? `${bestLocation.returnRate.toFixed(1)}% return` : 'Need 2+ sessions'}
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Best Loadout
              <InfoTooltip tooltip="Highest return loadout with at least 2 sessions" />
            </div>
            <div
              className="text-lg font-bold text-purple-400 truncate"
              title={bestLoadout?.name || 'N/A'}
            >
              {bestLoadout?.name || 'N/A'}
            </div>
            <div className="text-sm text-muted mt-1">
              {bestLoadout ? `${bestLoadout.returnRate.toFixed(1)}% return` : 'Need 2+ sessions'}
            </div>
          </div>
        </div>
      </div>

      {/* Category 11: Temporal Analytics */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Temporal Analytics</h3>
          <InfoTooltip tooltip="Time-based behavior and performance patterns" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Avg Session Duration
              <InfoTooltip tooltip="Average active session length in hours" />
            </div>
            <div className="text-2xl font-bold text-body">
              {temporalInsights.avgSessionHours.toFixed(2)}h
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Peak Performance Window
              <InfoTooltip tooltip="Start-hour window with highest average return rate" />
            </div>
            <div className="text-lg font-bold text-green-400">{temporalInsights.bestHourLabel}</div>
            <div className="text-sm text-muted mt-1">
              {temporalInsights.bestHourReturnRate.toFixed(1)}% avg return
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Avg Cooldown Gap
              <InfoTooltip tooltip="Average hours between session starts" />
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {temporalInsights.avgGapHours.toFixed(2)}h
            </div>
          </div>
        </div>
      </div>

      {/* Category 7: Creature Analysis */}
      {creatureAnalysis.length > 0 && (
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

      {/* Category 7b: Kill Tracking Analytics */}
      {filteredSessions.length > 0 && <KillTrackingAnalytics sessions={filteredSessions} />}

      {/* Category 7c: Detailed Creature Analytics */}
      {filteredSessions.length > 0 && <CreatureAnalytics sessions={filteredSessions} />}

      {/* Category 10: Skill Efficiency */}
      <div className="grid grid-cols-2 gap-6">
        {skillsByLocation.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">Skills by Location</h3>
              <InfoTooltip tooltip="Total skill gains grouped by location" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByLocation.slice(0, 10).map((item) => (
                <div
                  key={item.location}
                  className="flex justify-between p-2 border-b border-border"
                >
                  <span className="text-gray-300 truncate">{item.location || 'Unknown'}</span>
                  <span className="font-semibold text-blue-400">{item.skillGains.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {skillsByWeapon.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">Skills by Weapon</h3>
              <InfoTooltip tooltip="Total skill gains grouped by weapon" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsByWeapon.slice(0, 10).map((item) => (
                <div key={item.weapon} className="flex justify-between p-2 border-b border-border">
                  <span className="text-gray-300 truncate">{item.weapon}</span>
                  <span className="font-semibold text-purple-400">
                    {item.skillGains.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attributes Panel */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Attributes</h3>
          <InfoTooltip tooltip="Core character attributes advancement across all hunts. These are fundamental progression elements." />
        </div>
        {Object.values(lifetimeAttributeGains).some((attr) => attr.gains > 0) ? (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(lifetimeAttributeGains)
              .map(([name, data]) => ({ name, ...data }))
              .sort((a, b) => b.gains - a.gains)
              .map((attr) => {
                const attributeDescriptions: Record<string, string> = {
                  Agility:
                    'Affects coordination, finesse, and grace; influences movement speed and is vital for many professions.',
                  Health: 'Determines how much damage your avatar can withstand before dying.',
                  Intelligence: 'Impacts actions involving the mind, memory, and reasoning.',
                  Psyche: 'Influences willpower, mental strength, and mindforce.',
                  Stamina: 'Affects bodily hardiness, constitution, and physical toughness.',
                  Strength: 'Governs raw muscle power, lifting capacity, and brute force.',
                };
                return (
                  <div key={attr.name} className="border border-border rounded p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-sm mb-1">{attr.name}</div>
                        <div className="text-xs text-muted mb-2">
                          {attributeDescriptions[attr.name]}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-border">
                      <div className="text-2xl font-bold text-cyan-400">
                        {attr.gains.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted">{attr.count} events</div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center text-muted py-8">No attribute gains recorded</div>
        )}
      </div>

      {/* Debug: Show all skill names for attribute identification */}
      <div className="card p-6 border-yellow-500/30">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-bold text-yellow-400">All Skills Tracked</h3>
          <InfoTooltip tooltip="Complete list of skill names in your data." />
        </div>
        <div className="text-xs text-muted space-y-1 max-h-32 overflow-y-auto">
          {allSkillNames.length === 0 ? (
            <span>No skills tracked</span>
          ) : (
            allSkillNames.map((skill) => (
              <div key={skill} className="p-1 bg-gray-700/20 rounded px-2">
                {skill}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Skill Metrics</h3>
          <InfoTooltip tooltip="Overall skill efficiency and consistency" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Skill Gain Variance
              <InfoTooltip tooltip="Variability in skill gains per session. Lower = consistent" />
            </div>
            <div className="text-2xl font-bold text-body">{skillGainVariance.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Skills Per PED
              <InfoTooltip tooltip="Skill gains per PED spent. Efficiency metric" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{skillValuePerCost.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total Skill Gains</div>
            <div className="text-2xl font-bold text-green-400">{totalSkillGains.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Category 12: Projections & Predictions */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Projections & Predictions</h3>
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
              Data Points
              <InfoTooltip tooltip="Number of sessions analyzed" />
            </div>
            <div className="text-2xl font-bold text-body">{filteredSessions.length}</div>
          </div>
        </div>
      </div>
    </>
  );
}
