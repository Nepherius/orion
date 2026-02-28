import { useState } from 'react';
import { useHuntStore } from '../../store';
import { Target, Plus, Trash2 } from 'lucide-react';
import { Goal } from '../../types';

export function GrindGoals() {
    const { goals, addGoal, deleteGoal } = useHuntStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalTarget, setNewGoalTarget] = useState('');

    // Auto-amount can be the lifetime profit
    const sessions = useHuntStore(state => state.sessions);
    const lifetimeProfit = sessions.reduce((acc, s) => acc + (s.stats.totalLoot - s.stats.totalCost), 0);

    const handleAdd = () => {
        if (newGoalName && newGoalTarget) {
            addGoal({
                name: newGoalName,
                targetAmount: parseFloat(newGoalTarget),
                currentAmount: 0,
                isCompleted: false,
            });
            setNewGoalName('');
            setNewGoalTarget('');
            setIsAdding(false);
        }
    };

    return (
        <div className="card w-full p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-bold text-blue-400 uppercase">Grind Goals</h3>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Add New Target"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {isAdding && (
                <div className="flex flex-col gap-2 mb-4 animate-in fade-in slide-in-from-top-2 w-full">
                    <input
                        type="text"
                        placeholder="Goal Name (e.g., Improved Fap)"
                        className="input bg-gray-900 w-full text-sm border-gray-700 min-w-0"
                        value={newGoalName}
                        onChange={(e) => setNewGoalName(e.target.value)}
                    />
                    <div className="flex gap-2 w-full">
                        <input
                            type="number"
                            placeholder="Target PED"
                            className="input bg-gray-900 w-full min-w-0 text-sm border-gray-700"
                            value={newGoalTarget}
                            onChange={(e) => setNewGoalTarget(e.target.value)}
                        />
                        <button onClick={handleAdd} className="btn-primary py-1 px-4 text-sm whitespace-nowrap shrink-0">
                            Save Goal
                        </button>
                    </div>
                </div>
            )}

            {goals?.length === 0 && !isAdding ? (
                <div className="text-sm text-gray-500 text-center py-8">
                    No active financial goals. Set a target!
                </div>
            ) : (
                <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                    {goals?.map((goal: Goal) => {
                        // Either use manual currentAmount or lifetimeProfit
                        const amount = Math.max(goal.currentAmount || 0, lifetimeProfit);
                        const progress = Math.min(100, Math.max(0, (amount / goal.targetAmount) * 100));
                        const isCompleted = progress >= 100;

                        return (
                            <div key={goal.id} className="space-y-1.5 group w-full">
                                <div className="flex justify-between items-baseline text-sm gap-2">
                                    <span
                                        className={`truncate ${isCompleted ? 'text-green-400 font-semibold flex items-center gap-1' : 'text-gray-200 font-medium'}`}
                                        title={goal.name}
                                    >
                                        {isCompleted && '★ '}{goal.name}
                                    </span>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs font-mono text-gray-400">
                                            {amount.toFixed(0)} / {goal.targetAmount}
                                        </span>
                                        <button
                                            onClick={() => deleteGoal(goal.id)}
                                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                                    <div
                                        className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-purple-600 to-purple-400'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
