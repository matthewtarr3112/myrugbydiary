# Training Goal and Rep Scheme Specification

## Objective
Allow each player to have a training goal, and when a coach creates a program or session, each exercise prescription is automatically adjusted based on that goal.

## Training goals
The system supports three training goals:
- Strength
- Hypertrophy
- Endurance

## Recommended player field
Add to each player document:

```ts
trainingGoal: "strength" | "hypertrophy" | "endurance" | null
```

## Why this matters
A bench press prescription should not be identical for every player:
- Strength athlete: lower reps, heavier loads
- Hypertrophy athlete: moderate reps, moderate load
- Endurance athlete: higher reps, lower load

This enables individualized execution without requiring separate program templates per player.

## Recommended rep schemes
### Strength
- Sets: 3-5
- Reps: 3-6
- Rest: 2-5 minutes
- Intensity: 75-90% 1RM
- Best for: maximal force production

### Hypertrophy
- Sets: 3-4
- Reps: 6-12
- Rest: 60-90 seconds
- Intensity: 65-80% 1RM
- Best for: muscle growth and work volume

### Endurance
- Sets: 2-4
- Reps: 12-20+
- Rest: 30-60 seconds
- Intensity: 50-70% 1RM
- Best for: repeated effort and local muscular endurance

## Example program output
If the coach selects `Bench Press` for the week:

- Strength player: `5 x 5 @ 80-85% 1RM`
- Hypertrophy player: `4 x 8 @ 70-75% 1RM`
- Endurance player: `3 x 12 @ 55-65% 1RM`

## Data model suggestion
Add a shared training config file with the rep schemes and exercise presets. Example:

```ts
export type TrainingGoal = "strength" | "hypertrophy" | "endurance";

export const REP_SCHEMES = {
  strength: { sets: "3-5", reps: "3-6", restSeconds: 180 },
  hypertrophy: { sets: "3-4", reps: "6-12", restSeconds: 75 },
  endurance: { sets: "2-4", reps: "12-20+", restSeconds: 45 },
};
```

## UI requirements
In the player profile form, include:
- Training Goal dropdown
- Available options: Strength, Hypertrophy, Endurance
- Default: Not set

In the weekly program builder, include:
- exercise selection
- athlete selection
- automatic rep recommendation per athlete based on training goal
- optional manual override by the coach

## Recommended next implementation step
Build the underlying rep-scheme helper and add the `trainingGoal` field to the player document before creating the timeline-based weekly planner.
