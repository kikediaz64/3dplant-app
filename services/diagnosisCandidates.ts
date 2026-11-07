import type { DiagnosisResult } from '../types';

type Candidate = NonNullable<DiagnosisResult['candidates']>[number];

export function otherCandidates(result: DiagnosisResult): Candidate[] {
  const seen = new Set([result.scientificName?.trim().toLowerCase()]);
  return (result.candidates || []).filter(candidate => {
    const name = candidate.scientificName.trim().toLowerCase();
    if (candidate.score < 0.2 || !name || seen.has(name)) return false;
    seen.add(name);
    return true;
  }).slice(0, 3);
}

