export type TrainingGoal = "strength" | "hypertrophy" | "endurance";

export const TRAINING_GOAL_OPTIONS: Array<{ value: TrainingGoal; label: string }> = [
  { value: "hypertrophy", label: "Hypertrophy" },
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
];

export interface RepScheme {
  goal: TrainingGoal;
  sets: string;
  reps: string;
  restSeconds: number;
  intensity: string;
  description: string;
}

export const REP_SCHEMES: Record<TrainingGoal, RepScheme> = {
  strength: {
    goal: "strength",
    sets: "3-5",
    reps: "3-6",
    restSeconds: 180,
    intensity: "75-90% 1RM",
    description: "Heavy compounds with lower reps and longer rest for maximal force output.",
  },
  hypertrophy: {
    goal: "hypertrophy",
    sets: "3-4",
    reps: "6-12",
    restSeconds: 75,
    intensity: "65-80% 1RM",
    description: "Moderate loads with controlled fatigue to drive muscle growth.",
  },
  endurance: {
    goal: "endurance",
    sets: "2-4",
    reps: "12-20+",
    restSeconds: 45,
    intensity: "50-70% 1RM",
    description: "Higher reps and shorter rest to improve work capacity and repeated effort.",
  },
};

export function getTrainingGoalLabel(goal: TrainingGoal | null | undefined) {
  if (!goal) return "Not set";
  return TRAINING_GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? goal;
}

export function getRepSchemeForGoal(goal: TrainingGoal): RepScheme {
  return REP_SCHEMES[goal];
}

export function getExercisePrescription(exerciseName: string, goal: TrainingGoal) {
  const scheme = getRepSchemeForGoal(goal);
  return `${exerciseName}: ${scheme.sets} sets x ${scheme.reps} reps @ ${scheme.intensity}`;
}
