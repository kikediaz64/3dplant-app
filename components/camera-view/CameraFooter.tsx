import React from 'react';

interface CameraFooterProps {
  cameraActive: boolean;
  photos: string[];
  onClose: () => void;
  capturePhoto: () => void;
  handleFileInput: React.ChangeEventHandler<HTMLInputElement>;
  onToggleTip: () => void;
  continueWithPhotos: () => Promise<void>;
}

export default function CameraFooter({ cameraActive, photos, onClose, capturePhoto, handleFileInput, onToggleTip, continueWithPhotos }: CameraFooterProps) {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-50 w-full pb-8 pt-2 px-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
      <div className="flex items-center justify-between max-w-sm mx-auto">
        <button onClick={onClose} className="group flex shrink-0 items-center justify-center rounded-xl size-14 border-2 border-white/20 overflow-hidden relative active:scale-95 transition-transform">
          <img
            alt="Thumbnail"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5PH3h2j4Zyup-G4rtQSMtOgwwugl7EG91iRmuzrO-PmD0E0hf7V4KPj0rZz9-EVbCKVF_I2O5x6b1hnhP62kk_2GheN5UAb2sRroNH4PiJtjx65NRvE4P7zxpP7IPbcmwlvnYqJ4LUOS5UrJBEJlG4AztbpxO7pVHXZZMl21tFk39nyrcUMu0PjaTOjXVVykf1Sk-b3cO1vtkHxN4i5n7rZtAfyM2zrYWXtzhxlA4LLEGL2AUVaAFn-BjlDcUXknhQrzzRPnelKg"
          />
        </button>

        {/* Hidden file input for camera */}
        {/* Camera Button */}
        {cameraActive ? (
          <button
            onClick={capturePhoto}
            className="group relative flex shrink-0 items-center justify-center rounded-full size-20 bg-transparent border-[5px] border-white shadow-lg active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <div className="w-[66px] h-[66px] bg-primary rounded-full group-active:scale-90 transition-transform duration-150 shadow-[0_0_15px_rgba(19,236,19,0.4)]"></div>
            <span className="material-symbols-outlined absolute text-background-dark text-[32px] font-bold z-10 pointer-events-none">camera_alt</span>
          </button>
        ) : (
          <label className="group relative flex shrink-0 items-center justify-center rounded-full size-20 bg-transparent border-[5px] border-white shadow-lg active:scale-95 transition-all duration-150 cursor-pointer">
            <div className="w-[66px] h-[66px] bg-primary rounded-full group-active:scale-90 transition-transform duration-150 shadow-[0_0_15px_rgba(19,236,19,0.4)]"></div>
            <span className="material-symbols-outlined absolute text-background-dark text-[32px] font-bold z-10 pointer-events-none">photo_camera</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
        )}

        <button onClick={onToggleTip} className="flex shrink-0 items-center justify-center rounded-full size-14 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
        </button>
      </div>
      {photos.length > 0 && <button onClick={continueWithPhotos} className="block mx-auto mt-3 px-6 py-3 rounded-xl bg-primary text-black font-bold">Diagnosticar ({photos.length} {photos.length === 1 ? 'foto' : 'fotos'})</button>}
    </footer>
  );
}
