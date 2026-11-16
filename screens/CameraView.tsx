
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assessPhoto } from '../services/photoQuality.mjs';
import CameraHeader from '../components/camera-view/CameraHeader';
import CameraFrame from '../components/camera-view/CameraFrame';
import CameraPhotos from '../components/camera-view/CameraPhotos';
import CameraOverlays from '../components/camera-view/CameraOverlays';
import CameraFooter from '../components/camera-view/CameraFooter';

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  // Reescaneo: /scan?plantId=X. Cancelar vuelve a la ficha de esa planta; si no, al inicio.
  const [searchParams] = useSearchParams();
  const plantId = searchParams.get('plantId');
  const backPath = plantId ? `/plant/${encodeURIComponent(plantId)}` : '/';
  const resultPath = plantId ? `/result?plantId=${encodeURIComponent(plantId)}` : '/result';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Número de la última petición de cámara: si cambia mientras esperamos, la respuesta ya no vale.
  const requestRef = useRef(0);
  const [flashOn, setFlashOn] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
  const [photoLimitMessage, setPhotoLimitMessage] = useState(false);

  const photosRef = useRef<string[]>([]);
  const updatePhotos = (next: string[]) => {
    photosRef.current = next;
    setPhotos(next);
  };
  const addPhoto = (dataUrl: string) => {
    if (photosRef.current.length >= 3) {
      setPhotoLimitMessage(true);
      return;
    }
    setPhotoLimitMessage(false);
    updatePhotos([...photosRef.current, dataUrl]);
  };

  const saveAndContinue = () => {
    setQualityWarnings([]);
    setPhotoLimitMessage(false);
    try {
      localStorage.setItem('capturedPlantImages', JSON.stringify(photos));
      localStorage.removeItem('capturedPlantImage');
    } catch { alert('No hay espacio suficiente para guardar las fotos. Borra datos del navegador e intenta de nuevo.'); return; }
    navigate(resultPath);
  };

  const continueWithPhotos = async () => {
    if (!photos.length) return;
    const warnings = await Promise.all(photos.map(async (photo, index) => {
      const warning = await assessPhoto(photo);
      return warning ? warning.replace(/^Esta foto/i, `La foto ${index + 1}`).replace(/, ¿repetir\?$/i, '.') : null;
    }));
    const groupedWarnings = warnings.filter((warning): warning is string => Boolean(warning));
    if (groupedWarnings.length) {
      setQualityWarnings(groupedWarnings);
      return;
    }
    saveAndContinue();
  };

  const startCamera = useCallback(async () => {
    const requestId = ++requestRef.current;
    // Limpia cualquier cámara anterior antes de intentar de nuevo.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('NO_SUPPORT');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      // Si la pantalla se cerró (o React repitió el efecto) mientras esperábamos, apaga la cámara.
      if (requestId !== requestRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error('Camera error:', err);
      setCameraError('ERROR');
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      requestRef.current++;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  // Enchufa la señal recién cuando el <video> YA existe en pantalla.
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.warn('Video play failed:', e));
    }
  }, [cameraActive]);

  // Reduce la imagen a un tamaño razonable antes de enviarla al diagnóstico.
  // Las fotos del celular son enormes (varios MB) y eso hace que la IA tarde o falle.
  const resizeToDataUrl = (source: CanvasImageSource, srcWidth: number, srcHeight: number): string => {
    const MAX_DIM = 1024;
    const scale = Math.min(1, MAX_DIM / Math.max(srcWidth, srcHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcWidth * scale));
    canvas.height = Math.max(1, Math.round(srcHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Handle file input from native camera
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const input = event.target;
    if (!file) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const dataUrl = resizeToDataUrl(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(objectUrl);
      if (dataUrl) {
        addPhoto(dataUrl);
      } else {
        alert('Error al procesar la imagen. Intenta de nuevo.');
      }
      input.value = '';
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      alert('Error al leer la imagen. Intenta de nuevo.');
    };

    img.src = objectUrl;
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const dataUrl = resizeToDataUrl(video, video.videoWidth, video.videoHeight);
    if (!dataUrl) return;
    addPhoto(dataUrl);
  };

  return (
    <div className="bg-background-dark font-display text-white overflow-hidden h-screen w-full relative">
      {/* Camera Interface */}
      <div className="relative h-full w-full flex flex-col">
        {/* Top Bar */}
        <CameraHeader
          flashOn={flashOn}
          onClose={() => navigate(backPath)}
          onToggleFlash={() => setFlashOn(!flashOn)}
        />

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center px-6 pt-20 pb-48">
          {/* Camera Frame */}
          <CameraFrame
            videoRef={videoRef}
            cameraActive={cameraActive}
            cameraError={cameraError}
            startCamera={startCamera}
            handleFileInput={handleFileInput}
          />

          {/* Instruction */}
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
            <span className="material-symbols-outlined text-primary text-[24px]">center_focus_strong</span>
            <p className="text-sm text-text-sec-dark">
              Alinea la hoja para un diagnóstico preciso
            </p>
          </div>
          <CameraPhotos
            photos={photos}
            photoLimitMessage={photoLimitMessage}
            onRemovePhoto={index => updatePhotos(photosRef.current.filter((_, i) => i !== index))}
          />
        </main>

        <CameraOverlays
          qualityWarnings={qualityWarnings}
          showTip={showTip}
          onRepeat={() => setQualityWarnings([])}
          saveAndContinue={saveAndContinue}
          onCloseTip={() => setShowTip(false)}
        />

        <CameraFooter
          cameraActive={cameraActive}
          photos={photos}
          onClose={() => navigate(backPath)}
          capturePhoto={capturePhoto}
          handleFileInput={handleFileInput}
          onToggleTip={() => setShowTip(!showTip)}
          continueWithPhotos={continueWithPhotos}
        />
      </div>
    </div>
  );
};

export default CameraView;
