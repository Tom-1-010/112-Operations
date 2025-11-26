import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapComponent, { GmsIncident, Kazerne } from '../components/Map';
import { useUnitsMovement, Eenheid } from '../hooks/useUnitsMovement';
import { getActiveIncidentCoordinates } from '../lib/gms2';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import KazerneGeocodingTool from '../components/KazerneGeocodingTool';
import { ensureAllCoords, KazerneMetAdres, initKazernes, KazerneMetCoords, saveKazernesToStorage } from '../lib/kazerne-geocoding';
import { getUnitPositions, resetAllUnitsToKazerne } from '../services/globalUnitMovement';

/**
 * Voorbeeldmock met drie eenheden die automatisch bewegen naar een testmelding
 */
const initieleEenheden: Eenheid[] = [
  {
    id: 'unit-1',
    naam: 'Politie Eenheid 1',
    lat: 52.0907, // Amsterdam
    lng: 5.1214,
    status: 'beschikbaar',
  },
  {
    id: 'unit-2',
    naam: 'Brandweer Eenheid 2',
    lat: 52.3676, // Utrecht
    lng: 4.9041,
    status: 'onderweg',
  },
  {
    id: 'unit-3',
    naam: 'Ambulance Eenheid 3',
    lat: 51.9244, // Den Haag
    lng: 4.4777,
    status: 'beschikbaar',
  },
];

/**
 * Testmelding locatie (Rotterdam)
 */
const testMeldingLocatie = {
  lat: 51.9225,
  lng: 4.47917,
  naam: 'Testmelding Rotterdam',
};

interface KazerneWithVoertuigen {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: string | null;
  telefoonnummer: string | null;
  email: string | null;
  capaciteit: number;
  actief: boolean;
  latitude: string | null;
  longitude: string | null;
  regio: string | null;
  voertuigen?: any[] | null;
}

