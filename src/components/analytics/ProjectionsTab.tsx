import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useHuntStore } from '../../store';

const GeneralProjectionsPanel = lazy(() => import('./panels/GeneralProjectionsPanel'));
const CreatureProjectionsPanel = lazy(() => import('./panels/CreatureProjectionsPanel'));
const LootTheoryLabPanel = lazy(() => import('./panels/LootTheoryLabPanel'));

const panelFallback = (
  <div className="h-32 flex items-center justify-center text-muted">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
  </div>
);

export function ProjectionsTab() {
  const sessions = useHuntStore((state) => state.sessions);
  const creatureList = useMemo(
    () =>
      Array.from(
        new Set(
          sessions.flatMap((session) => [
            session.creature || 'Unknown',
            ...session.kills.map((kill) => kill.creatureName),
          ])
        )
      )
        .filter((creature) => creature && creature !== 'Unknown')
        .sort(),
    [sessions]
  );
  const [selectedCreature, setSelectedCreature] = useState('');

  useEffect(() => {
    if (creatureList.length === 0) {
      setSelectedCreature('');
    } else if (!creatureList.includes(selectedCreature)) {
      setSelectedCreature(creatureList[0]);
    }
  }, [creatureList, selectedCreature]);

  return (
    <div className="space-y-6">
      <Suspense fallback={panelFallback}>
        <GeneralProjectionsPanel />
        <CreatureProjectionsPanel
          creatureList={creatureList}
          selectedCreature={selectedCreature}
          onSelectedCreatureChange={setSelectedCreature}
        />
        <LootTheoryLabPanel selectedCreature={selectedCreature} />
      </Suspense>
    </div>
  );
}

export default ProjectionsTab;
