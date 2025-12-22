
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
}

export interface DiagnosisAction {
  title: string;
  description: string;
  icon: string;
}

export interface DiagnosisResult {
  speciesName: string;
  scientificName: string;
  problemName: string;
  confidence: number;
  impact: string;
  isContagious: boolean;
  severity: 'low' | 'moderate' | 'high';
  actionPlan: DiagnosisAction[];
  rootCauses: {
    title: string;
    description: string;
    image: string;
  }[];
}

export type FilterType = 'Todo' | 'Necesita Agua' | 'Habitación' | 'Especie';
