
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { plantStorage, getWateringStatus } from '../services/plantStorage';
import { MOCK_PLANTS } from '../constants';

const PlantDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Find plant from saved plants or mock plants
    const [plant, setPlant] = useState(() => {
        const savedPlants = plantStorage.getSavedPlants();
        const allPlants = [...savedPlants, ...MOCK_PLANTS];
        return allPlants.find(p => p.id === id);
    });

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

    const watering = getWateringStatus(plant);

    const handleWater = () => {
        const now = new Date().toISOString();
        plantStorage.updatePlant(plant.id, { lastWateredAt: now });
        setPlant(prev => prev ? { ...prev, lastWateredAt: now } : prev);
    };

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
                        onClick={() => navigate(-1)}
                        className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <button onClick={() => navigate('/assistant')} className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors">
                        <span className="material-symbols-outlined">support_agent</span>
                    </button>
                </div>

                {/* Plant Name */}
                <div className="absolute bottom-4 left-0 right-0 px-6 text-center">
                    <h1 className="text-2xl font-bold text-white drop-shadow-lg">{plant.name}</h1>
                    <p className="text-sm text-white/90 mt-1">{plant.location}</p>
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

                {/* Abono / Fertilización */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🌿</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Abono / Fertilización</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Aplica fertilizante líquido equilibrado cada 2-4 semanas durante primavera y verano. Usa abono orgánico (humus de lombriz o compost) para mejorar el suelo. Evita fertilizar en exceso: las puntas quemadas suelen indicar exceso de sales.
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
                        Próximo riego: <strong>{watering.nextWatering}</strong><br />
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

                {/* Plagas e insecticidas */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🐛</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Plagas e insecticidas</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Revisa el envés de las hojas cada semana. Aísla la planta enferma para evitar contagios.
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-2 list-disc list-inside space-y-1">
                        <li><strong>Jabón potásico:</strong> 15–20 ml por litro (tratamiento) o 10 ml/L (prevención). Pulverizar toda la planta cada 7 días.</li>
                        <li><strong>Aceite de neem:</strong> 3–5 ml por litro + 2–3 gotas de jabón suave. Aplicar al atardecer, cada 7–14 días.</li>
                        <li><strong>Mosca del sustrato:</strong> reduce el riego y coloca trampas amarillas.</li>
                    </ul>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Prueba siempre en 1–2 hojas y espera 24 h antes de aplicar a toda la planta.</p>
                </div>

                {/* Remedios caseros */}
                <div className="bg-gray-50 dark:bg-surface-dark rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🏡</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Remedios caseros</h3>
                    </div>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed list-disc list-inside space-y-1">
                        <li><strong>Cáscara de huevo</strong> (triturada): aporta calcio. Mezclar con el sustrato.</li>
                        <li><strong>Café</strong> (posos secos): aporta nitrógeno y acidifica un poco. Usar con moderación.</li>
                        <li><strong>Bicarbonato</strong>: fungicida suave. 1 cucharadita por litro de agua, pulverizar.</li>
                        <li><strong>Agua oxigenada</strong> (3%): oxigena raíces. 1 parte por 4 de agua al regar.</li>
                        <li><strong>Vinagre</strong>: acidifica el agua. Solo MUY diluido (1 cucharada por 4 L) y con cuidado.</li>
                        <li><strong>Leche</strong>: fungicida suave (1 parte por 9 de agua), pero puede favorecer hongos si se abusa.</li>
                    </ul>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Muchos remedios virales son mitos o dañinos: úsalos con moderación y prueba primero en una hoja.</p>
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
