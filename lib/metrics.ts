// Metric definitions — single source of truth for labels, units, and "better direction".
// betterDirection: "lower" = smaller number is better (times), "higher" = bigger is better (weights/reps/distance).

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  betterDirection: "lower" | "higher";
  category: "conditioning" | "strength" | "power" | "bodyComp";
}

export const METRIC_DEFS: MetricDef[] = [
  { key: "bronco", label: "Bronco", unit: "", betterDirection: "lower", category: "conditioning" },
  { key: "repeatSprint", label: "Repeat Sprint", unit: "", betterDirection: "higher", category: "conditioning" },
  { key: "row1600m", label: "Row 1600m", unit: "", betterDirection: "lower", category: "conditioning" },
  { key: "sprint10m", label: "10m Sprint", unit: "s", betterDirection: "lower", category: "conditioning" },
  { key: "sprint40m", label: "40m Sprint", unit: "s", betterDirection: "lower", category: "conditioning" },
  { key: "squat5rm", label: "Squat 5RM", unit: "kg", betterDirection: "higher", category: "strength" },
  { key: "squat1rm", label: "Squat 1RM", unit: "kg", betterDirection: "higher", category: "strength" },
  { key: "bench5rm", label: "Bench 5RM", unit: "kg", betterDirection: "higher", category: "strength" },
  { key: "bench1rm", label: "Bench 1RM", unit: "kg", betterDirection: "higher", category: "strength" },
  { key: "pullups", label: "Pull-ups", unit: "reps", betterDirection: "higher", category: "strength" },
  { key: "clean5rm", label: "Clean 5RM", unit: "kg", betterDirection: "higher", category: "strength" },
  { key: "grace", label: "Grace", unit: "", betterDirection: "lower", category: "conditioning" },
  { key: "burpee7min", label: "7min Burpee", unit: "reps", betterDirection: "higher", category: "conditioning" },
  { key: "verticalJump", label: "Vertical Jump", unit: "", betterDirection: "higher", category: "power" },
  { key: "broadJump", label: "Broad Jump", unit: "m", betterDirection: "higher", category: "power" },
  { key: "medBallChestPass", label: "MB Chest Pass", unit: "m", betterDirection: "higher", category: "power" },
  { key: "fatPct", label: "Body Fat %", unit: "%", betterDirection: "lower", category: "bodyComp" },
];

export function getMetricDef(key: string): MetricDef | undefined {
  return METRIC_DEFS.find((m) => m.key === key);
}

export const POSITION_GROUPS = [
  "Props", "Hookers", "Locks", "Loosies",
  "Scrumhalves", "Flyhalves", "Centres", "Wings", "Fullback",
] as const;

export type PositionGroup = typeof POSITION_GROUPS[number];

// Formation rows for the roster view — top to bottom, matching a rugby team shape.
export const FORMATION_ROWS: { label: string; positions: PositionGroup[] }[] = [
  { label: "Front Row", positions: ["Props", "Hookers"] },
  { label: "Second Row", positions: ["Locks"] },
  { label: "Back Row", positions: ["Loosies"] },
  { label: "Halfbacks", positions: ["Scrumhalves", "Flyhalves"] },
  { label: "Centres", positions: ["Centres"] },
  { label: "Back Three", positions: ["Wings", "Fullback"] },
];

// Parses values like "4m55s", "1,80s", "720m" into a comparable number where possible.
// Returns null if it can't be parsed (e.g. "DNT" = did not test).
export function parseMetricValue(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (s.toUpperCase() === "DNT") return null;
  const minSec = s.match(/^(\d+)m(\d+)s?$/);
  if (minSec) return parseInt(minSec[1]) * 60 + parseInt(minSec[2]);
  const plainSec = s.match(/^([\d,.]+)s$/);
  if (plainSec) return parseFloat(plainSec[1].replace(",", "."));
  const dist = s.match(/^(\d+)m$/);
  if (dist) return parseInt(dist[1]);
  const num = parseFloat(s.replace(",", "."));
  return isNaN(num) ? null : num;
}

// Compares a player's value against a target. Returns "ahead" | "behind" | "unknown".
export function compareToTarget(
  metricKey: string,
  playerValue: string | number | undefined | null,
  targetValue: string | number | undefined | null
): "ahead" | "behind" | "unknown" {
  const def = getMetricDef(metricKey);
  const p = parseMetricValue(playerValue);
  const t = parseMetricValue(targetValue);
  if (p === null || t === null || !def) return "unknown";
  if (def.betterDirection === "lower") return p <= t ? "ahead" : "behind";
  return p >= t ? "ahead" : "behind";
}
