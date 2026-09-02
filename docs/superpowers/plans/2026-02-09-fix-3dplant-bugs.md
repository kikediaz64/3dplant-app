# Plan: Arreglar 3dPlant (dejarla sólida)

> Verificación de cada bloque: `npx tsc --noEmit` (0 errores) y `npm run build` (éxito).

**Objetivo:** Corregir los 3 errores de tipos, el `index.css` ausente, y hacer funcionales los botones/filtros muertos de 3dPlant v2.

**Arquitectura:** Cambios quirúrgicos (React 19 + Vite 6 + TS 5.8 + Tailwind CDN + react-router 7). Sin refactor grande. Verificación = compilación + build (sin framework de tests).

---

## Tarea 1 — Arreglar los 3 errores de tipos

**Archivos:** `types.ts`, `services/plantStorage.ts`, `vite-env.d.ts` (nuevo).

### 1.1 `types.ts` — reemplazar completo

```ts
export interface PlantDiagnosis {
  health: string;
  problems: string[];
  recommendations: string[];
}

export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  location: string;
  image: string;
  status: 'healthy' | 'warning' | 'sick';
  isToxic: boolean;
  needsWater: boolean;
  careDetails: {
    light: string;
    water: string;
    temp: string;
    humidity: string;
  };
  nextWatering: string;
  diagnosis?: PlantDiagnosis;
}

export interface DiagnosisAction {
  title: string;
  description: string;
  icon: string;
}

export interface DiagnosisResult {
  speciesName: string;
  scientificName: string;
  problemName: string;
  confidence: number;
  impact: string;
  isContagious: boolean;
  severity: 'low' | 'moderate' | 'high';
  actionPlan: DiagnosisAction[];
  rootCauses: {
    title: string;
    description: string;
    image: string;
  }[];
}

export type FilterType = 'Todo' | 'Necesita Agua' | 'Tóxicas' | 'Enfermas';
```

(Añade `PlantDiagnosis` + `diagnosis?` → arregla `PlantDetail.tsx(24)`; cambia `FilterType` → arregla filtros de Tarea 4.)

### 1.2 `services/plantStorage.ts` — sustituir `SavedPlant` y añadir `clearAll()`

Reemplazar:

```ts
export interface SavedPlant extends Plant {
    id: string;
    scannedAt: string;
    lastUpdated: string;
    diagnosis?: {
        health: string;
        problems: string[];
        recommendations: string[];
    };
}
```

por:

```ts
export interface SavedPlant extends Plant {
    scannedAt: string;
    lastUpdated: string;
}
```

Y tras `updatePlant(...)`, añadir al objeto `plantStorage`:

```ts
    // Clear all saved plants
    clearAll(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing plants:', error);
            throw error;
        }
    },
```

### 1.3 Crear `vite-env.d.ts` (raíz)

```ts
/// <reference types="vite/client" />
```

(Arregla `geminiService.ts(5)` y `(19)`.)

### 1.4 Verificar

`npx tsc --noEmit` → 0 errores.

---

## Tarea 2 — `index.css` ausente

**Archivos:** `public/index.css` (nuevo), `index.html` (modificar).

### 2.1 Crear `public/index.css`

```css
.camera-overlay-shadow {
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
body { min-height: 100dvh; }
```

### 2.2 `index.html` — eliminar el bloque `<style>...</style>` (reglas ya movidas a `index.css`). Mantener `<link rel="stylesheet" href="/index.css">`.

### 2.3 Verificar

`npm run build` → sin el aviso "/index.css doesn't exist".

---

## Tarea 3 — Botones muertos de `CameraView.tsx`

**Archivo:** `screens/CameraView.tsx`.

- Importar `useState` de React y `getDailyTip` de `../constants/dailyTips`.
- Estado: `const [flashOn, setFlashOn] = useState(false);` y `const [showTip, setShowTip] = useState(false);`.
- **Flash** (top-right): `onClick={() => setFlashOn(!flashOn)}`; icono `{flashOn ? 'flash_on' : 'flash_off'}`.
- **Miniatura** (bottom-left): `onClick={() => navigate('/')}`.
- **Bombilla** (bottom-right): `onClick={() => setShowTip(!showTip)}`.
- Overlay de consejo (dentro de `main`, tras el frame):

```tsx
{showTip && (
  <div className="absolute inset-x-4 top-20 z-40 rounded-2xl bg-white/95 dark:bg-card-dark/95 backdrop-blur-md border border-white/10 p-4 shadow-xl">
    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Consejo</p>
    <p className="text-sm text-gray-900 dark:text-white mt-1 leading-relaxed">{getDailyTip()}</p>
    <button onClick={() => setShowTip(false)} className="mt-2 text-xs font-bold text-primary">Cerrar</button>
  </div>
)}
```

Verificar: `npx tsc --noEmit` → 0 errores.

---

## Tarea 4 — Filtros y botones de `GardenGallery.tsx`

**Archivo:** `screens/GardenGallery.tsx`.

- **Botón "+"** (header): `onClick={() => navigate('/scan')}`.
- **Filtros**: reemplazar `['Todo', 'Necesita Agua', 'Habitación', 'Especie']` por `['Todo', 'Necesita Agua', 'Tóxicas', 'Enfermas']`.
- **Lógica de filtro**: reemplazar el bloque actual por:

```tsx
const filteredPlants = plants.filter(p => {
  if (filter === 'Todo') return true;
  if (filter === 'Necesita Agua') return p.needsWater;
  if (filter === 'Tóxicas') return p.isToxic;
  if (filter === 'Enfermas') return p.status !== 'healthy';
  return true;
});
```

- **Pestaña "Ajustes"**: reemplazar `onClick={() => alert('Ajustes - Próximamente')}` por `onClick={() => navigate('/settings')}`.

Verificar: `npx tsc --noEmit` → 0 errores.

---

## Tarea 5 — Pantalla mínima de Ajustes

**Archivos:** `screens/Settings.tsx` (nuevo), `App.tsx` (modificar).

### 5.1 Crear `screens/Settings.tsx`

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plantStorage } from '../services/plantStorage';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [cleared, setCleared] = useState(false);
  const info = plantStorage.getStorageInfo();

  const handleClear = () => {
    if (window.confirm('¿Borrar todas las plantas guardadas? Esta acción no se puede deshacer.')) {
      plantStorage.clearAll();
      setCleared(true);
      setTimeout(() => navigate('/'), 1200);
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-black/5 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-gray-900 dark:text-white">arrow_back</span>
        </button>
        <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">Ajustes</h2>
      </header>

      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-white/5">
          <p className="text-sm font-bold text-gray-900 dark:text-white">3dPlant</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Diagnóstico de plantas con IA · v0.0.0</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{info.count} plantas guardadas · {info.estimatedSize}</p>
        </div>

        <button
          onClick={handleClear}
          className="w-full rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-300 font-bold h-12 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">delete_forever</span>
          {cleared ? 'Datos borrados' : 'Borrar plantas guardadas'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
```

### 5.2 `App.tsx` — añadir

```tsx
import Settings from './screens/Settings';
```

y dentro de `<Routes>`:

```tsx
<Route path="/settings" element={<Settings />} />
```

Verificar: `npx tsc --noEmit` → 0 errores.

---

## Tarea 6 — Verificación final (evidencia)

```
npx tsc --noEmit
npm run build
```

Esperado: 0 errores de tipos y build OK (sin el aviso de `index.css`).

