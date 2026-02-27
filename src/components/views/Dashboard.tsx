import { useHuntStore } from '../../store';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { ActiveSessionSidebar } from '../layout/ActiveSessionSidebar';
import { LiveTimer } from '../layout/LiveTimer';

export function Dashboard() {
  const activeSession = useHuntStore((state) => state.getActiveSession());

  if (!activeSession) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No active session. Start or resume a session to view the dashboard.</p>
      </div>
    );
  }

  const profit = activeSession.stats.totalLoot - activeSession.stats.totalCost;
  const duration = Date.now() - activeSession.startTime;
  const durationMinutes = duration / 1000 / 60;
  const durationHours = durationMinutes / 60;

  // Combat calculations
  const totalHits = activeSession.stats.hits || 0;
  const totalMisses = activeSession.stats.misses || 0;
  const totalDodges = activeSession.stats.dodges || 0;
  const totalEvades = activeSession.stats.evades || 0;
  const totalAttempts = totalHits + totalMisses + totalDodges;
  const hitRate = totalAttempts > 0 ? (totalHits / totalAttempts) * 100 : 0;
  const critRate = activeSession.stats.shotsFired > 0 ? (activeSession.stats.criticalHits / activeSession.stats.shotsFired) * 100 : 0;
  const evasionRate = (totalHits + totalMisses + totalDodges + totalEvades) > 0 ? (totalEvades / (totalHits + totalMisses + totalDodges + totalEvades)) * 100 : 0;

  // Performance metrics
  const totalEvents = activeSession.stats.lootEvents;

  // Economy metrics
  const totalLoot = activeSession.stats.totalLoot;
  const totalSpend = activeSession.stats.totalCost;
  const costPerKill = activeSession.stats.kills > 0 ? totalSpend / activeSession.stats.kills : 0;
  const lootPerKill = activeSession.stats.kills > 0 ? totalLoot / activeSession.stats.kills : 0;
  const netPL = profit;
  const lootPerPED = totalSpend > 0 ? totalLoot / totalSpend : 0;

  // Efficiency metrics
  const dpp = activeSession.stats.kills > 0 ? totalSpend / activeSession.stats.kills : 0;
  const dps = durationMinutes > 0 ? totalSpend / durationMinutes : 0;
  const killsPerPED = totalSpend > 0 ? activeSession.stats.kills / totalSpend : 0;
  const killsPerHour = durationHours > 0 ? activeSession.stats.kills / durationHours : 0;
  const avgDmgPerHit = activeSession.stats.shotsFired > 0 ? activeSession.stats.damageDealt / activeSession.stats.shotsFired : 0;
  const shotsPerKill = activeSession.stats.kills > 0 ? activeSession.stats.shotsFired / activeSession.stats.kills : 0;

  // Hourly rates
  const lootPerHour = durationHours > 0 ? totalLoot / durationHours : 0;
  const spendPerHour = durationHours > 0 ? totalSpend / durationHours : 0;
  const skillsPerHour = 0; // Placeholder
  const dmgPerHour = durationHours > 0 ? activeSession.stats.damageDealt / durationHours : 0;

  const StatCard = ({ label, value, color = 'text-white', info }: { label: string; value: string | number; color?: string; info?: string }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {label}
        {info && <Info className="w-3 h-3 cursor-help" />}
      </div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Main Content */}
      <div className="col-span-9 space-y-6">
        {/* Key Metrics */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">KEY METRICS</h2>
          <div className="flex gap-2 text-sm">
            <button className="px-3 py-1 bg-primary-600 rounded">📊</button>
            <button className="px-3 py-1 bg-gray-700 rounded">🔄</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="text-sm text-gray-400 mb-2">RETURN RATE</div>
            <div className={`text-4xl font-bold flex items-center gap-2 ${activeSession.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}`}>
              {activeSession.stats.returns >= 100 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              {activeSession.stats.returns.toFixed(1)}%
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-400 mb-2">PROFIT/LOSS</div>
            <div className={`text-4xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : ''}{profit.toFixed(2)} PED
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-400 mb-2">TOTAL KILLS</div>
            <div className="text-4xl font-bold text-white">{activeSession.stats.kills}</div>
          </div>
        </div>

        {/* Return Rate Chart */}
        <div className="card p-6">
          <div className="text-xs text-gray-400 uppercase mb-2">RETURN RATE</div>
          <div className="relative h-48 bg-gray-800 rounded" style={{ background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 100%)' }}>
            <div className="absolute top-4 left-4 text-red-400 font-bold text-xl">{activeSession.stats.returns.toFixed(1)}%</div>
            <div className="absolute bottom-4 right-4 text-xs text-gray-500">Return Rate</div>
            <div className="absolute top-2 right-2 text-xs text-gray-500">80</div>
            <div className="absolute bottom-2 left-12 flex justify-between w-[calc(100%-3rem)] text-xs text-gray-600">
              <span>0s</span>
              <span>3s</span>
              <span>6s</span>
              <span>10s</span>
              <span>13s</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Performance */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-blue-400 uppercase">Performance</h3>
              <span className="text-blue-400">›</span>
            </div>
            <div className="space-y-3">
              <StatCard label="Return Rate" value={`${activeSession.stats.returns.toFixed(1)}%`} color={activeSession.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'} />
              <StatCard label="Profit/Loss" value={`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} PED`} color={profit >= 0 ? 'text-green-400' : 'text-red-400'} />
              <StatCard label="Skills/PED" value="0.0000" />
              <StatCard label="Hit Rate" value={`${hitRate.toFixed(1)}%`} color={hitRate >= 80 ? 'text-green-400' : 'text-yellow-400'} />
              <StatCard label="Crit Rate" value={`${critRate.toFixed(1)}%`} color={critRate >= 5 ? 'text-yellow-400' : 'text-white'} />
              <StatCard label="Total Events" value={totalEvents} />
            </div>
          </div>

          {/* Economy */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-blue-400 uppercase">Economy</h3>
              <span className="text-blue-400">›</span>
            </div>
            <div className="space-y-3">
              <StatCard label="Total Loot" value={`${totalLoot.toFixed(2)} PED`} color="text-green-400" />
              <StatCard label="Total Spend" value={`${totalSpend.toFixed(2)} PED`} color="text-red-400" />
              <StatCard label="Cost/Kill" value={`${costPerKill.toFixed(2)} PED`} />
              <StatCard label="Loot/Kill" value={`${lootPerKill.toFixed(2)} PED`} />
              <StatCard label="Net P/L" value={`${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)} PED`} color={netPL >= 0 ? 'text-green-400' : 'text-red-400'} />
              <StatCard label="Loot/PED" value={lootPerPED.toFixed(3)} />
            </div>
          </div>

          {/* Efficiency */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-blue-400 uppercase">Efficiency</h3>
              <span className="text-blue-400">›</span>
            </div>
            <div className="space-y-3">
              <StatCard label="DPP" value={dpp.toFixed(2)} />
              <StatCard label="DPS" value={dps.toFixed(2)} />
              <StatCard label="Kills/PED" value={killsPerPED.toFixed(2)} />
              <StatCard label="Kills/Hour" value={killsPerHour.toFixed(1)} />
              <StatCard label="Avg Dmg/Hit" value={avgDmgPerHit.toFixed(1)} />
              <StatCard label="Shots/Kill" value={shotsPerKill.toFixed(1)} />
            </div>
          </div>
        </div>

        {/* Bottom Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Skills */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-blue-400 uppercase">Skills</h3>
              <span className="text-blue-400">›</span>
            </div>
            <div className="space-y-3">
              <StatCard label="Total Gains" value="0.0000" />
              <StatCard label="Skill Events" value="0" />
              <StatCard label="Skills/PED" value="0.0000" />
              <StatCard label="Skills/Hour" value="0.00" />
              <StatCard label="Skills/Kill" value="0.0000" />
              <StatCard label="Avg Skill Value" value="0.0000" />
            </div>
          </div>

          {/* Combat */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-blue-400 uppercase">Combat</h3>
              <span className="text-blue-400">›</span>
            </div>
            <div className="space-y-3">
              <StatCard label="Kills" value={activeSession.stats.kills} />
              <StatCard label="Total Damage Out" value={activeSession.stats.damageDealt.toFixed(0)} />
              <StatCard label="Total Damage In" value={(activeSession.stats.damageTaken || 0).toFixed(0)} color="text-red-400" />
              <StatCard label="Total Healing" value={(activeSession.stats.totalHealing || 0).toFixed(0)} color="text-green-400" />
              <StatCard label="Shots Fired" value={activeSession.stats.shotsFired} />
              <StatCard label="Hits" value={totalHits} color="text-green-400" />
              <StatCard label="Critical Hits" value={activeSession.stats.criticalHits || 0} color="text-yellow-400" />
              <StatCard label="Misses" value={totalMisses} color="text-gray-400" />
              <StatCard label="Dodges" value={totalDodges} color="text-red-400" />
              <StatCard label="Evades" value={totalEvades} color="text-blue-400" />
              <StatCard label="Hit Rate" value={`${hitRate.toFixed(1)}%`} color={hitRate >= 80 ? 'text-green-400' : 'text-yellow-400'} />
              <StatCard label="Crit Rate" value={`${critRate.toFixed(1)}%`} color={critRate >= 5 ? 'text-yellow-400' : 'text-white'} />
              <StatCard label="Evasion Rate" value={`${evasionRate.toFixed(1)}%`} color={evasionRate >= 20 ? 'text-green-400' : 'text-white'} />
            </div>
          </div>

          {/* Hourly Rates */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-blue-400 uppercase">Hourly Rates</h3>
              <span className="text-blue-400">›</span>
            </div>
            <div className="space-y-3">
              <StatCard label="Loot/Hour" value={`${lootPerHour.toFixed(2)} PED`} />
              <StatCard label="Spend/Hour" value={`${spendPerHour.toFixed(2)} PED`} />
              <StatCard label="Skills/Hour" value={skillsPerHour.toFixed(2)} />
              <StatCard label="Kills/Hour" value={killsPerHour.toFixed(1)} />
              <StatCard label="Dmg/Hour" value={dmgPerHour} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">Combat Time</div>
                <div className="font-semibold text-white">
                  <LiveTimer startTime={activeSession.startTime} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Session Sidebar */}
      <div className="col-span-3">
        <ActiveSessionSidebar />
      </div>
    </div>
  );
}
