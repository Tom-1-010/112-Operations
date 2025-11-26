import { useState, useEffect, useRef, useCallback } from 'react';
import { getActiveIncidentCoordinates } from '../lib/gms2';

/**
 * Interface voor een eenheid
 */
export interface Eenheid {
  id: string;
  naam: string;
  lat: number;
  lng: number;
  status: 'beschikbaar' | 'onderweg' | 'ter_plaatse';
}

/**
 * Configuratie voor eenhedenbeweging
 */
interface MovementConfig {
  snelheid?: number; // Aantal stappen per seconde (default: 30)
  animatieDuur?: number; // Duur van animatie in milliseconden (default: 5000)
}

/**
 * Hook voor het beheren van eenhedenbeweging op de kaart
 * 
 * @param eenheden - Array van eenheden die moeten bewegen
 * @param config - Configuratie voor beweging
 * @returns Object met bijgewerkte eenheden posities en functies
 */
export function useUnitsMovement(
  eenheden: Eenheid[],
  config: MovementConfig = {}
) {
  const { snelheid = 30, animatieDuur = 5000 } = config;

  // State voor eenheden posities
  const [eenhedenPosities, setEenhedenPosities] = useState<Record<string, { lat: number; lng: number }>>({});
  
  // Refs voor animatie
  const animatieRefs = useRef<Record<string, {
    intervalId: number | null;
    startPositie: { lat: number; lng: number };
    doelPositie: { lat: number; lng: number };
    startTijd: number;
    duur: number;
  }>>({});

  // Initialiseer posities van eenheden
  useEffect(() => {
    const initielePosities: Record<string, { lat: number; lng: number }> = {};
    
    eenheden.forEach((eenheid) => {
      initielePosities[eenheid.id] = {
        lat: eenheid.lat,
        lng: eenheid.lng,
      };
    });

    setEenhedenPosities(initielePosities);
  }, [eenheden]);

  /**
   * Beweeg een eenheid naar een specifieke locatie
   */
  const beweegEenheid = useCallback((eenheidId: string, doelLat: number, doelLng: number) => {
    const huidigePositie = eenhedenPosities[eenheidId];
    if (!huidigePositie) {
      console.warn(`Eenheid ${eenheidId} niet gevonden`);
      return;
    }

    // Stop eventuele lopende animatie
    const bestaandeAnimatie = animatieRefs.current[eenheidId];
    if (bestaandeAnimatie?.intervalId !== null) {
      if (bestaandeAnimatie.intervalId) {
        cancelAnimationFrame(bestaandeAnimatie.intervalId);
      }
    }

    const startPositie = { ...huidigePositie };
    const doelPositie = { lat: doelLat, lng: doelLng };
    const startTijd = Date.now();

    // Bereken afstand voor interpolatie
    const deltaLat = doelPositie.lat - startPositie.lat;
    const deltaLng = doelPositie.lng - startPositie.lng;

    // Animatiefunctie
    const animeren = () => {
      const nu = Date.now();
      const verstrekenTijd = nu - startTijd;
      const voortgang = Math.min(verstrekenTijd / animatieDuur, 1);

      // Ease-in-out functie voor vloeiende beweging
      const easeInOut = (t: number) => {
        return t < 0.5
          ? 2 * t * t
          : -1 + (4 - 2 * t) * t;
      };

      const easedVoortgang = easeInOut(voortgang);

      // Bereken nieuwe positie
      const nieuweLat = startPositie.lat + deltaLat * easedVoortgang;
      const nieuweLng = startPositie.lng + deltaLng * easedVoortgang;

      // Update positie
      setEenhedenPosities((prev) => ({
        ...prev,
        [eenheidId]: {
          lat: nieuweLat,
          lng: nieuweLng,
        },
      }));

      // Als animatie nog niet klaar is, plan volgende frame
      if (voortgang < 1) {
        const intervalId = requestAnimationFrame(animeren);
        animatieRefs.current[eenheidId] = {
          intervalId,
          startPositie,
          doelPositie,
          startTijd,
          duur: animatieDuur,
        };
      } else {
        // Animatie voltooid
        animatieRefs.current[eenheidId] = {
          intervalId: null,
          startPositie: doelPositie,
          doelPositie,
          startTijd: nu,
          duur: animatieDuur,
        };
      }
    };

    // Start animatie
    const intervalId = requestAnimationFrame(animeren);
    animatieRefs.current[eenheidId] = {
      intervalId,
      startPositie,
      doelPositie,
      startTijd,
      duur: animatieDuur,
    };
  }, [eenhedenPosities, animatieDuur]);

  /**
   * Beweeg alle eenheden naar de actieve incident locatie
   */
  const beweegNaarActiefIncident = useCallback(() => {
    const incidentCoordinaten = getActiveIncidentCoordinates();
    
    if (!incidentCoordinaten) {
      console.warn('Geen actief incident gevonden');
      return;
    }

    eenheden.forEach((eenheid) => {
      beweegEenheid(eenheid.id, incidentCoordinaten.lat, incidentCoordinaten.lng);
    });
  }, [eenheden, beweegEenheid]);

  /**
   * Beweeg een eenheid naar een specifieke locatie (convenience functie)
   */
  const beweegNaarLocatie = useCallback((eenheidId: string, lat: number, lng: number) => {
    beweegEenheid(eenheidId, lat, lng);
  }, [beweegEenheid]);

  /**
   * Stop alle animaties
   */
  const stopAlleAnimaties = useCallback(() => {
    Object.values(animatieRefs.current).forEach((animatie) => {
      if (animatie.intervalId !== null && animatie.intervalId) {
        cancelAnimationFrame(animatie.intervalId);
      }
    });
    animatieRefs.current = {};
  }, []);

  // Cleanup bij unmount
  useEffect(() => {
    return () => {
      stopAlleAnimaties();
    };
  }, [stopAlleAnimaties]);

  return {
    eenhedenPosities,
    beweegEenheid,
    beweegNaarActiefIncident,
    beweegNaarLocatie,
    stopAlleAnimaties,
  };
}












