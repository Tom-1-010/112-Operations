'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the Kaart component to avoid SSR issues with Leaflet
const Kaart = dynamic(() => import('./Kaart'), {
  ssr: false,
  loading: () => (
    <div className="dispatch-panel h-full flex items-center justify-center">
      <div className="text-gray-400 text-center">
        <div className="animate-pulse">Kaart wordt geladen...</div>
      </div>
    </div>
  ),
});

export default function KaartWrapper() {
  return (
    <Suspense fallback={
      <div className="dispatch-panel h-full flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="animate-pulse">Kaart wordt geladen...</div>
        </div>
      </div>
    }>
      <Kaart />
    </Suspense>
  );
}
