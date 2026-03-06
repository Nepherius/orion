import { X } from 'lucide-react';

interface LootItemOptionsModalProps {
  selectedItem: string | null;
  itemMarkup: number;
  itemFixedValue: number;
  isIgnored: boolean;
  onMarkupChange: (value: number) => void;
  onFixedValueChange: (value: number) => void;
  onSaveCustomRules: () => void;
  onToggleIgnore: () => void;
  onClose: () => void;
}

export function LootItemOptionsModal({
  selectedItem,
  itemMarkup,
  itemFixedValue,
  isIgnored,
  onMarkupChange,
  onFixedValueChange,
  onSaveCustomRules,
  onToggleIgnore,
  onClose,
}: LootItemOptionsModalProps) {
  if (!selectedItem) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{selectedItem}</h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-2">Set Mark Up - MU (%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="100"
                step="1"
                value={itemMarkup}
                onChange={(e) => onMarkupChange(Number(e.target.value))}
                className="input flex-1"
              />
              <button onClick={onSaveCustomRules} className="btn-primary">
                Save Custom Rules
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-2">Set Market Value - MV (PED)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={itemFixedValue}
              onChange={(e) => onFixedValueChange(Number(e.target.value))}
              className="input w-full"
            />
            <p className="text-xs text-muted mt-1">
              Additional value on top of TT. When set above 0, MU is ignored.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <button onClick={onToggleIgnore} className="btn-secondary w-full">
              {isIgnored ? 'Remove from Ignore List' : 'Add to Ignore List'}
            </button>
          </div>

          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
