"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { CalendarDays } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { dateKey, getWeekStart } from "@/lib/date";
import { normalizeProgram, ProgramWeek } from "@/lib/program";
import { WeatherWidget } from "@/components/WeatherWidget";
import { ScheduleWidget } from "@/components/ScheduleWidget";
import { ProgramViewer } from "@/components/ProgramViewer";

// TEMP: player login/role assignment isn't wired up yet, so the auth guard
// below is disabled to allow previewing this page. Restore it once player
// accounts can actually authenticate.
const PREVIEW_MODE = true;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlayerHome() {
  const { user, role, playerId, loading } = useAuth();
  const router = useRouter();

  const [playerName, setPlayerName] = useState("");
  const [programs, setPrograms] = useState<ProgramWeek[]>([]);
  const [quotes, setQuotes] = useState<Record<string, { text: string; author: string }>>({});
  const [view, setView] = useState<"today" | "week">("week");
  const [selectedDate] = useState(todayString());

  useEffect(() => {
    if (PREVIEW_MODE) return;
    if (loading) return;
    if (!user || role !== "player") {
      router.push("/login");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!playerId) return;
    getDoc(doc(db, "players", playerId)).then((snap) => {
      if (snap.exists()) setPlayerName((snap.data().name as string) || "");
    });
  }, [playerId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "programs"), (snap) => {
      const loaded = snap.docs.map((item) => normalizeProgram(item.id, item.data()));
      loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPrograms(loaded);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quotes"), (snap) => {
      const map: Record<string, { text: string; author: string }> = {};
      snap.docs.forEach((d) => (map[d.id] = d.data() as { text: string; author: string }));
      setQuotes(map);
    });
    return unsub;
  }, []);

  const myProgram = useMemo(
    () => programs.find((program) => program.assignedAll || (playerId && program.assignedPlayerIds.includes(playerId))),
    [programs, playerId]
  );

  const weekKey = dateKey(getWeekStart(new Date()));
  const quote = quotes[weekKey];

  if (!PREVIEW_MODE && (loading || !user || role !== "player")) {
    return <div className="min-h-screen w-full bg-neutral-950 text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen w-full bg-neutral-950 p-6 text-white md:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-sm uppercase tracking-wide text-emerald-400">Player dashboard</p>
        <h1 className="mt-2 text-3xl font-bold">
          {playerName ? `Welcome back, ${playerName}` : "Your training week"}
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-400">
          View this week&apos;s session, exercises and coaching notes.
        </p>

        {quote?.text && (
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm italic text-neutral-300">&quot;{quote.text}&quot;</p>
            {quote.author && <p className="mt-1 text-xs text-neutral-500">— {quote.author}</p>}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WeatherWidget />
        </div>

        <section className="mt-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-emerald-500" /> Today&apos;s schedule
          </h2>
          <ScheduleWidget />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5 text-emerald-500" /> Weekly program
            </h2>
            <div className="flex rounded-xl border border-neutral-800 p-1">
              <button
                onClick={() => setView("today")}
                className={`rounded-lg px-4 py-2 text-sm ${view === "today" ? "bg-emerald-500 text-black" : "text-neutral-400"}`}
              >
                Today
              </button>
              <button
                onClick={() => setView("week")}
                className={`rounded-lg px-4 py-2 text-sm ${view === "week" ? "bg-emerald-500 text-black" : "text-neutral-400"}`}
              >
                Week
              </button>
            </div>
          </div>
          {myProgram ? (
            <ProgramViewer program={myProgram} view={view} date={selectedDate} />
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-500">
              No program has been assigned to you yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
