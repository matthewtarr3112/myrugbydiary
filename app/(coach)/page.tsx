"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getWeather, weatherCodeMap } from "@/lib/weather";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Users,
  Handshake,
  Dumbbell,
  HeartPulse,
  CalendarDays,
  ClipboardCheck,
  LineChart,
  MessageSquare,
  CalendarRange,
  Cloud,
  Bell,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const menuItems = [
  { label: "Team Roster", icon: Users, sub: null, href: "/players" },
  { label: "Gym Session", icon: Dumbbell, sub: "Build strength sessions", href: "/program" },
  { label: "Pending Offers", icon: Handshake, sub: null, href: null },
  { label: "Weekly Program", icon: Dumbbell, sub: "Field · Gym · Weekly schedule", href: "/calendar" },
  { label: "Availability & Injuries", icon: HeartPulse, sub: null, href: null },
  { label: "Fixtures", icon: CalendarDays, sub: null, href: "/fixtures" },
  { label: "Attendance", icon: ClipboardCheck, sub: null, href: null },
  { label: "Performance", icon: LineChart, sub: null, href: null },
  { label: "Communication Log", icon: MessageSquare, sub: null, href: null },
  { label: "Season Calendar", icon: CalendarRange, sub: null, href: null },
];

const typeColors: Record<string, string> = {
  gym: "#3b82f6",
  theory: "#22d3ee",
  field: "#10b981",
  rest: "#71717a",
  meeting: "#a1a1aa",
  refuel: "#f59e0b",
};

