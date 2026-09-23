"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { FORMATION_ROWS, PositionGroup } from "@/lib/metrics";
import {
  TRAINING_GOAL_OPTIONS,
  TrainingGoal,
  getTrainingGoalLabel,
} from "@/lib/training";
import { UserPlus, Users } from "lucide-react";

interface Player {
  id: string;
  name: string;
  primaryPosition: PositionGroup | null;
  secondaryPosition: PositionGroup | null;
  trainingGoal: TrainingGoal | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PlayerTile({
  player,
  onClick,
  onTrainingGoalChange,
}: {
  player: Player;
  onClick: () => void;
  onTrainingGoalChange: (playerId: string, goal: TrainingGoal | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 w-28">
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div className="relative w-16 h-16 rounded-full bg-neutral-800 border-2 border-neutral-700 group-hover:border-emerald-500 flex items-center justify-center overflow-hidden transition">
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-neutral-400 font-semibold text-sm">
              {initials(player.name)}
            </span>
          )}
          {player.jerseyNumber && (
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {player.jerseyNumber}
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-300 text-center leading-tight group-hover:text-emerald-400 transition px-1">
          {player.name}
        </span>
      </button>

      <div className="w-full">
        <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-1 text-center">
          Goal
        </label>
        <select
          value={player.trainingGoal ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onTrainingGoalChange(player.id, (e.target.value || null) as TrainingGoal | null);
          }}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-[11px] text-neutral-100 outline-none focus:border-emerald-500"
          aria-label={`${player.name} training goal`}
        >
          <option value="">None</option>
          {TRAINING_GOAL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="mt-1 text-center text-[10px] text-neutral-400 min-h-[14px]">
          {player.trainingGoal ? getTrainingGoalLabel(player.trainingGoal) : "Not set"}
        </div>
      </div>
    </div>
  );
}

export default function RosterPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [fetching, setFetching] = useState(true);

  const handleTrainingGoalChange = async (playerId: string, goal: TrainingGoal | null) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId ? { ...player, trainingGoal: goal } : player
      )
    );

    await setDoc(doc(db, "players", playerId), { trainingGoal: goal }, { merge: true });
  };

  useEffect(() => {
    if (loading || role !== "coach") return;
    (async () => {
      const snap = await getDocs(query(collection(db, "players"), orderBy("name")));
      setPlayers(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Player, "id">) }))
      );
      setFetching(false);
    })();
  }, [loading, role]);

  if (loading) return null;
  if (role !== "coach") {
    router.push("/login");
    return null;
  }

  const unassigned = players.filter((p) => !p.primaryPosition);

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" /> Team Players
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {players.length} player{players.length !== 1 ? "s" : ""} on the roster
          </p>
        </div>
        <button
          onClick={() => router.push("/players/new")}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <UserPlus className="w-4 h-4" /> Add Player
        </button>
      </div>

      {fetching ? (
        <p className="text-neutral-500">Loading roster...</p>
      ) : players.length === 0 ? (
        <p className="text-neutral-500">
          No players yet. Click &quot;Add Player&quot; to add your first one.
        </p>
      ) : (
        <div className="space-y-10">
          {unassigned.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Unassigned — needs a position ({unassigned.length})
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-4 bg-neutral-900/50 border border-amber-500/20 rounded-2xl p-5">
                {unassigned.map((p) => (
                  <PlayerTile
                    key={p.id}
                    player={p}
                    onClick={() => router.push(`/players/${p.id}`)}
                    onTrainingGoalChange={handleTrainingGoalChange}
                  />
                ))}
              </div>
            </div>
          )}

          {FORMATION_ROWS.map((row) => {
            const rowPlayers = players.filter(
              (p) => p.primaryPosition && row.positions.includes(p.primaryPosition)
            );
            if (rowPlayers.length === 0) return null;
            return (
              <div key={row.label}>
                <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-4">
                  {row.label}
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6">
                  {rowPlayers.map((p) => (
                    <PlayerTile
                      key={p.id}
                      player={p}
                      onClick={() => router.push(`/players/${p.id}`)}
                      onTrainingGoalChange={handleTrainingGoalChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
