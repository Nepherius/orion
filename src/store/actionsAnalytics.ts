import { invoke } from '@tauri-apps/api/core';
import type {
  StoreSetState,
  StoreGetState,
  AnalyticsPerformanceSqlData,
  AnalyticsAdvancedSqlData,
  AnalyticsFactorSqlData,
  AnalyticsLifetimeStats,
} from './storeTypes';

export function createAnalyticsActions(set: StoreSetState, _get: StoreGetState) {
  return {
    fetchAnalyticsData: async (
      startTime: number | null,
      endTime: number | null,
      tags?: string[]
    ) => {
      set((state) => ({
        analyticsData: { ...state.analyticsData, isLoading: true, error: null },
      }));

      // Fetch independently so one failure doesn't block the others
      const [performanceResult, advancedResult, factorsResult] = await Promise.allSettled([
        invoke<AnalyticsPerformanceSqlData>('db_get_analytics_performance_data', {
          params: { start_time: startTime, end_time: endTime, tags },
        }),
        invoke<AnalyticsAdvancedSqlData>('db_get_analytics_advanced_data', {
          params: { start_time: startTime, end_time: endTime, tags },
        }),
        invoke<AnalyticsFactorSqlData>('db_get_analytics_factor_data', {
          params: { start_time: startTime, end_time: endTime, tags },
        }),
      ]);

      const performanceData =
        performanceResult.status === 'fulfilled' ? performanceResult.value : null;
      const advancedData = advancedResult.status === 'fulfilled' ? advancedResult.value : null;
      const factorsData = factorsResult.status === 'fulfilled' ? factorsResult.value : null;

      if (performanceResult.status === 'rejected') {
        console.error('Failed to fetch performance analytics:', performanceResult.reason);
      }
      if (advancedResult.status === 'rejected') {
        console.error('Failed to fetch advanced analytics:', advancedResult.reason);
      }
      if (factorsResult.status === 'rejected') {
        console.error('Failed to fetch factor analytics:', factorsResult.reason);
      }

      const hasError =
        performanceResult.status === 'rejected' ||
        advancedResult.status === 'rejected' ||
        factorsResult.status === 'rejected';

      set(() => ({
        analyticsData: {
          performance: performanceData,
          advanced: advancedData,
          factors: factorsData,
          isLoading: false,
          error: hasError ? 'Some analytics data failed to load' : null,
        },
      }));
    },

    setAnalyticsTimeRange: (startTime: number | null, endTime: number | null) => {
      set(() => ({
        analyticsTimeRange: { startTime, endTime },
      }));
    },

    setAnalyticsSelectedTags: (tags: string[]) => {
      set(() => ({ analyticsSelectedTags: tags }));
    },

    fetchLifetimeStats: async (
      startTime: number | null,
      endTime: number | null,
      tags?: string[]
    ) => {
      try {
        const dbStats = await invoke<AnalyticsLifetimeStats>('db_get_analytics_stats', {
          params: { start_time: startTime, end_time: endTime, tags },
        });
        if (dbStats) {
          set(() => ({ analyticsLifetimeStats: dbStats }));
        }
      } catch (err) {
        console.error('Failed to fetch lifetime stats from DB:', err);
        // Fallback: compute from in-memory sessions
        const state = _get();
        const filtered = state.sessions.filter((s) => {
          if (startTime !== null && s.startTime < startTime) return false;
          if (endTime !== null && s.startTime > endTime) return false;
          if (tags && tags.length > 0) {
            if (!s.tags || !tags.every((t) => s.tags!.includes(t))) return false;
          }
          return true;
        });
        const fallback = filtered.reduce(
          (acc, session) => {
            acc.totalLoot += session.stats.totalAdjustedLoot;
            acc.totalTtLoot += session.stats.totalTtLoot;
            acc.totalAdjustedLoot += session.stats.totalAdjustedLoot;
            acc.totalMarkupGain += session.stats.totalMarkupGain;
            acc.totalFixedGain += session.stats.totalFixedGain;
            acc.totalCost += session.stats.totalCost;
            acc.totalKills += session.stats.kills;
            acc.totalGlobals += session.stats.globals;
            acc.totalHofs += session.stats.hofs;
            acc.totalDamage += session.stats.damageDealt;
            acc.totalShotsFired += session.stats.shotsFired;
            acc.totalDuration += session.stats.duration;
            acc.totalSessions += 1;
            return acc;
          },
          {
            totalLoot: 0,
            totalTtLoot: 0,
            totalAdjustedLoot: 0,
            totalMarkupGain: 0,
            totalFixedGain: 0,
            totalCost: 0,
            totalKills: 0,
            totalGlobals: 0,
            totalHofs: 0,
            totalDamage: 0,
            totalShotsFired: 0,
            totalDuration: 0,
            totalSessions: 0,
          }
        );
        set(() => ({ analyticsLifetimeStats: fallback }));
      }
    },
  };
}
