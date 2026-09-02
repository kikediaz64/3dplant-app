
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnosePlant } from '../services/geminiService';
import { DiagnosisResult as IDiagnosisResult } from '../types';
import { plantStorage } from '../services/plantStorage';

const DiagnosisResult: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<IDiagnosisResult | null>(null);
  const [completedActions, setCompletedActions] = useState<boolean[]>([]);
  const [image, setImage] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingMessages = [
    "Identificando la especie...",
    "Analizando síntomas visuales...",
    "Buscando en la base de datos de 400,000 especies...",
    "Generando plan de acción ecológico...",
    "Finalizando diagnóstico..."
  ];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  useEffect(() => {
    const savedImage = localStorage.getItem('capturedPlantImage');
    console.log('Saved image exists:', !!savedImage);

    if (savedImage) {
      setImage(savedImage);
      handleDiagnosis(savedImage);
    } else {
      console.error('No image found in localStorage');
      setError('No se encontró ninguna imagen. Por favor, toma una foto nuevamente.');
      setLoading(false);
    }

    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDiagnosis = async (img: string) => {
    try {
      console.log('Starting diagnosis...');
      const diagnosis = await diagnosePlant(img);
      console.log('Diagnosis complete:', diagnosis);
      setResult(diagnosis);
      setCompletedActions(new Array(diagnosis.actionPlan.length).fill(false));
      setLoading(false);
    } catch (error) {
      console.error('Diagnosis error:', error);
      setError(`Error al analizar la planta: ${error instanceof Error ? error.message : 'Error desconocido'}. Por favor, intenta de nuevo.`);
      setLoading(false);
    }
  };

  const toggleAction = (index: number) => {
    const newActions = [...completedActions];
    newActions[index] = !newActions[index];
    setCompletedActions(newActions);
  };

  const handleSavePlant = () => {
    if (!result) return;

    try {
      const status: 'healthy' | 'warning' | 'sick' =
        result.healthStatus === 'Saludable' ? 'healthy' : result.healthStatus === 'Enferma' ? 'sick' : 'warning';

      const plantData = {
        name: result.speciesName || 'Planta desconocida',
        scientificName: result.scientificName || '',
        image: image,
        status,
        location: 'Mi Jardín',
        isToxic: result.isToxic ?? false,
        needsWater: result.hydration === 'Sedienta' || result.actionPlan?.some(a => a.title?.toLowerCase().includes('agua')) || false,
        nextWatering: 'En 3 días',
        wateringFrequencyDays: result.hydration === 'Sedienta' ? 2 : result.hydration === 'Encharcada' ? 5 : 3,
        lastWateredAt: new Date().toISOString(),
        careDetails: {
          light: result.luz || 'Media',
          water: 'Media',
          temp: '18-24°C',
          humidity: 'Media'
        },
        zona: result.zona,
        luz: result.luz,
        tipo: result.tipo,
        diagnosis: {
          health: result.healthStatus ? `${result.healthStatus} · ${result.healthScore ?? '—'}/100` : (result.problemName || 'Diagnóstico completado'),
          problems: [...(result.symptoms || []), ...(result.pests || [])],
          recommendations: result.actionPlan?.map(a => a.description) || []
        }
      };

      console.log('Saving plant:', plantData);
      plantStorage.savePlant(plantData);
      setSaved(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error saving plant:', error);
      console.error('Result data:', result);
      alert(`Error al guardar la planta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark p-6 text-center">
        <div className="relative size-32 mb-8">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[48px] animate-pulse">psychology</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Analizando Planta</h2>
        <p className="text-text-sec-dark font-medium transition-opacity duration-500">{loadingMessages[loadingMsgIdx]}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark p-6 text-center">
        <div className="mb-8">
          <span className="material-symbols-outlined text-red-500 text-[80px]">error</span>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-white">¡Oops!</h2>
        <p className="text-text-sec-dark font-medium mb-8 max-w-md">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/scan')}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-green-400 text-black font-bold transition-colors active:scale-95"
          >
            Tomar otra foto
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors active:scale-95"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 justify-between border-b border-gray-200 dark:border-white/5">
        <button
          onClick={() => navigate('/')}
          className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-gray-900 dark:text-white">arrow_back</span>
        </button>
        <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10">Resultado</h2>
      </div>

      {/* Hero Image */}
      <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-gray-800">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${image}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-90"></div>
        {/* Mock Area Highlight as per PDF request */}
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-primary rounded-xl shadow-[0_0_15px_rgba(19,236,19,0.5)] flex items-end justify-center pb-2">
          <div className="bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded-md mb-[-10px] shadow-sm uppercase tracking-wider">
            Área Afectada
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="relative -mt-16 px-4 z-10">
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-white/5">
          <div className="flex justify-between items-start mb-2">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="bg-primary/20 text-green-800 dark:text-primary text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified</span>
                  {result.confidence}% Coincidencia
                </span>
                {result.isToxic && (
                  <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>pets</span>
                    Tóxica
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{result.speciesName}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-0.5 italic">{result.scientificName}</p>
              {result.family && <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">Familia: {result.family}</p>}
            </div>
            <div className="text-center shrink-0">
              <div className="text-3xl font-bold text-primary">{result.healthScore ?? '—'}<span className="text-sm text-gray-400">/100</span></div>
              <div className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${result.healthStatus === 'Saludable' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : result.healthStatus === 'Enferma' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                {result.healthStatus ?? '—'}
              </div>
            </div>
          </div>
          {/* Estado rico */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {result.hydration && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                <span className="material-symbols-outlined text-blue-500" style={{ fontSize: '16px' }}>water_drop</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Hidratación: {result.hydration}</span>
              </div>
            )}
            {result.lightStatus && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: '16px' }}>wb_sunny</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Luz: {result.lightStatus}</span>
              </div>
            )}
            {result.urgency && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                <span className="material-symbols-outlined text-red-500" style={{ fontSize: '16px' }}>timer</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Urgencia: {result.urgency}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
              <span className="material-symbols-outlined text-orange-500" style={{ fontSize: '16px' }}>vital_signs</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Impacto {result.severity === 'low' ? 'Bajo' : result.severity === 'moderate' ? 'Moderado' : 'Crítico'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>coronavirus</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{result.isContagious ? 'Contagioso' : 'No contagioso'}</span>
            </div>
          </div>

          {/* Síntomas y plagas */}
          {(result.symptoms?.length || result.pests?.length) ? (
            <div className="mt-4 space-y-3">
              {result.symptoms?.length ? (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Síntomas observados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.symptoms.map((s, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/5">{s}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {result.pests?.length ? (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Plagas / enfermedades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.pests.map((p, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30">{p}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Problema principal */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Problema detectado</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{result.problemName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{result.impact}</p>
          </div>
        </div>
      </div>

      {/* Action Plan */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Plan de Acción Inmediato</h3>
          <span className="text-xs font-medium text-primary cursor-pointer">Ver guía completa</span>
        </div>
        <div className="flex flex-col gap-3">
          {result.actionPlan.map((action, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="mt-0.5 rounded-full bg-primary/20 text-primary p-1.5 shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined block" style={{ fontSize: '20px' }}>{action.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{action.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{action.description}</p>
              </div>
              <button
                onClick={() => toggleAction(idx)}
                className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${completedActions[idx] ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600 hover:border-primary'}`}
              >
                {completedActions[idx] && <span className="material-symbols-outlined text-black font-bold" style={{ fontSize: '16px' }}>check</span>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Root Causes */}
      <div className="px-4 mt-8 mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Causas Probables</h3>
        <div className="flex flex-col gap-3">
          {result.rootCauses.map((cause, idx) => (
            <div key={idx} className="rounded-xl bg-gray-100 dark:bg-surface-dark p-4 border border-transparent dark:border-white/5">
              <div className="flex gap-4 items-center">
                <div
                  className="h-20 w-20 shrink-0 rounded-lg bg-cover bg-center bg-gray-300 dark:bg-gray-800"
                  style={{ backgroundImage: `url('${cause.image || "https://picsum.photos/200/200?random=" + idx}')` }}
                ></div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{cause.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-normal">
                    {cause.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 w-full bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-white/10 p-4 pb-6 z-50">
        <div className="flex flex-col gap-3 max-w-lg mx-auto">
          <button
            onClick={handleSavePlant}
            disabled={saved}
            className={`w-full rounded-xl font-bold h-12 flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg ${saved
              ? 'bg-green-600 text-white'
              : 'bg-primary hover:bg-green-400 text-black shadow-primary/20'
              }`}
          >
            <span className="material-symbols-outlined">{saved ? 'check_circle' : 'add_circle'}</span>
            {saved ? 'Guardada en Mi Jardín' : 'Guardar en Mi Jardín'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-xl bg-gray-200 dark:bg-surface-dark hover:bg-gray-300 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold h-12 flex items-center justify-center gap-2 transition-colors active:scale-95 border border-gray-300 dark:border-white/10"
          >
            <span className="material-symbols-outlined">home</span>
            Volver al Jardín
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisResult;
