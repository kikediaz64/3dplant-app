
import React from 'react';
import { Plant } from '../types';

interface PlantCardProps {
  plant: Plant;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant }) => {
  const getStatusBadge = () => {
    if (plant.needsWater) {
      return (
        <div className="absolute top-3 left-3 bg-yellow-400 text-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
          <span className="material-symbols-outlined text-[14px]">water_drop</span>
          <span className="text-xs font-bold uppercase tracking-wider">Sedienta</span>
        </div>
      );
    }
    if (plant.status === 'healthy') {
      return (
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-green-800 dark:text-primary">Saludable</span>
        </div>
      );
    }
    return null;
  };

  return (
    <article className="flex flex-col rounded-2xl bg-card-light dark:bg-card-dark shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-800">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform hover:scale-105 duration-700" 
          style={{ backgroundImage: `url('${plant.image}')` }}
        ></div>
        {getStatusBadge()}
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-text-main-light dark:text-text-main-dark leading-tight">{plant.name}</h3>
            <p className="text-sm text-text-sec-light dark:text-text-sec-dark font-medium">{plant.location}</p>
          </div>
          {plant.isToxic && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
              <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-[16px]">pets</span>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-300 uppercase tracking-wide">Tóxica</span>
            </div>
          )}
          {!plant.isToxic && (
             <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[16px]">spa</span>
              <span className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wide">Segura</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-4 gap-2 py-2 border-y border-gray-100 dark:border-white/5">
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <span className="material-symbols-outlined text-text-sec-light dark:text-text-sec-dark text-[20px]">wb_sunny</span>
            <span className="text-[10px] font-medium text-text-sec-light dark:text-text-sec-dark">{plant.careDetails.light}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <span className="material-symbols-outlined text-text-sec-light dark:text-text-sec-dark text-[20px]">water_drop</span>
            <span className="text-[10px] font-medium text-text-sec-light dark:text-text-sec-dark">{plant.careDetails.water}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <span className="material-symbols-outlined text-text-sec-light dark:text-text-sec-dark text-[20px]">thermometer</span>
            <span className="text-[10px] font-medium text-text-sec-light dark:text-text-sec-dark">{plant.careDetails.temp}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <span className="material-symbols-outlined text-text-sec-light dark:text-text-sec-dark text-[20px]">humidity_percentage</span>
            <span className="text-[10px] font-medium text-text-sec-light dark:text-text-sec-dark">{plant.careDetails.humidity}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">{plant.needsWater ? '¡Necesita atención!' : 'Próximo riego'}</span>
            <span className={`text-sm font-bold flex items-center gap-1 ${plant.needsWater ? 'text-yellow-600 dark:text-yellow-400' : 'text-text-main-light dark:text-text-main-dark'}`}>
              <span className="material-symbols-outlined text-primary text-[16px]">schedule</span>
              {plant.nextWatering}
            </span>
          </div>
          <button className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${plant.needsWater ? 'bg-primary text-black shadow-lg shadow-primary/20 hover:bg-[#0fd60f]' : 'bg-primary/10 text-green-800 dark:text-green-300 hover:bg-primary/20'}`}>
            {plant.needsWater ? 'Regar Ahora' : 'Detalles'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default PlantCard;
