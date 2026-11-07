import type { DiagnosisResult, Plant } from '../types';

type Candidate = NonNullable<DiagnosisResult['candidates']>[number];
export const pendingSpeciesMessage = 'Especie elegida pendiente de revisión. Toxicidad y cuidados sin confirmar.';

export function otherCandidates(result: DiagnosisResult): Candidate[] {
  const seen = new Set([result.scientificName?.trim().toLowerCase()]);
  return (result.candidates || []).filter(candidate => {
    const name = candidate.scientificName.trim().toLowerCase();
    if (candidate.score < 0.2 || !name || seen.has(name)) return false;
    seen.add(name);
    return true;
  }).slice(0, 3);
}

export function selectSpecies(result: DiagnosisResult, candidate: Candidate): DiagnosisResult {
  return {
    speciesName: candidate.commonNames[0] || candidate.scientificName,
    scientificName: candidate.scientificName,
    candidates: result.candidates,
    speciesReviewPending: true,
    confidence: Math.round(candidate.score * 100),
    problemName: pendingSpeciesMessage,
    impact: '', isContagious: false, severity: 'low',
    actionPlan: [], rootCauses: []
  };
}

export function pendingSpeciesData(): Partial<Plant> {
  return {
    speciesReviewPending: true, isToxic: undefined, status: 'warning',
    careGuide: undefined, careDetails: { light: '', water: '', temp: '', humidity: '' },
    zona: undefined, luz: undefined, tipo: undefined,
    needsWater: false, nextWatering: 'Pendiente de revisión',
    wateringFrequencyDays: undefined, lastWateredAt: undefined,
    diagnosis: { health: pendingSpeciesMessage, problems: [], recommendations: [] },
    diagnosisHistory: []
  };
}
