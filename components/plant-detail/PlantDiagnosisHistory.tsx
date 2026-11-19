import React from 'react';
import type { Plant } from '../../types';
import { useNavigate } from 'react-router-dom';
import { isMockPlant } from '../../constants';
import { getDiagnosisHistory } from '../../services/plantStorage';
import { isValidScore } from '../../services/healthTrend';
import HealthChart from '../HealthChart';

interface Props {
    plant: Plant;
}

// Fecha y hora legibles para el historial; si la fecha no es válida, no muestra nada.
const formatEntryDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
        ? ''
        : d.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function PlantDiagnosisHistory({ plant }: Props) {
    const navigate = useNavigate();
    const history = getDiagnosisHistory(plant);
    if (isMockPlant(plant.id)) return null;
    return (
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
                <>
                    <HealthChart scores={history.map(entry => entry.healthScore)} />
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
                                    {isValidScore(entry.healthScore) ? <><span className="text-lg font-bold text-primary">{entry.healthScore}</span><span className="text-xs text-gray-400">/100</span></> : <span className="text-xs text-gray-400">Sin puntuación</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
