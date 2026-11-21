import React from 'react';
import type { Plant, CareGuide } from '../../types';
import { careText, missingCareData } from '../../services/careGuide';
import { fertilizerIntervalDays } from '../../services/calendar';
import { getWateringStatus, formatLastWateredAt } from '../../services/plantStorage';
import { occurrenceKeys } from '../../utils/occurrenceKeys';

interface Props {
    plant: Plant;
    guide?: CareGuide;
    exportReminder: (kind: 'riego' | 'abono', intervalDays: number) => void;
}

export default function PlantCareSections({ plant, guide, exportReminder }: Props) {
    const watering = getWateringStatus(plant);
    const fertilizerDays = fertilizerIntervalDays(guide?.fertilizer);
    const pestKeys = occurrenceKeys(guide?.commonPests ?? [], item => item);
    const remedyKeys = occurrenceKeys(guide?.homeRemedies ?? [], item => item);
    return (
        <>
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
                {fertilizerDays && <button type="button" onClick={() => exportReminder('abono', fertilizerDays)} className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-green-800 dark:text-green-300 hover:bg-primary/20">Añadir recordatorio de abono al calendario</button>}
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
                {formatLastWateredAt(plant.lastWateredAt) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Último riego: {formatLastWateredAt(plant.lastWateredAt)}</p>}
                {typeof plant.wateringFrequencyDays === 'number' && Number.isInteger(plant.wateringFrequencyDays) && plant.wateringFrequencyDays > 0 && <button type="button" onClick={() => exportReminder('riego', plant.wateringFrequencyDays!)} className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-green-800 dark:text-green-300 hover:bg-primary/20">Añadir recordatorio de riego al calendario</button>}
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
                {guide?.commonPests?.length ? <ul className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed list-disc list-inside space-y-1">{guide.commonPests.map((pest, idx) => (
                    <li key={pestKeys[idx]}>{pest}</li>
                ))}</ul> : <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{missingCareData}</p>}
            </div>

            {/* Remedios caseros */}
            <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🏡</span>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Remedios caseros</h3>
                </div>
                {guide?.homeRemedies?.length ? <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1 mt-2">{guide.homeRemedies.map((remedy, idx) => (
                    <li key={remedyKeys[idx]}>{remedy}</li>
                ))}</ul> : <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-2">{missingCareData}</p>}
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">Muchos remedios virales son mitos o pueden dañar las plantas. Consulta antes de aplicar cualquier remedio.</p>
            </div>
        </>
    );
}
