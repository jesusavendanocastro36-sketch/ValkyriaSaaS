// Epley formula: 1RM = weight * (1 + reps / 30)
export function estimateOneRM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function calcTonnage(weight: number, reps: number, sets: number): number {
  return weight * reps * sets;
}

// Suggests next weight based on RPE delta
export function suggestNextWeight(
  currentWeight: number,
  rpeReported: number,
  rpeProgrammed: number
): number {
  const delta = rpeReported - rpeProgrammed;
  if (delta < -1) return currentWeight + 5;
  if (delta < -0.5) return currentWeight + 2.5;
  if (delta > 1) return currentWeight - 5;
  if (delta > 0.5) return currentWeight - 2.5;
  return currentWeight;
}
