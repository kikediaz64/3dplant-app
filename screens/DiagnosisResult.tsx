
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnosePlant } from '../services/geminiService';
import { DiagnosisResult as IDiagnosisResult } from '../types';

const DiagnosisResult: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<IDiagnosisResult | null>(null);
  const [completedActions, setCompletedActions] = useState<boolean[]>([]);
  const [image, setImage] = useState<string>('');

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
    if (savedImage) {
      setImage(savedImage);
      handleDiagnosis(savedImage);
    } else {
      navigate('/');
    }

    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDiagnosis = async (img: string) => {
    try {
      const diagnosis = await diagnosePlant(img);
      setResult(diagnosis);
      setCompletedActions(new Array(diagnosis.actionPlan.length).fill(false));
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const toggleAction = (index: number) => {
    const newActions = [...completedActions];
    newActions[index] = !newActions[index];
    setCompletedActions(newActions);
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
        <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: `url('${image}')`}}></div>
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
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-primary/20 text-green-800 dark:text-primary text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{fontSize: '14px'}}>verified</span>
                  {result.confidence}% Coincidencia
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{result.problemName}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">{result.speciesName} ({result.scientificName})</p>
            </div>
            <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${result.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              <span className={`material-symbols-outlined ${result.severity === 'high' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {result.severity === 'high' ? 'warning' : 'info'}
              </span>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
              <span className="material-symbols-outlined text-orange-500" style={{fontSize: '16px'}}>vital_signs</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Impacto {result.severity === 'low' ? 'Bajo' : result.severity === 'moderate' ? 'Moderado' : 'Crítico'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
              <span className="material-symbols-outlined text-primary" style={{fontSize: '16px'}}>coronavirus</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{result.isContagious ? 'Contagioso' : 'No contagioso'}</span>
            </div>
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
                <span className="material-symbols-outlined block" style={{fontSize: '20px'}}>{action.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{action.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{action.description}</p>
              </div>
              <button 
                onClick={() => toggleAction(idx)}
                className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${completedActions[idx] ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600 hover:border-primary'}`}
              >
                {completedActions[idx] && <span className="material-symbols-outlined text-black font-bold" style={{fontSize: '16px'}}>check</span>}
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
                  style={{backgroundImage: `url('${cause.image || "https://picsum.photos/200/200?random=" + idx}')`}}
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
        <div className="flex gap-3 max-w-lg mx-auto">
          <button 
            onClick={() => navigate('/')}
            className="flex-1 rounded-xl bg-primary hover:bg-green-400 text-black font-bold h-12 flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">medical_services</span>
            Iniciar Tratamiento
          </button>
          <button className="size-12 rounded-xl bg-gray-200 dark:bg-surface-dark text-gray-900 dark:text-white flex items-center justify-center border border-gray-300 dark:border-white/10 hover:bg-gray-300 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">bookmark</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisResult;
