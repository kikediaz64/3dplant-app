
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlantCard from '../components/PlantCard';
import { MOCK_PLANTS } from '../constants';
import { plantStorage, getWateringStatus } from '../services/plantStorage';
import { getDailyTip } from '../constants/dailyTips';

interface FilterRowProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

const FilterRow: React.FC<FilterRowProps> = ({ label, options, selected, onToggle }) => (
  <div className="flex items-start gap-3">
    <span className="text-xs font-bold text-text-sec-light dark:text-text-sec-dark uppercase tracking-wide w-16 shrink-0 pt-2">{label}</span>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`shrink-0 flex h-9 items-center justify-center px-4 rounded-full text-sm font-bold transition-transform active:scale-95 ${active ? 'bg-primary text-black shadow-sm shadow-primary/30' : 'bg-white dark:bg-card-dark border border-black/5 dark:border-white/10 text-text-main-light dark:text-text-main-dark font-medium'}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

const GardenGallery: React.FC = () => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState(MOCK_PLANTS);
  const [filters, setFilters] = useState<{ zona: string[]; luz: string[]; riego: boolean; tipo: string[] }>({
    zona: [],
    luz: [],
    riego: false,
    tipo: []
  });

  useEffect(() => {
    // Load saved plants and combine with mock plants
    const savedPlants = plantStorage.getSavedPlants();
    setPlants([...savedPlants, ...MOCK_PLANTS]);
  }, []);

  const toggleFilter = (group: 'zona' | 'luz' | 'tipo', value: string) => {
    setFilters(prev => {
      const list = prev[group];
      const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
      return { ...prev, [group]: next };
    });
  };

  const clearFilters = () => setFilters({ zona: [], luz: [], riego: false, tipo: [] });

  const filteredPlants = plants.filter(p => {
    if (filters.zona.length && !filters.zona.includes(p.zona || '')) return false;
    if (filters.luz.length && !filters.luz.includes(p.luz || '')) return false;
    if (filters.riego && !getWateringStatus(p).needsWater) return false;
    if (filters.tipo.length && !filters.tipo.includes(p.tipo || '')) return false;
    return true;
  });

  const waterNeededCount = plants.filter(p => getWateringStatus(p).needsWater).length;

  const handleWater = (id: string) => {
    const now = new Date().toISOString();
    plantStorage.updatePlant(id, { lastWateredAt: now });
    setPlants(prev => prev.map(p => p.id === id ? { ...p, lastWateredAt: now } : p));
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-black/5 dark:border-white/5 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold leading-tight tracking-tight text-text-main-light dark:text-text-main-dark">Mi Jardín</h2>
            <p className="text-xs text-text-sec-light dark:text-text-sec-dark font-medium mt-0.5">{waterNeededCount} plantas necesitan agua</p>
          </div>
          <button onClick={() => navigate('/scan')} className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-card-dark shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 transition-all text-text-main-light dark:text-text-main-dark border border-black/5 dark:border-white/10">
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

      {/* Daily Tip */}
      <div className="px-5 py-3">
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💡</span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Consejo del día</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {getDailyTip()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-sec-light dark:text-text-sec-dark uppercase tracking-wide">Filtros</span>
          <button onClick={clearFilters} className="text-xs font-bold text-primary">Limpiar</button>
        </div>

        <FilterRow label="Zona" options={['Interior', 'Exterior']} selected={filters.zona} onToggle={(v) => toggleFilter('zona', v)} />
        <FilterRow label="Luz" options={['Sol pleno', 'Semisombra', 'Sombra']} selected={filters.luz} onToggle={(v) => toggleFilter('luz', v)} />
        <FilterRow label="Tipo" options={['Aromática', 'Floral', 'Frutal', 'Vegetal', 'Ornamental']} selected={filters.tipo} onToggle={(v) => toggleFilter('tipo', v)} />

        <div className="flex items-start gap-3">
          <span className="text-xs font-bold text-text-sec-light dark:text-text-sec-dark uppercase tracking-wide w-16 shrink-0 pt-2">Riego</span>
          <button
            onClick={() => setFilters(prev => ({ ...prev, riego: !prev.riego }))}
            className={`shrink-0 flex h-9 items-center justify-center px-4 rounded-full text-sm font-bold transition-transform active:scale-95 ${filters.riego ? 'bg-primary text-black shadow-sm shadow-primary/30' : 'bg-white dark:bg-card-dark border border-black/5 dark:border-white/10 text-text-main-light dark:text-text-main-dark font-medium'}`}
          >
            Necesita agua
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-6 px-5 py-2">
        {filteredPlants.map(plant => (
          <PlantCard key={plant.id} plant={plant} onWater={handleWater} />
        ))}
        {filteredPlants.length === 0 && (
          <p className="text-center text-sm text-text-sec-light dark:text-text-sec-dark py-8">No hay plantas con estos filtros.</p>
        )}
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
            onClick={() => navigate('/settings')}
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
