import { useState } from 'react';
import { Search } from 'lucide-react';
import { EquipmentItem } from '../../types';
import { filterEquipmentItems } from '../../utils/loadoutCalculations';

interface EquipmentSelectorProps {
  label: string;
  items: EquipmentItem[];
  selected: EquipmentItem | undefined;
  onSelect: (item: EquipmentItem) => void;
  placeholder?: string;
}

export function EquipmentSelector({
  label,
  items,
  selected,
  onSelect,
  placeholder = 'Search...',
}: EquipmentSelectorProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = filterEquipmentItems(items, search);

  const handleSelect = (item: EquipmentItem) => {
    onSelect(item);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="text-xs text-muted uppercase block mb-1">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder={selected?.Name || placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="input w-full pl-10"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((item: EquipmentItem) => (
            <button
              key={item.Id}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-gray-600 text-sm transition-colors"
            >
              {item.Name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
