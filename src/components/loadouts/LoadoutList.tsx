import { Search, Circle, Star } from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'favorites';
type SortOption = 'name-az' | 'name-za' | 'cost' | 'dpp';

interface LoadoutListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeCount: number;
  favoriteCount: number;
  totalCount: number;
}

export function LoadoutList({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  activeCount,
  favoriteCount,
  totalCount,
}: LoadoutListProps) {
  return (
    <div
      className="col-span-3 bg-gray-800 rounded-lg p-4 flex flex-col"
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search loadouts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Filters</div>
        <div className="space-y-1">
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-900 text-primary-300'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4" />
              <span>All Loadouts</span>
            </div>
            <span className="text-gray-500">{totalCount}</span>
          </button>
          <button
            onClick={() => onStatusFilterChange('active')}
            className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
              statusFilter === 'primary'
                ? 'bg-primary-900 text-primary-300'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 fill-green-400 text-green-400" />
              <span>Active</span>
            </div>
            <span className="text-gray-500">{activeCount}</span>
          </button>
          <button
            onClick={() => onStatusFilterChange('favorites')}
            className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
              statusFilter === 'favorites'
                ? 'bg-primary-900 text-primary-300'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>Favorites</span>
            </div>
            <span className="text-gray-500">{favoriteCount}</span>
          </button>
        </div>
      </div>

      {/* Sort By */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Sort By</div>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="input w-full text-sm"
        >
          <option value="name-az">Name A-Z</option>
          <option value="name-za">Name Z-A</option>
          <option value="cost">Lowest Cost</option>
          <option value="dpp">Highest DPP</option>
        </select>
      </div>
    </div>
  );
}
