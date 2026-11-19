import React from 'react';
import type { Plant } from '../../types';
import { useNavigate } from 'react-router-dom';

interface Props {
    plant: Plant;
    handleDelete: () => void;
}

export default function PlantDetailHero({ plant, handleDelete }: Props) {
    const navigate = useNavigate();
    return (
        <div className="relative h-40 w-full">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${plant.image}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background-light dark:to-background-dark" />

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
                <button
                    onClick={() => navigate('/')}
                    className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDelete}
                        aria-label="Eliminar planta"
                        className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-red-600/80 transition-colors"
                    >
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                    <button onClick={() => navigate(`/assistant/${plant.id}`)} className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors">
                        <span className="material-symbols-outlined">support_agent</span>
                    </button>
                </div>
            </div>

            {/* Plant Name */}
            <div className="absolute bottom-4 left-0 right-0 px-6 text-center">
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">{plant.name}</h1>
                <p className="text-sm text-white/90 mt-1">{plant.location}</p>
            </div>
        </div>
    );
}
