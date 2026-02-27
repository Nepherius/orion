import { useState, useEffect } from 'react';
import { useHuntStore, setupStoreSync } from './store';
import { SessionList } from './components/sessions/SessionList';
import { SessionDetails } from './components/sessions/SessionDetails';
import { ActiveSessionPanel } from './components/sessions/ActiveSessionPanel';
import { ItemDatabase } from './components/views/ItemDatabase';
import { Settings } from './components/views/Settings';
import { ChatLogMonitor } from './components/views/ChatLogMonitor';
import { ChatLogMonitorPanel } from './components/views/ChatLogMonitorPanel';
import { WelcomeModal } from './components/views/WelcomeModal';
import { Dashboard } from './components/views/Dashboard';
import { Loot } from './components/loot/Loot';
import { Loadouts } from './components/views/Loadouts';
import {
  Database,
  Settings as SettingsIcon,
  BarChart3,
  Activity,
  Package,
  Sword,
} from 'lucide-react';

type View = 'dashboard' | 'loot' | 'loadouts' | 'sessions' | 'database' | 'analytics' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const activeSession = useHuntStore((state) => state.getActiveSession());
  const avatarName = useHuntStore((state) => state.settings.avatarName);
  const [showWelcome, setShowWelcome] = useState(!avatarName);

  // Setup cross-window sync on mount
  useEffect(() => {
    setupStoreSync();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {showWelcome && <WelcomeModal onComplete={() => setShowWelcome(false)} />}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-bold text-primary-400 text-lg tracking-widest">ORION</div>
            <span className="text-sm text-gray-400">Entropia Universe Loot Tracker</span>
          </div>

          {/* Navigation */}
          <nav className="flex gap-2">
            {activeSession && (
              <>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`btn ${currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Activity className="w-4 h-4 inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('loot')}
                  className={`btn ${currentView === 'loot' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Loot
                </button>
              </>
            )}
            <button
              onClick={() => setCurrentView('sessions')}
              className={`btn ${currentView === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <span className="text-primary-400 text-xs font-bold tracking-wide inline mr-2">◆</span>
              Sessions
            </button>
            <button
              onClick={() => setCurrentView('loadouts')}
              className={`btn ${currentView === 'loadouts' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Sword className="w-4 h-4 inline mr-2" />
              Loadouts
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
            <ActiveSessionPanel
              session={activeSession}
              onSessionEnded={(sessionId) => {
                setCurrentView('sessions');
                setSelectedSessionId(sessionId);
              }}
              onSessionResumed={() => setCurrentView('dashboard')}
            />
          </div>
        </div>
      )}

      {/* Chat Log Monitor - Always mounted to track events */}
      <div className="hidden">
        <ChatLogMonitor />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {currentView === 'dashboard' && <Dashboard />}

        {currentView === 'loot' && <Loot />}

        {currentView === 'sessions' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 space-y-6">
              <SessionList
                selectedSessionId={selectedSessionId}
                onSelectSession={setSelectedSessionId}
                onNavigateToDashboard={() => setCurrentView('dashboard')}
              />
              <ChatLogMonitorPanel />
            </div>
            <div className="col-span-8">
              {selectedSessionId ? (
                <SessionDetails
                  sessionId={selectedSessionId}
                  onSessionResumed={() => setCurrentView('dashboard')}
                />
              ) : (
                <div className="card p-8 text-center text-gray-400">
                  <img
                    src="/icon.png"
                    alt="Orion"
                    className="w-16 h-16 mx-auto mb-4 opacity-50 object-contain"
                  />
                  <p>Select a session to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'loadouts' && <Loadouts />}

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
          <p>Orion Loot Tracker v0.1.0 - Track your Entropia Universe hunting sessions</p>
          <p className="mt-1">Not affiliated with MindArk PE AB or Entropia Universe</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
