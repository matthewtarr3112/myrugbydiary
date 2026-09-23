"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, doc, updateDoc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trophy, MapPin, Calendar } from "lucide-react";

interface Fixture {
  id: string;
  opponent: string;
  homeAway: "home" | "away";
  location: string;
  date: Date;
  result: { us: number; them: number } | null;
}

export default function FixturesPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [resultFor, setResultFor] = useState<string | null>(null);

  const [opponent, setOpponent] = useState("");
  const [homeAway, setHomeAway] = useState<"home" | "away">("home");
  const [location, setLocation] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("15:00");

  const [usScore, setUsScore] = useState("");
  const [themScore, setThemScore] = useState("");

  useEffect(() => {
    if (loading || role !== "coach") return;
    const unsub = onSnapshot(collection(db, "fixtures"), (snap) => {
      const loaded = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          opponent: data.opponent,
          homeAway: data.homeAway,
          location: data.location,
          date: data.date.toDate(),
          result: data.result ?? null,
        } as Fixture;
      });
      loaded.sort((a, b) => a.date.getTime() - b.date.getTime());
      setFixtures(loaded);
    });
    return unsub;
  }, [loading, role]);

  if (loading) return null;
  if (role !== "coach") {
    router.push("/login");
    return null;
  }

  async function handleAdd() {
    if (!opponent || !dateStr) return;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(h, m, 0, 0);
    await addDoc(collection(db, "fixtures"), {
      opponent,
      homeAway,
      location,
      date: Timestamp.fromDate(d),
      result: null,
    });
    setOpponent("");
    setLocation("");
    setDateStr("");
    setTimeStr("15:00");
    setHomeAway("home");
    setShowForm(false);
  }

  async function handleSaveResult(fixtureId: string) {
    if (usScore === "" || themScore === "") return;
    await updateDoc(doc(db, "fixtures", fixtureId), {
      result: { us: Number(usScore), them: Number(themScore) },
    });
    setResultFor(null);
    setUsScore("");
    setThemScore("");
  }

  const now = new Date();
  const upcoming = fixtures.filter((f) => f.date >= now);
  const past = fixtures.filter((f) => f.date < now).reverse();

  function resultBadge(f: Fixture) {
    if (!f.result) return null;
    const diff = f.result.us - f.result.them;
    const label = diff > 0 ? "W" : diff < 0 ? "L" : "D";
    const color =
      diff > 0 ? "text-emerald-400 bg-emerald-500/10" : diff < 0 ? "text-red-400 bg-red-500/10" : "text-neutral-400 bg-neutral-500/10";
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
        {label} {f.result.us}–{f.result.them}
      </span>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white p-6 md:p-10 mx-auto">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-emerald-500" /> Fixtures
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus className="w-4 h-4" /> Add Fixture
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-8 space-y-3">
          <input
            type="text"
            placeholder="Opponent (e.g. Pretoria Bulls)"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setHomeAway("home")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium border ${
                homeAway === "home" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-neutral-700 text-neutral-400"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setHomeAway("away")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium border ${
                homeAway === "away" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-neutral-700 text-neutral-400"
              }`}
            >
              Away
            </button>
          </div>
          <input
            type="text"
            placeholder="Location (e.g. Barnard Stadium)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl py-2.5 text-sm font-semibold"
          >
            Save Fixture
          </button>
        </div>
      )}

      <div className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-neutral-600 text-sm">No upcoming fixtures</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((f) => (
              <div key={f.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {f.homeAway === "home" ? "vs" : "@"} {f.opponent}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {f.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}{" "}
                      {f.date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {f.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {f.location}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-neutral-800 text-neutral-400">
                  {f.homeAway === "home" ? "Home" : "Away"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
          Past ({past.length})
        </h2>
        {past.length === 0 ? (
          <p className="text-neutral-600 text-sm">No past fixtures yet</p>
        ) : (
          <div className="space-y-2">
            {past.map((f) => (
              <div key={f.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {f.homeAway === "home" ? "vs" : "@"} {f.opponent}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {f.date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {f.result ? (
                    resultBadge(f)
                  ) : resultFor === f.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Us"
                        value={usScore}
                        onChange={(e) => setUsScore(e.target.value)}
                        className="w-14 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-sm text-center"
                      />
                      <span className="text-neutral-500">–</span>
                      <input
                        type="number"
                        placeholder="Them"
                        value={themScore}
                        onChange={(e) => setThemScore(e.target.value)}
                        className="w-14 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-sm text-center"
                      />
                      <button
                        onClick={() => handleSaveResult(f.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-1 text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResultFor(f.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Add Result
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}