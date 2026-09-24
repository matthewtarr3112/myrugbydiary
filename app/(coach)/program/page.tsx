"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowLeft, CalendarDays, Check, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { formatProgramDate, makeSession, normalizeProgram, PROGRAM_DAYS, ProgramSession, ProgramWeek, TRAINING_LOAD_OPTIONS, TrainingLoad } from "@/lib/program";
import { TrainingGoal } from "@/lib/training";
import { ProgramViewer } from "@/components/ProgramViewer";

interface PlayerDoc { id: string; name: string; trainingGoal: TrainingGoal | null; }
function todayString() { return new Date().toISOString().slice(0, 10); }

type SessionChange = (changes: Partial<ProgramSession>) => void;

function SessionEditor({ session, onChange, onRemove }: { session: ProgramSession; onChange: SessionChange; onRemove: () => void }) {
  const updateExercise = (index: number, value: string) => onChange({ exercises: session.exercises.map((item, i) => i === index ? value : item) });
  const addExercise = () => onChange({ exercises: [...session.exercises, ""] });
  const addSuperset = () => {
    const first = session.exercises.length;
    onChange({ exercises: [...session.exercises, "", ""], supersetGroups: [...(session.supersetGroups ?? []), [first, first + 1]] });
  };

  return (
    <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{session.day} session</h3><button type="button" onClick={onRemove} className="text-xs text-red-400">Remove</button></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="text-xs text-neutral-500">Day<select value={session.day} onChange={(e) => onChange({ day: e.target.value as ProgramSession["day"] })} className="mt-1 w-full field-control">{PROGRAM_DAYS.map((day) => <option key={day}>{day}</option>)}</select></label>
        <label className="text-xs text-neutral-500">Date<input type="date" value={session.date} onChange={(e) => onChange({ date: e.target.value })} className="mt-1 w-full field-control" /></label>
        <label className="text-xs text-neutral-500">Load<select value={session.load} onChange={(e) => onChange({ load: e.target.value as TrainingLoad })} className="mt-1 w-full field-control">{TRAINING_LOAD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-xs text-neutral-500">Location<input value={session.location} onChange={(e) => onChange({ location: e.target.value })} className="mt-1 w-full field-control" /></label>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="text-xs text-neutral-500">Start<input type="time" value={session.startTime} onChange={(e) => onChange({ startTime: e.target.value })} className="mt-1 w-full field-control" /></label>
        <label className="text-xs text-neutral-500">End<input type="time" value={session.endTime} onChange={(e) => onChange({ endTime: e.target.value })} className="mt-1 w-full field-control" /></label>
        <label className="text-xs text-neutral-500">Duration<input value={session.duration} onChange={(e) => onChange({ duration: e.target.value })} className="mt-1 w-full field-control" /></label>
        <label className="text-xs text-neutral-500">Session title<input value={session.title} onChange={(e) => onChange({ title: e.target.value })} className="mt-1 w-full field-control" /></label>
      </div>
      <div><p className="mb-2 text-xs text-neutral-500">Exercises</p>{session.exercises.map((exercise, index) => <div key={`${session.id}-exercise-${index}`} className="mb-2 flex gap-2"><input value={exercise} onChange={(e) => updateExercise(index, e.target.value)} placeholder="e.g. Back squat - 4 sets x 6" className="w-full field-control" />{session.exercises.length > 1 && <button type="button" onClick={() => onChange({ exercises: session.exercises.filter((_, i) => i !== index), supersetGroups: (session.supersetGroups ?? []).filter((group) => !group.includes(index)) })} className="px-2 text-neutral-500">x</button>}</div>)}<div className="flex flex-wrap gap-4"><button type="button" onClick={addExercise} className="inline-flex items-center gap-1 text-xs text-emerald-400"><Plus className="h-3.5 w-3.5" /> Add exercise</button><button type="button" onClick={addSuperset} className="inline-flex items-center gap-1 text-xs text-cyan-300"><Plus className="h-3.5 w-3.5" /> Add superset</button></div></div>
      <label className="block text-xs text-neutral-500">Notes<textarea value={session.details} onChange={(e) => onChange({ details: e.target.value })} rows={2} placeholder="Brief coaching notes for this session" className="mt-1 w-full field-control" /></label>
    </div>
  );
}

export default function ProgramPage() {
  const { role, playerId, loading } = useAuth();
  const router = useRouter();
  const isCoach = role === "coach";
  const [programs, setPrograms] = useState<ProgramWeek[]>([]);
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [view, setView] = useState<"today" | "week">("week");
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [title, setTitle] = useState("Weekly Program");
  const [weekStart, setWeekStart] = useState(todayString());
  const [quote, setQuote] = useState("");
  const [duties, setDuties] = useState("");
  const [sessions, setSessions] = useState<ProgramSession[]>([makeSession("Monday", todayString())]);
  const [assignAll, setAssignAll] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => { if (!loading && (!role || !["coach", "player"].includes(role))) router.push("/login"); }, [loading, role, router]);
  useEffect(() => { if (loading || !role || !["coach", "player"].includes(role)) return onSnapshot(collection(db, "programs"), (snap) => { const loaded = snap.docs.map((item) => normalizeProgram(item.id, item.data())); loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); setPrograms(loaded); setSelectedProgramId((current) => current || loaded[0]?.id || ""); }); }, [loading, role]);
  useEffect(() => { if (!isCoach) return; getDocs(query(collection(db, "players"), orderBy("name"))).then((snap) => { const loaded = snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<PlayerDoc, "id">) })); setPlayers(loaded); setSelectedPlayerIds(loaded.map((player) => player.id)); }); }, [isCoach]);

  const visiblePrograms = isCoach ? programs : programs.filter((program) => program.assignedAll || (playerId && program.assignedPlayerIds.includes(playerId)));
  const selectedProgram = visiblePrograms.find((program) => program.id === selectedProgramId) ?? visiblePrograms[0];
  const selectedPlayers = useMemo(() => players.filter((player) => selectedPlayerIds.includes(player.id)), [players, selectedPlayerIds]);
  if (loading || !["coach", "player"].includes(role ?? "")) return null;
  const updateSession = (id: string, changes: Partial<ProgramSession>) => setSessions((current) => current.map((session) => session.id === id ? { ...session, ...changes } : session));
  const addSession = () => setSessions((current) => [...current, makeSession(PROGRAM_DAYS[Math.min(current.length, PROGRAM_DAYS.length - 1)], weekStart)]);
  async function handleSave() {
    const cleanSessions = sessions
      .map((session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => exercise.trim()).filter(Boolean),
        supersetGroups: session.supersetGroups ?? [],
      }))
      .filter((session) => session.title.trim() || session.exercises.length);

    if (!cleanSessions.length) {
      setStatus("Add at least one session before saving the program.");
      return;
    }

    setSaving(true);
    setStatus("Saving program...");
    try {
      await addDoc(collection(db, "programs"), {
        title: title.trim() || "Weekly program",
        weekStart,
        quote: quote.trim(),
        duties: duties.trim(),
        sessions: cleanSessions,
        assignedPlayerIds: assignAll ? players.map((player) => player.id) : selectedPlayerIds,
        assignedAll: assignAll,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setStatus("Program saved successfully.");
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      setStatus(
        code === "permission-denied"
          ? "Program could not be saved because your account is not authorized as a coach. Sign out and sign back in, then try again."
          : error instanceof Error
            ? error.message
            : "Program could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return <div className="min-h-screen w-full bg-neutral-950 p-6 text-white md:p-10"><button onClick={() => router.push(role === "coach" ? "/" : "/dashboard")} className="mb-6 flex items-center gap-2 text-sm text-neutral-400"><ArrowLeft className="h-4 w-4" /> Back</button><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-emerald-500" /> Program builder</h1><p className="mt-1 text-sm text-neutral-500">Create clear daily and weekly training programs for the team.</p></div><div className="flex rounded-xl border border-neutral-800 p-1"><button onClick={() => setView("today")} className={`rounded-lg px-4 py-2 text-sm ${view === "today" ? "bg-emerald-500 text-black" : "text-neutral-400"}`}>Today</button><button onClick={() => setView("week")} className={`rounded-lg px-4 py-2 text-sm ${view === "week" ? "bg-emerald-500 text-black" : "text-neutral-400"}`}>Week</button></div></div>{isCoach && <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Build a weekly program</h2><p className="text-sm text-neutral-500">Add sessions and exercises manually.</p></div><button type="button" onClick={addSession} className="inline-flex items-center gap-2 text-sm text-emerald-400"><Plus className="h-4 w-4" /> Add session</button></div><div className="grid gap-3 md:grid-cols-3"><label className="text-xs text-neutral-500">Program title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full field-control" /></label><label className="text-xs text-neutral-500">Week starts<input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1 w-full field-control" /></label><label className="text-xs text-neutral-500">Weekly quote<input value={quote} onChange={(e) => setQuote(e.target.value)} className="mt-1 w-full field-control" /></label></div><div className="mt-4 space-y-3">{sessions.map((session) => <SessionEditor key={session.id} session={session} onChange={(changes) => updateSession(session.id, changes)} onRemove={() => setSessions((current) => current.filter((item) => item.id !== session.id))} />)}</div><label className="mt-4 block text-xs text-neutral-500">Weekly notes<textarea value={duties} onChange={(e) => setDuties(e.target.value)} rows={2} className="mt-1 w-full field-control" /></label><div className="mt-4 flex gap-2"><button type="button" onClick={() => setAssignAll(true)} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${assignAll ? "border-emerald-500 text-emerald-300" : "border-neutral-700 text-neutral-400"}`}>Assign all</button><button type="button" onClick={() => setAssignAll(false)} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${!assignAll ? "border-emerald-500 text-emerald-300" : "border-neutral-700 text-neutral-400"}`}>Custom</button></div>{!assignAll && <div className="mt-3 grid gap-2 md:grid-cols-2">{players.map((player) => <button type="button" key={player.id} onClick={() => setSelectedPlayerIds((current) => current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id])} className="flex justify-between rounded-lg border border-neutral-800 p-2 text-left text-sm">{player.name}{selectedPlayerIds.includes(player.id) && <Check className="h-4 w-4 text-emerald-400" />}</button>)}</div>}<button type="button" onClick={handleSave} disabled={saving || (!assignAll && !selectedPlayers.length)} className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black disabled:opacity-50">{saving ? "Saving..." : "Save weekly program"}</button></section>}{status && <p className="mb-5 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">{status}</p>}<section className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"><label className="text-xs text-neutral-500">View date<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="ml-2 field-control inline-block" /></label><select value={selectedProgram?.id ?? ""} onChange={(e) => setSelectedProgramId(e.target.value)} className="field-control ml-auto min-w-56"><option value="">No saved programs</option>{visiblePrograms.map((program) => <option key={program.id} value={program.id}>{program.title} · {formatProgramDate(program.weekStart)}</option>)}</select></section>{selectedProgram ? <ProgramViewer program={selectedProgram} view={view} date={selectedDate} /> : <p className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-500">{isCoach ? "No program has been saved yet." : "No program has been assigned to you yet."}</p>}</div>;
}
