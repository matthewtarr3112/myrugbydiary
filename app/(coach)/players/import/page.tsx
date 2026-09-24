"use client";

import { useState } from "react";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SEED_PLAYERS, SEED_TARGETS } from "@/lib/seedData";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";

export default function ImportPlayersPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (role !== "coach") {
    router.push("/login");
    return null;
  }

  async function runImport() {
    setBusy(true);
    setStatus("Importing players...");

    const batch = writeBatch(db);
    let playerCount = 0;

    for (const p of SEED_PLAYERS) {
      const playerRef = doc(collection(db, "players"));
      batch.set(playerRef, {
        name: p.name,
        primaryPosition: null,
        secondaryPosition: null,
        dob: null,
        heightCm: null,
        weightKg: null,
        photoUrl: null,
        email: null,
        inviteStatus: "not_invited",
        jerseyNumber: null,
        createdAt: new Date().toISOString(),
      });
      playerCount++;

      // metrics: one doc per {player, metric, session}
      for (const [session, metrics] of [
        ["Nov 2023", p.nov2023],
        ["Jan 2024", p.jan2024],
      ] as const) {
        for (const [metricKey, value] of Object.entries(metrics)) {
          const metricRef = doc(collection(db, "metrics"));
          batch.set(metricRef, {
            playerId: playerRef.id,
            playerName: p.name,
            metricKey,
            value,
            session,
          });
        }
      }
    }

    await batch.commit();
    setStatus(`Imported ${playerCount} players + their metrics. Importing targets...`);

    // targets: one doc per position group (separate batch, small)
    const targetBatch = writeBatch(db);
    for (const t of SEED_TARGETS) {
      const targetRef = doc(db, "targets", t.position);
      targetBatch.set(targetRef, { position: t.position, targets: t.targets });
    }
    await targetBatch.commit();

    setStatus(
      `Done. Imported ${playerCount} players, their Nov 2023 + Jan 2024 metrics, and ${SEED_TARGETS.length} position target sets.`
    );
    setBusy(false);
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white p-8 mx-auto">
      <h1 className="text-2xl font-bold mb-2">Import Example Player Data</h1>
      <p className="text-neutral-400 mb-6">
        One-time import of 26 historical players (with Nov 2023 / Jan 2024 test
        results) and position-based targets, for use as placeholder data in the
        Roster and Performance Centre. Positions are left blank — assign them
        per player after import.
      </p>

      <button
        onClick={runImport}
        disabled={busy}
        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold px-6 py-3 rounded-xl transition"
      >
        {busy ? "Importing..." : "Run Import"}
      </button>

      {status && (
        <p className="mt-4 text-emerald-400 text-sm whitespace-pre-line">{status}</p>
      )}

      <p className="mt-8 text-xs text-neutral-500">
        Safe to run once. Running it again will create duplicate players — delete
        this page (or the players/metrics/targets collections in Firestore) once
        real data entry replaces this example set.
      </p>
    </div>
  );
}
