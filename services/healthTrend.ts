export type HealthTrend = 'Mejorando' | 'Igual' | 'Empeorando';

export function isValidScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;
}

// Recibe puntuaciones en orden de más reciente a más antigua.
export function getHealthTrend(scores: Array<number | null | undefined>, tolerance = 5): HealthTrend | null {
  const valid = scores.filter(isValidScore);
  if (valid.length < 2) return null;

  const difference = valid[0] - valid[1];
  if (Math.abs(difference) <= tolerance) return 'Igual';
  return difference > 0 ? 'Mejorando' : 'Empeorando';
}
