import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

/**
 * Display a list of all skill names that are being tracked in the analytics data.
 */
export default function SkillsTrackedPanel() {
  const allSkillNames = useHuntStore((state) => state.analyticsData.advanced?.allSkillNames);

  if (!allSkillNames || allSkillNames.length === 0) return null;

  return (
    <div className="card p-6 border-yellow-500/30">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold text-yellow-400">All Skills Tracked</h3>
        <InfoTooltip tooltip="Complete list of skill names in your data." />
      </div>
      <div className="text-xs text-muted space-y-1 max-h-32 overflow-y-auto">
        {allSkillNames.length === 0 ? (
          <span>No skills tracked</span>
        ) : (
          allSkillNames.map((skill) => (
            <div key={skill} className="p-1 bg-gray-700/20 rounded px-2">
              {skill}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
