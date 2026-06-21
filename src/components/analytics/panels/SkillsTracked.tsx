import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

/**
 * Display a list of all skill names that are being tracked in the analytics data.
 */
export default function SkillsTrackedPanel() {
  const allSkillNames = useHuntStore((state) => state.analyticsData.advanced?.allSkillNames);

  if (!allSkillNames || allSkillNames.length === 0) {
    return (
      <AnalyticsEmptyState
        title="All Skills Tracked"
        message="No skill gain events are available for the selected filters."
      />
    );
  }

  return (
    <Panel
      title="All Skills Tracked"
      tooltip="Complete list of skill names in your data."
      className="border-yellow-500/30"
    >
      <div className="text-xs text-muted space-y-1 max-h-32 overflow-y-auto">
        {allSkillNames.map((skill) => (
          <div key={skill} className="p-1 bg-gray-700/20 rounded px-2">
            {skill}
          </div>
        ))}
      </div>
    </Panel>
  );
}
