import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { MetricTile, Panel } from '../../common/Panel';

export default function ComparativeAnalyticsPanel() {
  const weaponData = useHuntStore((state) => state.analyticsData.performance?.weaponData);
  const locationData = useHuntStore((state) => state.analyticsData.performance?.locationData);
  const loadoutRaw = useHuntStore((state) => state.analyticsData.performance?.loadoutData);
  const loadouts = useHuntStore((state) => state.loadouts);

  const bestWeapon = useMemo(() => {
    if (!weaponData || weaponData.length === 0) return null;
    return [...weaponData].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [weaponData]);

  const bestLocation = useMemo(() => {
    if (!locationData) return null;
    const candidates = locationData.filter((loc) => loc.sessions >= 2);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [locationData]);

  const bestLoadout = useMemo(() => {
    if (!loadoutRaw) return null;
    const resolved = loadoutRaw
      .map((item) => {
        const loadout = loadouts.find((l) => l.id === item.loadoutId);
        return {
          name: loadout?.name || 'Unknown',
          sessions: item.sessions,
          returnRate: item.returnRate,
        };
      })
      .filter((item) => item.name !== 'Unknown' && item.sessions >= 2);
    if (resolved.length === 0) return null;
    return [...resolved].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [loadoutRaw, loadouts]);

  return (
    <Panel title="Comparative Analytics" tooltip="Best performing setup comparisons">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricTile
          label="Best Weapon"
          tooltip="Highest adjusted return weapon with existing data"
          value={bestWeapon?.weapon || 'N/A'}
          valueClassName="text-blue-400"
          detail={
            bestWeapon ? `${bestWeapon.returnRate.toFixed(1)}% adjusted return` : 'Not enough data'
          }
        />
        <MetricTile
          label="Best Location"
          tooltip="Highest adjusted return location with at least 2 sessions"
          value={bestLocation?.location || 'N/A'}
          valueClassName="text-green-400"
          detail={
            bestLocation
              ? `${bestLocation.returnRate.toFixed(1)}% adjusted return`
              : 'Need 2+ sessions'
          }
        />
        <MetricTile
          label="Best Loadout"
          tooltip="Highest adjusted return loadout with at least 2 sessions"
          value={bestLoadout?.name || 'N/A'}
          valueClassName="text-purple-400"
          detail={
            bestLoadout
              ? `${bestLoadout.returnRate.toFixed(1)}% adjusted return`
              : 'Need 2+ sessions'
          }
        />
      </div>
    </Panel>
  );
}
