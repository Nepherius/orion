// Orion App main entry point
// This file sets up the main React application, dynamic imports, and routing for all major views.
import { useState, useEffect, lazy, Suspense } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { open } from '@tauri-apps/plugin-shell';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { useHuntStore, setupStoreSync, initializeStoreFromDb } from './store';
import packageJson from '../package.json';
import { useInitialDataLoader } from './hooks/useInitialDataLoader';
import type { HuntSession } from './types';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Panel } from './components/common/Panel';
import { UpdateModal } from './components/common/UpdateModal';

// Dynamically imported views and components to minimize bundle size
const SessionList = lazy(() =>
  import('./components/sessions/SessionList').then((m) => ({ default: m.SessionList }))
);
const SessionDetails = lazy(() =>
  import('./components/sessions/SessionDetails').then((m) => ({ default: m.SessionDetails }))
);
const ViewStats = lazy(() =>
  import('./components/views/ViewStats').then((m) => ({ default: m.ViewStats }))
);
const ActiveSessionPanel = lazy(() =>
  import('./components/sessions/ActiveSessionPanel').then((m) => ({
    default: m.ActiveSessionPanel,
  }))
);
const ChatLogMonitor = lazy(() =>
  import('./components/views/ChatLogMonitor').then((m) => ({ default: m.ChatLogMonitor }))
);
const WelcomeModal = lazy(() =>
  import('./components/views/WelcomeModal').then((m) => ({ default: m.WelcomeModal }))
);
const Loot = lazy(() => import('./components/loot/Loot').then((m) => ({ default: m.Loot })));
const Loadouts = lazy(() =>
  import('./components/views/Loadouts').then((m) => ({ default: m.Loadouts }))
);
const ItemDatabase = lazy(() =>
  import('./components/views/ItemDatabase').then((m) => ({ default: m.ItemDatabase }))
);
const Analytics = lazy(() =>
  import('./components/views/Analytics').then((m) => ({ default: m.Analytics }))
);
const Settings = lazy(() =>
  import('./components/views/Settings').then((m) => ({ default: m.Settings }))
);
const SessionSummaryModal = lazy(() =>
  import('./components/sessions/SessionSummaryModal').then((m) => ({
    default: m.SessionSummaryModal,
  }))
);

import {
  AlertTriangle,
  Database,
  Settings as SettingsIcon,
  BarChart3,
  Sword,
  X,
} from 'lucide-react';

