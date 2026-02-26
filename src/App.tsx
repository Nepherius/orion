import { useState } from 'react';
import { useHuntStore } from './store';
import { SessionList } from './components/SessionList';
import { SessionDetails } from './components/SessionDetails';
import { ActiveSessionPanel } from './components/ActiveSessionPanel';
import { ItemDatabase } from './components/ItemDatabase';
import { Settings } from './components/Settings';
import { ChatLogMonitor } from './components/ChatLogMonitor';
import { Target, Database, Settings as SettingsIcon, BarChart3 } from 'lucide-react';

type View = 'sessions' | 'database' | 'analytics' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const activeSession = useHuntStore((state) => state.getActiveSession());

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-primary-500" />
            <h1 className="text-2xl font-bold">ORION</h1>
            <span className="text-sm text-gray-400">Hunt Tracker</span>
          </div>

          {/* Navigation */}
          <nav className="flex gap-2">
            <button
              onClick={() => setCurrentView('sessions')}
              className={`btn ${currentView === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Sessions
            </button>
            <button
              onClick={() => setCurrentView('database')}
              className={`btn ${currentView === 'database' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Database className="w-4 h-4 inline mr-2" />
              Database
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`btn ${currentView === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`btn ${currentView === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <SettingsIcon className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </nav>
        </div>
      </header>

      {/* Active Session Banner */}
      {activeSession && (
        <div className="bg-primary-900 border-b border-primary-700">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <ActiveSessionPanel session={activeSession} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {currentView === 'sessions' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 space-y-6">
              <SessionList
                selectedSessionId={selectedSessionId}
                onSelectSession={setSelectedSessionId}
              />
              <ChatLogMonitor />
            </div>
            <div className="col-span-8">
              {selectedSessionId ? (
                <SessionDetails sessionId={selectedSessionId} />
              ) : (
                <div className="card p-8 text-center text-gray-400">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a session to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'database' && <ItemDatabase />}

        {currentView === 'analytics' && (
          <div className="card p-8 text-center text-gray-400">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Analytics view coming soon</p>
          </div>
        )}

        {currentView === 'settings' && <Settings />}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
          <p>Orion Hunt Tracker v0.1.0 - Track your Entropia Universe hunting sessions</p>
          <p className="mt-1">Not affiliated with MindArk PE AB or Entropia Universe</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
