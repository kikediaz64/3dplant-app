import React from 'react';

interface CameraFrameProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
  startCamera: () => Promise<void>;
  handleFileInput: React.ChangeEventHandler<HTMLInputElement>;
}

export default function CameraFrame({ videoRef, cameraActive, cameraError, startCamera, handleFileInput }: CameraFrameProps) {
  return (
    <div className="relative shrink-0 w-full max-w-sm h-[46vh] rounded-3xl border-4 border-primary/30 overflow-hidden mb-4 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
      />

      {!cameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="material-symbols-outlined text-white/40 text-[48px]">
            {cameraError ? 'videocam_off' : 'photo_camera'}
          </span>

          {cameraError === 'NO_SUPPORT' ? (
            <p className="text-sm text-white/70">
              Tu navegador no permite la cámara en vivo.<br />Usá el botón para hacer la foto.
            </p>
          ) : cameraError === 'ERROR' ? (
            <>
              <p className="text-sm text-white/70">
                No se pudo abrir la cámara (revisá los permisos).<br />Tocá "Reintentar" o hacé la foto igual.
              </p>
              <button onClick={startCamera} className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold active:scale-95 transition-transform">
                Reintentar
              </button>
            </>
          ) : (
            <p className="text-sm text-white/70">Abriendo cámara…</p>
          )}

          <label className="relative px-6 py-3 rounded-xl bg-primary text-black font-bold active:scale-95 transition-transform cursor-pointer flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            Tomar foto
            <input type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
        </div>
      )}

      {/* Corner Markers */}
      <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-primary rounded-tl-2xl"></div>
      <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-primary rounded-tr-2xl"></div>
      <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-primary rounded-bl-2xl"></div>
      <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-primary rounded-br-2xl"></div>

      {/* Center Focus Point */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="size-16 rounded-full border-2 border-primary/50 flex items-center justify-center">
          <div className="size-2 bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Grid Lines */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="border border-white/5"></div>
        ))}
      </div>
    </div>
  );
}
