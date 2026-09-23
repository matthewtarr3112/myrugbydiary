export const PROGRAM_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type ProgramDay = (typeof PROGRAM_DAYS)[number];
export type TrainingLoad = "high" | "low" | "recovery" | "rest";

export interface ProgramSession {
  id: string;
  day: ProgramDay;
  date: string;
  load: TrainingLoad;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  location: string;
  duration: string;
  details: string;
  exercises: string[];
  notes: string;
  supersetGroups: number[][];
}

export interface ProgramWeek {
  id: string;
  title: string;
  weekStart: string;
  quote: string;
  sessions: ProgramSession[];
  duties: string;
  assignedPlayerIds: string[];
  assignedAll: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const TRAINING_LOAD_OPTIONS: Array<{ value: TrainingLoad; label: string }> = [
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
  { value: "recovery", label: "Recovery" },
  { value: "rest", label: "Rest" },
];

export function makeSession(day: ProgramDay, date = ""): ProgramSession {
  return {
    id: `${day.toLowerCase()}-${Date.now()}`,
    day,
    date,
    load: "high",
    startTime: "07:00",
    endTime: "08:30",
    title: "Gym",
    category: "Strength and conditioning",
    location: "Gym",
    duration: "90 min",
    details: "",
    exercises: [""],
    notes: "",
    supersetGroups: [],
  };
}

export function formatProgramDate(date: string) {
  if (!date) return "Date not set";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function isSessionOnDate(session: ProgramSession, date: Date) {
  if (session.date) {
    return session.date === date.toISOString().slice(0, 10);
  }
  return session.day === PROGRAM_DAYS[(date.getDay() + 6) % 7];
}

export function normalizeProgram(id: string, data: Record<string, unknown>): ProgramWeek {
  const legacyMovements = Array.isArray(data.movements)
    ? data.movements.filter((movement): movement is string => typeof movement === "string")
    : [];
  const legacySession = makeSession("Monday");
  legacySession.title = "Program block";
  legacySession.details = typeof data.notes === "string" ? data.notes : "";
  legacySession.exercises = legacyMovements;

  return {
    id,
    title: typeof data.title === "string" ? data.title : "Weekly program",
    weekStart: typeof data.weekStart === "string" ? data.weekStart : "",
    quote: typeof data.quote === "string" ? data.quote : "",
    sessions: Array.isArray(data.sessions)
      ? (data.sessions as ProgramSession[]).map((session) => ({ ...session, supersetGroups: session.supersetGroups ?? [] }))
      : legacyMovements.length > 0
        ? [legacySession]
        : [],
    duties: typeof data.duties === "string" ? data.duties : "",
    assignedPlayerIds: Array.isArray(data.assignedPlayerIds)
      ? data.assignedPlayerIds.filter((playerId): playerId is string => typeof playerId === "string")
      : [],
    assignedAll: data.assignedAll === true,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export function parseProgramText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = lines.find((line) => /week|program|schedule/i.test(line)) ?? "Imported weekly program";
  const quote = lines.find((line) => /[“\"]/.test(line) && /[”\"]/.test(line))?.replace(/\s+/g, " ") ?? "";
  const dateMatch = text.match(/\b(\d{1,2})\s*[-–]\s*\d{1,2}\s+([A-Za-z]+)\s+(\d{4})\b/);
  const monthIndex = dateMatch ? new Date(`${dateMatch[2]} 1, ${dateMatch[3]}`).getMonth() : -1;
  const weekStart = dateMatch && monthIndex >= 0
    ? `${dateMatch[3]}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(dateMatch[1])).padStart(2, "0")}`
    : "";
  const dayMatches = [...text.matchAll(/\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/gi)];
  const days = [...new Set(dayMatches.map((match) => {
    const value = match[1].toLowerCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
  }))] as ProgramDay[];
  const detectedDays: ProgramDay[] = days.length > 0 ? days : ["Monday"];
  const activityLines = lines.filter((line) => /gym|theory|aerobic|skills|recovery|stretch|warm|conditioning|refuel|lunch|meeting/i.test(line));
  const chunkSize = Math.max(1, Math.ceil(activityLines.length / detectedDays.length));
  const sessions = detectedDays.map((day, index) => {
    const session = makeSession(day);
    const activities = activityLines.slice(index * chunkSize, (index + 1) * chunkSize);
    const exerciseLines = activities
      .flatMap((line) => line.split(/(?<=[.!?;])\s+/))
      .map((line) => line.replace(/^\d{2}h\d{2}\s+/, "").replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 2)
      .slice(0, 10);
    session.title = exerciseLines[0] ?? `Imported ${day} session`;
    session.category = "Imported timetable";
    session.details = "Imported from PDF. Review the exercise list and add or adjust coaching notes before publishing.";
    session.exercises = exerciseLines;
    return session;
  });

  return {
    title: title.replace(/\s+/g, " ").slice(0, 120),
    weekStart,
    quote: quote.slice(0, 500),
    duties: "Imported from PDF. Review each session before saving and add any duty roster or weekly notes.",
    sessions,
  };
}

export function splitExerciseText(exercises: string[]) {
  return exercises
    .flatMap((exercise) => exercise.split(/(?<=[.!?;])\s+|\s+(?=(?:Back|Front|Goblet|Bulgarian|Romanian|Incline|Decline|Flat|Single|Double|Seated|Standing|Walking|Push|Pull|DB|BB|KB|TRX|Cable|Barbell|Dumbbell)\b)/i))
    .map((exercise) => exercise.replace(/\s+/g, " ").trim())
    .filter((exercise) => exercise.length > 2)
    .slice(0, 20);
}

export interface ExerciseRow {
  label: string;
  exercise: string;
  prescription: string;
  notes: string;
}

function isGymExercise(text: string) {
  if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|^\d{1,2}\s+[a-z]+\s+\d{4}/i.test(text)) return false;
  if (/^(training|warm[- ]?up|cool[- ]?down|extra conditioning|on the|push\s*\d|pull\s*\d|sled work|flat|back through)/i.test(text)) return false;
  return /back squat|front squat|goblet squat|split squat|bulgarian|deadlift|good morning|bench press|shoulder press|chest press|row\b|pull[- ]?up|chin[- ]?up|neck bridge|hamstring|calf raise|lunges?|bicep|tricep|curl\b|superset|barbell|dumbbell|kettlebell|\bdb\b|\bbb\b/i.test(text);
}

export function formatExerciseRows(exercises: string[], supersetGroups: number[][] = [], manualMode = false): ExerciseRow[] {
  let letterIndex = 0;
  let supersetLetter = -1;
  let supersetIndex = 0;
  let supersetRemaining = 0;

  return splitExerciseText(exercises).map((rawText, exerciseIndex) => {
    const text = rawText.replace(/\s+/g, " ").trim();
    const sentences = text.split(/(?<=[.!?])\s+/);
    const firstSentence = sentences.shift() ?? text;
    const prescriptionMatch = firstSentence.match(/\b\d+\s*(?:sets?|x|reps?|min(?:utes?)?)\b[^.;]*/i);
    const prescription = prescriptionMatch?.[0]?.trim() ?? "";
    const exercise = firstSentence.replace(prescription, "").replace(/\s{2,}/g, " ").trim().replace(/[,:-]+$/, "");
    const notes = sentences.join(" ").trim();
    const group = supersetGroups.find((indexes) => indexes.includes(exerciseIndex));
    const gymExercise = manualMode || isGymExercise(text);
    const startsSuperset = gymExercise && /\bsuperset\b/i.test(text);

    if (group && group[0] === exerciseIndex) {
      supersetLetter = letterIndex;
      supersetIndex = 1;
      supersetRemaining = group.length;
    } else if (gymExercise && startsSuperset && supersetRemaining === 0) {
      supersetLetter = letterIndex;
      supersetIndex = 1;
      supersetRemaining = 2;
    }

    const label = !gymExercise
      ? ""
      : supersetRemaining > 0
        ? `${String.fromCharCode(65 + supersetLetter)}${supersetIndex}`
        : String.fromCharCode(65 + letterIndex);

    if (gymExercise && supersetRemaining > 0) {
      supersetIndex += 1;
      supersetRemaining -= 1;
      if (supersetRemaining === 0) letterIndex = supersetLetter + 1;
    } else if (gymExercise) {
      letterIndex += 1;
    }

    return { label, exercise: exercise || text, prescription, notes };
  });
}
