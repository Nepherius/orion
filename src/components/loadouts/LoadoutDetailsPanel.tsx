import { Circle, Star, Edit, Copy, Trash2 } from 'lucide-react';
import { Loadout } from '../../types';
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
      <div
        className="col-span-3 bg-surface rounded-lg overflow-hidden flex items-center justify-center"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        <div className="text-center text-muted">
          <Circle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a loadout to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="col-span-3 bg-surface rounded-lg overflow-hidden"
      style={{ minHeight: 'calc(100vh - 200px)' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xl font-bold mb-1">{loadout.name}</h3>
        <div className="flex items-center gap-2 text-xs">
          {loadout.isPrimary && (
            <span className="px-2 py-1 rounded bg-green-900 text-green-300 uppercase font-semibold">
              PRIMARY
            </span>
          )}
          {loadout.favorite && (
            <button onClick={() => onToggleFavorite(loadout.id)} className="p-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </button>
          )}
          {!loadout.favorite && (
            <button
              onClick={() => onToggleFavorite(loadout.id)}
              className="p-1 text-muted hover:text-yellow-400"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-border space-y-2">
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
      <div className="p-4 space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto">
        <LoadoutStatsPanel loadout={loadout} />
      </div>
    </div>
  );
}
