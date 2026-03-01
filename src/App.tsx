import { useState, useEffect, lazy, Suspense } from 'react';
import { useHuntStore, setupStoreSync, initializeStoreFromDb } from './store';
import packageJson from '../package.json';
import { SessionList } from './components/sessions/SessionList';
import { SessionDetails } from './components/sessions/SessionDetails';
import { ActiveSessionPanel } from './components/sessions/ActiveSessionPanel';
import { ChatLogMonitor } from './components/views/ChatLogMonitor';
import { ChatLogMonitorPanel } from './components/views/ChatLogMonitorPanel';
import { WelcomeModal } from './components/views/WelcomeModal';

// Dynamically imported views to minimize RAM footprint of unfocused tabs
const Dashboard = lazy(() => import('./components/views/Dashboard').then(m => ({ default: m.Dashboard })));
const Loot = lazy(() => import('./components/loot/Loot').then(m => ({ default: m.Loot })));
const Loadouts = lazy(() => import('./components/views/Loadouts').then(m => ({ default: m.Loadouts })));
const ItemDatabase = lazy(() => import('./components/views/ItemDatabase').then(m => ({ default: m.ItemDatabase })));
const Analytics = lazy(() => import('./components/views/Analytics').then(m => ({ default: m.Analytics })));
const Settings = lazy(() => import('./components/views/Settings').then(m => ({ default: m.Settings })));

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
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );

  const avatarName = useHuntStore((state) => state.settings.avatarName);
  const theme = useHuntStore((state) => state.settings.theme);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Show welcome modal only after data is loaded and avatar name is still empty
  const showWelcome = dataLoaded && !avatarName;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug(
      '[App] avatarName:',
      avatarName,
      'dataLoaded:',
      dataLoaded,
      'showWelcome:',
      showWelcome
    );
  }, [avatarName, dataLoaded, showWelcome]);

  // Setup cross-window sync on mount
  // CRITICAL: Must await DB initialization before setting up sync
  // to prevent broadcasting empty state before sessions are loaded
  useEffect(() => {
    const init = async () => {
      await initializeStoreFromDb();
      const cleanup = await setupStoreSync();
      // Mark as loaded after DB init completes
      setDataLoaded(true);

      // Return cleanup function for proper teardown
      return cleanup;
    };

    let cleanup: (() => void) | undefined;
    void init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  // Remove splash screen once React has mounted
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.remove();
    }
  }, []);

  // Sync Tailwind CSS theme classes dynamically
  useEffect(() => {
    document.documentElement.className = '';
    if (theme !== 'dark') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
    <div className="min-h-screen text-body bg-background">
      {showWelcome && <WelcomeModal />}

      {/* Loading screen while database initializes */}
      {!dataLoaded && (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center flex flex-col items-center">
            <img
              src="/assets/images/orion_full_alt.svg"
              alt="Orion"
              className="mb-8"
              style={{ marginLeft: '100px' }}
            />
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-muted">Loading...</p>
          </div>
        </div>
      )}

      {/* Main app content - only show after DB is initialized */}
      {dataLoaded && (
        <>
          {/* Header */}
          <header className="border-b border-border px-6 py-4 bg-surface">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-bold text-primary-400 text-lg tracking-widest">ORION</div>
                <span className="text-sm text-muted">Entropia Universe Loot Tracker</span>
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
                  <span className="text-primary-400 text-xs font-bold tracking-wide inline mr-2">
                    ◆
                  </span>
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
            <div className="bg-[var(--color-banner-bg)] border-b border-[var(--color-banner-border)] shadow-md">
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
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>}>
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
                      <div className="card p-8 text-center text-muted">
                        <p>Select a session to view details</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentView === 'loadouts' && <Loadouts />}

              {currentView === 'database' && <ItemDatabase />}

              {currentView === 'analytics' && <Analytics />}

              {currentView === 'settings' && <Settings />}
            </Suspense>
          </main>

          {/* Footer */}
          <footer className="border-t border-border px-6 py-4 mt-12 bg-surface">
            <div className="max-w-7xl mx-auto text-center text-sm text-muted">
              <p>
                Orion Loot Tracker v{packageJson.version} - Track your Entropia Universe hunting
                sessions
              </p>
              <p className="mt-1">Not affiliated with MindArk PE AB or Entropia Universe</p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
