import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { renderEenhedenOpKaart, moveEenheid, clearEenheden, updateEenheidStatus, rijdNaarMelding, stopRit, stopAlleRitten } from '../lib/renderEenhedenOpKaart';

/**
 * React hook om voertuigen te renderen op een Leaflet kaart
 * 
 * @param enabled - Of de voertuigen moeten worden getoond
 * @returns Object met functies om voertuigen te beheren
 */
export function useRenderEenhedenOpKaart(enabled: boolean = true) {
  const map = useMap();
  const isRendered = useRef(false);
  const isLoading = useRef(false);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Als map instance veranderd is, reset state
    if (mapInstanceRef.current !== map) {
      if (mapInstanceRef.current && isRendered.current) {
        // Oude map: clear markers
        clearEenheden();
        isRendered.current = false;
        isLoading.current = false;
      }
      mapInstanceRef.current = map;
    }

    if (!enabled) {
      if (isRendered.current) {
        clearEenheden();
        isRendered.current = false;
      }
      return;
    }

    // Als al gerenderd en enabled, niets doen
    if (isRendered.current) {
      return;
    }

    // Als al aan het laden, niets doen
    if (isLoading.current) {
      return;
    }

    // Render voertuigen op de kaart
    isLoading.current = true;
    renderEenhedenOpKaart(map)
      .then(() => {
        isRendered.current = true;
        isLoading.current = false;
      })
      .catch((error) => {
        console.error('Fout bij renderen voertuigen:', error);
        isLoading.current = false;
      });

    // Cleanup bij unmount of wanneer enabled false wordt
    return () => {
      if (!enabled && isRendered.current) {
        clearEenheden();
        isRendered.current = false;
      }
    };
  }, [map, enabled]);

  return {
    moveEenheid,
    clearEenheden,
    updateEenheidStatus,
    rijdNaarMelding: (roepnummer: string, melding: { lat: number; lon: number; id?: number | string; nr?: number }, options?: { snelheid?: number; updateInterval?: number; toonRoute?: boolean }) => {
      return rijdNaarMelding(roepnummer, melding, map, options);
    },
    stopRit,
    stopAlleRitten,
    map, // Exporteer map instance voor direct gebruik
  };
}