export default function MapPage() {
  const queryClient = useQueryClient();
  const [eenheden, setEenheden] = useState<Eenheid[]>(initieleEenheden);
  const [isMockActief, setIsMockActief] = useState(false);
  const [actiefIncident, setActiefIncident] = useState<{ lat: number; lng: number } | null>(null);
  const [incidenten, setIncidenten] = useState<GmsIncident[]>([]);
  const [incidentenZonderCoordinaten, setIncidentenZonderCoordinaten] = useState(0);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{ done: number; total: number; current?: string }>({ done: 0, total: 0 });
  const [geocodeerdeKazernes, setGeocodeerdeKazernes] = useState<KazerneMetCoords[]>([]);
  const [showVoertuigen, setShowVoertuigen] = useState(false);

  // Fetch kazernes met hun voertuigen (zoals in kazernes.tsx)
  const { data: kazernesData = [], isLoading: kazernesLaden } = useQuery<KazerneWithVoertuigen[]>({
    queryKey: ['/api/kazernes-with-voertuigen'],
  });

  const {
    eenhedenPosities,
    beweegNaarActiefIncident,
    beweegNaarLocatie,
    stopAlleAnimaties,
  } = useUnitsMovement(eenheden, {
    snelheid: 30,
    animatieDuur: 5000, // 5 seconden voor vloeiende beweging
  });

  // Laad GMS2 incidenten uit localStorage
  useEffect(() => {
    const loadIncidenten = () => {
      try {
        const storedIncidenten = localStorage.getItem('gms2Incidents');
        if (storedIncidenten) {
          const parsedIncidenten: GmsIncident[] = JSON.parse(storedIncidenten);
          // Filter alleen incidenten met coördinaten
          const incidentenMetCoordinaten = parsedIncidenten.filter(
            (inc) => inc.coordinates && 
                     Array.isArray(inc.coordinates) && 
                     inc.coordinates.length === 2
          );
          const incidentenZonder = parsedIncidenten.length - incidentenMetCoordinaten.length;
          
          setIncidenten(incidentenMetCoordinaten);
          setIncidentenZonderCoordinaten(incidentenZonder);
          
          console.log(`📍 ${incidentenMetCoordinaten.length} incidenten geladen met coördinaten uit ${parsedIncidenten.length} totaal`);
          
          if (incidentenZonder > 0) {
            console.warn(`⚠️ ${incidentenZonder} incident(en) hebben geen coördinaten en worden niet getoond op de kaart!`);
          }
        } else {
          setIncidenten([]);
          setIncidentenZonderCoordinaten(0);
        }
      } catch (error) {
        console.error('Fout bij laden incidenten uit localStorage:', error);
        setIncidenten([]);
      }
    };

    // Laad initial
    loadIncidenten();

    // Listen voor storage changes (wanneer GMS2 updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gms2Incidents') {
        loadIncidenten();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Poll elke 2 seconden voor updates (fallback als storage event niet werkt)
    const interval = setInterval(loadIncidenten, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Reset alle eenheden naar kazerne bij het laden van de pagina
  useEffect(() => {
    const resetUnitsOnLoad = async () => {
      // Wacht even zodat alles geladen is
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('🔄 Automatisch resetten van alle eenheden naar kazerne...');
      await resetAllUnitsToKazerne();
    };

    resetUnitsOnLoad();
  }, []);

  // Initialiseer kazernes: laad uit localStorage of JSON, geocodeer indien nodig
  useEffect(() => {
    let cancelled = false;

    const initializeKazernes = async () => {
      if (!cancelled) {
        setGeocodingLoading(true);
        setGeocodingProgress({ done: 0, total: 0 });
      }

      try {
        // Automatisch alle kazernes geocoderen op basis van adres (één keer, daarna opgeslagen)
        console.log('🔄 Automatisch geocoderen van alle kazernes op basis van adres...');
        const kazernesMetCoords = await initKazernes(
          (done, total, current) => {
            if (!cancelled) {
              setGeocodingProgress({ done, total, current });
            }
          }
        );

        if (!cancelled) {
          setGeocodeerdeKazernes(kazernesMetCoords);
          setGeocodingLoading(false);
          console.log(`✅ ${kazernesMetCoords.length} kazernes geladen en klaar voor weergave op kaart`);
          if (kazernesMetCoords.length > 0) {
            console.log(`📍 Eerste kazerne: ${kazernesMetCoords[0].naam} op ${kazernesMetCoords[0].lat}, ${kazernesMetCoords[0].lng}`);
          }
        }
      } catch (error) {
        console.error('❌ Fout bij initialiseren kazernes:', error);
        if (!cancelled) {
          setGeocodingLoading(false);
        }
      }
    };

    initializeKazernes();

    return () => {
      cancelled = true;
    };
  }, []);

  // Converteer gegeocodeerde kazernes naar Kazerne format voor de Map component
  const kazernes: Kazerne[] = useMemo(() => {
    // Gebruik gegeocodeerde kazernes (uit localStorage of gegeocodeerd)
    if (geocodeerdeKazernes.length === 0) {
      console.log('⚠️ Geen gegeocodeerde kazernes beschikbaar');
      return [];
    }

    const validKazernes = geocodeerdeKazernes
      .filter((k) => {
        // Filter alleen kazernes met geldige coördinaten
        const isValid = Number.isFinite(k.lat) && Number.isFinite(k.lng) && k.lat !== 0 && k.lng !== 0;
        if (!isValid) {
          console.warn(`⚠️ Kazerne "${k.naam}" heeft ongeldige coördinaten: ${k.lat}, ${k.lng}`);
        }
        return isValid;
      })
      .map((k) => {
        return {
          id: k.id,
          naam: k.naam,
          adres: k.adres,
          postcode: k.postcode,
          plaats: k.plaats,
          type: k.type || undefined,
          telefoonnummer: k.telefoonnummer || undefined,
          email: k.email || undefined,
          capaciteit: k.capaciteit,
          actief: k.actief,
          latitude: k.lat.toString(),
          longitude: k.lng.toString(),
          regio: k.regio || undefined,
        };
      });

    console.log(`📍 ${validKazernes.length} kazernes klaar voor weergave op kaart`);
    if (validKazernes.length > 0) {
      console.log(`📍 Voorbeeld: ${validKazernes[0].naam} op ${validKazernes[0].latitude}, ${validKazernes[0].longitude}`);
    }

    return validKazernes;
  }, [geocodeerdeKazernes]);

  /**
   * Update kazerne coördinaten in database en localStorage
   */
  const updateKazerneCoordinates = async (kazerneId: string, lat: number, lng: number): Promise<void> => {
    try {
      const response = await fetch(`/api/kazernes/${kazerneId}/coordinates`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fout bij bijwerken coördinaten');
      }

      const result = await response.json();
      
      // Invalideer query cache om data te refreshen
      await queryClient.invalidateQueries({ queryKey: ['/api/kazernes-with-voertuigen'] });
      
      // Update ook in localStorage
      const updatedKazernes = geocodeerdeKazernes.map(k => 
        k.id === kazerneId ? { ...k, lat, lng } : k
      );
      setGeocodeerdeKazernes(updatedKazernes);
      
      // Sla op in localStorage
      saveKazernesToStorage(updatedKazernes);
      
      console.log('✅ Kazerne coördinaten bijgewerkt:', result);
    } catch (error) {
      console.error('Fout bij bijwerken kazerne coördinaten:', error);
      throw error;
    }
  };

  // Poll voor actieve incident coördinaten
  useEffect(() => {
    const checkActiefIncident = () => {
      const coördinaten = getActiveIncidentCoordinates();
      if (coördinaten) {
        setActiefIncident(coördinaten);
      } else {
        setActiefIncident(null);
      }
    };

    // Check direct
    checkActiefIncident();

    // Poll elke 2 seconden
    const interval = setInterval(checkActiefIncident, 2000);

    return () => clearInterval(interval);
  }, []);

  // Luister naar globale eenhedenbeweging en synchroniseer met lokale state
  useEffect(() => {
    const updateFromGlobalPositions = () => {
      const globalPositions = getUnitPositions();
      
      if (globalPositions.size === 0) return;
      
      // Update lokale eenheden state met globale posities
      setEenheden((prev) => {
        const updated = [...prev];
        let changed = false;
        
        globalPositions.forEach((position, roepnummer) => {
          // Zoek eenheid op basis van naam of ID
          const eenheidIndex = updated.findIndex(
            (e) => e.id === roepnummer || e.naam.toLowerCase().includes(roepnummer.toLowerCase())
          );
          
          if (eenheidIndex !== -1) {
            // Update positie en status
            const eenheid = updated[eenheidIndex];
            if (eenheid.lat !== position.lat || eenheid.lng !== position.lng) {
              updated[eenheidIndex] = {
                ...eenheid,
                lat: position.lat,
                lng: position.lng,
                status: position.status === 'beschikbaar' ? 'beschikbaar' :
                        position.status === 'onderweg' ? 'onderweg' :
                        position.status === 'ter_plaatse' ? 'ter_plaatse' :
                        'beschikbaar',
              };
              changed = true;
            }
          } else {
            // Nieuwe eenheid toevoegen als deze niet bestaat
            updated.push({
              id: roepnummer,
              naam: roepnummer,
              lat: position.lat,
              lng: position.lng,
              status: position.status === 'beschikbaar' ? 'beschikbaar' :
                      position.status === 'onderweg' ? 'onderweg' :
                      position.status === 'ter_plaatse' ? 'ter_plaatse' :
                      'beschikbaar',
            });
            changed = true;
          }
        });
        
        return changed ? updated : prev;
      });
    };

    // Update direct
    updateFromGlobalPositions();

    // Listen voor globale positie updates
    const handlePositionUpdate = (e: CustomEvent) => {
      updateFromGlobalPositions();
    };

    window.addEventListener('unitPositionsUpdated', handlePositionUpdate as EventListener);
    window.addEventListener('unitMovementStarted', handlePositionUpdate as EventListener);

    // Poll ook periodiek (fallback)
    const interval = setInterval(updateFromGlobalPositions, 1000);

    return () => {
      window.removeEventListener('unitPositionsUpdated', handlePositionUpdate as EventListener);
      window.removeEventListener('unitMovementStarted', handlePositionUpdate as EventListener);
      clearInterval(interval);
    };
  }, []);

  /**
   * Start de voorbeeldmock: beweeg alle eenheden naar Rotterdam
   */
  const startMock = () => {
    setIsMockActief(true);
    
    // Update status van eenheden naar 'onderweg'
    setEenheden((prev) =>
      prev.map((eenheid) => ({
        ...eenheid,
        status: 'onderweg' as const,
      }))
    );

    // Beweeg alle eenheden naar testmelding locatie
    eenheden.forEach((eenheid) => {
      beweegNaarLocatie(eenheid.id, testMeldingLocatie.lat, testMeldingLocatie.lng);
    });

    // Na 5 seconden (wanneer animatie klaar is), update status naar 'ter_plaatse'
    setTimeout(() => {
      setEenheden((prev) =>
        prev.map((eenheid) => ({
          ...eenheid,
          status: 'ter_plaatse' as const,
        }))
      );
    }, 5000);
  };

  /**
   * Stop de mock en reset eenheden
   */
  const stopMock = () => {
    setIsMockActief(false);
    stopAlleAnimaties();

    // Reset eenheden naar initiële posities en status
    setEenheden(initieleEenheden);
  };

  /**
   * Beweeg eenheden naar actief incident (als beschikbaar)
   */
  const beweegNaarIncident = () => {
    if (!actiefIncident) {
      alert('Geen actief incident gevonden. Zorg dat er een incident is in GMS2 met coördinaten.');
      return;
    }

    // Update status naar 'onderweg'
    setEenheden((prev) =>
      prev.map((eenheid) => ({
        ...eenheid,
        status: 'onderweg' as const,
      }))
    );

    beweegNaarActiefIncident();

    // Na 5 seconden, update status naar 'ter_plaatse'
    setTimeout(() => {
      setEenheden((prev) =>
        prev.map((eenheid) => ({
          ...eenheid,
          status: 'ter_plaatse' as const,
        }))
      );
    }, 5000);
  };

  /**
   * Exporteer alle kazerne coördinaten als JSON
   */
  const exportKazernesJSON = () => {
    const data = kazernes.map((k) => {
      const lat = typeof k.latitude === 'string' ? parseFloat(k.latitude) : parseFloat(String(k.latitude));
      const lng = typeof k.longitude === 'string' ? parseFloat(k.longitude) : parseFloat(String(k.longitude));
      
      return {
        id: k.id,
        naam: k.naam,
        adres: k.adres,
        postcode: k.postcode,
        plaats: k.plaats,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kazernes_geocode_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meldkamer Kaart</h1>
            <p className="text-gray-600 mt-1">
              {eenheden.length} eenheden • {kazernes.length} kazernes {kazernesLaden && '(laden...)'} {geocodingLoading && '(geocoding...)'} • {incidenten.length} incidenten • {actiefIncident ? 'Actief incident gevonden' : 'Geen actief incident'}
              {incidentenZonderCoordinaten > 0 && (
                <span className="text-orange-600 ml-2">• {incidentenZonderCoordinaten} zonder coördinaten</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <KazerneGeocodingTool
              kazernes={kazernesData.map((k) => ({
                id: k.id,
                naam: k.naam,
                adres: k.adres,
                postcode: k.postcode,
                plaats: k.plaats,
                latitude: k.latitude,
                longitude: k.longitude,
              }))}
              onUpdateCoordinates={updateKazerneCoordinates}
            />
            <Button
              onClick={startMock}
              disabled={isMockActief}
              variant="default"
            >
              Start Mock (Rotterdam)
            </Button>
            <Button
              onClick={stopMock}
              disabled={!isMockActief}
              variant="outline"
            >
              Stop Mock
            </Button>
            <Button
              onClick={beweegNaarIncident}
              disabled={!actiefIncident}
              variant="default"
            >
              Beweeg naar Incident
            </Button>
            <Button
              onClick={exportKazernesJSON}
              disabled={kazernes.length === 0}
              variant="outline"
            >
              Export Kazernes JSON
            </Button>
            <Button
              onClick={() => setShowVoertuigen(!showVoertuigen)}
              variant={showVoertuigen ? "default" : "outline"}
            >
              {showVoertuigen ? "Verberg Voertuigen" : "Toon Voertuigen"}
            </Button>
            <Button
              onClick={async () => {
                if (confirm('Weet je zeker dat je alle eenheden terug wilt zetten naar hun kazerne?')) {
                  await resetAllUnitsToKazerne();
                }
              }}
              variant="outline"
            >
              Reset alle eenheden naar kazerne
            </Button>
          </div>
        </div>
      </div>

      {/* Kaart */}
      <div className="flex-1 relative">
        {/* Geocoding progress overlay */}
        {geocodingLoading && (
          <div className="absolute top-4 left-4 z-[1001] bg-black/70 text-white p-3 rounded-lg shadow-lg">
            <div className="font-bold mb-1">Kazerne-geocoding bezig…</div>
            <div className="text-sm">
              {geocodingProgress.done}/{geocodingProgress.total} afgerond
              {geocodingProgress.current && ` — ${geocodingProgress.current}`}
            </div>
          </div>
        )}

        <MapComponent
          eenheden={eenheden}
          eenhedenPosities={eenhedenPosities}
          incidenten={incidenten}
          kazernes={kazernes}
          showVoertuigen={showVoertuigen}
          center={[52.1, 5.3]}
          zoom={8}
        />

        {/* Info panel */}
        <div className="absolute top-4 right-4 z-[1000]">
          <Card className="w-80">
            <CardHeader>
              <CardTitle>Eenheden Status</CardTitle>
              <CardDescription>
                Overzicht van alle eenheden op de kaart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eenheden.map((eenheid) => {
                  const positie = eenhedenPosities[eenheid.id];
                  return (
                    <div
                      key={eenheid.id}
                      className="p-2 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{eenheid.naam}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            eenheid.status === 'beschikbaar'
                              ? 'bg-green-100 text-green-800'
                              : eenheid.status === 'onderweg'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {eenheid.status === 'beschikbaar'
                            ? 'Beschikbaar'
                            : eenheid.status === 'onderweg'
                            ? 'Onderweg'
                            : 'Ter Plaatse'}
                        </span>
                      </div>
                      {positie && (
                        <div className="text-xs text-gray-500">
                          {positie.lat.toFixed(4)}, {positie.lng.toFixed(4)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {actiefIncident && (
                <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-semibold text-blue-900">
                    Actief Incident:
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {actiefIncident.lat.toFixed(4)}, {actiefIncident.lng.toFixed(4)}
                  </div>
                </div>
              )}

              {kazernes.length > 0 && (
                <div className="mt-4 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm font-semibold text-purple-900">
                    Kazernes op kaart: {kazernes.length}
                  </div>
                  <div className="text-xs text-purple-700 mt-1">
                    {kazernes.filter(k => k.actief).length} actief
                  </div>
                </div>
              )}

              {incidenten.length > 0 && (
                <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-semibold text-green-900">
                    Incidenten op kaart: {incidenten.length}
                  </div>
                  {incidentenZonderCoordinaten > 0 && (
                    <div className="text-xs text-orange-700 mt-1">
                      ⚠️ {incidentenZonderCoordinaten} zonder coördinaten
                    </div>
                  )}
                </div>
              )}

              {isMockActief && (
                <div className="mt-4 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm font-semibold text-orange-900">
                    Mock Actief:
                  </div>
                  <div className="text-xs text-orange-700 mt-1">
                    Eenheden bewegen naar Rotterdam
                  </div>
                </div>
              )}

              {/* Legenda */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-semibold mb-2">Legenda:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span>Beschikbaar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span>Onderweg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span>Ter Plaatse</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

