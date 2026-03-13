import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { HuntSession, LootItem } from '../../types';
import { format } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';

interface CumulativeTrajectoryChartProps {
  session: HuntSession;
}

export function CumulativeTrajectoryChart({ session }: CumulativeTrajectoryChartProps) {
  const [lootEvents, setLootEvents] = useState<LootItem[]>(session?.loot || []);

  useEffect(() => {
    if (!session) return;

    // If we already have the raw loot in the state (e.g. active session), use it.
    if (session.loot && session.loot.length > 0) {
      setLootEvents(session.loot);
      return;
    }

    // Otherwise, this is a historical session loaded from summary.
    // Fetch the raw timestamped loot events from the database.
    const fetchLoot = async () => {
      try {
        const data = await invoke<LootItem[]>('db_get_session_loot', { sessionUuid: session.id });
        setLootEvents(data);
      } catch (error) {
        console.error('Failed to fetch session loot for chart:', error);
      }
    };

    fetchLoot();
  }, [session]);

  const chartData = useMemo(() => {
    // If we have no duration or no loot events loaded, graphing isn't possible
    if (!session || lootEvents.length === 0) {
      return [];
    }

    // Ensure loot is sorted by timestamp
    const sortedLoot = [...lootEvents].sort((a, b) => a.timestamp - b.timestamp);

    const totalCost = session.stats?.totalCost || 0;
    const startTime = session.startTime;
    const endTime = session.endTime || Date.now();
    const durationMs = endTime - startTime;

    if (durationMs <= 0) {
      return [];
    }

    let cumulativeLoot = 0;
    const dataPoints = [];

    // Add starting point (0 cost, 0 loot)
    dataPoints.push({
      time: startTime,
      formattedTime: format(startTime, 'HH:mm'),
      cumulativeLoot: 0,
      cumulativeCost: 0,
      returnPercent: 0,
    });

    // We calculate a data point for every single loot event.
    // The cost at that exact moment is approximated linearly based on elapsed time.
    for (const lootEvent of sortedLoot) {
      cumulativeLoot += lootEvent.totalValue;

      const elapsedMs = Math.max(0, lootEvent.timestamp - startTime);
      // Ensure we cap ratio at 1 (100%) in case a timestamp is weirdly recorded
      const elapsedRatio = Math.min(1, elapsedMs / durationMs);

      const approximatedCost = totalCost * elapsedRatio;

      // Calculate return percent. Avoid division by zero by setting a tiny floor.
      const safeCost = approximatedCost > 0 ? approximatedCost : 0.01;
      const returnPercent = (cumulativeLoot / safeCost) * 100;

      dataPoints.push({
        time: lootEvent.timestamp,
        formattedTime: format(lootEvent.timestamp, 'HH:mm'),
        cumulativeLoot,
        cumulativeCost: approximatedCost,
        returnPercent,
      });
    }

    // Add the final End-of-Session point to ensure the graph always ends on the exact final stats
    dataPoints.push({
      time: endTime,
      formattedTime: format(endTime, 'HH:mm'),
      cumulativeLoot: session.stats.totalLoot,
      cumulativeCost: totalCost,
      returnPercent: session.stats.returns,
    });

    return dataPoints;
  }, [session, lootEvents]);

  if (chartData.length === 0) {
    return (
      <div className="card p-6 mt-6 flex flex-col items-center justify-center text-muted">
        <p>Not enough session data to generate trajectory chart.</p>
        <p className="text-xs font-mono mt-2 opacity-50">
          DEBUG: Session={!!session}, Duration={session?.stats?.duration}, Loot={lootEvents?.length}
        </p>
      </div>
    );
  }

  // Debugging out to console if need be
  // console.log('Trajectory Chart Data:', chartData);

  // Find min and max for Y-Axis dynamically roughly capping around 150% out of convention unless there's a big HoF
  const minReturn = Math.min(...chartData.map((d) => d.returnPercent));
  const maxReturn = Math.max(...chartData.map((d) => d.returnPercent));

  // Give some breathing room on the Y axis
  const yAxisMin = Math.max(0, Math.floor(minReturn / 10) * 10 - 10);
  const yAxisMax = Math.max(150, Math.ceil(maxReturn / 10) * 10 + 10);

  return (
    <div className="card p-6 mt-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold">Cumulative Trajectory</h3>
        <p className="text-sm text-muted">
          Return percentage mapped across the session timeline. (Cost is linearly approximated).
        </p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="formattedTime"
              stroke="#9ca3af"
              fontSize={12}
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
              domain={[yAxisMin, yAxisMax]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-body)',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'returnPercent') return [`${value.toFixed(1)}%`, 'Return Rate'];
                if (name === 'cumulativeLoot') return [`${value.toFixed(2)} PED`, 'Total Loot'];
                if (name === 'cumulativeCost') return [`${value.toFixed(2)} PED`, 'Est. Cost'];
                return [value, name];
              }}
              labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}
            />
            {/* The break-even 100% line */}
            <ReferenceLine
              y={100}
              stroke="#9ca3af"
              strokeDasharray="4 4"
              label={{ position: 'right', value: '100%', fill: '#9ca3af', fontSize: 12 }}
            />

            <Line
              type="monotone"
              dataKey="returnPercent"
              stroke="#60a5fa"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#60a5fa', stroke: 'var(--color-surface)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
