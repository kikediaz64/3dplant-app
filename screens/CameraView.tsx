
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const CameraView: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file input from native camera
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileInput called');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.size, file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      console.log('Image read, data URL length:', dataUrl.length);
      localStorage.setItem('capturedPlantImage', dataUrl);
      console.log('Image saved to localStorage');

      // Clean up to prevent memory leaks
      reader.onload = null;
      if (event.target) {
        event.target.value = ''; // Reset input for next use
      }

      // Navigate to result
      console.log('Navigating to /result...');
      navigate('/result');
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('Error al leer la imagen. Por favor, intenta de nuevo.');
    };

    console.log('Starting to read file...');
    reader.readAsDataURL(file);
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
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
          <button className="flex items-center justify-center rounded-full size-10 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[24px]">flash_off</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32">
          {/* Camera Frame */}
          <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl border-4 border-primary/30 overflow-hidden mb-6">
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

        <footer className="w-full pb-20 pt-6 px-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            <button className="group flex shrink-0 items-center justify-center rounded-xl size-14 border-2 border-white/20 overflow-hidden relative active:scale-95 transition-transform">
              <img
                alt="Thumbnail"
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5PH3h2j4Zyup-G4rtQSMtOgwwugl7EG91iRmuzrO-PmD0E0hf7V4KPj0rZz9-EVbCKVF_I2O5x6b1hnhP62kk_2GheN5UAb2sRroNH4PiJtjx65NRvE4P7zxpP7IPbcmwlvnYqJ4LUOS5UrJBEJlG4AztbpxO7pVHXZZMl21tFk39nyrcUMu0PjaTOjXVVykf1Sk-b3cO1vtkHxN4i5n7rZtAfyM2zrYWXtzhxlA4LLEGL2AUVaAFn-BjlDcUXknhQrzzRPnelKg"
              />
            </button>

            {/* Hidden file input for camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              className="hidden"
            />

            {/* Camera Button */}
            <button
              onClick={handleCameraClick}
              className="group relative flex shrink-0 items-center justify-center rounded-full size-20 bg-transparent border-[5px] border-white shadow-lg active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <div className="w-[66px] h-[66px] bg-primary rounded-full group-active:scale-90 transition-transform duration-150 shadow-[0_0_15px_rgba(19,236,19,0.4)]"></div>
              <span className="material-symbols-outlined absolute text-background-dark text-[32px] font-bold z-10 pointer-events-none">camera_alt</span>
            </button>

            <button className="flex shrink-0 items-center justify-center rounded-full size-14 bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CameraView;
