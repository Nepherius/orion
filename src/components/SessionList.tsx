import { useState } from 'react';
import { useHuntStore } from '../store';
import { Plus, Search } from 'lucide-react';
import { NewSessionModal } from './NewSessionModal';
import { format } from 'date-fns';

interface SessionListProps {
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
}

export function SessionList({ selectedSessionId, onSelectSession }: SessionListProps) {
  const sessions = useHuntStore((state) => state.sessions);
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(
    (session) =>
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.creature.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Hunt Sessions</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      {/* Session List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            No sessions found. Create your first hunt session!
          </p>
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedSessionId === session.id
                  ? 'bg-primary-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{session.name}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    session.status === 'active'
                      ? 'bg-green-600'
                      : session.status === 'paused'
                        ? 'bg-yellow-600'
                        : 'bg-gray-600'
                  }`}
                >
                  {session.status}
                </span>
              </div>
              <p className="text-sm text-gray-300">{session.creature}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{format(session.startTime, 'MMM dd, yyyy')}</span>
                <span className={session.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}>
                  {session.stats.returns.toFixed(1)}% return
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {showNewModal && <NewSessionModal onClose={() => setShowNewModal(false)} />}
    </div>
  );
}