const loadLabels: Record<string, { label: string; color: string }> = {
  high: { label: "High Load", color: "#ef4444" },
  low: { label: "Low Load", color: "#eab308" },
  rest: { label: "Rest Day", color: "#71717a" },
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function CoachHome() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [dayMeta, setDayMeta] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Record<string, { text: string; author: string }>>({});
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || role !== "coach") router.push("/login");
  }, [user, role, loading, router]);

  useEffect(() => {
    getWeather().then(setWeather).catch(() => setWeather(null));
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sessions"), (snap) => {
      const loaded = snap.docs.map((d) => {
        const data = d.data();
        const typeInfo = typeColors[data.type];
        return {
          id: d.id,
          title: data.title,
          type: data.type,
          start: data.start.toDate(),
          end: data.end.toDate(),
          backgroundColor: typeInfo ? typeInfo + "26" : "#71717a26",
          borderColor: typeInfo || "#71717a",
        };
      });
      setAllSessions(loaded);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "dayMeta"), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => (map[d.id] = d.data().load));
      setDayMeta(map);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quotes"), (snap) => {
      const map: Record<string, { text: string; author: string }> = {};
      snap.docs.forEach((d) => (map[d.id] = d.data() as any));
      setQuotes(map);
    });
    return unsub;
  }, []);

  if (loading || !user || role !== "coach") {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">
        Loading...
      </div>
    );
  }

  const startOfSelected = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  );
  const endOfSelected = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate() + 1
  );

  const daySessions = allSessions
    .filter((s) => s.start >= startOfSelected && s.start < endOfSelected)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const selectedKey = dateKey(selectedDate);
  const todaysLoad = dayMeta[selectedKey];
  const weekKey = dateKey(getWeekStart(selectedDate));
  const quote = quotes[weekKey];

  const todaysBirthdays = notes.filter(
    (n) => n.type === "birthday" && n.date === selectedKey
  );
  const reminders = notes.filter((n) => n.type === "reminder");

  const birthdayEvents = notes
    .filter((n) => n.type === "birthday")
    .map((n) => ({
      id: "bday-" + n.id,
      title: `🎂 ${n.text}`,
      start: n.date,
      allDay: true,
      backgroundColor: "#eab30833",
      borderColor: "#eab308",
      textColor: "#fde68a",
    }));

  function shift(delta: number) {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + (viewMode === "week" ? delta * 7 : delta));
      if (viewMode === "week" && calendarRef.current) {
        calendarRef.current.getApi().gotoDate(next);
      }
      return next;
    });
  }

  function goToday() {
    const now = new Date();
    setSelectedDate(now);
    if (viewMode === "week" && calendarRef.current) {
      calendarRef.current.getApi().gotoDate(now);
    }
  }

  const isToday = startOfSelected.toDateString() === new Date().toDateString();

  const dateLabel =
    viewMode === "day"
      ? selectedDate.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : `Week of ${getWeekStart(selectedDate).toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
        })}`;

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-neutral-950 pb-10 text-white">
      <header className="flex min-w-0 items-center justify-between px-4 pb-6 pt-8 sm:px-6">
        <div className="min-w-0">
          <p className="text-sm text-neutral-500">
            {isToday && viewMode === "day" ? "Today" : dateLabel}
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Good morning, Coach
          </h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800">
          <Bell size={18} className="text-neutral-400" />
        </button>
      </header>

      {quote?.text && (
        <div className="px-6 mb-4">
          <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="break-words text-sm italic text-neutral-300">"{quote.text}"</p>
            {quote.author && (
              <p className="text-xs text-neutral-500 mt-1">— {quote.author}</p>
            )}
          </div>
        </div>
      )}

      <section className="mb-8 min-w-0 px-4 sm:px-6">
        <div className="mb-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <Cloud size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Weather</span>
            </div>
            {!weather ? (
              <p className="text-neutral-600 text-sm">Loading...</p>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">
                    {weatherCodeMap[weather.current.weather_code]?.emoji || "—"}
                  </span>
                  <span className="text-xl font-semibold">
                    {Math.round(weather.current.temperature_2m)}°C
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {weather.daily.time.slice(0, 4).map((day: string, i: number) => (
                    <div key={day} className="flex flex-col items-center min-w-[2.5rem]">
                      <span className="text-[10px] text-neutral-500">
                        {new Date(day).toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span className="text-sm">
                        {weatherCodeMap[weather.daily.weather_code[i]]?.emoji || "—"}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {Math.round(weather.daily.temperature_2m_max[i])}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <ClipboardCheck size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Attendance</span>
            </div>
            <p className="text-neutral-600 text-sm">—</p>
          </div>
        </div>

        <div className="mb-3 min-w-0 rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950 to-neutral-900 p-4 sm:p-5">
          <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-emerald-400">
              <CalendarDays size={16} />
              <span className="truncate text-xs font-medium uppercase tracking-wide">{dateLabel}</span>
              {viewMode === "day" && todaysLoad && loadLabels[todaysLoad] && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
                  style={{
                    backgroundColor: loadLabels[todaysLoad].color + "33",
                    color: loadLabels[todaysLoad].color,
                  }}
                >
                  {loadLabels[todaysLoad].label}
                </span>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex bg-black/30 rounded-full p-0.5">
                <button
                  onClick={() => setViewMode("day")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    viewMode === "day" ? "bg-emerald-600 text-white" : "text-neutral-400"
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    viewMode === "week" ? "bg-emerald-600 text-white" : "text-neutral-400"
                  }`}
                >
                  Week
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => shift(-1)}
                  className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center"
                >
                  <ChevronLeft size={14} className="text-neutral-300" />
                </button>
                {!isToday && (
                  <button
                    onClick={goToday}
                    className="text-xs text-emerald-400 px-1 hover:text-emerald-300"
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => shift(1)}
                  className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center"
                >
                  <ChevronRight size={14} className="text-neutral-300" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "day" ? (
            daySessions.length === 0 ? (
              <p className="text-neutral-400 text-sm">Nothing scheduled</p>
            ) : (
              <div className="space-y-2">
                {daySessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2"
                  >
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: typeColors[s.type] || "#71717a" }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-neutral-500">
                        {s.start.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {s.end.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="min-w-0 overflow-hidden rounded-xl bg-black/20 p-2">
              <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                firstDay={1}
                initialDate={selectedDate}
                headerToolbar={false}
                events={[...allSessions, ...birthdayEvents]}
                height="auto"
                slotMinTime="06:00:00"
                slotMaxTime="19:00:00"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <Bell size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Notes & Reminders
            </span>
          </div>
          {todaysBirthdays.length === 0 && reminders.length === 0 ? (
            <p className="text-neutral-600 text-sm">No notes yet</p>
          ) : (
            <div className="space-y-1">
              {todaysBirthdays.map((b) => (
                <p key={b.id} className="text-sm text-amber-400">
                  🎂 {b.text}'s birthday today
                </p>
              ))}
              {reminders.map((r) => (
                <p key={r.id} className="text-sm text-neutral-300">
                  {r.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="min-w-0 px-4 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
          Diary
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map(({ label, icon: Icon, sub, href }) => {
            const content = (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Icon size={18} className="text-emerald-400" />
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-neutral-600 group-hover:text-neutral-400 mt-1"
                  />
                </div>
                <p className="font-medium text-sm leading-tight">{label}</p>
                {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
              </>
            );

            if (href) {
              return (
                <Link
                  key={label}
                  href={href}
                  className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 text-left hover:bg-neutral-800 transition-colors group block"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={label}
                className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 text-left hover:bg-neutral-800 transition-colors group"
              >
                {content}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
