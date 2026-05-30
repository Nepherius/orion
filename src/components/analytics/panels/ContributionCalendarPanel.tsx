import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { subDays, startOfDay, format, addDays, getDay, isFirstDayOfMonth } from 'date-fns';

type CalendarDay = {
  date: Date;
  count: number;
  profit: number;
  isFirstOfMonth: boolean;
} | null;

export default function ContributionCalendarPanel() {
  const { sessions, analyticsTimeRange, analyticsSelectedTags } = useHuntStore((state) => ({
    sessions: state.sessions,
    analyticsTimeRange: state.analyticsTimeRange,
    analyticsSelectedTags: state.analyticsSelectedTags,
  }));

  const { calendarDays, maxProfit, maxLoss } = useMemo(() => {
    // If a specific temporal bound exists, end the calendar there; otherwise, use today.
    const end = analyticsTimeRange.endTime ? new Date(analyticsTimeRange.endTime) : new Date();
    // Start of the calendar (364 days + today = 365 days array)
    const numDays = 364;
    const start = startOfDay(subDays(end, numDays));

    // Filter sessions strictly by tags first, time bounds implicitly handled by calendar window
    const filtered = sessions.filter((s) => {
      if (analyticsSelectedTags.length > 0) {
        if (!s.tags || !analyticsSelectedTags.every((t) => s.tags!.includes(t))) return false;
      }
      return true;
    });

    const dayMap = new Map();
    // Offset start day so that columns align to week boundaries?
    // GitHub typically aligns rows 0-6 to Sun-Sat. To do this, we need to pad the front so that start begins on a Sunday.
    const startDayOfWeek = getDay(start);

    for (let i = 0; i <= numDays; i++) {
      const d = addDays(start, i);
      dayMap.set(format(d, 'yyyy-MM-dd'), {
        date: d,
        count: 0,
        profit: 0,
        isFirstOfMonth: isFirstDayOfMonth(d) || i === 0,
      });
    }

    filtered.forEach((session) => {
      const dStr = format(new Date(session.startTime), 'yyyy-MM-dd');
      if (dayMap.has(dStr)) {
        const bucket = dayMap.get(dStr);
        bucket.count += 1;
        bucket.profit += session.stats.totalLoot - session.stats.totalCost;
      }
    });

    const rawDays = Array.from(dayMap.values());

    // Now pad beginning with null to align week (so row 0 is Sunday)
    const newCalendarDays: CalendarDay[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      newCalendarDays.push(null);
    }
    newCalendarDays.push(...rawDays);

    let mxP = 0;
    let mxL = 0;
    rawDays.forEach((b) => {
      if (b.profit > mxP) mxP = b.profit;
      if (b.profit < mxL) mxL = b.profit;
    });

    return { calendarDays: newCalendarDays, maxProfit: mxP || 1, maxLoss: Math.abs(mxL) || 1 };
  }, [sessions, analyticsTimeRange, analyticsSelectedTags]);

  const weeks: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];
  calendarDays.forEach((day: CalendarDay) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const getColor = (profit: number) => {
    if (profit === 0) return 'bg-white/5 dark:bg-white/5'; // Solid muted color, no border
    if (profit > 0) {
      const intensity = profit / maxProfit;
      if (intensity > 0.6) return 'bg-emerald-400';
      if (intensity > 0.3) return 'bg-emerald-500';
      if (intensity > 0.1) return 'bg-emerald-700';
      return 'bg-emerald-800';
    } else {
      const intensity = Math.abs(profit) / maxLoss;
      if (intensity > 0.6) return 'bg-red-400';
      if (intensity > 0.3) return 'bg-red-500';
      if (intensity > 0.1) return 'bg-red-700';
      return 'bg-red-800';
    }
  };

  return (
    <Panel
      title="Session Contribution Heatmap"
      tooltip="Daily net profit/loss mapped over the selected 1-year timeline"
      className="overflow-x-auto scrollbar-hide"
    >
      <div className="min-w-max">
        {/* Month labels row */}
        <div className="flex gap-1 mb-2 text-xs text-muted/70 font-medium h-4">
          {weeks.map((week, wIndex) => {
            // Find if any day in this week is the first of a month (or the very first day in calendar)
            const monthDayInWeek = week.find((d) => d !== null && d.isFirstOfMonth);
            if (monthDayInWeek) {
              return (
                <div
                  key={`month-${wIndex}`}
                  className="w-3.5 shrink-0 whitespace-nowrap overflow-visible relative"
                >
                  <span className="absolute left-0">{format(monthDayInWeek.date, 'MMM')}</span>
                </div>
              );
            }
            return <div key={`month-${wIndex}`} className="w-3.5 shrink-0" />;
          })}
        </div>

        {/* Heatmap Matrix */}
        <div className="flex gap-1">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-1">
              {week.map((day, dIndex) => {
                if (!day)
                  return <div key={dIndex} className="w-3.5 h-3.5 rounded-sm bg-transparent" />;

                return (
                  <div
                    key={dIndex}
                    className={`w-3.5 h-3.5 rounded-sm ${getColor(day.profit)} transition-all duration-200 hover:scale-125 hover:ring-2 hover:ring-primary-500/50 hover:z-10 relative group cursor-pointer`}
                  >
                    {/* Solid backdrop for empty squares to feel solid over dark mode */}
                    {day.profit === 0 && (
                      <div className="absolute inset-0 bg-black/10 rounded-sm mix-blend-multiply pointer-events-none" />
                    )}

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-max bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-white/10 p-2.5 rounded-lg pointer-events-none backdrop-blur-md">
                      <div className="font-bold text-[13px] text-text">
                        {format(day.date, 'MMM d, yyyy')}
                      </div>
                      <div className="text-[11px] text-muted mt-1 font-medium">
                        {day.count} session{day.count !== 1 ? 's' : ''}
                      </div>
                      {day.count > 0 && (
                        <div
                          className={`text-xs font-bold mt-1.5 ${day.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                          {day.profit > 0 ? '+' : ''}
                          {day.profit.toFixed(2)} PED
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6 text-xs text-muted/70 font-medium justify-end">
        <span>High Loss</span>
        <div className="flex gap-1.5 items-center px-1">
          <div className="w-3.5 h-3.5 rounded-sm bg-red-400 shadow-inner"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-red-500 shadow-inner"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-red-700 shadow-inner"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-red-800 shadow-inner"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-white/5"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-800 shadow-inner"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-700 shadow-inner"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500 shadow-inner"></div>
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-400 shadow-inner"></div>
        </div>
        <span>High Profit</span>
      </div>
    </Panel>
  );
}
