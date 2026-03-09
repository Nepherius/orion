import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface RecentSession {
  date: string;
  returnRate: number;
  profit: number;
  loot: number;
}

export interface LoadoutData {
  name: string;
  sessions: number;
  returnRate: number;
  profit: number;
  avgKills: number;
}

export interface LocationData {
  location: string;
  sessions: number;
  returnRate: number;
  profit: number;
  globals: number;
}

export interface CostDatum {
  name: string;
  value: number;
  color: string;
}

export interface WeaponData {
  weapon: string;
  sessions: number;
  returnRate: number;
  totalLoot: number;
  totalCost: number;
  avgDamage: number;
}

export interface TopSkill {
  name: string;
  total: number;
}

export interface ArmorData {
  armor: string;
  sessions: number;
  returnRate: number;
  avgDamageTaken: number;
}

export interface CreatureAnalysisData {
  creature: string;
  count: number;
  returnRate: number;
  profit: number;
  totalKills: number;
  totalGlobals: number;
}

// Ensure HuntSession is imported at top
import type { HuntSession } from '../../../types';
import { InfoTooltip } from '../../common/InfoTooltip';
import { CreatureAnalytics } from '../../analytics/CreatureAnalytics';
import { KillTrackingAnalytics } from '../../analytics/KillTrackingAnalytics';

interface PerformancePanelsSectionProps {
  recentSessions: RecentSession[];
  loadoutData: LoadoutData[];
  locationData: LocationData[];
  costData: CostDatum[];
  weaponData: WeaponData[];
  topSkills: TopSkill[];
  armorData: ArmorData[];
  defaultTab?: 'performance' | 'equipment' | 'loot' | 'creatures';
  creatureAnalysis?: CreatureAnalysisData[];
  filteredSessions?: HuntSession[];
}

export function PerformancePanelsSection({
  recentSessions,
  loadoutData,
  locationData,
  costData,
  weaponData,
  topSkills,
  armorData,
  defaultTab,
  creatureAnalysis = [],
  filteredSessions = [],
}: PerformancePanelsSectionProps) {
  const showEquipment = !defaultTab || defaultTab === 'performance' || defaultTab === 'equipment';
  const showCreatures = !defaultTab || defaultTab === 'performance' || defaultTab === 'creatures';
  return (
    <>
      {/* Performance Over Time */}
      {showCreatures && recentSessions.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Performance Trend (Last 30 Sessions)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recentSessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="returnRate"
                stroke="#10B981"
                name="Return Rate %"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="loot"
                stroke="#3B82F6"
                name="Loot (PED)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Loadout Performance */}
      {showEquipment && loadoutData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Loadout Performance</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
              <div>Loadout</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Profit</div>
              <div className="text-right">Avg Kills</div>
            </div>
            {loadoutData.map((loadout) => (
              <div
                key={loadout.name}
                className="grid grid-cols-5 gap-2 text-sm py-2 hover:bg-surface-hover"
              >
                <div className="font-semibold truncate" title={loadout.name}>
                  {loadout.name}
                </div>
                <div className="text-right text-muted">{loadout.sessions}</div>
                <div
                  className={`text-right font-bold ${loadout.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {loadout.returnRate.toFixed(2)}%
                </div>
                <div
                  className={`text-right ${loadout.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {loadout.profit >= 0 ? '+' : ''}
                  {loadout.profit.toFixed(2)}
                </div>
                <div className="text-right">{loadout.avgKills.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sessions by Location */}
        {locationData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Performance by Location</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
                <div>Location</div>
                <div className="text-right">Sessions</div>
                <div className="text-right">Return %</div>
                <div className="text-right">Profit</div>
                <div className="text-right">Globals</div>
              </div>
              {locationData.map((loc) => (
                <div
                  key={loc.location}
                  className="grid grid-cols-5 gap-2 text-sm py-1 hover:bg-surface-hover"
                >
                  <div className="truncate" title={loc.location}>
                    {loc.location}
                  </div>
                  <div className="text-right text-muted">{loc.sessions}</div>
                  <div
                    className={`text-right font-semibold ${loc.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {loc.returnRate.toFixed(2)}%
                  </div>
                  <div
                    className={`text-right ${loc.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {loc.profit >= 0 ? '+' : ''}
                    {loc.profit.toFixed(2)}
                  </div>
                  <div className="text-right text-yellow-400">{loc.globals}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Cost Breakdown</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(2)} PED`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value: number) => `${value.toFixed(2)} PED`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weapon Performance */}
      {showEquipment && weaponData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Weapon Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weaponData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="weapon"
                stroke="var(--color-text-muted)"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Legend />
              <Bar dataKey="returnRate" fill="#10B981" name="Return Rate %" />
              <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Skills Gained */}
      {topSkills.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Top Skills Gained</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topSkills} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" stroke="var(--color-text-muted)" />
              <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" width={150} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Bar dataKey="total" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Armor Performance */}
      {showEquipment && armorData.length > 0 && armorData.some((a) => a.armor !== 'None') && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Armor Performance</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
              <div>Armor</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Avg Damage Taken</div>
            </div>
            {armorData.map((armor) => (
              <div
                key={armor.armor}
                className="grid grid-cols-4 gap-2 text-sm py-2 hover:bg-surface-hover"
              >
                <div className="truncate" title={armor.armor}>
                  {armor.armor}
                </div>
                <div className="text-right text-muted">{armor.sessions}</div>
                <div
                  className={`text-right font-semibold ${armor.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {armor.returnRate.toFixed(1)}%
                </div>
                <div className="text-right">{armor.avgDamageTaken.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category 7: Creature Analysis */}
      {showCreatures && creatureAnalysis.length > 0 && (
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
      {showCreatures && filteredSessions.length > 0 && <KillTrackingAnalytics sessions={filteredSessions} />}

      {/* Category 7c: Detailed Creature Analytics */}
      {showCreatures && filteredSessions.length > 0 && <CreatureAnalytics sessions={filteredSessions} />}
    </>
  );
}
