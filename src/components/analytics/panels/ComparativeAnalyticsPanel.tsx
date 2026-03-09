import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

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
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Comparative Analytics</h3>
        <InfoTooltip tooltip="Best performing setup comparisons" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Best Weapon
            <InfoTooltip tooltip="Highest return rate weapon with existing data" />
          </div>
          <div
            className="text-lg font-bold text-blue-400 truncate"
            title={bestWeapon?.weapon || 'N/A'}
          >
            {bestWeapon?.weapon || 'N/A'}
          </div>
          <div className="text-sm text-muted mt-1">
            {bestWeapon ? `${bestWeapon.returnRate.toFixed(1)}% return` : 'Not enough data'}
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Best Location
            <InfoTooltip tooltip="Highest return location with at least 2 sessions" />
          </div>
          <div
            className="text-lg font-bold text-green-400 truncate"
            title={bestLocation?.location || 'N/A'}
          >
            {bestLocation?.location || 'N/A'}
          </div>
          <div className="text-sm text-muted mt-1">
            {bestLocation ? `${bestLocation.returnRate.toFixed(1)}% return` : 'Need 2+ sessions'}
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Best Loadout
            <InfoTooltip tooltip="Highest return loadout with at least 2 sessions" />
          </div>
          <div
            className="text-lg font-bold text-purple-400 truncate"
            title={bestLoadout?.name || 'N/A'}
          >
            {bestLoadout?.name || 'N/A'}
          </div>
          <div className="text-sm text-muted mt-1">
            {bestLoadout ? `${bestLoadout.returnRate.toFixed(1)}% return` : 'Need 2+ sessions'}
          </div>
        </div>
      </div>
    </div>
  );
}
