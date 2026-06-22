import { Download, RefreshCw, X } from 'lucide-react';

interface UpdateModalProps {
  currentVersion: string;
  version: string;
  notes?: string;
  hasActiveSession: boolean;
  status: 'prompt' | 'downloading' | 'installing' | 'error';
  progress: number | null;
  error?: string;
  onInstall: () => void;
  onClose: () => void;
}

export function UpdateModal({
  currentVersion,
  version,
  notes,
  hasActiveSession,
  status,
  progress,
  error,
  onInstall,
  onClose,
}: UpdateModalProps) {
  const isBusy = status === 'downloading' || status === 'installing';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Download className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Orion update available</h2>
              <p className="mt-1 text-sm text-muted">
                Version {currentVersion} → {version}
              </p>
            </div>
          </div>
          {!isBusy && (
            <button onClick={onClose} className="text-muted hover:text-white" title="Update later">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {notes && (
          <div className="mb-4 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-white/[0.03] p-3 text-sm text-gray-300">
            {notes}
          </div>
        )}

        {hasActiveSession && status === 'prompt' && (
          <p className="mb-4 rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            A hunting session is currently active or paused. Finish or pause safely before updating;
            Orion will restart after installation.
          </p>
        )}

        {status === 'error' && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            The update could not be installed. {error}
          </p>
        )}

        {isBusy && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{status === 'installing' ? 'Installing update…' : 'Downloading update…'}</span>
              {progress !== null && <span>{progress}%</span>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-dark">
              <div
                className={`h-full rounded-full bg-primary-500 transition-all ${
                  progress === null ? 'w-1/3 animate-pulse' : ''
                }`}
                style={progress === null ? undefined : { width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isBusy && (
            <button onClick={onClose} className="btn-secondary flex-1">
              Later
            </button>
          )}
          <button
            onClick={onInstall}
            disabled={isBusy}
            className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70"
          >
            {isBusy ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {status === 'installing' ? 'Installing' : 'Downloading'}
              </>
            ) : status === 'error' ? (
              'Retry'
            ) : (
              'Install and restart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
