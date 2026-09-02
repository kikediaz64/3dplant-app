import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plantStorage } from '../services/plantStorage';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [cleared, setCleared] = useState(false);
  const info = plantStorage.getStorageInfo();

  const handleClear = () => {
    if (window.confirm('¿Borrar todas las plantas guardadas? Esta acción no se puede deshacer.')) {
      plantStorage.clearAll();
      setCleared(true);
      setTimeout(() => navigate('/'), 1200);
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-black/5 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-gray-900 dark:text-white">arrow_back</span>
        </button>
        <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">Ajustes</h2>
      </header>

      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-sm font-bold text-gray-900 dark:text-white">3dPlant</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Diagnóstico de plantas con IA · v0.0.0</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{info.count} plantas guardadas · {info.estimatedSize}</p>
        </div>

        <button
          onClick={handleClear}
          className="w-full rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-300 font-bold h-12 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">delete_forever</span>
          {cleared ? 'Datos borrados' : 'Borrar plantas guardadas'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
