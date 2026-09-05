
export interface PlantDiagnosis {
  health: string;
  problems: string[];
  recommendations: string[];
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
  nextWatering: string;
  wateringFrequencyDays?: number;
  lastWateredAt?: string;
  diagnosis?: PlantDiagnosis;
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
  zona?: ZonaTipo;
  luz?: LuzTipo;
  tipo?: PlantTipo;
}
