"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  setDoc,
  doc,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const sessionTypes = [
  { value: "gym", label: "Gym", color: "#3b82f6" },
  { value: "theory", label: "Theory", color: "#22d3ee" },
  { value: "field", label: "Field", color: "#10b981" },
  { value: "rest", label: "Rest", color: "#71717a" },
  { value: "meeting", label: "Meeting", color: "#a1a1aa" },
  { value: "refuel", label: "Refuel", color: "#f59e0b" },
];

const loadOptions = [
  { value: "high", label: "H", color: "#ef4444" },
  { value: "low", label: "L", color: "#eab308" },
  { value: "rest", label: "R", color: "#71717a" },
];

type DutyEntry = {
  task: string;
  assignedTo: string;
};

type QuoteEntry = {
  text: string;
  author: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  textColor?: string;
  allDay?: boolean;
};

type SessionTemplate = {
  title: string;
  start: string;
  end: string;
  type: string;
};

type TemplateDay = {
  offset: number;
  load: string;
  sessions: SessionTemplate[];
};

type NoteEntry = {
  id: string;
  type?: string;
  date: string;
  text: string;
};

type FixtureEntry = {
  id: string;
  homeAway: string;
  opponent: string;
  date: Date;
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

const foundationWeekSeed = [
  {
    offset: 0,
    load: "high",
    quote: {
      text: "Success is to wake up each morning and consciously decide that today will be the best day of your life.",
      author: "Ken Poirot",
    },
    duties: [
      { task: "Water station", assignedTo: "M. Brown" },
      { task: "Kit prep", assignedTo: "T. Smith" },
    ],
    sessions: [
      { title: "Gym Strength", start: "07:00", end: "08:30", type: "gym" },
      { title: "Theory Session", start: "09:00", end: "10:00", type: "theory" },
      { title: "Skills Lab", start: "10:30", end: "11:45", type: "field" },
      { title: "Lunch", start: "12:00", end: "13:00", type: "refuel" },
    ],
  },
  {
    offset: 1,
    load: "low",
    duties: [{ task: "Recovery checks", assignedTo: "A. Khan" }],
    sessions: [
      { title: "Mobility & Activation", start: "07:00", end: "08:00", type: "gym" },
      { title: "Leadership Review", start: "09:00", end: "10:00", type: "meeting" },
      { title: "Contact Skills", start: "10:30", end: "12:00", type: "field" },
    ],
  },
  {
    offset: 2,
    load: "high",
    duties: [{ task: "Pitch setup", assignedTo: "L. Dlamini" }],
    sessions: [
      { title: "Gym Power", start: "07:00", end: "08:30", type: "gym" },
      { title: "Tactical Theory", start: "09:00", end: "10:00", type: "theory" },
      { title: "Aerobics Block", start: "10:30", end: "12:00", type: "field" },
    ],
  },
  {
    offset: 3,
    load: "rest",
    duties: [{ task: "Recovery & stretch", assignedTo: "J. van Wyk" }],
    sessions: [
      { title: "Recovery Walk", start: "07:30", end: "08:15", type: "rest" },
      { title: "Mobility Session", start: "17:00", end: "18:00", type: "rest" },
    ],
  },
  {
    offset: 4,
    load: "rest",
    duties: [{ task: "Heritage Day prep", assignedTo: "Team" }],
    sessions: [
      { title: "Heritage Day", start: "10:00", end: "12:00", type: "meeting" },
      { title: "Recovery", start: "15:00", end: "16:00", type: "rest" },
    ],
  },
  {
    offset: 5,
    load: "rest",
    duties: [{ task: "Braai support", assignedTo: "Team" }],
    sessions: [{ title: "Family / Social Day", start: "11:00", end: "12:00", type: "rest" }],
  },
  {
    offset: 6,
    load: "rest",
    duties: [{ task: "Reset & weekly review", assignedTo: "Coaching staff" }],
    sessions: [{ title: "Recovery & Review", start: "09:00", end: "10:00", type: "rest" }],
  },
];

const trainingWeekTemplate: TemplateDay[] = foundationWeekSeed.map((day) => ({
  offset: day.offset,
  load: day.load,
  sessions: day.sessions,
}));

function createMatchWeekTemplate(matchDay: "friday" | "saturday"): TemplateDay[] {
  const days = trainingWeekTemplate.map((day) => ({
    ...day,
    sessions: [...day.sessions],
  }));
  const matchOffset = matchDay === "friday" ? 4 : 5;
  days[matchOffset] = {
    offset: matchOffset,
    load: "high",
    sessions: [{ title: "Match", start: "19:00", end: "21:00", type: "field" }],
  };
  days[matchOffset === 4 ? 5 : 4] = {
    offset: matchOffset === 4 ? 5 : 4,
    load: "rest",
    sessions: [{ title: "Recovery & Review", start: "09:00", end: "10:00", type: "rest" }],
  };
  return days;
}

function createPreviewEvents(weekStart: Date, template: TemplateDay[]): CalendarEvent[] {
  return template.flatMap((day, dayIndex) =>
    day.sessions.map((session, sessionIndex) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + day.offset);
      const [startHour, startMinute] = session.start.split(":").map(Number);
      const [endHour, endMinute] = session.end.split(":").map(Number);
      const start = new Date(date);
      const end = new Date(date);
      start.setHours(startHour, startMinute, 0, 0);
      end.setHours(endHour, endMinute, 0, 0);
      const typeInfo = sessionTypes.find((type) => type.value === session.type);

      return {
        id: `preview-${dayIndex}-${sessionIndex}`,
        title: session.title,
        start,
        end,
        backgroundColor: typeInfo ? typeInfo.color + "26" : "#71717a26",
        borderColor: typeInfo ? typeInfo.color : "#71717a",
      };
    })
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    createPreviewEvents(startOfWeek(new Date()), trainingWeekTemplate)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("gym");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [template, setTemplate] = useState<"training" | "match">("training");
  const [matchDay, setMatchDay] = useState<"friday" | "saturday">("saturday");

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [dayMeta, setDayMeta] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    const weekStart = startOfWeek(new Date());
    foundationWeekSeed.forEach((day) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + day.offset);
      values[dateKey(date)] = day.load;
    });
    return values;
  });
  const [duties, setDuties] = useState<Record<string, DutyEntry[]>>(() => {
    const values: Record<string, DutyEntry[]> = {};
    const weekStart = startOfWeek(new Date());
    foundationWeekSeed.forEach((day) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + day.offset);
      values[dateKey(date)] = day.duties;
    });
    return values;
  });
  const [quotes, setQuotes] = useState<Record<string, QuoteEntry>>(() => {
    const quote = foundationWeekSeed[0].quote;
    return quote ? { [dateKey(startOfWeek(new Date()))]: quote } : {};
  });
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [fixtures, setFixtures] = useState<FixtureEntry[]>([]);

  const [dutyDate, setDutyDate] = useState(dateKey(new Date()));
  const [dutyTask, setDutyTask] = useState("");
  const [dutyPlayer, setDutyPlayer] = useState("");
  const [editingDuty, setEditingDuty] = useState<{ date: string; index: number } | null>(null);
  const [editingDutyTask, setEditingDutyTask] = useState("");
  const [editingDutyPlayer, setEditingDutyPlayer] = useState("");

  const [draftQuote, setDraftQuote] = useState<QuoteEntry>(() => {
    const quote = foundationWeekSeed[0].quote;
    return quote || { text: "", author: "" };
  });

  const [bdayDate, setBdayDate] = useState("");
  const [bdayName, setBdayName] = useState("");
  const birthdayDateRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const updateCalendarView = () => {
      const mobile = window.matchMedia("(max-width: 640px)").matches;
      setIsMobile(mobile);
      calendarRef.current?.getApi().changeView(mobile ? "timeGridDay" : "timeGridWeek");
    };

    updateCalendarView();
    window.addEventListener("resize", updateCalendarView);
    return () => window.removeEventListener("resize", updateCalendarView);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const seedFoundationWeek = async () => {
      try {
        const sessionSnap = await getDocs(collection(db, "sessions"));
        if (cancelled || !sessionSnap.empty) return;

        const weekStart = startOfWeek(new Date());
        const seedDays = foundationWeekSeed.map((day) => {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + day.offset);
          return {
            ...day,
            date,
          };
        });

        await Promise.all(
          seedDays.flatMap(({ date, load, quote, duties, sessions }) => [
            setDoc(doc(db, "dayMeta", dateKey(date)), { load }, { merge: true }),
            ...(quote
              ? [setDoc(doc(db, "quotes", dateKey(date)), quote, { merge: true })]
              : []),
            setDoc(doc(db, "duties", dateKey(date)), { tasks: duties }, { merge: true }),
            ...sessions.map((session) =>
              addDoc(collection(db, "sessions"), {
                title: session.title,
                type: session.type,
                start: Timestamp.fromDate(combineDateAndTime(date, session.start)),
                end: Timestamp.fromDate(combineDateAndTime(date, session.end)),
                lead: "",
              })
            ),
          ])
        );
      } catch (error) {
        console.warn("Firestore schedule seed unavailable; showing the local preview.", error);
      }
    };

    seedFoundationWeek();

    const unsub = onSnapshot(collection(db, "sessions"), (snap) => {
      const loaded = snap.docs.map((d) => {
        const data = d.data();
        const typeInfo = sessionTypes.find((t) => t.value === data.type);
        return {
          id: d.id,
          title: data.title,
          start: data.start.toDate(),
          end: data.end.toDate(),
          backgroundColor: typeInfo ? typeInfo.color + "26" : "#71717a26",
          borderColor: typeInfo ? typeInfo.color : "#71717a",
        };
      });
      if (!cancelled) setEvents(loaded);
    });

    return () => {
      cancelled = true;
      unsub();
    };
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
      const map: Record<string, DutyEntry[]> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { tasks?: DutyEntry[] };
        map[d.id] = data.tasks || [];
      });
      setDuties(map);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quotes"), (snap) => {
      const map: Record<string, QuoteEntry> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as QuoteEntry;
        map[d.id] = data;
      });
      setQuotes(map);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snap) => {
      setNotes(
        snap.docs.map((d) => {
          const data = d.data() as Partial<NoteEntry>;
          return {
            id: d.id,
            type: data.type,
            date: data.date || "",
            text: data.text || "",
          } satisfies NoteEntry;
        })
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fixtures"), (snap) => {
      setFixtures(
        snap.docs.map((d) => {
          const data = d.data() as {
            homeAway: string;
            opponent: string;
            date: { toDate: () => Date };
          };
          return {
            id: d.id,
            homeAway: data.homeAway,
            opponent: data.opponent,
            date: data.date.toDate(),
          } satisfies FixtureEntry;
        })
      );
    });
    return unsub;
  }, []);

  const weekKey = dateKey(weekAnchor);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAnchor);
    d.setDate(weekAnchor.getDate() + i);
    return d;
  });

  const fixtureEvents = fixtures.map((f) => ({
    id: "fixture-" + f.id,
    title: `🏉 ${f.homeAway === "home" ? "vs" : "@"} ${f.opponent}`,
    start: f.date,
    end: new Date(f.date.getTime() + 2 * 60 * 60 * 1000),
    backgroundColor: "#8b5cf633",
    borderColor: "#8b5cf6",
    textColor: "#e9d5ff",
  }));

  function handleSelect(info: { start: Date; end: Date }) {
    setPendingSlot({ start: info.start, end: info.end });
    setEditingEventId(null);
    setTitle("");
    setType("gym");
    setStartTime(toTimeString(info.start));
    setEndTime(toTimeString(info.end));
    setModalOpen(true);
  }

  function handleEventClick(info: {
    event: { id: string; title: string; start: Date | null; end: Date | null };
  }) {
    if (info.event.id.startsWith("fixture-")) return;
    if (!info.event.start || !info.event.end) return;
    setEditingEventId(info.event.id);
    setPendingSlot({ start: info.event.start, end: info.event.end });
    setTitle(info.event.title);
    const selectedEvent = events.find((event) => event.id === info.event.id);
    const selectedType = sessionTypes.find((sessionType) => sessionType.color === selectedEvent?.borderColor);
    setType(selectedType?.value || "field");
    setStartTime(toTimeString(info.event.start));
    setEndTime(toTimeString(info.event.end));
    setModalOpen(true);
  }

  function toTimeString(d: Date) {
    return d.toTimeString().slice(0, 5);
  }

  function combineDateAndTime(baseDate: Date, timeStr: string) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d;
  }

  async function handleSave() {
    if (!pendingSlot || !title) return;
    const start = combineDateAndTime(pendingSlot.start, startTime);
    const end = combineDateAndTime(pendingSlot.start, endTime);
    if (editingEventId) {
      setEvents((current) =>
        current.map((event) =>
          event.id === editingEventId ? { ...event, title, start, end } : event
        )
      );
      try {
        await updateDoc(doc(db, "sessions", editingEventId), {
          title,
          start: Timestamp.fromDate(start),
          end: Timestamp.fromDate(end),
          type,
        });
      } catch (error) {
        console.warn("Session name/time saved to the local preview only.", error);
      }
    } else {
      const typeInfo = sessionTypes.find((sessionType) => sessionType.value === type);
      const localEvent: CalendarEvent = {
        id: `local-${Date.now()}`,
        title,
        start,
        end,
        backgroundColor: typeInfo ? typeInfo.color + "26" : "#71717a26",
        borderColor: typeInfo ? typeInfo.color : "#71717a",
      };
      setEvents((current) => [...current, localEvent]);
      try {
        await addDoc(collection(db, "sessions"), {
          title,
          start: Timestamp.fromDate(start),
          end: Timestamp.fromDate(end),
          type,
          lead: "",
        });
      } catch (error) {
        console.warn("New session saved to the local preview only.", error);
      }
    }
    setModalOpen(false);
  }

  async function handleEventChange(info: {
    event: { id: string; start: Date | null; end: Date | null };
  }) {
    if (info.event.id.startsWith("bday-") || info.event.id.startsWith("fixture-")) return;
    if (!info.event.start || !info.event.end) return;
    setEvents((current) =>
      current.map((event) =>
        event.id === info.event.id
          ? { ...event, start: info.event.start as Date, end: info.event.end as Date }
          : event
      )
    );
    try {
      await updateDoc(doc(db, "sessions", info.event.id), {
        start: Timestamp.fromDate(info.event.start),
        end: Timestamp.fromDate(info.event.end),
      });
    } catch (error) {
      console.warn("Session time saved to the local preview only.", error);
    }
  }

  function applyTemplate() {
    const selectedTemplate =
      template === "training" ? trainingWeekTemplate : createMatchWeekTemplate(matchDay);
    setEvents(createPreviewEvents(weekAnchor, selectedTemplate));
    const nextLoads: Record<string, string> = {};
    selectedTemplate.forEach((day) => {
      const date = new Date(weekAnchor);
      date.setDate(weekAnchor.getDate() + day.offset);
      nextLoads[dateKey(date)] = day.load;
    });
    setDayMeta((current) => ({ ...current, ...nextLoads }));
  }

  async function setDayLoad(key: string, load: string) {
    await setDoc(doc(db, "dayMeta", key), { load }, { merge: true });
  }

  async function addDuty() {
    if (!dutyTask || !dutyPlayer) return;
    const nextDuties = [
      ...(duties[dutyDate] || []),
      { task: dutyTask, assignedTo: dutyPlayer },
    ];
    setDuties((current) => ({ ...current, [dutyDate]: nextDuties }));
    try {
      await setDoc(doc(db, "duties", dutyDate), { tasks: nextDuties }, { merge: true });
    } catch (error) {
      console.warn("Duty saved to the local preview only.", error);
    }
    setDutyTask("");
    setDutyPlayer("");
  }

  function beginDutyEdit(date: string, index: number, duty: DutyEntry) {
    setEditingDuty({ date, index });
    setEditingDutyTask(duty.task);
    setEditingDutyPlayer(duty.assignedTo);
  }

  async function saveDutyEdit() {
    if (!editingDuty || !editingDutyTask || !editingDutyPlayer) return;
    const nextDuties = [...(duties[editingDuty.date] || [])];
    nextDuties[editingDuty.index] = {
      task: editingDutyTask,
      assignedTo: editingDutyPlayer,
    };
    setDuties((current) => ({ ...current, [editingDuty.date]: nextDuties }));
    try {
      await setDoc(
        doc(db, "duties", editingDuty.date),
        { tasks: nextDuties },
        { merge: true }
      );
    } catch (error) {
      console.warn("Duty edit saved to the local preview only.", error);
    }
    setEditingDuty(null);
  }

  async function removeDuty() {
    if (!editingDuty) return;
    const nextDuties = (duties[editingDuty.date] || []).filter(
      (_, index) => index !== editingDuty.index
    );
    setDuties((current) => ({ ...current, [editingDuty.date]: nextDuties }));
    try {
      await setDoc(
        doc(db, "duties", editingDuty.date),
        { tasks: nextDuties },
        { merge: true }
      );
    } catch (error) {
      console.warn("Duty removal saved to the local preview only.", error);
    }
    setEditingDuty(null);
  }

  async function saveQuote() {
    await setDoc(
      doc(db, "quotes", weekKey),
      { text: draftQuote.text, author: draftQuote.author },
      { merge: true }
    );
  }

  async function addBirthday() {
    if (!bdayDate || !bdayName) return;
    await addDoc(collection(db, "notes"), {
      date: bdayDate,
      text: bdayName,
      type: "birthday",
    });
    setBdayDate("");
    setBdayName("");
  }

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-neutral-950 p-2 text-white sm:p-4">
      <div className="mb-4 flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="truncate text-xl font-semibold sm:text-2xl">Training Calendar</h1>
      </div>

      {/* WEEK TEMPLATES */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
              Start with a week template
            </p>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as "training" | "match")}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm outline-none"
            >
              <option value="training">Training Week</option>
              <option value="match">Match Week</option>
            </select>
          </div>
          {template === "match" && (
            <div className="flex-1">
              <label className="text-xs text-neutral-500 uppercase tracking-wide mb-2 block">
                Match day
              </label>
              <select
                value={matchDay}
                onChange={(e) => setMatchDay(e.target.value as "friday" | "saturday")}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm outline-none"
              >
                <option value="saturday">Saturday</option>
                <option value="friday">Friday</option>
              </select>
            </div>
          )}
          <button
            onClick={applyTemplate}
            className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-4 py-2 text-sm font-medium"
          >
            Apply Template
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-3">
          Drag a session to change its time. Click any session to edit its name or times.
        </p>
      </div>

      {/* QUOTE OF THE WEEK */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
          Quote of the Week
        </p>
        <textarea
          value={draftQuote.text}
          onChange={(e) => setDraftQuote((current) => ({ ...current, text: e.target.value }))}
          placeholder="Enter this week's quote..."
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 mb-2"
          rows={2}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={draftQuote.author}
            onChange={(e) => setDraftQuote((current) => ({ ...current, author: e.target.value }))}
            placeholder="Author"
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={saveQuote}
            className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-4 text-sm font-medium"
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* CALENDAR */}
        <div className="min-w-0 overflow-hidden rounded-2xl bg-neutral-900 p-2 sm:p-4 lg:col-span-3">
          {isMobile && (
            <p className="mb-2 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-center text-xs text-emerald-300">
              Daily view · use the arrows to move between days
            </p>
          )}
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            firstDay={1}
            editable={true}
            selectable={true}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventChange}
            eventResize={handleEventChange}
            dayHeaderContent={(arg) => {
              const key = dateKey(arg.date);
              const birthdayNames = notes
                .filter((note) => note.type === "birthday" && note.date === key)
                .map((note) => note.text);
              const dayDuties = duties[key] || [];
              const currentLoad = dayMeta[key];

              return (
                <div className="w-full min-w-0 px-1 pb-1 text-left">
                  <div className="mb-1 flex justify-center gap-1">
                    {loadOptions.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDayLoad(key, option.value);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold"
                        style={{
                          backgroundColor:
                            currentLoad === option.value ? option.color : "transparent",
                          borderColor: option.color,
                          color: currentLoad === option.value ? "white" : option.color,
                        }}
                        title={`${option.label} load`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-300">
                    {arg.text}
                  </div>
                  {(dayDuties.length > 0 || birthdayNames.length > 0) && (
                    <div className="mt-1 space-y-0.5 text-[10px] leading-tight">
                      {dayDuties.map((duty, index) => (
                        <button
                          type="button"
                          key={`duty-${index}`}
                          onClick={() => beginDutyEdit(key, index, duty)}
                          className="block w-full truncate rounded bg-emerald-500/15 px-1 py-0.5 text-left text-emerald-300"
                          title={`${duty.task} — ${duty.assignedTo}`}
                        >
                          <span className="font-medium">{duty.task}</span>
                          <span className="text-emerald-200/70"> · {duty.assignedTo}</span>
                        </button>
                      ))}
                      {birthdayNames.map((name) => (
                        <div
                          key={`birthday-${name}`}
                          className="truncate rounded bg-amber-500/15 px-1 py-0.5 text-amber-300"
                          title={`Birthday: ${name}`}
                        >
                          🎂 {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }}
            events={[...events, ...fixtureEvents]}
            datesSet={(arg) => {
              const nextWeek = startOfWeek(new Date(arg.start));
              setWeekAnchor(nextWeek);
              const nextQuote = quotes[dateKey(nextWeek)];
              setDraftQuote({
                text: nextQuote?.text || "",
                author: nextQuote?.author || "",
              });
            }}
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
          />
        </div>

        {/* DUTY ROSTER */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
              Duty Roster
            </p>
            <select
              value={dutyDate}
              onChange={(e) => setDutyDate(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-sm mb-2 outline-none"
            >
              {weekDays.map((d) => (
                <option key={dateKey(d)} value={dateKey(d)}>
                  {d.toLocaleDateString(undefined, { weekday: "long", day: "numeric" })}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={dutyTask}
              onChange={(e) => setDutyTask(e.target.value)}
              placeholder="Task (e.g. Water)"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs mb-1 outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={dutyPlayer}
              onChange={(e) => setDutyPlayer(e.target.value)}
              placeholder="Player name"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs mb-2 outline-none focus:border-emerald-500"
            />
            <button
              onClick={addDuty}
              className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl py-1.5 text-xs font-medium"
            >
              Add Duty
            </button>
          </div>

          <div className="border-t border-neutral-800 pt-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
              Add Birthday
            </p>
            <input
              ref={birthdayDateRef}
              type="date"
              value={bdayDate}
              onChange={(e) => setBdayDate(e.target.value)}
              onClick={() => birthdayDateRef.current?.showPicker?.()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  birthdayDateRef.current?.showPicker?.();
                }
              }}
              aria-label="Birthday date"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs mb-1 outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={bdayName}
              onChange={(e) => setBdayName(e.target.value)}
              placeholder="Name"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs mb-2 outline-none focus:border-emerald-500"
            />
            <button
              onClick={addBirthday}
              className="w-full bg-amber-600 hover:bg-amber-500 rounded-xl py-1.5 text-xs font-medium"
            >
              Add Birthday
            </button>
          </div>
        </div>
      </div>

      {editingDuty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-1 text-lg font-semibold">Edit Duty</h2>
            <p className="mb-4 text-xs text-neutral-500">
              {new Date(`${editingDuty.date}T12:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <input
              type="text"
              value={editingDutyTask}
              onChange={(event) => setEditingDutyTask(event.target.value)}
              placeholder="Task"
              className="mb-2 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={editingDutyPlayer}
              onChange={(event) => setEditingDutyPlayer(event.target.value)}
              placeholder="Assigned to"
              className="mb-5 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingDuty(null)}
                className="flex-1 rounded-xl bg-neutral-800 py-2 text-sm font-medium hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeDuty}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium hover:bg-red-500"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={saveDutyEdit}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-medium hover:bg-emerald-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">
              {editingEventId ? "Edit Session" : "New Session"}
            </h2>

            <label className="text-xs text-neutral-500 uppercase tracking-wide">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gym Conditioning"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 mt-1 mb-4 text-sm outline-none focus:border-emerald-500"
            />

            <label className="text-xs text-neutral-500 uppercase tracking-wide">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
              {sessionTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`rounded-xl px-2 py-2 text-xs font-medium border transition-colors ${
                    type === t.value ? "border-white/60" : "border-transparent opacity-60"
                  }`}
                  style={{ backgroundColor: t.color + "33", color: t.color }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wide">
                  Start
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wide">
                  End
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 rounded-xl py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-xl py-2 text-sm font-medium"
              >
                {editingEventId ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
