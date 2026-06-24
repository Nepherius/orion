import { useMemo, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Check, Clipboard, Download, X } from 'lucide-react';
import type { HuntSession } from '../../types';
import {
  buildCreatureHuntLog,
  createCreatureHuntLogCsv,
  createCreatureHuntLogMarkdown,
  type CreatureHuntLogFilters,
} from '../../utils/creatureHuntLog';

interface CreatureHuntLogModalProps {
  creature: string;
  sessions: HuntSession[];
  filters?: CreatureHuntLogFilters;
  onClose: () => void;
}

const fixed = (value: number) => value.toFixed(2);
const formatDate = (timestamp: number | null) =>
  timestamp
    ? new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

const safeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLocaleLowerCase() || 'creature';

const emptyTagFilter: string[] = [];

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back to a temporary textarea for WebViews without clipboard permission.
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
}

export function CreatureHuntLogModal({
  creature,
  sessions,
  filters,
  onClose,
}: CreatureHuntLogModalProps) {
  const filterStartTime = filters?.startTime ?? null;
  const filterEndTime = filters?.endTime ?? null;
  const filterTags = filters?.tags ?? emptyTagFilter;
  const report = useMemo(
    () =>
      buildCreatureHuntLog(sessions, creature, {
        startTime: filterStartTime,
        endTime: filterEndTime,
        tags: filterTags,
      }),
    [creature, sessions, filterStartTime, filterEndTime, filterTags]
  );
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleCopyForumLog = async () => {
    setExportError(null);
    try {
      await copyText(createCreatureHuntLogMarkdown(report));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy forum hunting log:', error);
      setExportError('Unable to copy the forum log.');
    }
  };

  const handleExportCsv = async () => {
    setExportError(null);
    const csv = createCreatureHuntLogCsv(report);
    const fileName = `${safeFileName(creature)}-hunting-log.csv`;

    try {
      if (isTauri()) {
        const path = await save({
          title: `Export ${creature} Hunting Log`,
          defaultPath: fileName,
          filters: [{ name: 'CSV spreadsheet', extensions: ['csv'] }],
        });
        if (path) await writeTextFile(path, csv);
        return;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export creature hunting log:', error);
      setExportError('Unable to export the CSV file.');
    }
  };

  const { summary } = report;
  const hasData = report.runs.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl font-bold text-blue-400">{creature} Hunting Log</h2>
            <p className="mt-1 text-sm text-muted">
              Forum-style lifetime report using TT values and the Creature Analytics allocation
              rules.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-white"
            aria-label="Close hunting log"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {!hasData ? (
            <div className="rounded-lg border border-border bg-white/[0.03] p-8 text-center text-muted">
              No completed sessions can be allocated to {creature}.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                <SummaryValue label="Sessions" value={summary.sessionsIncluded.toLocaleString()} />
                <SummaryValue label="Kills" value={summary.kills.toLocaleString()} />
                <SummaryValue label="Skill Gains" value={fixed(summary.totalSkillGains)} />
                <SummaryValue label="Hours" value={fixed(summary.durationHours)} />
                <SummaryValue
                  label="TT Cost"
                  value={`${fixed(summary.ttCost)} PED`}
                  valueClassName="text-red-400"
                />
                <SummaryValue
                  label="TT Return"
                  value={`${fixed(summary.ttReturn)} PED`}
                  valueClassName="text-blue-400"
                />
                <SummaryValue
                  label="TT Return %"
                  value={`${fixed(summary.ttReturnPercent)}%`}
                  valueClassName={
                    summary.ttReturnPercent >= 100 ? 'text-green-400' : 'text-yellow-400'
                  }
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-border bg-white/[0.03] p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
                    Hunt Details
                  </h3>
                  <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
                    <Detail label="Period">
                      {formatDate(summary.startTime)} – {formatDate(summary.endTime)}
                    </Detail>
                    <Detail label="Locations">
                      {summary.locations.join(', ') || 'Not recorded'}
                    </Detail>
                    <Detail label="Maturities">
                      {summary.maturities.join(', ') || 'Not recorded'}
                    </Detail>
                    <Detail label="Equipment">
                      {summary.equipment.join(', ') || 'Not recorded'}
                    </Detail>
                    <Detail label="Globals / HoFs">
                      {summary.globals} / {summary.hofs}
                    </Detail>
                  </dl>
                </section>

                <section className="rounded-lg border border-border bg-white/[0.03] p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
                    Cost & Return
                  </h3>
                  <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-2 text-sm">
                    <Detail label="Ammo">{fixed(summary.ammoCost)} PED</Detail>
                    <Detail label="Weapon decay">{fixed(summary.weaponDecay)} PED</Detail>
                    <Detail label="Healing">{fixed(summary.healingCost)} PED</Detail>
                    <Detail label="Other">{fixed(summary.otherCosts)} PED</Detail>
                    <Detail label="TT profit/loss">
                      <span className={summary.ttProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {summary.ttProfit >= 0 ? '+' : ''}
                        {fixed(summary.ttProfit)} PED
                      </span>
                    </Detail>
                    <Detail label="With valuation">
                      {fixed(summary.adjustedReturn)} PED ({fixed(summary.adjustedReturnPercent)}%)
                    </Detail>
                  </dl>
                </section>
              </div>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Runs</h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead className="bg-surface-hover text-left text-xs uppercase text-muted">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Session</th>
                        <th className="p-3 text-right">Kills</th>
                        <th className="p-3 text-right">Skill Gains</th>
                        <th className="p-3 text-right">TT Cost</th>
                        <th className="p-3 text-right">TT Return</th>
                        <th className="p-3 text-right">Return</th>
                        <th className="p-3 text-right">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.runs.map((run) => (
                        <tr key={`${run.date}-${run.number}`} className="border-t border-border">
                          <td className="p-3 text-muted">{run.number}</td>
                          <td className="p-3 whitespace-nowrap">{formatDate(run.date)}</td>
                          <td className="max-w-64 truncate p-3" title={run.sessionName}>
                            {run.sessionName}
                          </td>
                          <td className="p-3 text-right font-mono">{run.kills}</td>
                          <td className="p-3 text-right font-mono">{fixed(run.skillGains)}</td>
                          <td className="p-3 text-right font-mono">{fixed(run.ttCost)}</td>
                          <td className="p-3 text-right font-mono">{fixed(run.ttReturn)}</td>
                          <td className="p-3 text-right font-mono">
                            {fixed(run.ttReturnPercent)}%
                          </td>
                          <td className="p-3 text-right font-mono">{fixed(run.durationHours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Skill Gains</h3>
                {report.skillGains.length === 0 ? (
                  <div className="rounded-lg border border-border p-4 text-sm text-muted">
                    No skill gains recorded.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-auto rounded-lg border border-border">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead className="sticky top-0 bg-surface-hover text-left text-xs uppercase text-muted">
                        <tr>
                          <th className="p-3">Skill</th>
                          <th className="p-3 text-right">Gain Amount</th>
                          <th className="p-3 text-right">Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.skillGains.map((skill) => (
                          <tr key={skill.name} className="border-t border-border">
                            <td className="p-3">{skill.name}</td>
                            <td className="p-3 text-right font-mono">{fixed(skill.gainAmount)}</td>
                            <td className="p-3 text-right font-mono">{skill.events}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
                  Loot Composition
                </h3>
                <div className="max-h-80 overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="sticky top-0 bg-surface-hover text-left text-xs uppercase text-muted">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">TT</th>
                        <th className="p-3 text-right">Adjusted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lootComposition.map((item) => (
                        <tr key={item.name} className="border-t border-border">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-right font-mono">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono">{fixed(item.ttValue)}</td>
                          <td className="p-3 text-right font-mono">{fixed(item.adjustedValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <p className="text-xs text-muted">
                Full single-creature sessions use session totals. Completely linked mixed sessions
                are allocated by selected-creature kill cost. {summary.excludedMixedSessions}{' '}
                incomplete mixed session{summary.excludedMixedSessions === 1 ? '' : 's'} excluded.
                Skill gain amounts are included; skill levels and Codex progress are not shown
                because Orion does not track reliable before/after values.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
          <div className="text-xs text-red-400">{exportError}</div>
          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={handleCopyForumLog}
              disabled={!hasData}
              className="btn-secondary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Forum Log'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!hasData}
              className="btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryValue({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold ${valueClassName}`}>{value}</div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}
