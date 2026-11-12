import React from 'react';
import { getHealthTrend, isValidScore } from '../services/healthTrend';

interface HealthChartProps {
    // Puntuaciones en orden de más reciente a más antigua, como el historial.
    scores: Array<number | null | undefined>;
}

export default function HealthChart({ scores }: HealthChartProps) {
    const validScores = scores.filter(isValidScore);
    const healthTrend = getHealthTrend(validScores);
    if (!healthTrend) return null;

    const chartWidth = Math.max(160, validScores.length * 48);
    const chartPoints = [...validScores].reverse().map((score, index) => ({
        score,
        x: 12 + index * ((chartWidth - 24) / (validScores.length - 1)),
        y: 56 - (score / 100) * 48,
    }));

    return (
        <div className="mb-4 rounded-lg bg-white/70 p-3 dark:bg-black/10">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Evolución de salud</p>
                <span className={`text-xs font-bold ${healthTrend === 'Mejorando' ? 'text-green-700 dark:text-green-300' : healthTrend === 'Empeorando' ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>{healthTrend}</span>
            </div>
            <svg viewBox={`0 0 ${chartWidth} 64`} className="w-full h-auto" role="img" aria-label={`Evolución de puntuación: ${healthTrend}. Puntuaciones: ${chartPoints.map(({ score }) => score).join(', ')}`}>
                <polyline fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary" points={chartPoints.map(({ x, y }) => `${x},${y}`).join(' ')} />
                {chartPoints.map(({ score, x, y }, index) => (
                    <g key={index}>
                        <circle cx={x} cy={y} r="3.5" fill="currentColor" className="text-primary" />
                        <text x={x} y={Math.max(9, y - 7)} textAnchor="middle" fontSize="8" fill="currentColor" className="text-gray-600 dark:text-gray-300">{score}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
}
