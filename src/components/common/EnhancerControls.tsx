import { Plus, Minus } from 'lucide-react';
import { LoadoutEnhancers } from '../../types';

interface EnhancerControlsProps {
  enhancers: LoadoutEnhancers;
  onUpdate: (enhancers: LoadoutEnhancers) => void;
  maxPerType?: number;
}

export function EnhancerControls({ enhancers, onUpdate, maxPerType = 100 }: EnhancerControlsProps) {
  const total = enhancers.dmg + enhancers.acc + enhancers.rng + enhancers.eco;

  const handleDecrement = (type: keyof LoadoutEnhancers) => {
    onUpdate({
      ...enhancers,
      [type]: Math.max(0, enhancers[type] - 1),
    });
  };

  const handleIncrement = (type: keyof LoadoutEnhancers) => {
    onUpdate({
      ...enhancers,
      [type]: Math.min(maxPerType, enhancers[type] + 1),
    });
  };

  return (
    <div>
      <div className="text-xs text-muted mb-2">Enhancers ({total}/100)</div>
      <div className="grid grid-cols-2 gap-2">
        {(['dmg', 'acc', 'rng', 'eco'] as const).map((type) => (
          <div key={type} className="bg-surface rounded-lg p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase text-muted">{type}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDecrement(type)}
                  className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center"
                  title={`Decrease ${type}`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono w-6 text-center">{enhancers[type]}</span>
                <button
                  onClick={() => handleIncrement(type)}
                  className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center"
                  title={`Increase ${type}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
