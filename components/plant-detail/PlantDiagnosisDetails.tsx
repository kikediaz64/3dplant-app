import React from 'react';
import type { Plant } from '../../types';
import { getPlantDetailTones } from '../../utils/plantDetailTones';

interface Props {
    plant: Plant;
}

export default function PlantDiagnosisDetails({ plant }: Props) {
    const detailedInfo = plant.diagnosis || {
        health: 'Información no disponible',
        problems: [],
        recommendations: []
    };
    const { diagnosisTone, recommendationsTone } = getPlantDetailTones(plant.status);

    return (
        <>
            {/* Diagnóstico y recomendaciones primero, justo después del historial (o al inicio si no hay). */}
            {detailedInfo.problems && detailedInfo.problems.length > 0 && (
                <div className={`rounded-xl border p-4 mb-4 ${diagnosisTone.box}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{diagnosisTone.icon}</span>
                        <h3 className={`text-base font-bold ${diagnosisTone.title}`}>Problemas detectados</h3>
                    </div>
                    <ul className={`text-sm leading-relaxed list-disc list-inside ${diagnosisTone.text}`}>
                        {detailedInfo.problems.map((problem, idx) => {
                            const occurrence = detailedInfo.problems.slice(0, idx).filter(item => item === problem).length;
                            return <li key={JSON.stringify([problem, occurrence])}>{problem}</li>;
                        })}
                    </ul>
                </div>
            )}
            {detailedInfo.recommendations && detailedInfo.recommendations.length > 0 && (
                <div className={`rounded-xl border p-4 mb-4 ${recommendationsTone.box}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{recommendationsTone.icon}</span>
                        <h3 className={`text-base font-bold ${recommendationsTone.title}`}>Recomendaciones</h3>
                    </div>
                    <ul className={`text-sm leading-relaxed list-disc list-inside ${recommendationsTone.text}`}>
                        {detailedInfo.recommendations.map((rec, idx) => {
                            const occurrence = detailedInfo.recommendations.slice(0, idx).filter(item => item === rec).length;
                            return <li key={JSON.stringify([rec, occurrence])}>{rec}</li>;
                        })}
                    </ul>
                </div>
            )}
        </>
    );
}
