import { Circle, Star, Edit, Copy, Trash2 } from 'lucide-react';
import { Loadout } from '../../types';
import { Panel } from '../common/Panel';
import { LoadoutStatsPanel } from './LoadoutStatsPanel';

interface LoadoutDetailsPanelProps {
  loadout: Loadout | null;
  onSetPrimary: (id: string) => void;
  onEdit: (loadout: Loadout) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function LoadoutDetailsPanel({
  loadout,
  onSetPrimary,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: LoadoutDetailsPanelProps) {
  if (!loadout) {
    return (
      <Panel
        className="col-span-3 min-h-[calc(100vh-200px)]"
        contentClassName="flex h-full min-h-[calc(100vh-240px)] items-center justify-center"
      >
        <div className="text-center text-muted">
          <Circle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a loadout to view details</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={loadout.name}
      className="col-span-3 min-h-[calc(100vh-200px)] overflow-hidden"
      action={
        <button
          onClick={() => onToggleFavorite(loadout.id)}
          className={loadout.favorite ? 'p-1' : 'p-1 text-muted hover:text-yellow-400'}
          title={loadout.favorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Star
            className={`h-4 w-4 ${loadout.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
          />
        </button>
      }
    >
      {/* Header */}
      {loadout.isPrimary && (
        <span className="mb-4 inline-flex rounded bg-green-900 px-2 py-1 text-xs font-semibold uppercase text-green-300">
          PRIMARY
        </span>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 border-b border-border pb-4">
        {!loadout.isPrimary && (
          <button
            onClick={() => onSetPrimary(loadout.id)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Circle className="w-4 h-4 fill-green-400 text-green-400" />
            Set Primary
          </button>
        )}
        {loadout.isPrimary && (
          <div className="w-full p-3 bg-green-900 text-green-300 rounded text-center text-sm font-semibold">
            Currently Primary
          </div>
        )}
        <button
          onClick={() => onEdit(loadout)}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => onDuplicate(loadout.id)}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        <button
          onClick={() => onDelete(loadout.id)}
          className="btn-danger w-full flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Stats */}
      <div className="mt-4 max-h-[calc(100vh-450px)] space-y-4 overflow-y-auto">
        <LoadoutStatsPanel loadout={loadout} />
      </div>
    </Panel>
  );
}
