interface AnalyticsConsentModalProps {
  onAllow: () => void;
  onDecline: () => void;
}

export function AnalyticsConsentModal({ onAllow, onDecline }: AnalyticsConsentModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-8 max-w-md w-full mx-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Share Anonymous Analytics?</h2>
          <p className="text-muted">
            Orion can send a tiny app-open event to help measure active installs and version
            adoption.
          </p>
        </div>

        <div className="rounded border border-border bg-surface-dark p-4 text-sm text-muted">
          The event payload contains Orion version, operating system, build mode, and a generated
          local install id. Avatar names, chat logs, sessions, loot, and Entropia data are not
          recorded.
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onDecline} className="btn-secondary flex-1">
            Do Not Share
          </button>
          <button type="button" onClick={onAllow} className="btn-primary flex-1">
            Share Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
