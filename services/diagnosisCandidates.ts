import type { DiagnosisResult } from '../types';

type Candidate = NonNullable<DiagnosisResult['candidates']>[number];

// Debe coincidir con MIN_ALTERNATIVE_SCORE de netlify/functions/ai.mjs.
export const MIN_ALTERNATIVE_SCORE = 0.05;

export function otherCandidates(result: DiagnosisResult): Candidate[] {
  const seen = new Set([result.scientificName?.trim().toLowerCase()]);
  return (result.candidates || []).filter(candidate => {
    const name = candidate.scientificName.trim().toLowerCase();
    if (candidate.score < MIN_ALTERNATIVE_SCORE || !name || seen.has(name)) return false;
    seen.add(name);
    return true;
  }).slice(0, 3);
}

