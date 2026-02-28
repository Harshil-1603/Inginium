'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/lib/useAuth';

interface Booking {
  id: number;
  roomId: number;
  startTime: string;
  endTime: string;
  purpose?: string | null;
  status: string;
  room: { id: number; name: string; capacity: number };
  requester: { id: number; name: string; role: string };
}

// Full 24-hour day
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 – 23
const HOUR_HEIGHT = 56; // px per hour (24 × 56 = 1344px total)

const BOOKING_COLORS = [
  'bg-violet-500/80 border-violet-400/60',
  'bg-sky-500/80 border-sky-400/60',
  'bg-[#00E599]/70 border-[#00E599]/60',
  'bg-pink-500/70 border-pink-400/60',
  'bg-amber-500/70 border-amber-400/60',
];

export default function WeeklyCalendar({ canEdit = false }: { canEdit?: boolean }) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/rooms/approved?weekStart=${weekStart.toISOString()}&weekEnd=${weekEnd.toISOString()}`
      );
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch {
      // silent — no credentials configured yet
    } finally {
      setLoading(false);
    }
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) =>
      format(parseISO(b.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );

  // Offset from top of the 24-hour grid (hour 0 = top)
  const getTopOffset = (startTime: string) => {
    const start = parseISO(startTime);
    const offset = start.getHours() + start.getMinutes() / 60;
    return offset * HOUR_HEIGHT;
  };

  const getHeight = (startTime: string, endTime: string) => {
    const mins = differenceInMinutes(parseISO(endTime), parseISO(startTime));
    return Math.max(24, (mins / 60) * HOUR_HEIGHT);
  };

  const colorFor = (roomId: number) => BOOKING_COLORS[roomId % BOOKING_COLORS.length];

  const totalHeight = HOURS.length * HOUR_HEIGHT; // 1344px

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 shrink-0">
        <span className="text-sm font-semibold text-zinc-100">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-2.5 h-7 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <span className="text-xs bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/30 px-2 py-0.5 rounded-full font-medium">
              Edit mode (LHC)
            </span>
          )}
          {loading && <span className="text-xs text-zinc-500 animate-pulse">Refreshing…</span>}
          <button
            onClick={fetchBookings}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            title="Refresh"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable calendar body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time gutter + day columns */}
        <div className="flex flex-1 overflow-auto">
          {/* Fixed time gutter */}
          <div className="sticky left-0 z-10 w-14 shrink-0 bg-zinc-950 border-r border-zinc-800">
            {/* Day header spacer */}
            <div className="h-10 border-b border-zinc-800" />
            <div style={{ height: totalHeight, position: 'relative' }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT, position: 'absolute', left: 0, right: 0 }}
                  className="flex items-start justify-end pr-2 pt-1 border-b border-zinc-800/40"
                >
                  <span className="text-[10px] text-zinc-600 font-medium leading-none">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          <div className="flex flex-1 min-w-0">
            {days.map((day) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const dayBookings = getBookingsForDay(day);

              return (
                <div key={day.toISOString()} className="flex-1 min-w-[100px] border-r border-zinc-800/60 last:border-r-0 flex flex-col">
                  {/* Day header — sticky */}
                  <div className={`sticky top-0 z-10 h-10 flex flex-col items-center justify-center border-b border-zinc-800 shrink-0 ${isToday ? 'bg-zinc-900/80' : 'bg-zinc-950'}`}>
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${isToday ? 'text-[#00E599]' : 'text-zinc-500'}`}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={`text-xs font-medium ${isToday ? 'text-[#00E599]' : 'text-zinc-400'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Hour rows + bookings */}
                  <div className="relative" style={{ height: totalHeight }}>
                    {/* Hour grid lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        className={`absolute inset-x-0 border-b ${h % 6 === 0 ? 'border-zinc-700/60' : 'border-zinc-800/40'}`}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isToday && (() => {
                      const now = new Date();
                      const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
                      return (
                        <div
                          style={{ top, position: 'absolute', left: 0, right: 0, zIndex: 5 }}
                          className="flex items-center"
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                          <div className="flex-1 h-px bg-red-500/70" />
                        </div>
                      );
                    })()}

                    {/* Bookings */}
                    {dayBookings.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          top: getTopOffset(b.startTime),
                          height: getHeight(b.startTime, b.endTime),
                          left: 2,
                          right: 2,
                          position: 'absolute',
                          zIndex: 2,
                        }}
                        className={`rounded-md border px-1.5 py-1 overflow-hidden ${colorFor(b.roomId)} text-white`}
                        title={`${b.room.name} — ${b.requester.name}\n${format(parseISO(b.startTime), 'HH:mm')} – ${format(parseISO(b.endTime), 'HH:mm')}${b.purpose ? `\n${b.purpose}` : ''}`}
                      >
                        <p className="text-[10px] font-semibold truncate leading-tight">{b.room.name}</p>
                        <p className="text-[9px] opacity-80 truncate">{b.requester.name}</p>
                        <p className="text-[9px] opacity-70 truncate">
                          {format(parseISO(b.startTime), 'HH:mm')}–{format(parseISO(b.endTime), 'HH:mm')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
