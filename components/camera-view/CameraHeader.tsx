import React from 'react';

interface CameraHeaderProps {
  flashOn: boolean;
  onClose: () => void;
  onToggleFlash: () => void;
}

export default function CameraHeader({ flashOn, onClose, onToggleFlash }: CameraHeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
      <button
        onClick={onClose}
        className="flex items-center justify-center rounded-full size-10 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[24px]">close</span>
      </button>
      <div className="text-center">
        <h1 className="text-lg font-bold">Nueva Foto</h1>
        <p className="text-xs text-primary flex items-center gap-1 justify-center">
          <span className="size-2 bg-primary rounded-full animate-pulse"></span>
          AI READY
        </p>
      </div>
      <button onClick={onToggleFlash} className="flex items-center justify-center rounded-full size-10 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
        <span className="material-symbols-outlined text-[24px]">{flashOn ? 'flash_on' : 'flash_off'}</span>
      </button>
    </header>
  );
}
