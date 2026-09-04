
import { Plant } from '../types';

export interface SavedPlant extends Plant {
    scannedAt: string;
    lastUpdated: string;
}

export interface WateringStatus {
    needsWater: boolean;
    nextWatering: string;
}

// Calcula el estado de riego según la frecuencia y el último riego.
export function getWateringStatus(plant: Plant): WateringStatus {
    const frequencyDays = plant.wateringFrequencyDays ?? 3;
    const lastWateredAt = plant.lastWateredAt ? new Date(plant.lastWateredAt).getTime() : null;

    // Plantas sin datos de ciclo (mock o antiguas): usar valores guardados.
    if (!lastWateredAt) {
        return {
            needsWater: plant.needsWater,
            nextWatering: plant.nextWatering || 'En 3 días',
        };
    }

    const elapsedDays = (Date.now() - lastWateredAt) / (1000 * 60 * 60 * 24);
    const daysLeft = frequencyDays - elapsedDays;

    if (daysLeft <= 0) {
        return { needsWater: true, nextWatering: 'Riego hoy' };
    }
    if (daysLeft < 1) {
        return { needsWater: false, nextWatering: `En ${Math.ceil(daysLeft * 24)} h` };
    }
    return { needsWater: false, nextWatering: `En ${Math.ceil(daysLeft)} días` };
}

const STORAGE_KEY = 'savedPlants';

export const plantStorage = {
    // Get all saved plants from localStorage
    getSavedPlants(): SavedPlant[] {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading saved plants:', error);
            return [];
        }
    },

    // Save a new plant to localStorage
    savePlant(plant: Omit<SavedPlant, 'id' | 'scannedAt' | 'lastUpdated'>): SavedPlant {
        try {
            const plants = this.getSavedPlants();
            const now = new Date().toISOString();

            const newPlant: SavedPlant = {
                ...plant,
                id: `plant_${Date.now()}`,
                scannedAt: now,
                lastUpdated: now,
            };

            plants.unshift(newPlant); // Add to beginning of array
            localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));

            return newPlant;
        } catch (error) {
            console.error('Error saving plant:', error);
            if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                throw new Error('El almacenamiento está lleno. Borra algunas plantas o reduce el tamaño de las fotos.');
            }
            throw error;
        }
    },

    // Delete a plant by ID
    deletePlant(id: string): void {
        try {
            const plants = this.getSavedPlants();
            const filtered = plants.filter(p => p.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch (error) {
            console.error('Error deleting plant:', error);
            throw error;
        }
    },

    // Replace all saved plants with an imported backup.
    importPlants(plants: SavedPlant[]): void {
        try {
            const cleaned: SavedPlant[] = plants.map((p, i) => ({
                ...p,
                id: p.id || `plant_${Date.now()}_${i}`,
                scannedAt: p.scannedAt || new Date().toISOString(),
                lastUpdated: p.lastUpdated || new Date().toISOString(),
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        } catch (error) {
            console.error('Error importing plants:', error);
            throw error;
        }
    },

    // Update a plant
    updatePlant(id: string, updates: Partial<SavedPlant>): void {
        try {
            const plants = this.getSavedPlants();
            const index = plants.findIndex(p => p.id === id);

            if (index !== -1) {
                plants[index] = {
                    ...plants[index],
                    ...updates,
                    lastUpdated: new Date().toISOString(),
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
            }
        } catch (error) {
            console.error('Error updating plant:', error);
            throw error;
        }
    },

    // Clear all saved plants
    clearAll(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing plants:', error);
            throw error;
        }
    },

    // Get storage usage info
    getStorageInfo(): { count: number; estimatedSize: string } {
        const plants = this.getSavedPlants();
        const data = localStorage.getItem(STORAGE_KEY) || '';
        const sizeInBytes = new Blob([data]).size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

        return {
            count: plants.length,
            estimatedSize: `${sizeInMB} MB`,
        };
    },
};
