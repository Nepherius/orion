import { Circle, Star, Edit, Copy, Trash2 } from 'lucide-react';
import { Loadout } from '../../types';
import { LoadoutStatsPanel } from './LoadoutStatsPanel';

interface LoadoutDetailsPanelProps {
  loadout: Loadout | null;
  onSetActive: (id: string) => void;
  onEdit: (loadout: Loadout) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function LoadoutDetailsPanel({
  loadout,
  onSetActive,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: LoadoutDetailsPanelProps) {
  if (!loadout) {
    return (
      <div
        className="col-span-3 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        <div className="text-center text-gray-400">
          <Circle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a loadout to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="col-span-3 bg-gray-800 rounded-lg overflow-hidden"
      style={{ minHeight: 'calc(100vh - 200px)' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xl font-bold mb-1">{loadout.name}</h3>
        <div className="flex items-center gap-2 text-xs">
          {loadout.status === 'active' && (
            <span className="px-2 py-1 rounded bg-green-900 text-green-300 uppercase font-semibold">
              ACTIVE
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
              className="p-1 text-gray-500 hover:text-yellow-400"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-gray-700 space-y-2">
        {loadout.status === 'inactive' && (
          <button
            onClick={() => onSetActive(loadout.id)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Circle className="w-4 h-4 fill-green-400 text-green-400" />
            Set Active
          </button>
        )}
        {loadout.status === 'active' && (
          <div className="w-full p-3 bg-green-900 text-green-300 rounded text-center text-sm font-semibold">
            Currently Active
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
