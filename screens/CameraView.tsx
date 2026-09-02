
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyTip } from '../constants/dailyTips';

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
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
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('ERROR');
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
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

  // Reduce la imagen a un tamaño razonable antes de enviarla a Gemini.
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
        localStorage.setItem('capturedPlantImage', dataUrl);
        navigate('/result');
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
    localStorage.setItem('capturedPlantImage', dataUrl);
    navigate('/result');
  };

  return (
    <div className="bg-background-dark font-display text-white overflow-hidden h-screen w-full relative">
      {/* Camera Interface */}
      <div className="relative h-full w-full flex flex-col">
        {/* Top Bar */}
        <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={() => navigate('/')}
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
          <button onClick={() => setFlashOn(!flashOn)} className="flex items-center justify-center rounded-full size-10 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[24px]">{flashOn ? 'flash_on' : 'flash_off'}</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-24">
          {/* Camera Frame */}
          <div className="relative w-full max-w-sm h-[46vh] rounded-3xl border-4 border-primary/30 overflow-hidden mb-4 bg-black">
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

          {/* Instruction */}
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
            <span className="material-symbols-outlined text-primary text-[24px]">center_focus_strong</span>
            <p className="text-sm text-text-sec-dark">
              Alinea la hoja para un diagnóstico preciso
            </p>
          </div>
        </main>

        {showTip && (
          <div className="absolute inset-x-4 top-20 z-40 rounded-2xl bg-white/95 dark:bg-card-dark/95 backdrop-blur-md border border-white/10 p-4 shadow-xl">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Consejo</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1 leading-relaxed">{getDailyTip()}</p>
            <button onClick={() => setShowTip(false)} className="mt-2 text-xs font-bold text-primary">Cerrar</button>
          </div>
        )}

        <footer className="absolute bottom-0 left-0 right-0 z-50 w-full pb-8 pt-2 px-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            <button onClick={() => navigate('/')} className="group flex shrink-0 items-center justify-center rounded-xl size-14 border-2 border-white/20 overflow-hidden relative active:scale-95 transition-transform">
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

            <button onClick={() => setShowTip(!showTip)} className="flex shrink-0 items-center justify-center rounded-full size-14 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CameraView;
