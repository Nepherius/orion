import { Plus, Circle } from 'lucide-react';
import { Loadout } from '../../types';
import { DataTable, DataTableColumn } from '../common/DataTable';
import { Panel } from '../common/Panel';

interface LoadoutTableProps {
  loadouts: Loadout[];
  selectedLoadoutId: string | null;
  onSelectLoadout: (id: string) => void;
  onNewLoadout: () => void;
}

export function LoadoutTable({
  loadouts,
  selectedLoadoutId,
  onSelectLoadout,
  onNewLoadout,
}: LoadoutTableProps) {
  const columns: Array<DataTableColumn<Loadout>> = [
    {
      key: 'name',
      header: 'Name / Weapon',
      span: 3,
      render: (loadout) => (
        <div className="flex items-center gap-3">
          <Circle
            className={`h-2 w-2 ${
              loadout.isPrimary ? 'fill-green-400 text-green-400' : 'fill-gray-600 text-gray-600'
            }`}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-body">{loadout.name}</span>
              {loadout.isPrimary && (
                <span className="rounded bg-green-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-300">
                  PRIMARY
                </span>
              )}
              {loadout.hotkey && (
                <span className="rounded bg-blue-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-300">
                  CTRL+{loadout.hotkey}
                </span>
              )}
            </div>
            <div className="truncate text-sm text-muted">{loadout.weapon?.Name || 'No weapon'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      render: (loadout) => (
        <>
          <div className="font-mono text-blue-400">{loadout.costPerShot.toFixed(4)}</div>
          <div className="text-xs text-gray-500">PED</div>
        </>
      ),
    },
  ];

  return (
    <div className="col-span-6">
      <Panel
        title={`Loadouts (${loadouts.length})`}
        action={
          <button onClick={onNewLoadout} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New
          </button>
        }
      >
        <DataTable
          columns={columns}
          rows={loadouts}
          getRowKey={(loadout) => loadout.id}
          onRowClick={(loadout) => onSelectLoadout(loadout.id)}
          rowClassName={(loadout) => (selectedLoadoutId === loadout.id ? 'bg-surface' : '')}
          emptyMessage="No loadouts found. Create your first loadout!"
        />
      </Panel>
    </div>
  );
}
