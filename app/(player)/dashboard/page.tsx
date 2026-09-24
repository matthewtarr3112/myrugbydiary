"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

// TEMP: player login/role assignment isn't wired up yet, so the auth guard
// below is disabled to allow previewing this page. Restore it once player
// accounts can actually authenticate.
const PREVIEW_MODE = true;

export default function PlayerHome() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (PREVIEW_MODE) return;
    if (loading) return;
    if (!user || role !== "player") {
      router.push("/login");
    }
  }, [user, role, loading, router]);

  if (!PREVIEW_MODE && (loading || !user || role !== "player")) {
    return <div className="min-h-screen w-full bg-neutral-950 text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen w-full bg-neutral-950 p-6 text-white md:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-sm uppercase tracking-wide text-emerald-400">Player dashboard</p>
        <h1 className="mt-2 text-3xl font-bold">Your training week</h1>
        <p className="mt-2 max-w-2xl text-neutral-400">
          View today&apos;s session, the full weekly plan, exercises and coaching notes.
        </p>
        <button
          type="button"
          onClick={() => router.push("/program")}
          className="mt-8 flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4 text-left transition hover:border-emerald-500/50"
        >
          <CalendarDays className="h-6 w-6 text-emerald-400" />
          <span>
            <strong className="block">Open program viewer</strong>
            <span className="text-sm text-neutral-500">Today and weekly programme</span>
          </span>
        </button>
      </div>
    </main>
  );
}