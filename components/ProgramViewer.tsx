import { formatExerciseRows, formatProgramDate, PROGRAM_DAYS, ProgramSession, ProgramWeek } from "@/lib/program";

export function SessionCard({ session }: { session: ProgramSession }) {
  const rows = formatExerciseRows(session.exercises.filter(Boolean), session.supersetGroups ?? [], true);
  const loadColor = session.load === "high" ? "text-red-300" : session.load === "low" ? "text-cyan-300" : "text-emerald-300";
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80">
      <div className="flex items-start justify-between border-b border-neutral-800 p-4">
        <div>
          <h3 className="font-semibold">{session.title || "Training session"}</h3>
          <p className="text-xs text-neutral-500">{session.location} · {session.startTime} - {session.endTime}</p>
        </div>
        <span className={`text-xs uppercase ${loadColor}`}>{session.load}</span>
      </div>
      <div className="p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">Exercise program</p>
        {rows.map((row, index) => (
          <div key={`${session.id}-${index}`} className="border-b border-neutral-800 py-3 last:border-0">
            <div className="flex items-baseline gap-3 text-sm">
              {row.label && <span className="w-8 shrink-0 font-bold text-emerald-300">{row.label}</span>}
              <span className={row.label ? "flex-1 text-neutral-100" : "pl-11 text-neutral-400"}>{row.exercise}</span>
              {row.prescription && <span className="text-xs text-cyan-300">{row.prescription}</span>}
            </div>
            {row.notes && <p className="mt-1 pl-11 text-xs text-neutral-500">{row.notes}</p>}
          </div>
        ))}
      </div>
    </article>
  );
}

export function ProgramViewer({ program, view, date }: { program: ProgramWeek; view: "today" | "week"; date: string }) {
  const sessions = view === "today" ? program.sessions.filter((session) => session.date === date) : program.sessions;
  const groups = PROGRAM_DAYS.map((day) => ({ day, sessions: sessions.filter((session) => session.day === day) })).filter((group) => group.sessions.length);
  const notes = [program.duties, ...sessions.flatMap((session) => [session.details, session.notes])].filter(Boolean);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{program.title}</h2>
        <p className="text-sm text-neutral-500">Week starting {formatProgramDate(program.weekStart)}</p>
      </div>
      {groups.map((group) => (
        <section key={group.day}>
          <div className="mb-3 border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wide">{group.day}</h3>
            <p className="text-xs text-neutral-500">{formatProgramDate(group.sessions[0].date)}</p>
          </div>
          <div className="space-y-3">
            {group.sessions.map((session) => <SessionCard key={session.id} session={session} />)}
          </div>
        </section>
      ))}
      {notes.length > 0 && (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">Notes</h3>
          {notes.map((note, index) => (
            <p key={index} className="mt-2 whitespace-pre-wrap border-b border-neutral-800 pb-2 text-sm text-neutral-400">{note}</p>
          ))}
        </section>
      )}
    </div>
  );
}
