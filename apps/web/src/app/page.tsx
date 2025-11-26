'use client';

import Header from '../components/Header';
import MeldingenPanel from '../components/MeldingenPanel';
import EenhedenPanel from '../components/EenhedenPanel';
import KaartWrapper from '../components/KaartWrapper';

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col bg-dark-900">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Meldingen */}
        <div className="w-1/3 border-r border-dark-700">
          <MeldingenPanel />
        </div>
        
        {/* Center Column - Map */}
        <div className="flex-1">
          <KaartWrapper />
        </div>
        
        {/* Right Column - Eenheden */}
        <div className="w-1/3 border-l border-dark-700">
          <EenhedenPanel />
        </div>
      </div>
    </div>
  );
}