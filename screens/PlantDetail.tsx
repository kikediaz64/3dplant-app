import PlantDetailHero from '../components/plant-detail/PlantDetailHero';
import PlantDiagnosisHistory from '../components/plant-detail/PlantDiagnosisHistory';
import PlantDiagnosisDetails from '../components/plant-detail/PlantDiagnosisDetails';
import PlantCareSections from '../components/plant-detail/PlantCareSections';
import { useJustWatered } from '../hooks/useJustWatered';
import ToxicityNotice from '../components/ToxicityNotice';
import { normalizeCareGuide } from '../services/careGuide';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { plantStorage } from '../services/plantStorage';
import { MOCK_PLANTS, isMockPlant } from '../constants';
import { createRecurringReminderIcs, downloadCalendarReminder, nextReminderStart } from '../services/calendar';

const PlantDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Find plant from saved plants or mock plants
    const [plant, setPlant] = useState(() => {
        const savedPlants = plantStorage.getSavedPlants();
        const allPlants = [...savedPlants, ...MOCK_PLANTS];
        return allPlants.find(p => p.id === id);
    });

    // Fuerza un re-render periódico para que "Próximo riego" se actualice con el tiempo.
    const [, setTick] = useState(0);
    const { justWatered, markJustWatered } = useJustWatered();

    useEffect(() => {
        const refresh = () => setTick(t => t + 1);
        const interval = setInterval(refresh, 60 * 1000);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('focus', refresh);
        };
    }, []);

    if (!plant) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-dark">
                <p className="text-white">Planta no encontrada</p>
            </div>
        );
    }

    const handleWater = () => {
        if (justWatered) return;
        const now = new Date().toISOString();
        plantStorage.updatePlant(plant.id, { lastWateredAt: now });
        setPlant(prev => prev ? { ...prev, lastWateredAt: now } : prev);
        markJustWatered();
    };

    const handleDelete = () => {
        if (!window.confirm(`¿Eliminar ${plant.name} de tu jardín?`)) return;
        if (isMockPlant(plant.id)) {
            plantStorage.dismissMockPlant(plant.id);
        } else {
            plantStorage.deletePlant(plant.id);
        }
        navigate('/');
    };

    const guide = normalizeCareGuide(plant.careGuide);
    const exportReminder = (kind: 'riego' | 'abono', intervalDays: number) => {
        const start = nextReminderStart({ lastWateredAt: kind === 'riego' ? plant.lastWateredAt : undefined, intervalDays, now: new Date() });
        const ics = createRecurringReminderIcs({ plantName: plant.name, kind, intervalDays, start });
        const safeName = plant.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'planta';
        downloadCalendarReminder(ics, `${kind}-${safeName}.ics`, { plantName: plant.name, kind, intervalDays, start });
    };

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
            <PlantDetailHero plant={plant} handleDelete={handleDelete} />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
                <ToxicityNotice careGuide={guide} isToxic={plant.isToxic} />
                <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Ante dudas sobre toxicidad, consulta a un veterinario o a un médico.</p>
                <PlantDiagnosisHistory plant={plant} />

                <PlantDiagnosisDetails plant={plant} />

                <PlantCareSections plant={plant} guide={guide} exportReminder={exportReminder} />

            </div>

            {/* Bottom Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-white/10 p-4 pb-6">
                <div className="flex gap-3 max-w-lg mx-auto">
                    <button
                        onClick={handleWater}
                        disabled={justWatered}
                        className="flex-1 rounded-xl bg-primary hover:bg-green-400 text-black font-bold h-12 flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined">{justWatered ? 'check' : 'water_drop'}</span>
                        {justWatered ? 'Regada ✓' : 'Regar ahora'}
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white font-bold h-12 flex items-center justify-center gap-2 transition-colors active:scale-95"
                    >
                        <span className="material-symbols-outlined">home</span>
                        Volver
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlantDetail;
