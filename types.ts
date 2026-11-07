
export interface PlantDiagnosis {
  health: string;
  problems: string[];
  recommendations: string[];
}

export type ToxicityStatus = 'tóxica' | 'no tóxica' | 'desconocido';

export interface PlantToxicity {
  pets: ToxicityStatus;
  people: ToxicityStatus;
  note: string;
}

export interface CareGuide {
  origin?: string;
  soil?: string;
  fertilizer?: string;
  seasonal?: string;
  watering?: string;
  light?: string;
  temperature?: string;
  humidity?: string;
  commonPests?: string[];
  toxicity?: PlantToxicity;
}

export type ZonaTipo = 'Interior' | 'Exterior';
export type LuzTipo = 'Sol pleno' | 'Semisombra' | 'Sombra';
export type PlantTipo = 'Aromática' | 'Floral' | 'Frutal' | 'Vegetal' | 'Ornamental';

export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  location: string;
  image: string;
  status: 'healthy' | 'warning' | 'sick';
  isToxic: boolean;
  needsWater: boolean;
  careDetails: {
    light: string;
    water: string;
    temp: string;
    humidity: string;
  };
  careGuide?: CareGuide;
  nextWatering: string;
  wateringFrequencyDays?: number;
  lastWateredAt?: string;
  diagnosis?: PlantDiagnosis;
  diagnosisHistory?: DiagnosisEntry[];
  zona?: ZonaTipo;
  luz?: LuzTipo;
  tipo?: PlantTipo;
}

export interface DiagnosisAction {
  title: string;
  description: string;
  icon: string;
}

export type HealthStatus = 'Saludable' | 'Aviso' | 'Enferma';
export type UrgencyLevel = 'Baja' | 'Media' | 'Alta';
export type HydrationState = 'Sedienta' | 'Bien' | 'Encharcada';
export type LightState = 'Falta' | 'Adecuada' | 'Exceso';

export interface DiagnosisEntry {
  id: string;
  date: string;
  healthStatus?: HealthStatus;
  healthScore?: number;
  image: string;
  problems: string[];
  recommendations: string[];
}

export interface DiagnosisResult {
  speciesName: string;
  scientificName: string;
  family?: string;
  problemName: string;
  confidence: number;
  impact: string;
  isContagious: boolean;
  severity: 'low' | 'moderate' | 'high';
  healthScore?: number;
  healthStatus?: HealthStatus;
  urgency?: UrgencyLevel;
  hydration?: HydrationState;
  lightStatus?: LightState;
  symptoms?: string[];
  pests?: string[];
  isToxic?: boolean;
  actionPlan: DiagnosisAction[];
  rootCauses: {
    title: string;
    description: string;
    image?: string;
  }[];
  careGuide?: CareGuide;
  zona?: ZonaTipo;
  luz?: LuzTipo;
  tipo?: PlantTipo;
  candidates?: {
    scientificName: string;
    commonNames: string[];
    score: number;
    imageUrl: string | null;
  }[];
}
