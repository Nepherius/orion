import { useState } from 'react';
import { useHuntStore } from '../store';
import { Plus, Search, Circle, CheckCircle, Clock } from 'lucide-react';
import { NewSessionModal } from './NewSessionModal';
import { format } from 'date-fns';

interface SessionListProps {
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
}

type StatusFilter = 'all' | 'active' | 'paused' | 'completed';
type SortOption = 'newest' | 'oldest' | 'profit' | 'returns';

export function SessionList({ selectedSessionId, onSelectSession }: SessionListProps) {
  const sessions = useHuntStore((state) => state.sessions);
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter sessions
  let filteredSessions = sessions.filter(
    (session) =>
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.weapon.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (statusFilter !== 'all') {
    filteredSessions = filteredSessions.filter((s) => s.status === statusFilter);
  }

  // Sort sessions
  filteredSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.startTime - a.startTime;
      case 'oldest':
        return a.startTime - b.startTime;
      case 'profit':
        return (b.stats.totalLoot - b.stats.totalCost) - (a.stats.totalLoot - a.stats.totalCost);
      case 'returns':
        return b.stats.returns - a.stats.returns;
      default:
        return 0;
    }
  });

  // Calculate counts
  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 250px)' }}>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      {/* Status Filters */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Status</div>
        <div className="space-y-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-900 text-primary-300'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4" />
              <span>All Sessions</span>
            </div>
            <span className="text-gray-500">{sessions.length}</span>
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
              statusFilter === 'active'
                ? 'bg-primary-900 text-primary-300'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Active</span>
            </div>
            <span className="text-gray-500">{activeCount}</span>
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
              statusFilter === 'completed'
                ? 'bg-primary-900 text-primary-300'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Completed</span>
            </div>
            <span className="text-gray-500">{completedCount}</span>
          </button>
        </div>
      </div>

      {/* Sort By */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Sort By</div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="input w-full text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="profit">Highest Profit</option>
          <option value="returns">Best Returns</option>
        </select>
      </div>

      {/* New Session Button */}
      <button
        onClick={() => setShowNewModal(true)}
        className="btn-primary w-full mb-4 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        New Session
      </button>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredSessions.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            No sessions found. Create your first hunt session!
          </p>
        ) : (
          filteredSessions.map((session) => {
            const profit = session.stats.totalLoot - session.stats.totalCost;
            const duration = session.endTime
              ? session.endTime - session.startTime
              : Date.now() - session.startTime;

            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors border ${
                  selectedSessionId === session.id
                    ? 'bg-gray-700 border-primary-500'
                    : 'bg-gray-750 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-white mb-1">{session.name}</div>
                    <div className="text-xs text-gray-400">
                      {format(session.startTime, 'MMM dd')} · {formatDuration(duration)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}{profit.toFixed(3)} PED
                    </div>
                    <div className="text-xs text-gray-400">PROFIT</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 text-[10px] uppercase font-semibold rounded ${
                      session.status === 'active'
                        ? 'bg-green-900 text-green-300'
                        : session.status === 'paused'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {session.status}
                  </span>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${session.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                      {session.stats.returns.toFixed(3)}%
                    </div>
                    <div className="text-xs text-gray-400">TT%</div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {showNewModal && <NewSessionModal onClose={() => setShowNewModal(false)} />}
    </div>
  );
}
