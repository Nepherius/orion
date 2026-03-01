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

interface SessionDetailsProps {
  sessionId: string;
  onSessionResumed?: () => void;
}

interface GroupedLootItem {
  name: string;
  quantity: number;
  value: number;
  markup: number;
  totalValue: number;
  count: number;
}

export function SessionDetails({ sessionId, onSessionResumed }: SessionDetailsProps) {
  const session = useHuntStore((state) => state.sessions.find((s) => s.id === sessionId));
  const removeLoot = useHuntStore((state) => state.removeLoot);
  const deleteSession = useHuntStore((state) => state.deleteSession);
  const resumeSession = useHuntStore((state) => state.resumeSession);
  const pauseSession = useHuntStore((state) => state.pauseSession);
  const [showAddLoot, setShowAddLoot] = useState(false);
  const [showAddGlobal, setShowAddGlobal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLootExpanded, setIsLootExpanded] = useState(false);
  const [groupedLoot, setGroupedLoot] = useState<GroupedLootItem[]>([]);

  useEffect(() => {
    if (!session) return;

    const loadGroupedLoot = async () => {
      try {
        const result = await invoke<GroupedLootItem[]>('db_get_session_loot_grouped', {
          sessionUuid: session.id,
        });
        setGroupedLoot(result);
      } catch (error) {
        console.error('Failed to load grouped loot:', error);
      }
    };

    if (!isLootExpanded && session.loot.length > 0) {
      loadGroupedLoot();
    }
  }, [isLootExpanded, session]);

  const profit = useMemo(() => {
    if (!session) return 0;
    return session.stats.totalLoot - session.stats.totalCost;
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
    return <div className="card p-6">Session not found</div>;
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

  return (
    <div className="space-y-6">
      {/* Session Overview Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{session.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Weapon: {session.weapon}</span>
              {session.armor && (
                <>
                  <span>•</span>
                  <span>Armor: {session.armor}</span>
                </>
              )}
              {session.location && (
                <>
                  <span>•</span>
                  <span>Location: {session.location}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {session.status === 'completed' ? (
                <button
                  onClick={handleResume}
                  className="btn-primary flex items-center gap-2 text-sm"
                  title="Resume Session"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              ) : session.status === 'active' ? (
                <button
                  onClick={handlePause}
                  className="btn-secondary flex items-center gap-2 text-sm"
                  title="Pause Session"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="btn-primary flex items-center gap-2 text-sm"
                  title="Resume Session"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Edit Session"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDeleteRequest}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                title="Delete Session"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
            <div className="text-right text-sm">
              <div className="text-xs text-gray-400">Started</div>
              <div className="font-medium text-gray-300">{format(session.startTime, 'PPpp')}</div>
              {session.endTime && (
                <>
                  <div className="text-xs text-gray-400 mt-1">Ended</div>
                  <div className="font-medium text-gray-300">{format(session.endTime, 'PPpp')}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Loot</div>
            <div className="text-2xl font-bold text-green-400">
              {session.stats.totalLoot.toFixed(2)} PED
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-red-400">
              {session.stats.totalCost.toFixed(2)} PED
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Profit/Loss</div>
            <div
              className={`text-2xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {profit >= 0 ? '+' : ''}
              {profit.toFixed(2)} PED
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Returns</div>
            <div
              className={`text-2xl font-bold flex items-center gap-2 ${session.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'
                }`}
            >
              {session.stats.returns >= 100 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {session.stats.returns.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">Loot Events</div>
            <div className="text-lg font-semibold">{session.stats.lootEvents}</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">Globals</div>
            <div className="text-lg font-semibold text-yellow-400">{session.stats.globals}</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">HoFs</div>
            <div className="text-lg font-semibold text-purple-400">{session.stats.hofs}</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">Duration</div>
            <div className="text-lg font-semibold">
              {Math.floor(session.stats.duration / 3600)}h{' '}
              {Math.floor((session.stats.duration % 3600) / 60)}m
            </div>
          </div>
        </div>
      </div>

      {/* Costs Panel */}
      <CostsPanel session={session} />

      {/* Loot Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Loot</h3>
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
        </div>

        {session.loot.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No loot recorded yet</p>
        ) : isLootExpanded ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">TT Value</th>
                  <th className="text-right py-2 px-3">Markup</th>
                  <th className="text-right py-2 px-3">Total Value</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {session.loot.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-700">
                    <td className="py-2 px-3 text-sm text-gray-400">
                      {format(item.timestamp, 'HH:mm:ss')}
                    </td>
                    <td className="py-2 px-3 font-medium">{item.name}</td>
                    <td className="py-2 px-3 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-right">{item.value.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{item.markup}%</td>
                    <td className="py-2 px-3 text-right font-semibold text-green-400">
                      {item.totalValue.toFixed(2)} PED
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => removeLoot(sessionId, item.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">TT Value</th>
                  <th className="text-right py-2 px-3">Avg Markup</th>
                  <th className="text-right py-2 px-3">Total Value</th>
                  <th className="text-right py-2 px-3">Count</th>
                </tr>
              </thead>
              <tbody>
                {groupedLoot.map((stackedItem) => (
                  <tr key={stackedItem.name} className="border-b border-gray-800 hover:bg-gray-700">
                    <td className="py-2 px-3 font-medium">{stackedItem.name}</td>
                    <td className="py-2 px-3 text-right">{stackedItem.quantity}</td>
                    <td className="py-2 px-3 text-right">{stackedItem.value.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{stackedItem.markup.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right font-semibold text-green-400">
                      {stackedItem.totalValue.toFixed(2)} PED
                    </td>
                    <td className="py-2 px-3 text-right text-sm text-gray-400">
                      {stackedItem.count}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Globals & HoFs */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Globals & HoFs
          </h3>
          <button
            onClick={() => setShowAddGlobal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Add Global
          </button>
        </div>

        {session.globals.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No globals recorded yet</p>
        ) : (
          <div className="space-y-2">
            {session.globals.map((global) => (
              <div
                key={global.id}
                className={`p-3 rounded-lg flex items-center justify-between ${global.isHoF
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
                  {global.isHoF && <span className="ml-2 text-sm">🏆 HoF</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills */}
      {groupedSkills.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Skill Gains</h3>
          <div className="space-y-2">
            {groupedSkills.map((skill) => (
              <div
                key={skill.skillName}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{skill.skillName}</span>
                  <span className="text-xs text-gray-400">({skill.count}x)</span>
                </div>
                <span className="text-green-400">+{skill.gainAmount.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {session.notes && (
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Notes</h3>
          <p className="text-gray-300 whitespace-pre-wrap">{session.notes}</p>
        </div>
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
    </div>
  );
}
