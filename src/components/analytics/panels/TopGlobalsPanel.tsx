import { format } from 'date-fns';
import { useHuntStore } from '../../../store';
import { DataTable, DataTableColumn } from '../../common/DataTable';
import { Panel } from '../../common/Panel';

export default function TopGlobalsPanel() {
  const allGlobals = useHuntStore((state) => state.analyticsData.performance?.allGlobals);

  if (!allGlobals || allGlobals.length === 0) return null;

  const columns: Array<DataTableColumn<(typeof allGlobals)[number]>> = [
    {
      key: 'creature',
      header: 'Creature',
      render: (global) => (
        <span className="flex items-center gap-1 font-semibold text-yellow-400">
          {global.isHoF && <span className="text-purple-400">★</span>}
          <span className="truncate">{global.creature}</span>
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (global) => (
        <span className="font-bold text-green-400">{global.value.toFixed(2)} PED</span>
      ),
    },
    {
      key: 'session',
      header: 'Session',
      render: (global) => (
        <span className="block truncate text-muted" title={global.sessionName}>
          {global.sessionName}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (global) => (
        <span className="block truncate text-muted" title={global.location || 'Unknown'}>
          {global.location || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      render: (global) => (
        <span className="text-muted">{format(global.timestamp, 'MM/dd/yy')}</span>
      ),
    },
  ];

  return (
    <Panel
      title={`Top Globals${allGlobals.some((global) => global.isHoF) ? ' & Hall of Fame' : ''}`}
    >
      <DataTable
        columns={columns}
        rows={allGlobals}
        getRowKey={(global) => global.id}
        maxHeightClassName="max-h-96 overflow-y-auto"
        rowClassName={(global) => (global.isHoF ? 'bg-purple-900/20' : '')}
      />
    </Panel>
  );
}
