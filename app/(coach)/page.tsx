"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { dateKey, getWeekStart } from "@/lib/date";
import { WeatherWidget } from "@/components/WeatherWidget";
import { ScheduleWidget } from "@/components/ScheduleWidget";
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
  Bell,
  ChevronRight,
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

export default function CoachHome() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [quotes, setQuotes] = useState<Record<string, { text: string; author: string }>>({});

  useEffect(() => {
    if (loading) return;
    if (!user || role !== "coach") router.push("/login");
  }, [user, role, loading, router]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quotes"), (snap) => {
      const map: Record<string, { text: string; author: string }> = {};
      snap.docs.forEach((d) => (map[d.id] = d.data() as { text: string; author: string }));
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

  const weekKey = dateKey(getWeekStart(new Date()));
  const quote = quotes[weekKey];

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-neutral-950 pb-10 text-white">
      <header className="flex min-w-0 items-center justify-between px-4 pb-6 pt-8 sm:px-6">
        <div className="min-w-0">
          <p className="text-sm text-neutral-500">Today</p>
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
              <p className="break-words text-sm italic text-neutral-300">&quot;{quote.text}&quot;</p>
            {quote.author && (
              <p className="text-xs text-neutral-500 mt-1">— {quote.author}</p>
            )}
          </div>
        </div>
      )}

      <section className="mb-8 min-w-0 px-4 sm:px-6">
        <div className="mb-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <WeatherWidget />
          <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <ClipboardCheck size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Attendance</span>
            </div>
            <p className="text-neutral-600 text-sm">—</p>
          </div>
        </div>

        <ScheduleWidget />
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
