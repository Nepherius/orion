import { useHuntStore } from '../../../store';
import { DataTable, DataTableColumn } from '../../common/DataTable';
import { Panel } from '../../common/Panel';

export default function LocationPerformancePanel() {
  const locationData = useHuntStore((state) => state.analyticsData.performance?.locationData);

  if (!locationData || locationData.length === 0) return null;

  const columns: Array<DataTableColumn<(typeof locationData)[number]>> = [
    {
      key: 'location',
      header: 'Location',
      render: (location) => (
        <span className="block truncate" title={location.location}>
          {location.location}
        </span>
      ),
    },
    {
      key: 'sessions',
      header: 'Sessions',
      align: 'right',
      render: (location) => location.sessions,
    },
    {
      key: 'returnRate',
      header: 'Return %',
      align: 'right',
      render: (location) => (
        <span
          className={`font-semibold ${location.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
        >
          {location.returnRate.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (location) => (
        <span className={location.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
          {location.profit >= 0 ? '+' : ''}
          {location.profit.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'globals',
      header: 'Globals',
      align: 'right',
      render: (location) => <span className="text-yellow-400">{location.globals}</span>,
    },
  ];

  return (
    <Panel title="Performance by Location">
      <DataTable
        columns={columns}
        rows={locationData}
        getRowKey={(location) => location.location}
        maxHeightClassName="max-h-96 overflow-y-auto"
      />
    </Panel>
  );
}
