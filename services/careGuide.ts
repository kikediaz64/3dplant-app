import type { CareGuide, Plant } from '../types';

export const missingCareData = 'Sin datos para esta planta: haz un diagnóstico nuevo para verlos';
export const careText = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : missingCareData;

// La respuesta de la IA y las copias importadas no garantizan los tipos de TypeScript.
export function normalizeCareGuide(value: unknown): CareGuide | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const guide: CareGuide = {};
  for (const key of ['origin', 'soil', 'fertilizer', 'seasonal', 'watering', 'light', 'temperature', 'humidity'] as const) {
    if (typeof source[key] === 'string') guide[key] = source[key].trim();
  }
  guide.commonPests = Array.isArray(source.commonPests)
    ? source.commonPests.filter((p): p is string => typeof p === 'string').map(p => p.trim()).filter(Boolean)
    : [];
  return guide;
}

export function diagnosisCare(value: unknown): Pick<Plant, 'careGuide' | 'careDetails'> {
  const careGuide = normalizeCareGuide(value);
  return {
    careGuide,
    careDetails: {
      light: careGuide?.light || '', water: careGuide?.watering || '',
      temp: careGuide?.temperature || '', humidity: careGuide?.humidity || ''
    }
  };
}
