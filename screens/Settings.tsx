import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plantStorage, SavedPlant } from '../services/plantStorage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [cleared, setCleared] = useState(false);
  const [info, setInfo] = useState(plantStorage.getStorageInfo());
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIOS = /(iPad|iPhone|iPod)/.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      installPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      setCanInstall(false);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt as EventListener);
    window.addEventListener('appinstalled', onInstalled as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt as EventListener);
      window.removeEventListener('appinstalled', onInstalled as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = installPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setCanInstall(false);
    }
    installPromptRef.current = null;
  };

  const handleClear = () => {
    if (window.confirm('¿Borrar todas las plantas guardadas? Esta acción no se puede deshacer.')) {
      plantStorage.clearAll();
      setCleared(true);
      setInfo(plantStorage.getStorageInfo());
      setTimeout(() => navigate('/'), 1200);
    }
  };

  const handleExport = () => {
    const plants = plantStorage.getSavedPlants();
    if (plants.length === 0) {
      setBackupMsg('No hay plantas guardadas para respaldar.');
      return;
    }
    const data = JSON.stringify(
      { app: '3dPlant', exportedAt: new Date().toISOString(), plants },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3dplant-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBackupMsg('Respaldo descargado ✔');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const plants: SavedPlant[] = Array.isArray(parsed) ? parsed : parsed.plants;
        if (!Array.isArray(plants)) throw new Error('bad format');
        plantStorage.importPlants(plants);
        setInfo(plantStorage.getStorageInfo());
        setBackupMsg(`Se restauraron ${plants.length} plantas ✔`);
      } catch {
        setBackupMsg('No se pudo importar: el archivo no es un respaldo válido.');
      }
      input.value = '';
    };
    reader.onerror = () => {
      setBackupMsg('No se pudo leer el archivo.');
      input.value = '';
    };
    reader.readAsText(file);
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
        {/* Info */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-sm font-bold text-gray-900 dark:text-white">3dPlant</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Diagnóstico de plantas con IA · v0.0.0</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{info.count} plantas guardadas · {info.estimatedSize}</p>
        </div>

        {/* Instalar como app */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Instalar como aplicación</p>
          {installed || isStandalone ? (
            <p className="text-xs text-green-700 dark:text-green-300 mt-2">La app ya está instalada 🎉</p>
          ) : canInstall ? (
            <button onClick={handleInstall} className="mt-3 w-full rounded-xl bg-primary hover:bg-green-400 text-black font-bold h-12 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <span className="material-symbols-outlined">download</span>
              Instalar en el teléfono
            </button>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              {isIOS
                ? 'En iPhone/iPad: abre esta web en Safari → pulsa Compartir (⬆) → «Añadir a pantalla de inicio». Así quedará guardada como una app con su icono.'
                : 'En Chrome/Android: abre el menú (⋮) → «Añadir a pantalla de inicio» (o usa el aviso de instalación) para guardarla como app.'}
            </p>
          )}
        </div>

        {/* Respaldo */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Respaldo de datos</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Tus plantas se guardan solo en este navegador. Si cambias de navegador o limpias los datos, se pierden. Exporta un respaldo para no perderlas.
          </p>
          <div className="flex gap-3 mt-3">
            <button onClick={handleExport} className="flex-1 rounded-xl bg-primary/10 text-green-800 dark:text-green-300 hover:bg-primary/20 font-bold h-12 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[20px]">download</span>
              Exportar
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl bg-primary/10 text-green-800 dark:text-green-300 hover:bg-primary/20 font-bold h-12 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[20px]">upload</span>
              Importar
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
          </div>
          {backupMsg && <p className="text-xs font-medium text-green-700 dark:text-green-300 mt-2">{backupMsg}</p>}
        </div>

        {/* Borrar */}
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
