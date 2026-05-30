import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { DataTable, DataTableColumn } from '../../common/DataTable';
import { Panel } from '../../common/Panel';

export default function LoadoutPerformancePanel() {
  const loadoutRaw = useHuntStore((state) => state.analyticsData.performance?.loadoutData);
  const loadouts = useHuntStore((state) => state.loadouts);

  const loadoutData = useMemo(() => {
    if (!loadoutRaw) return [];
    return loadoutRaw
      .map((item) => {
        const loadout = loadouts.find((l) => l.id === item.loadoutId);
        return {
          name: loadout?.name || 'Unknown',
          sessions: item.sessions,
          returnRate: item.returnRate,
          profit: item.profit,
          avgKills: item.avgKills,
        };
      })
      .filter((item) => item.name !== 'Unknown');
  }, [loadoutRaw, loadouts]);

  if (loadoutData.length === 0) return null;

  const columns: Array<DataTableColumn<(typeof loadoutData)[number]>> = [
    {
      key: 'name',
      header: 'Loadout',
      render: (loadout) => (
        <span className="block truncate font-semibold" title={loadout.name}>
          {loadout.name}
        </span>
      ),
    },
    { key: 'sessions', header: 'Sessions', align: 'right', render: (loadout) => loadout.sessions },
    {
      key: 'returnRate',
      header: 'Return %',
      align: 'right',
      render: (loadout) => (
        <span
          className={`font-bold ${loadout.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
        >
          {loadout.returnRate.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (loadout) => (
        <span className={loadout.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
          {loadout.profit >= 0 ? '+' : ''}
          {loadout.profit.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'avgKills',
      header: 'Avg Kills',
      align: 'right',
      render: (loadout) => loadout.avgKills.toFixed(2),
    },
  ];

  return (
    <Panel title="Loadout Performance">
      <DataTable columns={columns} rows={loadoutData} getRowKey={(loadout) => loadout.name} />
    </Panel>
  );
}
