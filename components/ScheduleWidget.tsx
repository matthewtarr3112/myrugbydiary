"use client";
import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Bell, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { dateKey, getWeekStart } from "@/lib/date";

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

interface SessionEvent {
  id: string;
  title: string;
  type: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
}

interface NoteDoc {
  id: string;
  type?: string;
  date?: string;
  text?: string;
}

export function ScheduleWidget() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [allSessions, setAllSessions] = useState<SessionEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [dayMeta, setDayMeta] = useState<Record<string, string>>({});
  const [duties, setDuties] = useState<Record<string, { task: string; assignedTo: string }[]>>({});
  const [notes, setNotes] = useState<NoteDoc[]>([]);

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
    const unsub = onSnapshot(collection(db, "duties"), (snap) => {
      const map: Record<string, { task: string; assignedTo: string }[]> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { tasks?: { task?: string; assignedTo?: string }[] };
        map[d.id] = (data.tasks || []).map((duty) => ({
          task: duty.task || "Unassigned task",
          assignedTo: duty.assignedTo || "Unassigned",
        }));
      });
      setDuties(map);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const startOfSelected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const endOfSelected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);

  const daySessions = allSessions
    .filter((s) => s.start >= startOfSelected && s.start < endOfSelected)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const selectedKey = dateKey(selectedDate);
  const todaysLoad = dayMeta[selectedKey];
  const todaysDuties = duties[selectedKey] || [];

  const todaysBirthdays = notes.filter((n) => n.type === "birthday" && n.date === selectedKey);
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
      ? selectedDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
      : `Week of ${getWeekStart(selectedDate).toLocaleDateString(undefined, { day: "numeric", month: "long" })}`;

  return (
    <>
      <div className="mb-3 min-w-0 rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950 to-neutral-900 p-4 sm:p-5">
        <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-emerald-400">
            <CalendarDays size={16} />
            <span className="truncate text-xs font-medium uppercase tracking-wide">{dateLabel}</span>
            {viewMode === "day" && todaysLoad && loadLabels[todaysLoad] && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
                style={{ backgroundColor: loadLabels[todaysLoad].color + "33", color: loadLabels[todaysLoad].color }}
              >
                {loadLabels[todaysLoad].label}
              </span>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex bg-black/30 rounded-full p-0.5">
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${viewMode === "day" ? "bg-emerald-600 text-white" : "text-neutral-400"}`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${viewMode === "week" ? "bg-emerald-600 text-white" : "text-neutral-400"}`}
              >
                Week
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => shift(-1)} className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center">
                <ChevronLeft size={14} className="text-neutral-300" />
              </button>
              {!isToday && (
                <button onClick={goToday} className="text-xs text-emerald-400 px-1 hover:text-emerald-300">
                  Today
                </button>
              )}
              <button onClick={() => shift(1)} className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center">
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
                <div key={s.id} className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: typeColors[s.type] || "#71717a" }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-neutral-500">
                      {s.start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}{" "}
                      – {s.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
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
              eventContent={(arg) => (
                <div className="fc-compact-event" title={`${arg.timeText} · ${arg.event.title}`}>
                  <span className="fc-compact-event-time">{arg.timeText}</span>
                  <span className="fc-compact-event-title">{arg.event.title}</span>
                </div>
              )}
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
          <span className="text-xs font-medium uppercase tracking-wide">Notes & Reminders</span>
        </div>
        {todaysBirthdays.length === 0 && reminders.length === 0 && todaysDuties.length === 0 ? (
          <p className="text-neutral-600 text-sm">No notes yet</p>
        ) : (
          <div className="space-y-1">
            {todaysBirthdays.map((b) => (
              <p key={b.id} className="text-sm text-amber-400">
                🎂 {b.text}&apos;s birthday today
              </p>
            ))}
            {reminders.map((r) => (
              <p key={r.id} className="text-sm text-neutral-300">
                {r.text}
              </p>
            ))}
            {todaysDuties.length > 0 && (
              <div className="mt-3 border-t border-neutral-800 pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-400">Duties & Tasks</p>
                <div className="space-y-2">
                  {todaysDuties.map((duty, index) => (
                    <div key={`${duty.task}-${duty.assignedTo}-${index}`} className="flex items-start justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
                      <span className="text-sm text-neutral-200">{duty.task}</span>
                      <span className="shrink-0 text-xs text-neutral-500">{duty.assignedTo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
