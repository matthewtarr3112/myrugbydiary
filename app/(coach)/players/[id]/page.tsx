"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, getDocs, setDoc, addDoc, collection, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import {
  METRIC_DEFS, POSITION_GROUPS, PositionGroup, compareToTarget, parseMetricValue,
} from "@/lib/metrics";
import {
  TRAINING_GOAL_OPTIONS,
  TrainingGoal,
  getRepSchemeForGoal,
  getTrainingGoalLabel,
} from "@/lib/training";
import { ArrowLeft, Save, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PlayerDoc {
  name: string;
  primaryPosition: PositionGroup | null;
  secondaryPosition: PositionGroup | null;
  trainingGoal: TrainingGoal | null;
  jerseyNumber: number | null;
  dob: string | null;
  heightCm: number | null;
  weightKg: number | null;
  photoUrl: string | null;
}

interface MetricRow {
  metricKey: string;
  nov: string | number | null;
  jan: string | number | null;
}

const BLANK_PLAYER: PlayerDoc = {
  name: "",
  primaryPosition: null,
  secondaryPosition: null,
  trainingGoal: null,
  jerseyNumber: null,
  dob: null,
  heightCm: null,
  weightKg: null,
  photoUrl: null,
};

export default function PlayerCardPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [player, setPlayer] = useState<PlayerDoc>(BLANK_PLAYER);
  const [metricRows, setMetricRows] = useState<MetricRow[]>([]);
  const [targets, setTargets] = useState<Record<string, string | number> | null>(null);
  const [fetching, setFetching] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || role !== "coach" || isNew) return;
    (async () => {
      const playerSnap = await getDoc(doc(db, "players", id));
      if (playerSnap.exists()) {
        setPlayer({ ...BLANK_PLAYER, ...(playerSnap.data() as PlayerDoc) });
      }

      const metricsSnap = await getDocs(
        query(collection(db, "metrics"), where("playerId", "==", id))
      );
      const byKey: Record<string, MetricRow> = {};
      metricsSnap.docs.forEach((d) => {
        const data = d.data();
        const key = data.metricKey as string;
        if (!byKey[key]) byKey[key] = { metricKey: key, nov: null, jan: null };
        if (data.session === "Nov 2023") byKey[key].nov = data.value;
        if (data.session === "Jan 2024") byKey[key].jan = data.value;
      });
      setMetricRows(Object.values(byKey));
      setFetching(false);
    })();
  }, [loading, role, id, isNew]);

  useEffect(() => {
    if (!player.primaryPosition) {
      setTargets(null);
      return;
    }
    (async () => {
      const targetSnap = await getDoc(doc(db, "targets", player.primaryPosition as string));
      setTargets(targetSnap.exists() ? (targetSnap.data().targets as Record<string, string | number>) : null);
    })();
  }, [player.primaryPosition]);

  if (loading) return null;
  if (role !== "coach") {
    router.push("/login");
    return null;
  }

  async function handleSave() {
    if (!player.name.trim()) return;
    setSaving(true);
    if (isNew) {
      const ref = await addDoc(collection(db, "players"), player);
      router.push(`/players/${ref.id}`);
    } else {
      await setDoc(doc(db, "players", id), player, { merge: true });
      setSaving(false);
    }
  }

  function bestValue(row: MetricRow): string | number | null {
    const def = METRIC_DEFS.find((m) => m.key === row.metricKey);
    const novVal = parseMetricValue(row.nov);
    const janVal = parseMetricValue(row.jan);
    if (novVal === null && janVal === null) return null;
    if (novVal === null) return row.jan;
    if (janVal === null) return row.nov;
    if (!def) return row.jan;
    if (def.betterDirection === "lower") return novVal <= janVal ? row.nov : row.jan;
    return novVal >= janVal ? row.nov : row.jan;
  }

  const selectedGoalScheme = player.trainingGoal ? getRepSchemeForGoal(player.trainingGoal) : null;

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white p-6 md:p-10 mx-auto">
      <button
        onClick={() => router.push("/players")}
        className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to roster
      </button>

      <div className="grid md:grid-cols-[220px_minmax(0,1fr)] gap-8 w-full max-w-none">
        {/* Left: photo + basic form */}
        <div className="space-y-4">
          <div className="w-full aspect-square rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
            {player.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-neutral-500 text-sm text-center px-4">No photo</span>
            )}
          </div>
          <input
            type="text"
            placeholder="Photo URL"
            value={player.photoUrl ?? ""}
            onChange={(e) => setPlayer({ ...player, photoUrl: e.target.value || null })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm"
          />
        </div>

        {/* Right: details form */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Player name"
            value={player.name}
            onChange={(e) => setPlayer({ ...player, name: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-xl font-bold"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Primary Position</label>
              <select
                value={player.primaryPosition ?? ""}
                onChange={(e) =>
                  setPlayer({ ...player, primaryPosition: (e.target.value || null) as PositionGroup | null })
                }
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5"
              >
                <option value="">Unassigned</option>
                {POSITION_GROUPS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Secondary Position</label>
              <select
                value={player.secondaryPosition ?? ""}
                onChange={(e) =>
                  setPlayer({ ...player, secondaryPosition: (e.target.value || null) as PositionGroup | null })
                }
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5"
              >
                <option value="">None</option>
                {POSITION_GROUPS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="training-goal" className="text-xs text-neutral-500 mb-1 block">
                Training Goal
              </label>
              <select
                id="training-goal"
                value={player.trainingGoal ?? ""}
                onChange={(e) =>
                  setPlayer({
                    ...player,
                    trainingGoal: (e.target.value || null) as TrainingGoal | null,
                  })
                }
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5"
              >
                <option value="">Not set</option>
                {TRAINING_GOAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Jersey Number</label>
              <input
                type="number"
                value={player.jerseyNumber ?? ""}
                onChange={(e) => setPlayer({ ...player, jerseyNumber: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={player.dob ?? ""}
                onChange={(e) => setPlayer({ ...player, dob: e.target.value || null })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Training Goal Preview</label>
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-300 min-h-[42px] flex items-center">
                {selectedGoalScheme ? (
                  <span>{getTrainingGoalLabel(player.trainingGoal)} · {selectedGoalScheme.reps} reps</span>
                ) : (
                  <span className="text-neutral-500">No goal assigned</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Height (cm)</label>
              <input
                type="number"
                value={player.heightCm ?? ""}
                onChange={(e) => setPlayer({ ...player, heightCm: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Weight (kg)</label>
              <input
                type="number"
                value={player.weightKg ?? ""}
                onChange={(e) => setPlayer({ ...player, weightKg: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !player.name.trim()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : isNew ? "Create Player" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Performance section — only for existing players */}
      {!isNew && (
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-1">Performance</h2>
          {!player.primaryPosition && (
            <p className="text-amber-400 text-sm mb-4">
              Set a primary position above to compare this player against position targets.
            </p>
          )}
          {fetching ? (
            <p className="text-neutral-500 text-sm">Loading metrics...</p>
          ) : metricRows.length === 0 ? (
            <p className="text-neutral-500 text-sm">No test data recorded for this player yet.</p>
          ) : (
            <div className="rounded-2xl border border-neutral-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900 text-neutral-400 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Metric</th>
                    <th className="px-4 py-3 font-medium">Nov 2023</th>
                    <th className="px-4 py-3 font-medium">Jan 2024</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => {
                    const def = METRIC_DEFS.find((m) => m.key === row.metricKey);
                    const target = targets?.[row.metricKey] ?? null;
                    const best = bestValue(row);
                    const status = target !== null ? compareToTarget(row.metricKey, best, target) : "unknown";
                    return (
                      <tr key={row.metricKey} className="border-t border-neutral-800">
                        <td className="px-4 py-3 text-neutral-300">
                          {def?.label ?? row.metricKey}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">{row.nov ?? "—"}</td>
                        <td className="px-4 py-3 text-neutral-400">{row.jan ?? "—"}</td>
                        <td className="px-4 py-3 text-neutral-400">{target ?? "—"}</td>
                        <td className="px-4 py-3">
                          {status === "ahead" && (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <TrendingUp className="w-3.5 h-3.5" /> On target
                            </span>
                          )}
                          {status === "behind" && (
                            <span className="flex items-center gap-1 text-red-400">
                              <TrendingDown className="w-3.5 h-3.5" /> Below target
                            </span>
                          )}
                          {status === "unknown" && (
                            <span className="flex items-center gap-1 text-neutral-500">
                              <Minus className="w-3.5 h-3.5" /> No target
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
