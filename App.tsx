
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import GardenGallery from './screens/GardenGallery';
import CameraView from './screens/CameraView';
import DiagnosisResult from './screens/DiagnosisResult';
import PlantDetail from './screens/PlantDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="max-w-[500px] mx-auto min-h-screen bg-background-light dark:bg-background-dark shadow-2xl relative">
        <Routes>
          <Route path="/" element={<GardenGallery />} />
          <Route path="/scan" element={<CameraView />} />
          <Route path="/result" element={<DiagnosisResult />} />
          <Route path="/plant/:id" element={<PlantDetail />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