type View = 'dashboard' | 'loot' | 'loadouts' | 'sessions' | 'database' | 'analytics' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [viewStatsOverlaySessionId, setViewStatsOverlaySessionId] = useState<string | null>(null);
  const [completedSessionSummary, setCompletedSessionSummary] = useState<HuntSession | null>(null);
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );
  const isLiveSessionAvailable =
    activeSession?.status === 'active' || activeSession?.status === 'paused';
  const selectedSession = useHuntStore((state) =>
    selectedSessionId ? state.sessions.find((s) => s.id === selectedSessionId) || null : null
  );

  const openSelectedSessionViewStatsOverlay = () => {
    if (selectedSession?.status === 'completed') {
      setViewStatsOverlaySessionId(selectedSession.id);
    }
  };

  const avatarName = useHuntStore((state) => state.settings.avatarName);
  const theme = useHuntStore((state) => state.settings.theme);
  const persistenceError = useHuntStore((state) => state.persistenceError);
  const clearPersistenceError = useHuntStore((state) => state.clearPersistenceError);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial equipment data from API on fresh install
  const {
    isLoading: isLoadingInitialData,
    progress: initialDataProgress,
    error: initialDataError,
  } = useInitialDataLoader();
  const [showInitialDataError, setShowInitialDataError] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    'prompt' | 'downloading' | 'installing' | 'error'
  >('prompt');
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string>();

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

  // Show error notification if initial data load fails
  useEffect(() => {
    if (initialDataError) {
      setShowInitialDataError(true);

      console.error('[App] Initial data load error:', initialDataError);
    }
  }, [initialDataError]);

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

  // Set initial view to Live if there's an active/paused session
  useEffect(() => {
    if (dataLoaded && isLiveSessionAvailable) {
      setCurrentView('dashboard');
    }
  }, [dataLoaded, isLiveSessionAvailable]); // Only run once when data loads

  // Check GitHub Releases after startup. Failures stay non-blocking so an unavailable
  // release endpoint never prevents Orion from opening normally.
  useEffect(() => {
    if (!dataLoaded || !isTauri()) {
      return;
    }

    let cancelled = false;

    void check({ timeout: 15_000 })
      .then((update) => {
        if (cancelled) {
          void update?.close();
          return;
        }
        if (update) {
          setAvailableUpdate(update);
          setUpdateStatus('prompt');
        }
      })
      .catch((error: unknown) => {
        console.warn('[Updater] Update check failed:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [dataLoaded]);

  const dismissUpdate = () => {
    if (updateStatus === 'downloading' || updateStatus === 'installing') {
      return;
    }
    void availableUpdate?.close();
    setAvailableUpdate(null);
    setUpdateStatus('prompt');
    setUpdateProgress(null);
    setUpdateError(undefined);
  };

  const installUpdate = async () => {
    if (!availableUpdate) {
      return;
    }

    setUpdateStatus('downloading');
    setUpdateProgress(null);
    setUpdateError(undefined);

    let downloaded = 0;
    let contentLength: number | undefined;

    try {
      await availableUpdate.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength;
          setUpdateProgress(contentLength ? 0 : null);
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (contentLength) {
            setUpdateProgress(Math.min(100, Math.round((downloaded / contentLength) * 100)));
          }
        } else {
          setUpdateProgress(100);
          setUpdateStatus('installing');
        }
      });

      setUpdateStatus('installing');
      await relaunch();
    } catch (error) {
      console.error('[Updater] Update installation failed:', error);
      setUpdateError(error instanceof Error ? error.message : String(error));
      setUpdateStatus('error');
    }
  };

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

      {availableUpdate && (
        <UpdateModal
          currentVersion={availableUpdate.currentVersion}
          version={availableUpdate.version}
          notes={availableUpdate.body}
          hasActiveSession={isLiveSessionAvailable}
          status={updateStatus}
          progress={updateProgress}
          error={updateError}
          onInstall={() => void installUpdate()}
          onClose={dismissUpdate}
        />
      )}

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

      {/* Initial data loading overlay - shown after DB loads on first run */}
      {dataLoaded && isLoadingInitialData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center flex flex-col items-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
              <h3 className="text-lg font-bold mb-2">First Run Setup</h3>
              <p className="text-muted mb-4">Syncing equipment data from Entropia Nexus...</p>
              {initialDataProgress && (
                <div className="w-full">
                  <p className="text-sm text-primary-400 mb-2">{initialDataProgress.fileName}</p>
                  <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width:
                          initialDataProgress.total > 0
                            ? `${(initialDataProgress.current / initialDataProgress.total) * 100}%`
                            : '100%',
                      }}
                    ></div>
                  </div>
                  {initialDataProgress.total > 0 && (
                    <p className="text-xs text-muted mt-2">
                      {initialDataProgress.current} of {initialDataProgress.total} files
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initial data error notification */}
      {showInitialDataError && (
        <div className="fixed bottom-6 right-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 max-w-sm z-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/30 flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-200">Equipment data download failed</p>
              <p className="text-xs text-red-300/70 mt-1">
                The app will continue to work normally. The system will retry on next restart.
              </p>
            </div>
            <button
              onClick={() => setShowInitialDataError(false)}
              className="flex-shrink-0 text-red-300/50 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {persistenceError && (
        <div className="fixed bottom-6 left-6 z-[60] max-w-md rounded-lg border border-red-500/50 bg-red-950/95 p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-100">Changes may not be saved</p>
              <p className="mt-1 text-xs text-red-200/80">
                Orion could not write recent changes to its database. Keep the app open and retry
                the action before restarting.
              </p>
              <p className="mt-2 break-all font-mono text-[11px] text-red-300/70">
                {persistenceError.command}: {persistenceError.message}
              </p>
            </div>
            <button
              onClick={clearPersistenceError}
              className="shrink-0 text-red-300/60 transition-colors hover:text-red-200"
              title="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
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
                <button
                  onClick={() => setCurrentView('dashboard')}
                  disabled={!isLiveSessionAvailable}
                  className={`btn w-28 justify-center ${currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'} ${
                    !isLiveSessionAvailable ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={
                    isLiveSessionAvailable
                      ? 'Open live session view'
                      : 'Live view is only available when a session is active or paused'
                  }
                >
                  <span className="text-primary-400 text-xs font-bold tracking-wide inline mr-2">
                    ●
                  </span>
                  Live
                </button>
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
                  onSessionEnded={(completedSession) => {
                    setCurrentView('sessions');
                    setSelectedSessionId(completedSession.id);
                    setCompletedSessionSummary(completedSession);
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
            <ErrorBoundary name="Main view" resetKey={currentView}>
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                }
              >
                {currentView === 'dashboard' && (
                  <ViewStats
                    sessionId={selectedSessionId ?? activeSession?.id ?? null}
                    onSessionResumed={() => setCurrentView('dashboard')}
                    showSidebar={true}
                  />
                )}

                {currentView === 'loot' && <Loot />}

                {currentView === 'sessions' && (
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-4 space-y-6">
                      <SessionList
                        selectedSessionId={selectedSessionId}
                        onSelectSession={setSelectedSessionId}
                        onNavigateToDashboard={() => setCurrentView('dashboard')}
                      />
                    </div>
                    <div className="col-span-8">
                      {selectedSessionId ? (
                        <SessionDetails
                          sessionId={selectedSessionId}
                          onSessionResumed={() => setCurrentView('dashboard')}
                          onOpenInDashboard={openSelectedSessionViewStatsOverlay}
                        />
                      ) : (
                        <Panel contentClassName="py-4 text-center text-muted">
                          <p>Select a session to view details</p>
                        </Panel>
                      )}
                    </div>
                  </div>
                )}

                {currentView === 'loadouts' && <Loadouts />}

                {currentView === 'database' && <ItemDatabase />}

                {currentView === 'analytics' && <Analytics />}

                {currentView === 'settings' && <Settings />}
              </Suspense>
            </ErrorBoundary>
          </main>

          {viewStatsOverlaySessionId && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setViewStatsOverlaySessionId(null)}
            >
              <div className="h-full w-full p-6">
                <div
                  className="card h-full max-w-7xl mx-auto flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h2 className="text-lg font-semibold">Overview</h2>
                    <button
                      onClick={() => setViewStatsOverlaySessionId(null)}
                      className="btn-secondary h-8 w-8 p-0 flex items-center justify-center"
                      title="Close Overview"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <ViewStats
                      sessionId={viewStatsOverlaySessionId}
                      showHeader={false}
                      showSidebar={false}
                      onSessionResumed={() => {
                        setViewStatsOverlaySessionId(null);
                        setCurrentView('dashboard');
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {completedSessionSummary && (
            <SessionSummaryModal
              isOpen={!!completedSessionSummary}
              onClose={() => setCompletedSessionSummary(null)}
              session={completedSessionSummary}
            />
          )}

          {/* Footer */}
          <footer className="border-t border-border px-6 py-4 mt-12 bg-surface">
            <div className="max-w-7xl mx-auto text-center text-sm text-muted">
              <p>
                Enjoying Orion Loot Tracker v{packageJson.version}?{' '}
                <button
                  type="button"
                  onClick={() => open('https://buymeacoffee.com/nepheriusjc')}
                  className="cursor-pointer text-primary-400 underline transition-colors hover:text-primary-300"
                >
                  Buy me a coffee
                </button>
              </p>
              <p className="mt-1">Not affiliated with MindArk PE AB or Entropia Universe.</p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
