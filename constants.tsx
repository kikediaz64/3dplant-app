
import { Plant } from './types';

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_PLANTS: Plant[] = [
  {
    id: '1',
    name: 'Geranio',
    scientificName: 'Pelargonium zonale',
    location: 'Terraza',
    image: '/plantas-ejemplo/geranio.webp',
    status: 'healthy',
    isToxic: true,
    needsWater: false,
    careDetails: {
      light: '',
      water: '',
      temp: '',
      humidity: ''
    },
    nextWatering: 'En 3 días',
    wateringFrequencyDays: 4,
    lastWateredAt: daysAgo(1),
    zona: 'Exterior',
    luz: 'Sol pleno',
    tipo: 'Floral'
  },
  {
    id: '2',
    name: 'Hortensia',
    scientificName: 'Hydrangea macrophylla',
    location: 'Patio',
    image: '/plantas-ejemplo/hortensia.webp',
    status: 'warning',
    isToxic: true,
    needsWater: true,
    careDetails: {
      light: '',
      water: '',
      temp: '',
      humidity: ''
    },
    nextWatering: 'Riego hoy',
    wateringFrequencyDays: 3,
    lastWateredAt: daysAgo(3),
    zona: 'Exterior',
    luz: 'Semisombra',
    tipo: 'Floral'
  },
  {
    id: '3',
    name: 'Pimiento',
    scientificName: 'Capsicum annuum',
    location: 'Huerto',
    image: '/plantas-ejemplo/pimiento.webp',
    status: 'healthy',
    isToxic: false,
    needsWater: false,
    careDetails: {
      light: '',
      water: '',
      temp: '',
      humidity: ''
    },
    nextWatering: 'En 2 días',
    wateringFrequencyDays: 3,
    lastWateredAt: daysAgo(1),
    zona: 'Exterior',
    luz: 'Sol pleno',
    tipo: 'Vegetal'
  },
  {
    id: '4',
    name: 'Agapanto',
    scientificName: 'Agapanthus africanus',
    location: 'Balcón',
    image: '/plantas-ejemplo/agapanto.webp',
    status: 'warning',
    isToxic: true,
    needsWater: false,
    careDetails: {
      light: '',
      water: '',
      temp: '',
      humidity: ''
    },
    nextWatering: 'En 5 días',
    wateringFrequencyDays: 7,
    lastWateredAt: daysAgo(2),
    zona: 'Exterior',
    luz: 'Sol pleno',
    tipo: 'Floral'
  }
];

// Indica si una planta es de las de ejemplo (no guardada por el usuario).
export const isMockPlant = (id: string): boolean => MOCK_PLANTS.some(p => p.id === id);
