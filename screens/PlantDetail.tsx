
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { plantStorage } from '../services/plantStorage';
import { MOCK_PLANTS } from '../constants';

const PlantDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Find plant from saved plants or mock plants
    const savedPlants = plantStorage.getSavedPlants();
    const allPlants = [...savedPlants, ...MOCK_PLANTS];
    const plant = allPlants.find(p => p.id === id);

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

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark">
            {/* Hero Image with Overlay */}
            <div className="relative h-64 w-full">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${plant.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background-light dark:to-background-dark" />

                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <button className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>
                </div>

                {/* Plant Name */}
                <div className="absolute bottom-4 left-0 right-0 px-6 text-center">
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">{plant.name}</h1>
                    <p className="text-sm text-white/90 mt-1">{plant.location}</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="flex justify-around py-4 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-white/10">
                <div className="text-center">
                    <span className="material-symbols-outlined text-blue-500 text-[28px]">water_drop</span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Agua</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{plant.nextWatering}</p>
                </div>
                <div className="text-center">
                    <span className="material-symbols-outlined text-orange-500 text-[28px]">thermostat</span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Temperatura</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{plant.careDetails.temp}</p>
                </div>
                <div className="text-center">
                    <span className="material-symbols-outlined text-yellow-500 text-[28px]">wb_sunny</span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Luz</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{plant.careDetails.light}</p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
                {/* Historia */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🕐</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Historia</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {plant.scientificName ? `${plant.name} (${plant.scientificName}) es una planta apreciada por su belleza y facilidad de cuidado. Originaria de regiones tropicales, se ha adaptado bien a ambientes de interior.` : 'Información de historia no disponible.'}
                    </p>
                </div>

                {/* Tipo de suelo */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🌱</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Tipo de suelo</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Requiere un sustrato bien drenado con buen contenido de materia orgánica. Se recomienda una mezcla de tierra para macetas, perlita y turba en proporciones iguales para asegurar un drenaje óptimo.
                    </p>
                </div>

                {/* Cuidado estacional */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📅</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Cuidado estacional</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        <strong>Primavera/Verano:</strong> Período de crecimiento activo. Aumenta el riego y fertiliza mensualmente.<br /><br />
                        <strong>Otoño/Invierno:</strong> Reduce el riego y suspende la fertilización. La planta entra en reposo.
                    </p>
                </div>

                {/* Necesidades de riego */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💧</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Necesidades de riego</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Frecuencia: {plant.careDetails.water}<br />
                        Regar cuando los primeros 2-3 cm de tierra estén secos al tacto. Evitar el encharcamiento. El agua no debe acumularse en la base de la planta.
                    </p>
                </div>

                {/* Requisitos de luz */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">☀️</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Requisitos de luz</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Intensidad: {plant.careDetails.light}<br />
                        Prefiere luz indirecta brillante. Evitar la exposición directa al sol durante las horas más intensas del día, ya que puede quemar las hojas.
                    </p>
                </div>

                {/* Temperatura */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🌡️</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Temperatura</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Rango ideal: {plant.careDetails.temp}<br />
                        Evitar temperaturas por debajo de 10°C y corrientes de aire frío. Mantener alejada de calefactores y aires acondicionados.
                    </p>
                </div>

                {/* Humedad */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💨</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Humedad</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Nivel: {plant.careDetails.humidity}<br />
                        Beneficia de pulverizaciones regulares en ambientes secos. Considera usar un humidificador o bandeja con guijarros y agua.
                    </p>
                </div>

                {/* Diagnóstico (si existe) */}
                {detailedInfo.problems && detailedInfo.problems.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-900/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">⚠️</span>
                            <h3 className="text-base font-bold text-orange-900 dark:text-orange-300">Problemas detectados</h3>
                        </div>
                        <ul className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed list-disc list-inside">
                            {detailedInfo.problems.map((problem, idx) => (
                                <li key={idx}>{problem}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recomendaciones (si existen) */}
                {detailedInfo.recommendations && detailedInfo.recommendations.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4 border border-green-200 dark:border-green-900/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">✅</span>
                            <h3 className="text-base font-bold text-green-900 dark:text-green-300">Recomendaciones</h3>
                        </div>
                        <ul className="text-sm text-green-800 dark:text-green-200 leading-relaxed list-disc list-inside">
                            {detailedInfo.recommendations.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Bottom Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-white/10 p-4 pb-6">
                <div className="flex gap-3 max-w-lg mx-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 rounded-xl bg-primary hover:bg-green-400 text-black font-bold h-12 flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">home</span>
                        Volver al Jardín
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlantDetail;
