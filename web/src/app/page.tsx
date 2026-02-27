'use client';

import { useState } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Placeholder events — keyed by "YYYY-M-D"
const EVENTS: Record<string, { title: string; color: string }[]> = {
  [`2026-2-${new Date().getDate()}`]: [
    { title: 'Team standup', color: 'bg-violet-500/80' },
    { title: '1:1 with lead', color: 'bg-sky-500/80' },
  ],
  [`2026-2-${new Date().getDate() + 1}`]: [
    { title: 'DB migration', color: 'bg-[#00E599]/70' },
  ],
  [`2026-2-${new Date().getDate() - 2}`]: [
    { title: 'Design review', color: 'bg-pink-500/70' },
    { title: 'Weekly sync', color: 'bg-violet-500/80' },
  ],
};

function getEventsForDay(year: number, month: number, day: number) {
  return EVENTS[`${year}-${month}-${day}`] ?? [];
}

export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  // Build grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Total cells = 6 rows × 7 cols = 42 (covers all months)
  const cells: { day: number; current: boolean }[] = [];

  // Previous month overflow
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  // Next month overflow
  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next++, current: false });
  }

  const rows: typeof cells[] = [];
  for (let i = 0; i < 42; i += 7) rows.push(cells.slice(i, i + 7));

  const goToPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goToNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => { setViewYear(todayY); setViewMonth(todayM); };

  const isToday = (day: number, current: boolean) =>
    current && day === todayD && viewMonth === todayM && viewYear === todayY;

  return (
    // Fill the full height of the parent `<main>` which is `flex-1 overflow-y-auto`
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800 shrink-0">
        {/* Month + year */}
        <h1 className="text-base font-semibold text-zinc-100 min-w-[160px]">
          {MONTHS[viewMonth]}{' '}
          <span className="text-zinc-500 font-normal">{viewYear}</span>
        </h1>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrev}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button
            onClick={goToNext}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* Today */}
        <button
          onClick={goToToday}
          className="px-3 h-7 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors border border-zinc-700"
        >
          Today
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-600 font-medium uppercase tracking-widest">Month</span>
        </div>
      </div>

      {/* ── Day-of-week headers ───────────────────────────────────── */}
      <div className="grid grid-cols-7 border-b border-zinc-800 shrink-0">
        {DAYS_SHORT.map((d, i) => (
          <div
            key={d}
            className={`
              py-2 text-center text-xs font-semibold uppercase tracking-widest
              ${i === 0 || i === 6 ? 'text-zinc-600' : 'text-zinc-500'}
            `}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-rows-6 overflow-hidden">
        {rows.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-zinc-800/60 last:border-b-0">
            {week.map(({ day, current }, di) => {
              const today = isToday(day, current);
              const isWeekend = di === 0 || di === 6;

              // Resolve actual year/month for event lookup
              let evY = viewYear, evM = viewMonth + 1;
              if (!current && wi === 0) { evM = viewMonth === 0 ? 12 : viewMonth; evY = viewMonth === 0 ? viewYear - 1 : viewYear; }
              if (!current && wi > 3) { evM = viewMonth === 11 ? 1 : viewMonth + 2; evY = viewMonth === 11 ? viewYear + 1 : viewYear; }
              const events = current ? getEventsForDay(viewYear, viewMonth + 1, day) : [];

              return (
                <div
                  key={di}
                  className={`
                    relative flex flex-col min-h-0 p-1.5 border-r border-zinc-800/60 last:border-r-0
                    ${isWeekend && current ? 'bg-zinc-900/30' : ''}
                    ${!current ? 'bg-transparent' : ''}
                    group cursor-pointer hover:bg-zinc-900/50 transition-colors
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-end mb-1">
                    <span
                      className={`
                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium select-none
                        ${today
                          ? 'bg-[#00E599] text-zinc-950 font-semibold'
                          : current
                            ? isWeekend ? 'text-zinc-500' : 'text-zinc-400'
                            : 'text-zinc-700'
                        }
                      `}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {events.slice(0, 3).map((ev, ei) => (
                      <div
                        key={ei}
                        className={`
                          ${ev.color} text-white text-[10px] font-medium
                          px-1.5 py-0.5 rounded truncate leading-tight
                        `}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <span className="text-[10px] text-zinc-600 pl-1">+{events.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
