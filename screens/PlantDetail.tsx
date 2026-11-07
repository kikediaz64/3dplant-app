import { normalizeCareGuide, missingCareData, careText } from '../services/careGuide';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { plantStorage, getWateringStatus, getDiagnosisHistory } from '../services/plantStorage';
import { MOCK_PLANTS, isMockPlant } from '../constants';

// Fecha y hora legibles para el historial; si la fecha no es válida, no muestra nada.
const formatEntryDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
        ? ''
        : d.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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

    const detailedInfo = plant.diagnosis || {
        health: 'Información no disponible',
        problems: [],
        recommendations: []
    };
    const diagnosisTone = plant.status === 'sick'
        ? { box: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30', title: 'text-red-900 dark:text-red-300', text: 'text-red-800 dark:text-red-200', icon: '🔴' }
        : plant.status === 'warning'
            ? { box: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30', title: 'text-orange-900 dark:text-orange-300', text: 'text-orange-800 dark:text-orange-200', icon: '⚠️' }
            : { box: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30', title: 'text-green-900 dark:text-green-300', text: 'text-green-800 dark:text-green-200', icon: '✅' };

    const watering = getWateringStatus(plant);
    const history = getDiagnosisHistory(plant);

    const handleWater = () => {
        const now = new Date().toISOString();
        plantStorage.updatePlant(plant.id, { lastWateredAt: now });
        setPlant(prev => prev ? { ...prev, lastWateredAt: now } : prev);
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

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
            {/* Hero Image with Overlay */}
            <div className="relative h-40 w-full">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${plant.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background-light dark:to-background-dark" />

                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDelete}
                            aria-label="Eliminar planta"
                            className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-red-600/80 transition-colors"
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                        <button onClick={() => navigate(`/assistant/${plant.id}`)} className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors">
                            <span className="material-symbols-outlined">support_agent</span>
                        </button>
                    </div>
                </div>

                {/* Plant Name */}
                <div className="absolute bottom-4 left-0 right-0 px-6 text-center">
                    <h1 className="text-2xl font-bold text-white drop-shadow-lg">{plant.name}</h1>
                    <p className="text-sm text-white/90 mt-1">{plant.location}</p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
                {/* Historial de diagnósticos (las plantas de ejemplo no tienen) */}
                {!isMockPlant(plant.id) && (
                    <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📋</span>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Historial de diagnósticos</h3>
                            </div>
                            <button
                                onClick={() => navigate(`/scan?plantId=${encodeURIComponent(plant.id)}`)}
                                className="flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-green-800 dark:text-green-300 text-xs font-bold px-3 py-2 transition-colors active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                                Nuevo diagnóstico
                            </button>
                        </div>
                        {history.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300">Aún no hay diagnósticos guardados.</p>
                        ) : (
                            <ul className="space-y-3">
                                {history.map((entry, idx) => (
                                    <li key={entry.id} className="flex items-center gap-3">
                                        <div
                                            className="size-12 shrink-0 rounded-lg bg-cover bg-center bg-gray-200 dark:bg-gray-800"
                                            style={{ backgroundImage: `url('${entry.image}')` }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatEntryDate(entry.date)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {entry.healthStatus ?? 'Sin estado'}
                                                {idx === 0 && <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-green-800 dark:text-primary">Actual</span>}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-lg font-bold text-primary">{entry.healthScore ?? '—'}</span>
                                            <span className="text-xs text-gray-400">/100</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Diagnóstico y recomendaciones primero, justo después del historial (o al inicio si no hay). */}
                {detailedInfo.problems && detailedInfo.problems.length > 0 && (
                    <div className={`rounded-xl border p-4 mb-4 ${diagnosisTone.box}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{diagnosisTone.icon}</span>
                            <h3 className={`text-base font-bold ${diagnosisTone.title}`}>Problemas detectados</h3>
                        </div>
                        <ul className={`text-sm leading-relaxed list-disc list-inside ${diagnosisTone.text}`}>
                            {detailedInfo.problems.map((problem, idx) => <li key={idx}>{problem}</li>)}
                        </ul>
                    </div>
                )}
                {detailedInfo.recommendations && detailedInfo.recommendations.length > 0 && (
                    <div className={`rounded-xl border p-4 mb-4 ${diagnosisTone.box}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{diagnosisTone.icon}</span>
                            <h3 className={`text-base font-bold ${diagnosisTone.title}`}>Recomendaciones</h3>
                        </div>
                        <ul className={`text-sm leading-relaxed list-disc list-inside ${diagnosisTone.text}`}>
                            {detailedInfo.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                        </ul>
                    </div>
                )}

                {/* Historia */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🕐</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Historia</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{careText(guide?.origin)}</p>
                </div>

                {/* Tipo de suelo */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🌱</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Tipo de suelo</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{careText(guide?.soil)}</p>
                </div>

                {/* Abono / Fertilización */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🌿</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Abono / Fertilización</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{careText(guide?.fertilizer)}</p>
                </div>

                {/* Cuidado estacional */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📅</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Cuidado estacional</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{careText(guide?.seasonal)}</p>
                </div>

                {/* Necesidades de riego */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💧</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Necesidades de riego</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {careText(guide?.watering)}
                    </p>
                    <p className="text-sm font-medium mt-2">Próximo riego: {watering.nextWatering}
                    </p>
                </div>

                {/* Requisitos de luz */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">☀️</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Requisitos de luz</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {careText(guide?.light)}
                    </p>
                </div>

                {/* Temperatura */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🌡️</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Temperatura</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {careText(guide?.temperature)}
                    </p>
                </div>

                {/* Humedad */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💨</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Humedad</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {careText(guide?.humidity)}
                    </p>
                </div>

                {/* Plagas e insecticidas */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🐛</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Plagas e insecticidas</h3>
                    </div>
                    {guide?.commonPests?.length ? <ul className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed list-disc list-inside space-y-1">{guide.commonPests.map((pest, idx) => <li key={idx}>{pest}</li>)}</ul> : <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{missingCareData}</p>}
                </div>

                {/* Remedios caseros */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🏡</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Remedios caseros</h3>
                    </div>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1 mt-2">
                        <li>Cáscara de huevo y posos de café: consulta si son adecuados para esta especie antes de añadirlos al sustrato.</li>
                        <li>Agua oxigenada y vinagre: no aplicarlos sin comprobar su uso y dosis para esta planta.</li>
                    </ul>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">Muchos remedios virales son mitos o pueden dañar las plantas. Consulta antes de aplicar cualquier remedio.</p>
                </div>

            </div>

            {/* Bottom Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-white/10 p-4 pb-6">
                <div className="flex gap-3 max-w-lg mx-auto">
                    <button
                        onClick={handleWater}
                        className="flex-1 rounded-xl bg-primary hover:bg-green-400 text-black font-bold h-12 flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">water_drop</span>
                        Regar ahora
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
