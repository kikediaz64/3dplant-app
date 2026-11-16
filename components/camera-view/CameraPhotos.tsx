import React from 'react';

interface CameraPhotosProps {
  photos: string[];
  photoLimitMessage: boolean;
  onRemovePhoto: (index: number) => void;
}

export default function CameraPhotos({ photos, photoLimitMessage, onRemovePhoto }: CameraPhotosProps) {
  return (
    <>
      <div className="mt-3 flex gap-2 items-center">
        {photos.map((photo, index) => <div key={index} className="relative"><img src={photo} alt={`Foto ${index + 1}`} className="w-14 h-14 rounded-lg object-cover"/><button aria-label={`Quitar foto ${index + 1}`} onClick={() => onRemovePhoto(index)} className="absolute -top-2 -right-2 rounded-full bg-red-600 px-1">×</button></div>)}
        <span className="text-xs text-white/70">{photos.length}/3 {photos.length === 1 ? 'foto' : 'fotos'}</span>
      </div>
      {photoLimitMessage && <p role="status" className="mt-2 text-xs text-amber-200">Puedes añadir hasta 3 fotos.</p>}
    </>
  );
}
