import type { CareGuide, Plant, PlantToxicity, ToxicityStatus } from '../types';

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
  const toxicity = source.toxicity && typeof source.toxicity === 'object' && !Array.isArray(source.toxicity)
    ? source.toxicity as Record<string, unknown>
    : undefined;
  if (toxicity) {
    const normalizeStatus = (status: unknown): ToxicityStatus => {
      const text = typeof status === 'string'
        ? status.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/[.!]$/, '').trim()
        : '';
      return text === 'toxica' ? 'tóxica' : text === 'no toxica' ? 'no tóxica' : 'desconocido';
    };
    const cleanToxicity: PlantToxicity = {
      pets: normalizeStatus(toxicity.pets),
      people: normalizeStatus(toxicity.people),
      note: typeof toxicity.note === 'string' ? toxicity.note.trim() : ''
    };
    guide.toxicity = cleanToxicity;
  }
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

// Avisa si cualquier fuente dice tóxica; un false antiguo puede ser un valor por defecto sin datos.
export function toxicityState(plant: { careGuide?: unknown; isToxic?: boolean }): boolean | undefined {
  const toxicity = normalizeCareGuide(plant.careGuide)?.toxicity;
  if (plant.isToxic === true) return true;
  if (!toxicity) return undefined;
  if (toxicity.pets === 'tóxica' || toxicity.people === 'tóxica') return true;
  if (toxicity.pets === 'no tóxica' && toxicity.people === 'no tóxica') return false;
  return undefined;
}
