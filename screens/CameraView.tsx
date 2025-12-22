
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    }
    setupCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      localStorage.setItem('capturedPlantImage', dataUrl);
      navigate('/result');
    }
  };

  return (
    <div className="bg-background-dark font-display text-white overflow-hidden h-screen w-full relative">
      {/* Camera Feed */}
      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
        {stream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        ) : (
          <img 
            alt="Camera placeholder" 
            className="w-full h-full object-cover opacity-50" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZny3hOldk8anczw7LSsclm9Bo3TAQ7PyuQ6bGiY8AdPgyAArR6uqsMIJMx9tXhL_WJJass5saNhJXcDAZRKQRtMRPl9JsapdWoevw3DW_-oVmRRITmOfW4KGVtixSHsmkPtQ5vV9CxoGGfpAcf1D3igiAJcCHCuYxMnNm74gRIXTc5AQAn7lmVJgd8uR4kUBZZUwE8YpzY83Vr7IiF3BuqPvDeHoMOn_m5PvVP16le1D09x0cxUNVBftf5DOrhsPLQW5XtBWV90A"
          />
        )}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent"></div>
      </div>

      {/* UI Layer */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        <header className="flex items-center justify-between p-4 pt-12 pb-2">
          <button 
            onClick={() => navigate('/')}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
          
          <div className="flex flex-col items-center">
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] drop-shadow-md">Nueva Foto</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider">AI Ready</span>
            </div>
          </div>
          
          <button className="flex size-12 shrink-0 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors">
            <span className="material-symbols-outlined text-[24px]">flash_off</span>
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center relative w-full px-6">
          <div className="relative w-full aspect-[3/4] max-w-sm rounded-3xl border border-white/20 camera-overlay-shadow overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
              <div className="border-r border-white/50"></div>
              <div className="border-r border-white/50"></div>
              <div className="border-b border-white/50 row-start-1 col-span-3"></div>
              <div className="border-b border-white/50 row-start-2 col-span-3"></div>
            </div>
            <div className="absolute top-4 left-4 w-8 h-8 border-t-[4px] border-l-[4px] border-primary rounded-tl-xl drop-shadow-[0_0_8px_rgba(19,236,19,0.6)]"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-[4px] border-r-[4px] border-primary rounded-tr-xl drop-shadow-[0_0_8px_rgba(19,236,19,0.6)]"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-[4px] border-l-[4px] border-primary rounded-bl-xl drop-shadow-[0_0_8px_rgba(19,236,19,0.6)]"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-[4px] border-r-[4px] border-primary rounded-br-xl drop-shadow-[0_0_8px_rgba(19,236,19,0.6)]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-12 border border-primary/50 rounded-full flex items-center justify-center opacity-80">
              <div className="size-1 bg-primary rounded-full"></div>
            </div>
          </div>
          
          <div className="mt-6 px-4 py-2.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
            <p className="text-white text-sm font-medium leading-normal text-center flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">center_focus_strong</span>
              Alinea la hoja para un diagnóstico preciso
            </p>
          </div>
        </main>

        <footer className="w-full pb-8 pt-6 px-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            <button className="group flex shrink-0 items-center justify-center rounded-xl size-14 border-2 border-white/20 overflow-hidden relative active:scale-95 transition-transform">
              <img 
                alt="Thumbnail" 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5PH3h2j4Zyup-G4rtQSMtOgwwugl7EG91iRmuzrO-PmD0E0hf7V4KPj0rZz9-EVbCKVF_I2O5x6b1hnhP62kk_2GheN5UAb2sRroNH4PiJtjx65NRvE4P7zxpP7IPbcmwlvnYqJ4LUOS5UrJBEJlG4AztbpxO7pVHXZZMl21tFk39nyrcUMu0PjaTOjXVVykf1Sk-b3cO1vtkHxN4i5n7rZtAfyM2zrYWXtzhxlA4LLEGL2AUVaAFn-BjlDcUXknhQrzzRPnelKg"
              />
            </button>
            
            <button 
              onClick={handleCapture}
              className="group relative flex shrink-0 items-center justify-center rounded-full size-20 bg-transparent border-[5px] border-white shadow-lg active:scale-95 transition-all duration-150"
            >
              <div className="w-[66px] h-[66px] bg-primary rounded-full group-active:scale-90 transition-transform duration-150 shadow-[0_0_15px_rgba(19,236,19,0.4)]"></div>
              <span className="material-symbols-outlined absolute text-background-dark text-[32px] font-bold z-10 pointer-events-none">camera_alt</span>
            </button>
            
            <button className="flex shrink-0 items-center justify-center rounded-full size-14 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>lightbulb</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CameraView;
