import React from 'react';
import { getDailyTip } from '../../constants/dailyTips';

interface CameraOverlaysProps {
  qualityWarnings: string[];
  showTip: boolean;
  onRepeat: () => void;
  saveAndContinue: () => void;
  onCloseTip: () => void;
}

export default function CameraOverlays({ qualityWarnings, showTip, onRepeat, saveAndContinue, onCloseTip }: CameraOverlaysProps) {
  return (
    <>
      {qualityWarnings.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6">
          <div role="alert" className="w-full max-w-sm rounded-xl border border-amber-300/40 bg-black/90 p-4 text-sm text-white">
            <p>{qualityWarnings.join(' ')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={onRepeat} className="rounded-lg bg-white/15 px-3 py-2 font-bold">Repetir fotos</button>
              <button onClick={saveAndContinue} className="rounded-lg bg-primary px-3 py-2 font-bold text-black">Continuar igualmente</button>
            </div>
          </div>
        </div>
      )}

      {showTip && (
        <div className="absolute inset-x-4 top-20 z-40 rounded-2xl bg-white/95 dark:bg-card-dark/95 backdrop-blur-md border border-white/10 p-4 shadow-xl">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Consejo</p>
          <p className="text-sm text-gray-900 dark:text-white mt-1 leading-relaxed">{getDailyTip()}</p>
          <button onClick={onCloseTip} className="mt-2 text-xs font-bold text-primary">Cerrar</button>
        </div>
      )}
    </>
  );
}
