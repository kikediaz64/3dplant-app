
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlantCard from '../components/PlantCard';
import { MOCK_PLANTS } from '../constants';
import { FilterType } from '../types';

const GardenGallery: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('Todo');

  const filters: FilterType[] = ['Todo', 'Necesita Agua', 'Habitación', 'Especie'];

  const filteredPlants = MOCK_PLANTS.filter(p => {
    if (filter === 'Todo') return true;
    if (filter === 'Necesita Agua') return p.needsWater;
    return true;
  });

  const waterNeededCount = MOCK_PLANTS.filter(p => p.needsWater).length;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-black/5 dark:border-white/5 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold leading-tight tracking-tight text-text-main-light dark:text-text-main-dark">Mi Jardín</h2>
            <p className="text-xs text-text-sec-light dark:text-text-sec-dark font-medium mt-0.5">{waterNeededCount} plantas necesitan agua</p>
          </div>
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-card-dark shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 transition-all text-text-main-light dark:text-text-main-dark border border-black/5 dark:border-white/10">
            <span className="material-symbols-outlined text-[24px]">add</span>
          </button>
        </div>
      </header>

      {/* Headline */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-text-main-light dark:text-text-main-dark">
          Buenos días.<br />
          <span className="text-text-sec-light dark:text-text-sec-dark text-2xl font-normal">Tu jardín se ve genial hoy.</span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-5 py-4 overflow-x-auto no-scrollbar snap-x">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`snap-start shrink-0 flex h-9 items-center justify-center px-5 rounded-full text-sm font-bold transition-transform active:scale-95 
              ${filter === f
                ? 'bg-primary text-black shadow-sm shadow-primary/30'
                : 'bg-white dark:bg-card-dark border border-black/5 dark:border-white/10 text-text-main-light dark:text-text-main-dark font-medium'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-6 px-5 py-2">
        {filteredPlants.map(plant => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#0c1a0c]/90 backdrop-blur-lg border-t border-black/5 dark:border-white/5 pb-5 pt-3 px-6 z-50">
        <ul className="flex justify-between items-end">
          <li
            onClick={() => navigate('/')}
            className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer group"
          >
            <div className="w-12 h-8 rounded-full flex items-center justify-center bg-primary/20 text-green-900 dark:text-green-300 transition-colors">
              <span className="material-symbols-outlined text-[24px]">potted_plant</span>
            </div>
            <span className="text-[10px] font-bold text-green-900 dark:text-green-300">Mi Jardín</span>
          </li>
          <li
            onClick={() => navigate('/scan')}
            className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer group relative"
          >
            <div className="absolute -top-10 bg-primary text-black rounded-full h-16 w-16 flex items-center justify-center shadow-[0_8px_20px_rgba(19,236,19,0.4)] border-4 border-background-light dark:border-background-dark transform transition-transform hover:scale-110 active:scale-95 z-10">
              <span className="material-symbols-outlined text-[32px]">center_focus_strong</span>
            </div>
            <div className="h-6"></div>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-2">Escanear</span>
          </li>
          <li
            onClick={() => alert('Ajustes - Próximamente')}
            className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer group"
          >
            <div className="w-12 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-green-800 dark:hover:text-green-300 transition-colors">
              <span className="material-symbols-outlined text-[24px]">settings</span>
            </div>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 group-hover:text-green-900 dark:group-hover:text-green-300">Ajustes</span>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default GardenGallery;
