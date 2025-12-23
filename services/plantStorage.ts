
import { Plant } from '../types';

export interface SavedPlant extends Plant {
    id: string;
    scannedAt: string;
    lastUpdated: string;
    diagnosis?: {
        health: string;
        problems: string[];
        recommendations: string[];
    };
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
