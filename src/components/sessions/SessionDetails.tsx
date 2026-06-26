import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useHuntStore } from '../../store';
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Award,
  Zap,
  Play,
  Pause,
  Edit2,
  List,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import { AddLootModal } from '../loot/AddLootModal';
import { AddGlobalModal } from '../loot/AddGlobalModal';
import { EditSessionModal } from './EditSessionModal';
import { CostsPanel } from './CostsPanel';
import { ConfirmModal } from '../common/ConfirmModal';
import { SessionSummaryModal } from './SessionSummaryModal';
import { CumulativeTrajectoryChart } from './CumulativeTrajectoryChart';
import { DataTable, DataTableColumn } from '../common/DataTable';
import { MetricTile, Panel } from '../common/Panel';

interface SessionDetailsProps {
  sessionId: string;
  onSessionResumed?: () => void;
  onOpenInDashboard?: () => void;
  displayMode?: 'full' | 'loot-only';
}

interface GroupedLootItem {
  name: string;
  quantity: number;
  value: number;
  markup: number;
  totalValue: number;
  count: number;
}

export function SessionDetails({
  sessionId,
  onSessionResumed,
  onOpenInDashboard,
  displayMode = 'full',
}: SessionDetailsProps) {
  const session = useHuntStore((state) => state.sessions.find((s) => s.id === sessionId));
  const loadoutName = useHuntStore((state) =>
    session?.loadoutId ? state.loadouts.find((l) => l.id === session.loadoutId)?.name : undefined
  );
  const removeLoot = useHuntStore((state) => state.removeLoot);
  const deleteSession = useHuntStore((state) => state.deleteSession);
  const resumeSession = useHuntStore((state) => state.resumeSession);
  const pauseSession = useHuntStore((state) => state.pauseSession);
  const [showAddLoot, setShowAddLoot] = useState(false);
  const [showAddGlobal, setShowAddGlobal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isLootExpanded, setIsLootExpanded] = useState(false);
  const [groupedLoot, setGroupedLoot] = useState<GroupedLootItem[]>([]);
  const [groupedLootError, setGroupedLootError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setGroupedLootError(null);

    const loadGroupedLoot = async () => {
      try {
        const result = await invoke<GroupedLootItem[]>('db_get_session_loot_grouped', {
          sessionUuid: session.id,
        });
        setGroupedLoot(result);
      } catch (error) {
        console.error('Failed to load grouped loot:', error);
        setGroupedLootError('Unable to load stacked loot totals.');
      }
    };

    if (!isLootExpanded && session.loot.length > 0) {
      loadGroupedLoot();
    }
  }, [isLootExpanded, session]);

  const profit = useMemo(() => {
    if (!session) return 0;
    return session.stats.adjustedProfit;
  }, [session]);

  const groupedSkills = useMemo(() => {
    if (!session) return [];
    return Object.values(
      session.skills.reduce(
        (acc, skill) => {
          if (!acc[skill.skillName]) {
            acc[skill.skillName] = {
              skillName: skill.skillName,
              gainAmount: 0,
              count: 0,
            };
          }
          acc[skill.skillName].gainAmount += skill.gainAmount;
          acc[skill.skillName].count += 1;
          return acc;
        },
        {} as Record<string, { skillName: string; gainAmount: number; count: number }>
      )
    ).sort((a, b) => b.gainAmount - a.gainAmount);
  }, [session]);

  if (!session) {
    return <Panel>Session not found</Panel>;
  }

  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    deleteSession(sessionId);
    setShowDeleteConfirm(false);
  };

  const handleResume = () => {
    resumeSession(sessionId);
    onSessionResumed?.();
  };

  const handlePause = () => {
    pauseSession(sessionId);
  };

  const isLootOnly = displayMode === 'loot-only';

  const btnWidth = 'w-31';
  const btnHeight = 'h-6';
  const detailedLootColumns: Array<DataTableColumn<(typeof session.loot)[number]>> = [
    {
      key: 'time',
      header: 'Time',
      render: (item) => <span className="text-muted">{format(item.timestamp, 'HH:mm:ss')}</span>,
    },
    { key: 'item', header: 'Item', span: 1.5, render: (item) => item.name },
    { key: 'quantity', header: 'Qty', align: 'right', render: (item) => item.quantity },
    {
      key: 'tt',
      header: 'TT Value',
      align: 'right',
      render: (item) => item.value.toFixed(2),
    },
    { key: 'markup', header: 'Markup', align: 'right', render: (item) => `${item.markup}%` },
    {
      key: 'total',
      header: 'Total Value',
      align: 'right',
      render: (item) => (
        <span className="font-semibold text-green-400">{item.totalValue.toFixed(2)} PED</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <button
          onClick={() => removeLoot(sessionId, item.id)}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const groupedLootColumns: Array<DataTableColumn<GroupedLootItem>> = [
    { key: 'item', header: 'Item', span: 1.5, render: (item) => item.name },
    { key: 'quantity', header: 'Qty', align: 'right', render: (item) => item.quantity },
    {
      key: 'tt',
      header: 'TT Value',
      align: 'right',
      render: (item) => item.value.toFixed(2),
    },
    {
      key: 'markup',
      header: 'Avg Markup',
      align: 'right',
      render: (item) => `${item.markup.toFixed(1)}%`,
    },
    {
      key: 'total',
      header: 'Total Value',
      align: 'right',
      render: (item) => (
        <span className="font-semibold text-green-400">{item.totalValue.toFixed(2)} PED</span>
      ),
    },
    {
      key: 'count',
      header: 'Count',
      align: 'right',
      render: (item) => <span className="text-muted">{item.count}x</span>,
    },
  ];

  const skillColumns: Array<
    DataTableColumn<{ skillName: string; gainAmount: number; count: number }>
  > = [
    { key: 'skill', header: 'Skill', span: 1.5, render: (skill) => skill.skillName },
    {
      key: 'gain',
      header: 'Gain Amount',
      align: 'right',
      render: (skill) => (
        <span className="font-semibold text-green-400">+{skill.gainAmount.toFixed(4)}</span>
      ),
    },
    {
      key: 'count',
      header: 'Count',
      align: 'right',
      render: (skill) => <span className="text-muted">{skill.count}x</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Session Overview Card */}
      {!isLootOnly && (
        <Panel>
          {/* Row 1: Title and Buttons */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">{session.name}</h2>
            <div className="flex gap-2">
              {session.status === 'completed' && (
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className={`btn-secondary ${btnHeight} ${btnWidth} px-3 flex items-center justify-center gap-2 text-sm whitespace-nowrap`}
                  title="View Executive Summary"
                >
                  <Award className="w-4 h-4 text-purple-400" />
                  Summary
                </button>
              )}
              {onOpenInDashboard && session.status === 'completed' && (
                <button
                  onClick={() => onOpenInDashboard()}
                  className={`btn-secondary ${btnHeight} ${btnWidth} px-3 flex items-center justify-center gap-2 text-sm whitespace-nowrap`}
                  title="Open Details"
                >
                  <Zap className="w-4 h-4" />
                  Details
                </button>
              )}
              {session.status === 'completed' ? (
                <button
                  onClick={handleResume}
                  className={`btn-primary ${btnHeight} ${btnWidth} px-3 flex items-center justify-center gap-2 text-sm whitespace-nowrap`}
                  title="Resume Session"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              ) : session.status === 'active' ? (
                <button
                  onClick={handlePause}
                  className={`btn-secondary ${btnHeight} ${btnWidth} px-3 flex items-center justify-center gap-2 text-sm whitespace-nowrap`}
                  title="Pause Session"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className={`btn-primary ${btnHeight} ${btnWidth} px-3 flex items-center justify-center gap-2 text-sm whitespace-nowrap`}
                  title="Resume Session"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className={`btn-secondary ${btnHeight} ${btnWidth} px-3 flex items-center justify-center gap-2 text-sm whitespace-nowrap`}
                title="Edit Session"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDeleteRequest}
                className={`bg-red-600 hover:bg-red-700 text-white ${btnHeight} ${btnWidth} px-3 rounded-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap transition-colors`}
                title="Delete Session"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="flex gap-6 text-sm mb-4">
            <div>
              <span className="text-muted">Started:</span>{' '}
              <span className="font-medium text-gray-300">{format(session.startTime, 'PPpp')}</span>
            </div>
            {session.endTime && (
              <div>
                <span className="text-muted">Ended:</span>{' '}
                <span className="font-medium text-gray-300">{format(session.endTime, 'PPpp')}</span>
              </div>
            )}
          </div>

          {/* Row 3: Details Grid */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-sm mb-4">
            <div className="text-muted">Loadout</div>
            <div className="text-muted">Weapon</div>
            <div className="text-muted">Location</div>
            <div className="text-muted">Creature</div>

            <div className="font-medium text-gray-300">{loadoutName || '-'}</div>
            <div className="font-medium text-gray-300">{session.weapon || '-'}</div>
            <div className="font-medium text-gray-300">{session.location || '-'}</div>
            <div className="font-medium text-gray-300">{session.creature || '-'}</div>
          </div>

          <div className="mt-6 space-y-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Cost and TT
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="Total Cost"
                  value={`${session.stats.totalCost.toFixed(2)} PED`}
                  valueClassName="text-red-400"
                  size="sm"
                />
                <MetricTile
                  label="TT Loot"
                  value={`${session.stats.totalTtLoot.toFixed(2)} PED`}
                  valueClassName="text-blue-400"
                  size="sm"
                />
                <MetricTile
                  label="TT Return"
                  value={`${session.stats.ttReturns.toFixed(1)}%`}
                  valueClassName={
                    session.stats.ttReturns >= 100 ? 'text-green-400' : 'text-red-400'
                  }
                  size="sm"
                />
                <MetricTile
                  label="TT P/L"
                  value={`${session.stats.ttProfit >= 0 ? '+' : ''}${session.stats.ttProfit.toFixed(2)} PED`}
                  valueClassName={session.stats.ttProfit >= 0 ? 'text-green-400' : 'text-red-400'}
                  size="sm"
                />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Adjusted Result
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="MU/Fixed Uplift"
                  value={`+${(session.stats.totalMarkupGain + session.stats.totalFixedGain).toFixed(2)} PED`}
                  detail={`MU ${session.stats.totalMarkupGain.toFixed(2)} · fixed ${session.stats.totalFixedGain.toFixed(2)}`}
                  valueClassName="text-green-400"
                  size="sm"
                />
                <MetricTile
                  label="Adjusted Loot"
                  value={`${session.stats.totalAdjustedLoot.toFixed(2)} PED`}
                  valueClassName="text-green-400"
                />
                <MetricTile
                  label="Adjusted Return"
                  value={`${session.stats.adjustedReturns.toFixed(1)}%`}
                  icon={
                    session.stats.adjustedReturns >= 100 ? (
                      <TrendingUp className="h-5 w-5 shrink-0" />
                    ) : (
                      <TrendingDown className="h-5 w-5 shrink-0" />
                    )
                  }
                  valueClassName={
                    session.stats.adjustedReturns >= 100 ? 'text-green-400' : 'text-red-400'
                  }
                />
                <MetricTile
                  label="Adjusted P/L"
                  value={`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} PED`}
                  valueClassName={profit >= 0 ? 'text-green-400' : 'text-red-400'}
                />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Activity
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <MetricTile label="Kills" value={session.stats.kills} size="sm" />
                <MetricTile label="Loot Events" value={session.stats.lootEvents} size="sm" />
                <MetricTile
                  label="Globals"
                  value={session.stats.globals}
                  valueClassName="text-yellow-400"
                  size="sm"
                />
                <MetricTile
                  label="HoFs"
                  value={session.stats.hofs}
                  valueClassName="text-purple-400"
                  size="sm"
                />
                <MetricTile
                  label="Duration"
                  value={`${Math.floor(session.stats.duration / 3600)}h ${Math.floor((session.stats.duration % 3600) / 60)}m`}
                  size="sm"
                />
              </div>
            </section>
          </div>
        </Panel>
      )}

      {/* Cumulative Trajectory Chart plotted along the session's duration */}
      <CumulativeTrajectoryChart session={session} />

      {/* Costs Panel */}
      {!isLootOnly && <CostsPanel session={session} />}

      {/* Globals & HoFs */}
      <Panel
        title="Globals & HoFs"
        action={
          <button
            onClick={() => setShowAddGlobal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Add Global
          </button>
        }
      >
        {session.globals.length === 0 ? (
          <p className="text-center text-muted py-8">No globals recorded yet</p>
        ) : (
          <div className="space-y-2">
            {session.globals.map((global) => (
              <div
                key={global.id}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  global.isHoF
                    ? 'bg-purple-900 border border-purple-600'
                    : 'bg-yellow-900 border border-yellow-600'
                }`}
              >
                <div>
                  <span className="font-medium">{global.creature}</span>
                  <span className="text-sm text-gray-300 ml-2">
                    {format(global.timestamp, 'MMM dd, HH:mm')}
                  </span>
                </div>
                <div className="font-bold text-lg">
                  {global.value.toFixed(2)} PED
                  {global.isHoF && (
                    <span className="ml-2 inline-flex items-center gap-1 text-sm">
                      <Award className="h-4 w-4" />
                      HoF
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Loot Table */}
      <Panel
        title="Loot"
        action={
          <div className="flex items-center gap-2">
            {session.loot.length > 0 && (
              <button
                onClick={() => setIsLootExpanded(!isLootExpanded)}
                className="btn-secondary flex items-center gap-2 text-sm"
                title={isLootExpanded ? 'Stack items' : 'Show detailed list'}
              >
                {isLootExpanded ? (
                  <>
                    <Layers className="w-4 h-4" />
                    Stack
                  </>
                ) : (
                  <>
                    <List className="w-4 h-4" />
                    Expand
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setShowAddLoot(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Loot
            </button>
          </div>
        }
      >
        {session.loot.length === 0 ? (
          <p className="text-center text-muted py-8">No loot recorded yet</p>
        ) : isLootExpanded ? (
          <DataTable
            columns={detailedLootColumns}
            rows={session.loot}
            getRowKey={(item) => item.id}
          />
        ) : groupedLootError ? (
          <p className="text-center text-red-400 py-8">{groupedLootError}</p>
        ) : (
          <DataTable
            columns={groupedLootColumns}
            rows={groupedLoot}
            getRowKey={(item) => item.name}
            emptyMessage="No stacked loot available."
          />
        )}
      </Panel>

      {/* Skills */}
      {groupedSkills.length > 0 && (
        <Panel title="Skill Gains">
          <DataTable
            columns={skillColumns}
            rows={groupedSkills}
            getRowKey={(skill) => skill.skillName}
          />
        </Panel>
      )}

      {/* Notes */}
      {session.notes && (
        <Panel title="Notes">
          <p className="text-gray-300 whitespace-pre-wrap">{session.notes}</p>
        </Panel>
      )}

      {showAddLoot && <AddLootModal sessionId={sessionId} onClose={() => setShowAddLoot(false)} />}
      {showAddGlobal && (
        <AddGlobalModal sessionId={sessionId} onClose={() => setShowAddGlobal(false)} />
      )}
      {showEditModal && (
        <EditSessionModal sessionId={sessionId} onClose={() => setShowEditModal(false)} />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        variant="danger"
        title="Delete Session?"
        message={`Are you sure you want to delete "${session.name}"?`}
        detail="This action cannot be undone. All loot, costs, and session data will be permanently deleted."
        confirmText="Delete Session"
        cancelText="Cancel"
      />

      <SessionSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        session={session}
      />
    </div>
  );
}
