import { useState, useEffect, useRef, useMemo } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";
import { generateInzetvoorstelFromMapping, loadMarMappings } from "../../../Inzetvoorstellen/inzetvoorstel-mapping";
import { routingService, calculateETA as calculateETAService, formatETA as formatETAService } from "../services/routingService";
import { getVoertuigMarkers } from "../lib/renderEenhedenOpKaart";
import { normalizeRoepnummer } from "../lib/renderEenhedenOpKaart";
import { setStatus as setUnitStatusCentral, hasStatus, STATUS_COLUMN_MAPPING, getStatusDef, getDefaultStatus, getAllStatusesSync, statusEventBus } from "../lib/brw-status";
import { getUnitPosition, getUnitPositions, saveUnitPositions, updateVehicleStatus } from "../services/globalUnitMovement";
import { getInzetrolForIncidentAndVehicle, getVoertuigenFromInzetvoorstellenRT } from "../services/inzetvoorstellenRT";
import MapComponent, { GmsIncident as MapGmsIncident, Kazerne } from "../components/Map";
import { useUnitsMovement, Eenheid } from "../hooks/useUnitsMovement";
import { useQuery } from "@tanstack/react-query";
import { initKazernes, KazerneMetCoords } from "../lib/kazerne-geocoding";
import L from "leaflet";

interface LMCClassification {
  MC1: string;
  MC2: string;
  MC3: string;
  Code: string;
  PRIO: number;
  DEFINITIE: string;
}

interface GmsIncident {
  id: number;
  nr: number;
  prio: number;
  tijd: string;
  mc: string;
  locatie: string;
  plaats: string;
  roepnr: string;
  positie: string;
  melderNaam?: string;
  melderAdres?: string;
  telefoonnummer?: string;
  straatnaam?: string;
  huisnummer?: string;
  toevoeging?: string;
  postcode?: string;
  plaatsnaam?: string;
  gemeente?: string;
  coordinates?: [number, number] | null; // [longitude, latitude] from PDOK BAG API
  mc1?: string;
  mc2?: string;
  mc3?: string;
  notities?: string;
  karakteristieken?: any[];
  status?: string;
  object?: string;
  functie?: string;
  meldingslogging?: string;
  tijdstip?: string;
  prioriteit?: number;
  assignedUnits?: AssignedUnit[];
}

interface AssignedUnit {
  roepnummer: string;
  soort_voertuig: string;
  inzetrol?: string; // Inzetrol bepaald op basis van Inzetvoorstellen RT basis.json
  huidige_status?: string; // Actieve status: 'ov', 'ar', 'tp', 'nb', 'ir', 'bs', 'kz', 'vr', 'fd', 'GA'
  ov_tijd?: string;
  ar_tijd?: string;
  tp_tijd?: string;
  nb_tijd?: string;
  ir_tijd?: string;
  bs_tijd?: string;
  kz_tijd?: string;
  vr_tijd?: string;
  fd_tijd?: string;
  ga_tijd?: string;
}

export default function GMS2({ onOvdOcActivation }: { onOvdOcActivation?: () => void }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedIncident, setSelectedIncident] = useState<GmsIncident | null>(null);
  const [kladblokText, setKladblokText] = useState("");
  const [mc1Value, setMc1Value] = useState("Bezitsaantasting");
  const [mc2Value, setMc2Value] = useState("Inbraak");
  const [notitiesText, setNotitiesText] = useState("");
  const [priorityValue, setPriorityValue] = useState(2);
  const [loggingEntries, setLoggingEntries] = useState<Array<{
    id: number;
    timestamp: string;
    message: string;
  }>>([]);
  const [loggingTabEntries, setLoggingTabEntries] = useState<Array<{
    id: number;
    timestamp: string;
    message: string;
  }>>([]);
  const [lmcClassifications, setLmcClassifications] = useState<LMCClassification[]>([]);
  const [selectedMC1, setSelectedMC1] = useState("");
  const [selectedMC2, setSelectedMC2] = useState("");
  const [selectedMC3, setSelectedMC3] = useState("");
  const [activeLoggingTab, setActiveLoggingTab] = useState("hist-meldblok");
  const [bagSearchResults, setBagSearchResults] = useState<any[]>([]);
  const [bagSearchQuery, setBagSearchQuery] = useState("");
  const [karakteristieken, setKarakteristieken] = useState<any[]>([]);
  const [karakteristiekenDatabase, setKarakteristiekenDatabase] = useState<any[]>([]);
  const [selectedKarakteristieken, setSelectedKarakteristieken] = useState<any[]>([]);
  const [showP2000Screen, setShowP2000Screen] = useState(false);
  const [pagerText, setPagerText] = useState("");
  const [incidentKanaal, setIncidentKanaal] = useState("1"); // Default incidentkanaal
  const [showKarakteristiekenDialog, setShowKarakteristiekenDialog] = useState(false);
  const [karakteristiekenSearchQuery, setKarakteristiekenSearchQuery] = useState("");
  const [filteredKarakteristieken, setFilteredKarakteristieken] = useState<any[]>([]);
  const [showDubContent, setShowDubContent] = useState(false);
  const [a1Units, setA1Units] = useState<any[]>([]);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [locationDetails, setLocationDetails] = useState<any>(null);
  const [shouldAutoCheckFOPiket, setShouldAutoCheckFOPiket] = useState(false);
  const [foPiketChecked, setFoPiketChecked] = useState(false);
  const [inzetvoorstel, setInzetvoorstel] = useState<any | null>(null);
  const [showInzetvoorstel, setShowInzetvoorstel] = useState(false);
  const [brwUnitsMap, setBrwUnitsMap] = useState<Record<string, {
    roepnummer: string;
    gmsNaam: string;
    post: string;
    rollen: string[];
    alternatieven: string[];
    status: string;
  }>>({});
  // ETA state: map van roepnummer -> ETA in seconden
  const [unitETAs, setUnitETAs] = useState<Record<string, number>>({});
  const etaUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handleNieuwRef = useRef<(() => void) | null>(null);
  const handleUitgifteRef = useRef<(() => Promise<void>) | null>(null);
  
  // Filter state voor Inzetvoorstel
  const [ivFilterType, setIvFilterType] = useState<string>(''); // TS-6, RV, HV, etc.
  const [ivFilterStatus, setIvFilterStatus] = useState<string>(''); // BS, KZ, NB
  const [ivFilterMaxETA, setIvFilterMaxETA] = useState<number>(999999); // max ETA in seconden
  const [ivShowAllUnits, setIvShowAllUnits] = useState<boolean>(false); // toon alle eenheden
  const [ivShowOnlyAvailable, setIvShowOnlyAvailable] = useState<boolean>(true); // alleen beschikbare
  const [ivFiltersEnabled, setIvFiltersEnabled] = useState<boolean>(false); // filters standaard UIT
  const [ivSelectedUnits, setIvSelectedUnits] = useState<Set<string>>(new Set()); // geselecteerde eenheden in IV (nog niet gekoppeld)
  const [ivUnitRoles, setIvUnitRoles] = useState<Map<string, string>>(new Map()); // Map van roepnummer -> inzetrol
  const [ivAllBrwUnits, setIvAllBrwUnits] = useState<Array<{
    roepnummer: string;
    gmsNaam: string;
    post: string;
    rollen: string[];
    alternatieven: string[];
    status: string;
    eta?: number | null;
    type?: string; // eerste rol als type
  }>>([]);
  
  // Map component state (synchroon met map.tsx)
  const [mapEenheden, setMapEenheden] = useState<Eenheid[]>([]);
  const [geocodeerdeKazernes, setGeocodeerdeKazernes] = useState<KazerneMetCoords[]>([]);
  const [showVoertuigen, setShowVoertuigen] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const {
    eenhedenPosities,
    beweegNaarActiefIncident,
    beweegNaarLocatie,
    stopAlleAnimaties,
  } = useUnitsMovement(mapEenheden, {
    snelheid: 30,
    animatieDuur: 5000,
  });

  // Functie om in te zoomen op incidentlocatie
  const zoomToIncident = (coordinates: [number, number] | null) => {
    if (!coordinates || !mapInstanceRef.current) return;
    
    const [lng, lat] = coordinates; // GeoJSON format: [longitude, latitude]
    mapInstanceRef.current.setView([lat, lng], 15, {
      animate: true,
      duration: 0.5
    });
  };

  // Fetch kazernes met voertuigen
  const { data: kazernesData = [] } = useQuery<any[]>({
    queryKey: ['/api/kazernes-with-voertuigen'],
  });

  // Form state for new incidents
  const [formData, setFormData] = useState({
    melderNaam: "",
    telefoonnummer: "",
    melderAdres: "",
    huisnummer: "",
    toevoeging: "",
    gemeente: "",
    straatnaam: "",
    postcode: "",
    plaatsnaam: "",
    object: "",
    functie: "",
    roepnummer: "",
    extra: "",
    coordinates: null as [number, number] | null
  });

  // Get next incident number from localStorage, starting from 20250001
  const getNextIncidentNumber = () => {
    const lastNumber = localStorage.getItem("lastIncidentNumber");
    let nextNumber = lastNumber ? parseInt(lastNumber) + 1 : 20250001;
    localStorage.setItem("lastIncidentNumber", nextNumber.toString());
    return nextNumber;
  };

  // Initialize incident number if not exists
  useEffect(() => {
    if (!localStorage.getItem("lastIncidentNumber")) {
      localStorage.setItem("lastIncidentNumber", "20250000");
    }
  }, []);

  // Incidents state management with proper loading and saving
  const [incidents, setIncidents] = useLocalStorage<GmsIncident[]>("gms2Incidents", []);

  // Listen for storage events to update incidents when units are linked
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gms2Incidents' && e.newValue) {
        try {
          const updatedIncidents = JSON.parse(e.newValue);
          setIncidents(updatedIncidents);
        } catch (error) {
          console.error('Error parsing updated incidents:', error);
        }
      }

    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setIncidents]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle keyboard shortcuts: ESC to close inzetvoorstel modal, F2 to create new incident, F4 for uitgifte
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Open nieuwe melding
      if (e.key === 'F2') {
        e.preventDefault();
        if (handleNieuwRef.current) {
          handleNieuwRef.current();
        }
        return;
      }
      // F4: Uitgifte van melding
      if (e.key === 'F4') {
        e.preventDefault();
        if (handleUitgifteRef.current) {
          handleUitgifteRef.current();
        }
        return;
      }
      // ESC: Close inzetvoorstel modal
      if (e.key === 'Escape' && showInzetvoorstel) {
        setShowInzetvoorstel(false);
        setInzetvoorstel(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInzetvoorstel]);

  // Cleanup ETA update interval bij unmount
  useEffect(() => {
    return () => {
      if (etaUpdateIntervalRef.current) {
        clearInterval(etaUpdateIntervalRef.current);
      }
    };
  }, []);

  // Herbereken inzetrollen wanneer meldingsclassificatie of karakteristieken wijzigen
  useEffect(() => {
    if (showInzetvoorstel && ivSelectedUnits.size > 0 && selectedIncident) {
      // Debounce: wacht 500ms na laatste wijziging voordat we herberekenen
      const timeoutId = setTimeout(async () => {
        const mc1 = selectedIncident.mc1 || selectedMC1 || '';
        const mc2 = selectedIncident.mc2 || selectedMC2 || '';
        const karakteristieken = selectedKarakteristieken || [];

        const newRoles = new Map<string, string>();

        // Herbereken voor alle geselecteerde eenheden
        for (const roepnummer of ivSelectedUnits) {
          const unit = brwUnitsMap[roepnummer] || ivAllBrwUnits.find(u => u.roepnummer === roepnummer);
          if (!unit) continue;

          const voertuigtype = unit.type || unit.rollen[0] || 'Onbekend';

          try {
            const inzetrol = await getInzetrolForIncidentAndVehicle(
              mc1,
              mc2,
              karakteristieken,
              voertuigtype
            );

            if (inzetrol) {
              newRoles.set(roepnummer, inzetrol);
            }
          } catch (error) {
            console.error(`❌ Fout bij herberekenen inzetrol voor ${roepnummer}:`, error);
          }
        }

        // Update state
        setIvUnitRoles(newRoles);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedMC1, selectedMC2, selectedMC3, selectedKarakteristieken, showInzetvoorstel, selectedIncident, ivSelectedUnits, brwUnitsMap, ivAllBrwUnits]);

  // Functie om alle ETA's te herberekenen (gebruikt Leaflet marker posities)
  const recalcETAs = async () => {
    if (!showInzetvoorstel || !inzetvoorstel?.brwMatches || !selectedIncident?.coordinates) {
      return;
    }

    const incidentCoords = selectedIncident.coordinates;
    const newEtaMap: Record<string, number> = {};
    const updatePromises: Promise<void>[] = [];

    Object.values(inzetvoorstel.brwMatches).forEach((match) => {
      match.beschikbaar.forEach((unit) => {
        const roepnummer = typeof unit === 'string' ? unit : unit.roepnummer;
        updatePromises.push(
          calculateETAForUnit(roepnummer, incidentCoords as [number, number]).then((eta) => {
            if (eta !== null) {
              newEtaMap[roepnummer] = eta;
            }
          })
        );
      });
    });

    await Promise.all(updatePromises);
    setUnitETAs(prev => ({ ...prev, ...newEtaMap }));
  };

  // Live updates bij verplaatsing van eenheid (gebruikt Leaflet marker positie)
  useEffect(() => {
    const handleUnitMovement = (event: CustomEvent) => {
      const { roepnummer } = event.detail;
      // Herbereken ETA als inzetvoorstel open is en incident coördinaten beschikbaar zijn
      if (showInzetvoorstel && selectedIncident?.coordinates && roepnummer) {
        calculateETAForUnit(roepnummer, selectedIncident.coordinates as [number, number]).then((eta) => {
          if (eta !== null) {
            setUnitETAs(prev => ({ ...prev, [roepnummer]: eta }));
          }
        });
      }
      
      // Herbereken alle ETA's bij movement (marker positie is veranderd)
      if (showInzetvoorstel) {
        recalcETAs();
      }
    };

    window.addEventListener('unitMovement', handleUnitMovement as EventListener);
    window.addEventListener('unitPositionsUpdated', handleUnitMovement as EventListener);
    
    return () => {
      window.removeEventListener('unitMovement', handleUnitMovement as EventListener);
      window.removeEventListener('unitPositionsUpdated', handleUnitMovement as EventListener);
    };
  }, [showInzetvoorstel, selectedIncident, inzetvoorstel]);

  // Automatische IV-refresh bij statuswijzigingen
  useEffect(() => {
    // Functie om te checken of IV opnieuw moet worden gegenereerd
    const shouldRefreshIV = (oldStatusCode: string | undefined, newStatusCode: string): boolean => {
      const old = (oldStatusCode || '').toLowerCase();
      const new_ = newStatusCode.toLowerCase();
      
      // IV moet opnieuw worden gegenereerd wanneer:
      // 1. Status verandert van beschikbaar (KZ/IR/BS) naar ingezet (OV/UT/TP)
      const fromAvailable = old === 'kz' || old === 'ir' || old === 'bs';
      const toInzet = new_ === 'ov' || new_ === 'ut' || new_ === 'tp';
      if (fromAvailable && toInzet) {
        return true;
      }
      
      // 2. Status verandert van ingezet naar beschikbaar (TP → IR, IR → BS, BS → KZ)
      const fromInzet = old === 'tp' || old === 'ut' || old === 'ov';
      const toAvailable = new_ === 'ir' || new_ === 'bs' || new_ === 'kz';
      if (fromInzet && toAvailable) {
        return true;
      }
      
      // 3. Status verandert binnen beschikbaar (IR → BS, BS → KZ)
      if ((old === 'ir' && new_ === 'bs') || (old === 'bs' && new_ === 'kz')) {
        return true;
      }
      
      return false;
    };

    // Handler voor statuswijzigingen via statusEventBus
    const handleStatusChanged = (data: any) => {
      const { roepnummer, oldStatusCode, newStatusCode, incidentId } = data;
      
      // Check of IV moet worden ververst
      if (shouldRefreshIV(oldStatusCode, newStatusCode)) {
        // Alleen refresh als IV open is en voor het geselecteerde incident
        if (showInzetvoorstel && selectedIncident && 
            (!incidentId || incidentId === selectedIncident.id)) {
          console.log(`🔄 IV auto-refresh: ${roepnummer} status ${oldStatusCode || 'geen'} → ${newStatusCode}`);
          // Genereer IV opnieuw
          void generateInzetvoorstel(inzetvoorstel?.extended || false);
        }
      }
    };

    // Handler voor unitStatusChanged events (van globalUnitMovement)
    const handleUnitStatusChanged = (event: CustomEvent) => {
      const { roepnummer, oldStatusCode, newStatusCode, incidentId } = event.detail;
      
      // Check of IV moet worden ververst
      if (shouldRefreshIV(oldStatusCode, newStatusCode)) {
        // Alleen refresh als IV open is en voor het geselecteerde incident
        if (showInzetvoorstel && selectedIncident && 
            (!incidentId || incidentId === selectedIncident.id)) {
          console.log(`🔄 IV auto-refresh: ${roepnummer} status ${oldStatusCode || 'geen'} → ${newStatusCode}`);
          // Genereer IV opnieuw
          void generateInzetvoorstel(inzetvoorstel?.extended || false);
        }
      }
    };

    // Handler voor unitArrivedAtStation events (voertuig aangekomen op kazerne: BS → KZ)
    const handleUnitArrivedAtStation = (event: CustomEvent) => {
      const { roepnummer, status } = event.detail;
      
      // Bij aankomst op kazerne (BS → KZ): refresh IV zodat eenheid weer beschikbaar is
      if (status === 'kz') {
        if (showInzetvoorstel && selectedIncident) {
          console.log(`🔄 IV auto-refresh: ${roepnummer} aangekomen op kazerne (BS → KZ), eenheid weer beschikbaar`);
          // Genereer IV opnieuw zodat eenheid weer in beschikbare lijst staat
          void generateInzetvoorstel(inzetvoorstel?.extended || false);
        }
      }
    };

    // Luister naar statusEventBus events
    statusEventBus.on('statusChanged', handleStatusChanged);
    
    // Luister naar unitStatusChanged events
    window.addEventListener('unitStatusChanged', handleUnitStatusChanged as EventListener);
    
    // Luister naar unitArrivedAtStation events (voertuig aangekomen op kazerne)
    window.addEventListener('unitArrivedAtStation', handleUnitArrivedAtStation as EventListener);
    
    return () => {
      statusEventBus.off('statusChanged', handleStatusChanged);
      window.removeEventListener('unitStatusChanged', handleUnitStatusChanged as EventListener);
      window.removeEventListener('unitArrivedAtStation', handleUnitArrivedAtStation as EventListener);
    };
  }, [showInzetvoorstel, selectedIncident, inzetvoorstel]);

  // Load A1 Waterweg units from rooster data
  useEffect(() => {
    const loadA1Units = async () => {
      try {
        const response = await fetch('/attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json');
        if (response.ok) {
          const roosterData = await response.json();
          const a1TeamUnits = roosterData['Basisteam Waterweg (A1)'] || [];
          
          const processedUnits = a1TeamUnits.map((unit: any) => ({
            id: `a1-${unit.roepnummer}`,
            roepnummer: unit.roepnummer,
            aantal_mensen: unit.aantal_mensen,
            rollen: Array.isArray(unit.rollen) ? unit.rollen : [unit.rollen],
            soort_auto: unit.soort_auto,
            team: 'Basisteam Waterweg (A1)',
            status: unit.primair ? getDefaultStatus().afkorting : 'bd', // Primair: kz, anders: bd (buiten dienst)
            locatie: 'Basisteam Waterweg, Delftseveerweg 40, Vlaardingen',
            incident: '',
            coordinates: [4.34367832, 51.91387332], // Bureau coordinates [lng, lat]
            type: unit.soort_auto || 'BPV-auto',
            primair: unit.primair,
            kans_in_dienst: unit.kans_in_dienst
          }));

          setA1Units(processedUnits);
          console.log('🚔 GMS2: A1 Waterweg units loaded:', processedUnits.length);
        }
      } catch (error) {
        console.error('Failed to load A1 units:', error);
      }
    };

    loadA1Units();
  }, []);

  // Initialize kazernes for Map component (synchroon met map.tsx)
  useEffect(() => {
    let cancelled = false;

    const initializeKazernes = async () => {
      try {
        console.log('🔄 GMS2 Map: Automatisch geocoderen van alle kazernes...');
        const kazernesMetCoords = await initKazernes(
          (done, total, current) => {
            if (!cancelled) {
              // Progress callback (optioneel)
            }
          }
        );

        if (!cancelled) {
          setGeocodeerdeKazernes(kazernesMetCoords);
          console.log(`✅ GMS2 Map: ${kazernesMetCoords.length} kazernes geladen`);
        }
      } catch (error) {
        console.error('❌ GMS2 Map: Fout bij initialiseren kazernes:', error);
      }
    };

    initializeKazernes();

    return () => {
      cancelled = true;
    };
  }, []);

  // Synchronize eenheden from global positions (synchroon met map.tsx)
  useEffect(() => {
    const updateFromGlobalPositions = () => {
      const globalPositions = getUnitPositions();
      
      if (globalPositions.size === 0) return;
      
      setMapEenheden((prev) => {
        const updated: Eenheid[] = [];
        const seen = new Set<string>();
        
        globalPositions.forEach((position, roepnummer) => {
          seen.add(roepnummer);
          const existing = prev.find(e => e.id === roepnummer || e.naam === roepnummer);
          
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
        });
        
        return updated;
      });
    };

    updateFromGlobalPositions();

    const handlePositionUpdate = (e: CustomEvent) => {
      updateFromGlobalPositions();
    };

    window.addEventListener('unitPositionsUpdated', handlePositionUpdate as EventListener);
    window.addEventListener('unitMovementStarted', handlePositionUpdate as EventListener);

    const interval = setInterval(updateFromGlobalPositions, 1000);

    return () => {
      window.removeEventListener('unitPositionsUpdated', handlePositionUpdate as EventListener);
      window.removeEventListener('unitMovementStarted', handlePositionUpdate as EventListener);
      clearInterval(interval);
    };
  }, []);

  // Convert geocodeerde kazernes to Kazerne format for Map component
  const kazernes: Kazerne[] = useMemo(() => {
    if (geocodeerdeKazernes.length === 0) return [];

    return geocodeerdeKazernes
      .filter((k) => {
        const isValid = Number.isFinite(k.lat) && Number.isFinite(k.lng) && k.lat !== 0 && k.lng !== 0;
        return isValid;
      })
      .map((k) => {
        // Find voertuigen from kazernesData
        const kazerneData = kazernesData.find((kd: any) => kd.id === k.id);
        
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
          voertuigen: kazerneData?.voertuigen || undefined,
        };
      });
  }, [geocodeerdeKazernes, kazernesData]);

  // Convert GMS2 incidents to Map format
  const mapIncidenten: MapGmsIncident[] = useMemo(() => {
    return incidents
      .filter(inc => inc.coordinates && Array.isArray(inc.coordinates) && inc.coordinates.length === 2)
      .map(inc => ({
        id: inc.id,
        nr: inc.nr,
        prio: inc.prio,
        tijd: inc.tijd,
        mc: inc.mc,
        locatie: inc.locatie,
        plaats: inc.plaats,
        straatnaam: inc.straatnaam,
        huisnummer: inc.huisnummer,
        postcode: inc.postcode,
        plaatsnaam: inc.plaatsnaam,
        coordinates: inc.coordinates,
        mc1: inc.mc1,
        mc2: inc.mc2,
        mc3: inc.mc3,
        status: inc.status,
        melderNaam: inc.melderNaam,
        assignedUnits: inc.assignedUnits,
      }));
  }, [incidents]);

  // Auto-selection disabled to ensure "Nieuw" workflow works correctly
  // No automatic incident selection - user must manually select incidents

  // Load LMC classifications
  useEffect(() => {
    const loadLMCClassifications = async () => {
      try {
        const response = await fetch('/lmc_classifications.json');
        const data = await response.json();
        setLmcClassifications(data);
        console.log('Loaded LMC classifications:', data.length, 'entries');
      } catch (error) {
        console.error('Error loading LMC classifications:', error);
      }
    };

    loadLMCClassifications();
    
    // Laad ook MAR mappings voor inzetvoorstellen
    loadMarMappings();
  }, []);

  // Load karakteristieken database from JSON file
  useEffect(() => {
    const loadKarakteristieken = async () => {
      try {
        const response = await fetch('/karakteristieken.json');
        const data = await response.json();
        
        // Transform field names from snake_case to camelCase
        const transformedData = data.map((k: any) => ({
          ktNaam: k.kt_naam || '',
          ktType: k.kt_type || '',
          ktWaarde: k.kt_waarde || null,
          ktCode: k.kt_code || null,
          ktParser: k.kt_parser || null
        }));
        
        setKarakteristiekenDatabase(transformedData);
        console.log('✅ Loaded karakteristieken from JSON:', transformedData.length, 'entries');

        // Debug: Show sample codes
        if (transformedData.length > 0) {
          console.log('📋 Sample karakteristieken codes:', transformedData.slice(0, 10).map(k => ({
            code: k.ktCode,
            naam: k.ktNaam,
            type: k.ktType
          })));

          // Check specifically for ovdp-related codes
          const ovdpCodes = transformedData.filter(k => 
            k.ktCode && k.ktCode.toLowerCase().includes('ovdp') ||
            k.ktNaam && k.ktNaam.toLowerCase().includes('ovdp')
          );
          if (ovdpCodes.length > 0) {
            console.log('🔍 Found OVDP-related codes:', ovdpCodes);
          } else {
            console.log('❌ No OVDP-related codes found in database');
          }
        }
      } catch (error) {
        console.error('❌ Error loading karakteristieken from JSON:', error);
      }
    };

    loadKarakteristieken();
  }, []);

  // Load BRW units dataset once for linking in IV
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/data/brw_eenheden_structured.json');
        if (!res.ok) return;
        const ds = await res.json();
        let overrides: Record<string, string> = {};
        try {
          const raw = localStorage.getItem('brwStatusOverrides');
          if (raw) overrides = JSON.parse(raw);
        } catch {}
        const map: Record<string, any> = {};
        Object.entries(ds || {}).forEach(([rn, v]: any) => {
          map[rn] = {
            roepnummer: rn,
            gmsNaam: v?.["GMS-naam"] || '',
            post: v?.post || '',
            rollen: Array.isArray(v?.["inzetrollen GMS"]) ? v["inzetrollen GMS"] : [],
            alternatieven: Array.isArray(v?.["alternatief benaming"]) ? v["alternatief benaming"] : [],
            status: overrides[rn] ?? getDefaultStatus().afkorting // Default naar "kz" (op kazerne)
          };
        });
        setBrwUnitsMap(map);
      } catch {}
    };
    load();
  }, []);

  const isBrwUnitAssigned = (roepnummer: string): boolean => {
    return !!selectedIncident?.assignedUnits?.some(u => u.roepnummer === roepnummer);
  };

  const toggleAssignBrwUnit = (roepnummer: string) => {
    if (!selectedIncident) {
      addSystemLoggingEntry('❌ Geen incident geselecteerd voor koppelen van eenheid');
      return;
    }

    const unit = brwUnitsMap[roepnummer];
    const soort_voertuig = unit?.gmsNaam || (unit?.rollen?.[0] || 'BRW-eenheid');

    const already = selectedIncident.assignedUnits?.some(u => u.roepnummer === roepnummer);
    let updatedAssigned = Array.isArray(selectedIncident.assignedUnits) ? [...selectedIncident.assignedUnits] : [];
    if (already) {
      updatedAssigned = updatedAssigned.filter(u => u.roepnummer !== roepnummer);
      addSystemLoggingEntry(`🧹 Eenheid ${roepnummer} ontkoppeld van incident #${selectedIncident.nr}`);
    } else {
      const now = new Date().toTimeString().slice(0, 5);
      updatedAssigned.push({ 
        roepnummer, 
        soort_voertuig, 
        huidige_status: 'ov', // Opdracht verstrekt
        ov_tijd: now 
      });
      addSystemLoggingEntry(`🧩 Eenheid ${roepnummer} gekoppeld aan incident #${selectedIncident.nr} - Status: OV`);
    }

    const updatedIncident = { ...selectedIncident, assignedUnits: updatedAssigned } as any;
    setSelectedIncident(updatedIncident);
    setIncidents(prev => prev.map(inc => inc.id === updatedIncident.id ? updatedIncident : inc));
  };

  // Initialize dropdowns when classifications are loaded
  useEffect(() => {
    if (lmcClassifications.length > 0) {
      initializeLMCDropdowns();
    }
  }, [lmcClassifications]);

  const formatDateTime = (date: Date) => {
    const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                   'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${dayName} ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  };

  const handleIncidentSelect = (incident: GmsIncident) => {
    console.log(`📋 Selecting incident ${incident.nr} for editing`);

    // Zoom naar incidentlocatie op de kaart
    if (incident.coordinates) {
      zoomToIncident(incident.coordinates);
    }

    // Reset all PROC checkboxes first
    const procCheckboxes = [
      'persvoorlichting',
      'tev-piket', 
      'officier-dienst',
      'bvt',
      'hovj',
      'verkeersongevallenanalyse',
      'coordinatie-centrum',
      'forensische-opsporing',
      'fo-piket-rotterdam'
    ];
    
    procCheckboxes.forEach(id => {
      const checkbox = document.getElementById(id) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    // Reset auto-check flag and checkbox state
    setShouldAutoCheckFOPiket(false);
    setFoPiketChecked(false);

    // Set selected incident first
    setSelectedIncident(incident);
    
    // Store selected incident ID in localStorage for unit linking
    localStorage.setItem('selectedIncidentId', incident.id.toString());

    // Generate automatic pager text
    const generatePagerText = (incident: GmsIncident) => {
      const prio = incident.prio || 2;
      const classificatie = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || "Onbekend";
      const adres = incident.locatie || "Adres onbekend";
      const plaats = incident.plaatsnaam || incident.plaats || "Plaats onbekend";
      const roepnummers = incident.assignedUnits?.length ? incident.assignedUnits.map(u => u.roepnummer).join(" ") : "";
      
      // Check for gespreksgroep karakteristiek (code "gg")
      const gespreksgroepKarakteristiek = incident.karakteristieken?.find(
        k => k.ktCode === 'gg' || k.ktCode === 'GG'
      );
      
      // Use gespreksgroep waarde if available, otherwise use default "1"
      const kanaalOfGroep = gespreksgroepKarakteristiek?.waarde 
        ? gespreksgroepKarakteristiek.waarde.toUpperCase()
        : "1";
      
      const parts = [
        `P${prio}`,
        kanaalOfGroep,
        classificatie,
        adres.toUpperCase(),
        plaats.toUpperCase(),
        roepnummers
      ].filter(part => part && part.trim() !== "");
      
      return parts.join(" ");
    };

    // Set pager text automatically
    setPagerText(generatePagerText(incident));

    // Load all incident data into form fields
    if (incident) {
      // Get assigned roepnummers for the form
      const assignedRoepnummers = incident.assignedUnits?.map(unit => unit.roepnummer).join(', ') || incident.roepnr || '';
      
      const incidentFormData = {
        melderNaam: incident.melderNaam || "",
        telefoonnummer: incident.telefoonnummer || "",
        melderAdres: incident.melderAdres || "",
        huisnummer: incident.huisnummer || "",
        toevoeging: incident.toevoeging || "",
        gemeente: incident.gemeente || "",
        straatnaam: incident.straatnaam || "",
        postcode: incident.postcode || "",
        plaatsnaam: incident.plaatsnaam || "",
        object: incident.object || "",
        functie: incident.functie || "",
        roepnummer: assignedRoepnummers,
        coordinates: incident.coordinates || null
      };

      console.log(`📋 Loading incident data into form:`, incidentFormData);
      console.log(`📋 Incident coordinates:`, incident.coordinates);
      setFormData(incidentFormData);

      // Set MC classifications immediately and ensure they persist
      const mc1Value = incident.mc1 || "";
      const mc2Value = incident.mc2 || "";
      const mc3Value = incident.mc3 || "";

      console.log(`📋 Setting MC values: MC1="${mc1Value}", MC2="${mc2Value}", MC3="${mc3Value}"`);

      setSelectedMC1(mc1Value);
      setSelectedMC2(mc2Value);
      setSelectedMC3(mc3Value);

      // Set priority
      if (incident.prio) setPriorityValue(incident.prio);

      // Set notes if available
      if (incident.notities) setNotitiesText(incident.notities);

      // Load karakteristieken if available
      if (incident.karakteristieken && Array.isArray(incident.karakteristieken)) {
        setSelectedKarakteristieken(incident.karakteristieken);
        
        // Debug: Log all karakteristieken to see what's available
        console.log('🔍 Incident karakteristieken:', incident.karakteristieken?.map(k => ({ name: k.ktNaam, code: k.ktCode })));
        
        // Check if incident has "Inzet Pol recherche FO" karakteristiek and auto-check FO piket Rotterdam
        const hasInzetPolRechercheFO = incident.karakteristieken?.some(k => 
          k.ktNaam === 'Inzet Pol recherche FO' ||
          k.ktNaam === 'Inzet Pol Recherche FO' ||
          k.ktNaam === 'inzet pol recherche fo' ||
          k.ktNaam === 'Inzet Pol recherche' ||
          k.ktNaam?.toLowerCase().includes('inzet pol recherche') ||
          k.ktCode === 'ipr' ||
          k.ktCode === 'IPR'
        );
        
        if (hasInzetPolRechercheFO) {
          console.log('🕵️ Incident has "Inzet Pol recherche FO" karakteristiek - auto-checking FO piket');
          addSystemLoggingEntry('🕵️ Incident geladen met Inzet Pol recherche FO - FO piket Rotterdam automatisch aangevinkt');
          setFoPiketChecked(true);
          
          // Also add capcode to pager text if not already present
          setPagerText(prev => {
            if (!prev.includes('1430100')) {
              const newText = prev + " 1430100";
              console.log('📝 Adding capcode 1430100 to pager text:', newText);
              return newText;
            }
            return prev;
          });
        } else {
          setShouldAutoCheckFOPiket(false);
        }
      } else {
        setSelectedKarakteristieken([]);
      }
      
      // Reset inzetvoorstel view when selecting a different incident
      // This ensures old inzetvoorstel doesn't persist from previous incident
      setShowInzetvoorstel(false);
      setInzetvoorstel(null);

      // Load logging history if available - IMPORTANT: Clear first, then load
      setLoggingEntries([]); // Clear any existing entries first

      if (incident.meldingslogging) {
        const loggingLines = incident.meldingslogging.split('\n').filter(line => line.trim());
        const parsedEntries = loggingLines.map((line, index) => ({
          id: Date.now() + index + Math.random(), // Ensure unique IDs
          timestamp: line.substring(0, 20),
          message: line.substring(21)
        }));

        console.log(`📋 Loading ${parsedEntries.length} logging entries for incident ${incident.nr}`);
        setLoggingEntries(parsedEntries);
      }

      // Restore MC classifications in dropdowns with proper MC3 preservation
      setTimeout(() => {
        const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
        const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
        const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

        if (mc1Select && incident.mc1) {
          // First populate MC1 dropdown if not already populated
          if (mc1Select.options.length <= 1) {
            const mc1Options = Array.from(new Set(lmcClassifications.map(c => c.MC1).filter(Boolean))).sort();
            mc1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
            mc1Options.forEach(mc1 => {
              const option = document.createElement('option');
              option.value = mc1;
              option.textContent = mc1;
              mc1Select.appendChild(option);
            });
          }
          mc1Select.value = incident.mc1;

          setTimeout(() => {
            if (mc2Select && incident.mc2) {
              // Populate MC2 dropdown based on selected MC1
              const mc2Options = Array.from(new Set(
                lmcClassifications
                  .filter(c => c.MC1 === incident.mc1 && c.MC2 && c.MC2.trim() !== "")
                  .map(c => c.MC2)
              )).sort();

              mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
              mc2Options.forEach(mc2 => {
                const option = document.createElement('option');
                option.value = mc2;
                option.textContent = mc2;
                mc2Select.appendChild(option);
              });
              mc2Select.value = incident.mc2;

              setTimeout(() => {
                if (mc3Select && incident.mc3) {
                  // Populate MC3 dropdown based on selected MC1 and MC2
                  const mc3Options = Array.from(new Set(
                    lmcClassifications
                      .filter(c => c.MC1 === incident.mc1 && c.MC2 === incident.mc2 && c.MC3 && c.MC3.trim() !== "")
                      .map(c => c.MC3)
                  )).sort();

                  mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
                  mc3Options.forEach(mc3 => {
                    const option = document.createElement('option');
                    option.value = mc3;
                    option.textContent = mc3;
                    mc3Select.appendChild(option);
                  });
                  mc3Select.value = incident.mc3;

                  console.log(`📋 Restored complete classification: MC1="${incident.mc1}", MC2="${incident.mc2}", MC3="${incident.mc3}"`);
                }
              }, 100);
            }
          }, 100);
        }
      }, 250);


    }
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle "Update" button click for existing incidents
  const handleUpdate = async () => {
    if (selectedIncident) {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Get current values from the UI dropdowns to ensure we have the latest state
      const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
      const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
      const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

      // Priority order: dropdown value > state value > original incident value > empty string
      const currentMC1 = mc1Select?.value || selectedMC1 || selectedIncident.mc1 || "";
      const currentMC2 = mc2Select?.value || selectedMC2 || selectedIncident.mc2 || "";
      const currentMC3 = mc3Select?.value || selectedMC3 || selectedIncident.mc3 || "";

      console.log(`📝 Update - Preserving MC values: MC1="${currentMC1}", MC2="${currentMC2}", MC3="${currentMC3}"`);

      // Determine MC code based on selected classification
      let mcCode = selectedIncident.mc;
      if (currentMC3 && currentMC2 && currentMC1) {
        const matchingClassification = lmcClassifications.find(c => 
          c.MC1 === currentMC1 && c.MC2 === currentMC2 && c.MC3 === currentMC3
        );
        if (matchingClassification) {
          mcCode = matchingClassification.Code.toUpperCase();
        }
      } else if (currentMC2 && currentMC1) {
        const matchingClassification = lmcClassifications.find(c => 
          c.MC1 === currentMC1 && c.MC2 === currentMC2
        );
        if (matchingClassification) {
          mcCode = matchingClassification.Code.toUpperCase();
        }
      }

      // Create location string
      const location = formData.straatnaam && formData.huisnummer 
        ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
        : formData.straatnaam?.toUpperCase() || "";

      // Auto-geocode if address exists but no coordinates
      let finalCoordinates = formData.coordinates;
      if (!finalCoordinates && formData.straatnaam && formData.plaatsnaam) {
        console.log(`🔄 Auto-geocoding: ${formData.straatnaam} ${formData.huisnummer || ''}, ${formData.plaatsnaam}`);
        try {
          const geocodeQuery = `${formData.straatnaam} ${formData.huisnummer || ''} ${formData.plaatsnaam}`.trim();
          const results = await searchBAGAddress(geocodeQuery);
          if (results.length > 0 && results[0].coordinates) {
            finalCoordinates = results[0].coordinates;
            console.log(`✅ Auto-geocoded: [${finalCoordinates[0]}, ${finalCoordinates[1]}]`);
            addSystemLoggingEntry(`📍 Locatie automatisch gegeocodeerd: [${finalCoordinates[0].toFixed(4)}, ${finalCoordinates[1].toFixed(4)}]`);
          }
        } catch (error) {
          console.error('Auto-geocoding failed:', error);
        }
      }

      const updatedIncident: GmsIncident = {
        ...selectedIncident,
        prio: priorityValue,
        mc: mcCode,
        locatie: location,
        plaats: formData.plaatsnaam?.substring(0, 3).toUpperCase() || "",
        melderNaam: formData.melderNaam,
        melderAdres: formData.melderAdres,  
        telefoonnummer: formData.telefoonnummer,
        straatnaam: formData.straatnaam,
        huisnummer: formData.huisnummer,
        toevoeging: formData.toevoeging,
        postcode: formData.postcode,
        plaatsnaam: formData.plaatsnaam,
        gemeente: formData.gemeente,
        coordinates: finalCoordinates,
        object: formData.object,
        functie: formData.functie,
        mc1: currentMC1,
        mc2: currentMC2,
        mc3: currentMC3,
        notities: notitiesText,
        karakteristieken: selectedKarakteristieken,
        meldingslogging: loggingEntries.map(entry => `${entry.timestamp} ${entry.message}`).join('\n'),
        prioriteit: priorityValue
      };

      console.log(`💾 Saving incident with coordinates:`, updatedIncident.coordinates);

      // Update state variables to match what we just saved
      setSelectedMC1(currentMC1);
      setSelectedMC2(currentMC2);
      setSelectedMC3(currentMC3);

      // Update incident in list
      setIncidents(prev => prev.map(inc => 
        inc.id === selectedIncident.id ? updatedIncident : inc
      ));

      // Update selected incident
      setSelectedIncident(updatedIncident);


    }
  };

  // Handle "Uitgifte" button click
  const handleUitgifte = async () => {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newIncidentNumber = getNextIncidentNumber();

    // Determine MC code based on selected classification
    let mcCode = "";
    if (selectedMC3 && selectedMC2 && selectedMC1) {
      const matchingClassification = lmcClassifications.find(c => 
        c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && c.MC3 === selectedMC3
      );
      if (matchingClassification) {
        mcCode = matchingClassification.Code.toUpperCase();
      }
    } else if (selectedMC2 && selectedMC1) {
      const matchingClassification = lmcClassifications.find(c => 
        c.MC1 === selectedMC1 && c.MC2 === selectedMC2
      );
      if (matchingClassification) {
        mcCode = matchingClassification.Code.toUpperCase();
      }
    }

    // Create location string
    const location = formData.straatnaam && formData.huisnummer 
      ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
      : formData.straatnaam?.toUpperCase() || "";

    // Auto-geocode if address exists but no coordinates
    let finalCoordinates = formData.coordinates;
    if (!finalCoordinates && formData.straatnaam && formData.plaatsnaam) {
      console.log(`🔄 Auto-geocoding bij Uitgifte: ${formData.straatnaam} ${formData.huisnummer || ''}, ${formData.plaatsnaam}`);
      try {
        const geocodeQuery = `${formData.straatnaam} ${formData.huisnummer || ''} ${formData.plaatsnaam}`.trim();
        const results = await searchBAGAddress(geocodeQuery);
        if (results.length > 0 && results[0].coordinates) {
          finalCoordinates = results[0].coordinates;
          console.log(`✅ Auto-geocoded bij Uitgifte: [${finalCoordinates[0]}, ${finalCoordinates[1]}]`);
          addSystemLoggingEntry(`📍 Locatie automatisch gegeocodeerd: [${finalCoordinates[0].toFixed(4)}, ${finalCoordinates[1].toFixed(4)}]`);
        }
      } catch (error) {
        console.error('Auto-geocoding failed bij Uitgifte:', error);
      }
    }

    const newIncident: GmsIncident = {
      id: Date.now(),
      nr: newIncidentNumber,
      prio: priorityValue,
      tijd: timeString,
      mc: mcCode,
      locatie: location,
      plaats: formData.plaatsnaam?.substring(0, 3).toUpperCase() || "",
      roepnr: formData.roepnummer || "",
      positie: "",
      melderNaam: formData.melderNaam,
      melderAdres: formData.melderAdres,  
      telefoonnummer: formData.telefoonnummer,
      straatnaam: formData.straatnaam,
      huisnummer: formData.huisnummer,
      toevoeging: formData.toevoeging,
      postcode: formData.postcode,
      plaatsnaam: formData.plaatsnaam,
      gemeente: formData.gemeente,
      coordinates: finalCoordinates,
      object: formData.object,
      functie: formData.functie,
      mc1: selectedMC1,
      mc2: selectedMC2,
      mc3: selectedMC3,
      notities: notitiesText,
      karakteristieken: selectedKarakteristieken,
      status: "Openstaand",
      meldingslogging: loggingEntries.map(entry => `${entry.timestamp} ${entry.message}`).join('\n'),
      tijdstip: new Date().toISOString(),
      prioriteit: priorityValue
    };
    
    console.log(`💾 Nieuwe melding aangemaakt met coordinates:`, finalCoordinates);

    // Generate automatic pager text for new incident
    const generatePagerText = (incident: GmsIncident) => {
      const prio = incident.prio || 2;
      const classificatie = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || "Onbekend";
      const adres = incident.locatie || "Adres onbekend";
      const plaats = incident.plaatsnaam || incident.plaats || "Plaats onbekend";
      const roepnummers = incident.assignedUnits?.length ? incident.assignedUnits.map(u => u.roepnummer).join(" ") : "";
      
      // Check for gespreksgroep karakteristiek (code "gg")
      const gespreksgroepKarakteristiek = incident.karakteristieken?.find(
        k => k.ktCode === 'gg' || k.ktCode === 'GG'
      );
      
      // Use gespreksgroep waarde if available, otherwise use default "1"
      const kanaalOfGroep = gespreksgroepKarakteristiek?.waarde 
        ? gespreksgroepKarakteristiek.waarde.toUpperCase()
        : "1";
      
      const parts = [
        `P${prio}`,
        kanaalOfGroep,
        classificatie,
        adres.toUpperCase(),
        plaats.toUpperCase(),
        roepnummers
      ].filter(part => part && part.trim() !== "");
      
      return parts.join(" ");
    };

    // Set pager text for new incident
    setPagerText(generatePagerText(newIncident));

    // Add to incidents list (at the beginning for newest first)
    setIncidents(prev => [newIncident, ...prev]);
    
    // Dispatch custom event voor real-time map updates
    window.dispatchEvent(new CustomEvent('gms2IncidentsUpdated'));

    // Zoom naar nieuwe incidentlocatie op de kaart
    if (finalCoordinates) {
      setTimeout(() => {
        zoomToIncident(finalCoordinates);
      }, 100); // Kleine delay om ervoor te zorgen dat de map klaar is
    }

    // Clear selected incident so "Uitgifte" button stays for next incident
    setSelectedIncident(null);

    // Only clear classifications and notes, keep address data intact
    setSelectedMC1("");
    setSelectedMC2("");
    setSelectedMC3("");
    setPriorityValue(2);
    setNotitiesText("");

    // Clear classification dropdowns only
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (mc1Select) mc1Select.value = "";
    if (mc2Select) mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
    if (mc3Select) mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
  };

  // Update ref when handleUitgifte is defined (runs after handleUitgifte is defined)
  useEffect(() => {
    handleUitgifteRef.current = handleUitgifte;
  });

  // Handle "Archiveer" button click
  const handleArchiveer = async () => {
    if (!selectedIncident) {
      return;
    }

    const assignedUnits = selectedIncident.assignedUnits || [];
    const currentTime = new Date().toTimeString().slice(0, 5);
    const globalPositions = getUnitPositions();
    let positionsChanged = false;

    const processedUnits: Array<{
      roepnummer: string;
      normalized: string;
      kazerneNaam?: string;
      movementStarted: boolean;
    }> = [];
    const unitsAwaitingArrival = new Set<string>();

    const findKazerneCoordsForUnit = (roepnummer: string) => {
      const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
      let kazerneMatch: any | undefined;

      for (const kazerne of kazernesData || []) {
        if (!kazerne?.voertuigen || kazerne.voertuigen.length === 0) continue;
        if (kazerne.voertuigen.some((voertuig: any) => normalizeRoepnummer(voertuig.roepnummer) === normalizedRoepnummer)) {
          kazerneMatch = kazerne;
          break;
        }
      }

      if (!kazerneMatch) {
        return null;
      }

      const geocodeerdeMatch = geocodeerdeKazernes.find(k => k.id === kazerneMatch.id);
      const lat = Number(geocodeerdeMatch?.lat ?? kazerneMatch.lat ?? kazerneMatch.latitude);
      const lng = Number(geocodeerdeMatch?.lng ?? kazerneMatch.lng ?? kazerneMatch.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        lat,
        lng,
        naam: geocodeerdeMatch?.naam || kazerneMatch.naam || kazerneMatch.plaats || undefined,
      };
    };

    const getUnitCoordinates = (roepnummer: string) => {
      const normalized = normalizeRoepnummer(roepnummer);
      const position = globalPositions.get(normalized);
      if (position?.lat && position?.lng) {
        return { lat: position.lat, lng: position.lng };
      }

      const mapEenheid = mapEenheden.find(
        (eenheid) =>
          normalizeRoepnummer(eenheid.id) === normalized ||
          normalizeRoepnummer(eenheid.naam) === normalized
      );

      if (mapEenheid) {
        return { lat: mapEenheid.lat, lng: mapEenheid.lng };
      }

      if (selectedIncident.coordinates && selectedIncident.coordinates.length === 2) {
        const [lng, lat] = selectedIncident.coordinates;
        return { lat, lng };
      }

      return null;
    };

    for (const assignedUnit of assignedUnits) {
      const roepnummer = assignedUnit.roepnummer;
      if (!roepnummer) continue;

      const normalized = normalizeRoepnummer(roepnummer);
      const currentPosition = globalPositions.get(normalized) || getUnitPosition(roepnummer);
      const currentStatusCode =
        currentPosition?.statusCode?.toLowerCase() ||
        assignedUnit.huidige_status?.toLowerCase();

      if (currentStatusCode === 'kz') {
        console.log(`ℹ️ Eenheid ${roepnummer} staat al op de kazerne, overslaan.`);
        continue;
      }

      const kazerneInfo = findKazerneCoordsForUnit(roepnummer);
      if (!kazerneInfo) {
        console.warn(`⚠️ Geen kazerne gevonden voor ${roepnummer}. Status ongewijzigd.`);
        continue;
      }

      const unitCoords = getUnitCoordinates(roepnummer);
      if (!unitCoords) {
        console.warn(`⚠️ Geen huidige positie gevonden voor ${roepnummer}.`);
        continue;
      }

      let routeCalculated = true;
      try {
        const routeResult = await routingService.getRoute(
          [unitCoords.lat, unitCoords.lng],
          [kazerneInfo.lat, kazerneInfo.lng]
        );
        if (routeResult) {
          console.log(
            `🗺️ Route voor ${roepnummer}: ${(routeResult.distance / 1000).toFixed(1)} km, ${(routeResult.duration / 60).toFixed(1)} min`
          );
        }
      } catch (routeError) {
        routeCalculated = false;
        console.warn(`⚠️ Routeberekening mislukt voor ${roepnummer}. Status blijft BS, geen automatische rit.`, routeError);
      }

      let positionToUpdate = globalPositions.get(normalized);
      if (!positionToUpdate) {
        positionToUpdate = {
          roepnummer: normalized,
          lat: unitCoords.lat,
          lng: unitCoords.lng,
          status: 'beschikbaar',
          statusCode: 'bs',
          activeIncidentId: selectedIncident.id,
          lastUpdate: Date.now(),
        } as any;
        globalPositions.set(normalized, positionToUpdate);
      }

      if (routeCalculated) {
        positionToUpdate.targetLat = kazerneInfo.lat;
        positionToUpdate.targetLng = kazerneInfo.lng;
        positionToUpdate.targetType = 'kazerne';
        positionToUpdate.status = 'terug_naar_kazerne';
        unitsAwaitingArrival.add(normalized);
      } else {
        positionToUpdate.targetLat = undefined;
        positionToUpdate.targetLng = undefined;
        positionToUpdate.targetType = undefined;
        positionToUpdate.status = 'beschikbaar';
      }

      positionToUpdate.lastUpdate = Date.now();
      positionToUpdate.activeIncidentId = selectedIncident.id;

      updateVehicleStatus(positionToUpdate as any, 'bs', selectedIncident.id);
      positionsChanged = true;

      setUnitStatus(roepnummer, 'bs');

      processedUnits.push({
        roepnummer,
        normalized,
        kazerneNaam: kazerneInfo.naam,
        movementStarted: routeCalculated,
      });
    }

    if (positionsChanged) {
      saveUnitPositions(globalPositions);
      window.dispatchEvent(
        new CustomEvent('unitPositionsUpdated', {
          detail: Object.fromEntries(globalPositions),
        })
      );
    }

    if (unitsAwaitingArrival.size > 0) {
      const arrivalListener = ((event: Event) => {
        const detail = (event as CustomEvent).detail as { roepnummer?: string };
        if (!detail?.roepnummer) return;

        const normalized = normalizeRoepnummer(detail.roepnummer);
        if (!unitsAwaitingArrival.has(normalized)) return;

        setUnitStatus(detail.roepnummer, 'kz');
        unitsAwaitingArrival.delete(normalized);

        if (unitsAwaitingArrival.size === 0) {
          window.removeEventListener('unitArrivedAtStation', arrivalListener);
        }
      }) as EventListener;

      window.addEventListener('unitArrivedAtStation', arrivalListener);

      setTimeout(() => {
        window.removeEventListener('unitArrivedAtStation', arrivalListener);
      }, 10 * 60 * 1000);
    }

    const processedSet = new Set(processedUnits.map((unit) => unit.normalized));
    const updatedAssignedUnits = (selectedIncident.assignedUnits || []).map((unit) => {
      const normalized = normalizeRoepnummer(unit.roepnummer);
      if (!processedSet.has(normalized)) {
        return unit;
      }

      return {
        ...unit,
        huidige_status: 'bs',
        ir_tijd: unit.ir_tijd || currentTime,
        bs_tijd: currentTime,
      };
    });

    const incidentWithUpdatedUnits = {
      ...selectedIncident,
      assignedUnits: updatedAssignedUnits,
    };

    if (processedUnits.length > 0) {
      try {
        const response = await fetch('/api/police-units');
        if (response.ok) {
          const allUnits = await response.json();

          for (const processed of processedUnits) {
            const unitToUpdate = allUnits.find(
              (unit: any) => normalizeRoepnummer(unit.roepnummer) === processed.normalized
            );

            if (unitToUpdate) {
              const updatedUnit = {
                ...unitToUpdate,
                status: 'bs',
                incident: '',
              };

              await fetch(`/api/police-units/${unitToUpdate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUnit),
              });
            }
          }
        }
      } catch (error) {
        console.error('Error updating unit statuses after archiving:', error);
        addSystemLoggingEntry(`⚠️ Fout bij vrijgeven eenheden na archivering`);
      }

      const retourSamenvatting = processedUnits
        .map((unit) => (unit.kazerneNaam ? `${unit.roepnummer}→${unit.kazerneNaam}` : unit.roepnummer))
        .join(', ');

      addSystemLoggingEntry(
        `📦 Incident afgesloten - ${processedUnits.length} eenhe${processedUnits.length === 1 ? 'id' : 'den'} retour (BS): ${retourSamenvatting}`
      );
    } else {
      addSystemLoggingEntry(`📦 Incident afgesloten - geen actieve eenheden gevonden`);
    }

    const archivedIncident = {
      ...incidentWithUpdatedUnits,
      status: "Afgesloten"
    };

    setIncidents(prev => prev.map(inc => 
      inc.id === archivedIncident.id ? archivedIncident : inc
    ));

    setIncidents(prev => prev.filter(inc => inc.id !== archivedIncident.id));
    
    window.dispatchEvent(new CustomEvent('gms2IncidentsUpdated'));
    window.dispatchEvent(new CustomEvent('gms2IncidentArchived', { detail: archivedIncident }));

    const remainingIncidents = incidents.filter(inc => inc.id !== archivedIncident.id);
    setSelectedIncident(remainingIncidents.length > 0 ? remainingIncidents[0] : null);
  };

  // Handle "Nieuw" button click - Complete reset for new incident
  const handleNieuw = () => {
    // Generate a unique session ID for this new incident to prevent data mixing
    const newSessionId = `new_incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🆕 Starting completely new incident with session ID: ${newSessionId}`);

    // STEP 1: Immediately clear selected incident to break all connections
    setSelectedIncident(null);

    // STEP 2: Complete form data reset with empty object
    const cleanFormData = {
      melderNaam: "",
      telefoonnummer: "",
      melderAdres: "",
      huisnummer: "",
      toevoeging: "",
      gemeente: "",
      straatnaam: "",
      postcode: "",
      plaatsnaam: "",
      object: "",
      functie: "",
      roepnummer: "",
      coordinates: null as [number, number] | null
    };
    setFormData(cleanFormData);

    // STEP 3: Reset ALL classification states immediately
    setSelectedMC1("");
    setSelectedMC2("");
    setSelectedMC3("");
    setPriorityValue(2);
    setNotitiesText("");
    setSelectedKarakteristieken([]);

    // STEP 4: Clear kladblok and logging IMMEDIATELY - NO ADDING ENTRIES
    setKladblokText(""); // Keep kladblok completely empty
    setLoggingEntries([]); // Complete immediate reset - no entries at all
    setShowInzetvoorstel(false); // Clear inzetvoorstel view
    setInzetvoorstel(null);

    // STEP 5: Force DOM elements to reset without delays
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    // Clear all dropdowns immediately and remove any existing event listeners
    if (mc1Select) {
      mc1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
      mc1Select.value = "";
      // Clear any bound data or state
      mc1Select.removeAttribute('data-current-value');
    }
    if (mc2Select) {
      mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
      mc2Select.value = "";
      mc2Select.removeAttribute('data-current-value');
    }
    if (mc3Select) {
      mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
      mc3Select.value = "";
      mc3Select.removeAttribute('data-current-value');
    }

    // STEP 6: Force complete reinitialization of dropdown system
    if (lmcClassifications.length > 0) {
      // Immediate reinitialization without delay
      setTimeout(() => {
        console.log(`🔄 Reinitializing dropdowns for new incident ${newSessionId.slice(-8)}`);
        initializeLMCDropdowns();
      }, 10);
    }

    // STEP 7: Reset activeLoggingTab to ensure clean state
    setActiveLoggingTab("hist-meldblok");

    // NO STEP 8 - Keep logging completely empty for new incident
    // The user can start fresh without any pre-filled logging entries

    console.log(`✅ New incident reset complete - session: ${newSessionId} - completely clean state`);
  };

  // Update ref when handleNieuw is defined (runs after handleNieuw is defined)
  useEffect(() => {
    handleNieuwRef.current = handleNieuw;
  });

  const addLoggingEntry = (message: string) => {
    const now = new Date();
    const dateStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = now.getFullYear();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const timestamp = `${dateStr}:${monthStr} ${yearStr} ${timeStr} OC RTD`;

    const newEntry = {
      id: Date.now(),
      timestamp,
      message: message.trim()
    };

    setLoggingEntries(prev => [newEntry, ...prev]);
    
    // Also add to logging tab entries for detailed logging view
    setLoggingTabEntries(prev => [newEntry, ...prev]);
  };

  // Separate function for automatic system logging (only goes to Logging tab)
  const addSystemLoggingEntry = (message: string) => {
    const now = new Date();
    const dateStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = now.getFullYear();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const timestamp = `${dateStr}:${monthStr} ${yearStr} ${timeStr} OC RTD`;

    const newEntry = {
      id: Date.now(),
      timestamp,
      message: message.trim()
    };

    // Only add to logging tab entries (not to hist-meldblok)
    setLoggingTabEntries(prev => [newEntry, ...prev]);
  };

  // Handle Werkplek popup window
  const handleWerkplekClick = () => {
    const windowFeatures = "width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no";
    const popupWindow = window.open("", "GMS2_Werkplek", windowFeatures);

    if (popupWindow) {
      // Create a complete HTML document for the popup
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>GMS2 Werkplek</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Arial, sans-serif;
              background: #f5f5f5;
            }
            .popup-header {
              background: #333;
              color: white;
              padding: 10px;
              font-weight: bold;
            }
            .popup-content {
              padding: 20px;
            }
            .data-sync-indicator {
              background: #4CAF50;
              color: white;
              padding: 5px 10px;
              border-radius: 3px;
              font-size: 12px;
              margin-bottom: 10px;
            }
            .incident-summary {
              background: white;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 15px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .current-incident {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .incident-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 10px;
            }
            .detail-item {
              padding: 8px;
              background: #f9f9f9;
              border-radius: 3px;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="popup-header">
            GMS2 Werkplek - Data Verbonden
          </div>
          <div class="popup-content">
            <div class="data-sync-indicator">
              🔗 Live data-verbinding actief
            </div>
            <div id="incident-data" class="incident-summary">
              <div class="current-incident">Laden van incident data...</div>
            </div>
          </div>

          <script>
            // Live data synchronization
            function updateIncidentData() {
              const mainWindow = window.opener;
              if (mainWindow && !mainWindow.closed) {
                try {
                  // Access the React state from the main window
                  const selectedIncident = mainWindow.gms2SelectedIncident;
                  const incidents = mainWindow.gms2Incidents || [];

                  const incidentDataDiv = document.getElementById('incident-data');

                  if (selectedIncident) {
                    incidentDataDiv.innerHTML = \`
                      <div class="current-incident">
                        Actief Incident: #\${selectedIncident.nr || 'Nieuw'}
                      </div>
                      <div class="incident-details">
                        <div class="detail-item">
                          <div class="detail-label">Locatie:</div>
                          <div>\${selectedIncident.locatie || 'Niet ingevuld'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Classificatie:</div>
                          <div>\${selectedIncident.mc3 || selectedIncident.mc2 || selectedIncident.mc1 || selectedIncident.mc || 'Niet geclassificeerd'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Prioriteit:</div>
                          <div>P\${selectedIncident.prio || 'Onbekend'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Tijd:</div>
                          <div>\${selectedIncident.tijd || 'Niet ingevuld'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Plaats:</div>
                          <div>\${selectedIncident.plaats || 'Niet ingevuld'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Status:</div>
                          <div>\${selectedIncident.status || 'Openstaand'}</div>
                        </div>
                      </div>
                      <div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 3px;">
                        <strong>Totaal incidenten:</strong> \${incidents.length}
                      </div>
                    \`;
                  } else {
                    incidentDataDiv.innerHTML = \`
                      <div class="current-incident">
                        Geen incident geselecteerd
                      </div>
                      <div style="margin-top: 10px; color: #666;">
                        Selecteer een incident in het hoofdscherm om details te zien
                      </div>
                      <div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 3px;">
                        <strong>Totaal incidenten:</strong> \${incidents.length}
                      </div>
                    \`;
                  }
                } catch (error) {
                  console.error('Error syncing data:', error);
                }
              } else {
                document.getElementById('incident-data').innerHTML = \`
                  <div class="current-incident" style="color: red;">
                    ❌ Verbinding met hoofdscherm verloren
                  </div>
                  <div style="margin-top: 10px; color: #666;">
                    Het hoofdscherm is gesloten of niet meer beschikbaar
                  </div>
                \`;
              }
            }

            // Update every 2 seconds
            setInterval(updateIncidentData, 2000);

            // Initial update
            updateIncidentData();

            // Handle window close
            window.addEventListener('beforeunload', function() {
              if (window.opener && !window.opener.closed) {
                console.log('Werkplek window closing');
              }
            });
          </script>
        </body>
        </html>
      `;

      popupWindow.document.write(htmlContent);
      popupWindow.document.close();

      // Store references for data sync
      popupWindow.focus();

      console.log('🪟 Werkplek window opened with live data connection');
    } else {
      console.error('❌ Failed to open popup window - check popup blocker');
      alert('Kon het Werkplek venster niet openen. Controleer de popup blocker instellingen.');
    }
  };

  // Function to set unit status (gebruikt centrale statusmodule)
  const setUnitStatus = (roepnummer: string, statusCode: string) => {
    if (!selectedIncident || !selectedIncident.assignedUnits) return;

    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format
    
    // Map "ar" naar "ut" voor interne opslag (AR kolom toont UT status)
    const internalStatusCode = statusCode === 'ar' ? 'ut' : statusCode;
    
    const updatedAssignedUnits = selectedIncident.assignedUnits.map(unit => {
      if (unit.roepnummer === roepnummer) {
        const updatedUnit: AssignedUnit = { 
          ...unit,
          huidige_status: internalStatusCode // Nieuwe status actief (gebruik interne code)
        };
        
        // Behoud alle bestaande tijden - wis ze NIET
        // Alleen zet tijd voor nieuwe status als deze nog niet bestaat
        // Voor UT (AR): zet altijd tijd als status naar UT gaat (ook als er al een tijd was)
        const oldStatus = unit.huidige_status;
        switch (internalStatusCode) {
          case 'ov':
            if (!updatedUnit.ov_tijd) {
              updatedUnit.ov_tijd = currentTime;
            }
            break;
          case 'ut': // AR kolom toont UT status
            // Zet altijd tijd wanneer status naar UT gaat (ook als er al een tijd was)
            // Alleen als de oude status niet UT was, zet nieuwe tijd
            if (!updatedUnit.ar_tijd || oldStatus !== 'ut') {
              updatedUnit.ar_tijd = currentTime;
            }
            break;
          case 'tp':
            if (!updatedUnit.tp_tijd) {
              updatedUnit.tp_tijd = currentTime;
            }
            break;
          case 'nb':
            if (!updatedUnit.nb_tijd) {
              updatedUnit.nb_tijd = currentTime;
            }
            break;
          case 'ir':
            if (!updatedUnit.ir_tijd) {
              updatedUnit.ir_tijd = currentTime;
            }
            break;
          case 'bs':
            if (!updatedUnit.bs_tijd) {
              updatedUnit.bs_tijd = currentTime;
            }
            break;
          case 'kz':
            if (!updatedUnit.kz_tijd) {
              updatedUnit.kz_tijd = currentTime;
            }
            break;
          case 'vr':
            if (!updatedUnit.vr_tijd) {
              updatedUnit.vr_tijd = currentTime;
            }
            break;
          case 'fd':
            if (!updatedUnit.fd_tijd) {
              updatedUnit.fd_tijd = currentTime;
            }
            break;
          case 'GA':
            if (!updatedUnit.ga_tijd) {
              updatedUnit.ga_tijd = currentTime;
            }
            break;
        }
        
        // Gebruik centrale statusmodule
        setUnitStatusCentral(updatedUnit, internalStatusCode, {
          incidentId: selectedIncident.id
        });
        
        return updatedUnit;
      }
      return unit;
    });

    const updatedIncident = {
      ...selectedIncident,
      assignedUnits: updatedAssignedUnits
    };

    setSelectedIncident(updatedIncident);
    setIncidents(prev => prev.map(inc => 
      inc.id === updatedIncident.id ? updatedIncident : inc
    ));

    // Trigger update voor database
    updateSelectedIncident(updatedIncident);

    const statusNamen: Record<string, string> = {
      'ov': 'Opdracht verstrekt',
      'ut': 'Uitgerukt',
      'ar': 'Aanrijdend', // UI naam voor UT
      'tp': 'Ter plaatse',
      'nb': 'Niet bezet',
      'ir': 'Ingerukt',
      'bs': 'Beschikbaar',
      'kz': 'Op kazerne',
      'vr': 'Vrij',
      'fd': 'Buiten dienst',
      'GA': 'Spraakaanvraag'
    };

    console.log(`⏰ Status bijgewerkt voor ${roepnummer}: ${statusNamen[statusCode] || statusCode} om ${currentTime}`);
    addSystemLoggingEntry(`📊 ${roepnummer}: ${statusNamen[statusCode] || statusCode} (${currentTime})`);
  };

  // Function to update unit status times based on status changes (legacy support)
  const updateUnitStatusTime = (roepnummer: string, newStatus: string) => {
    // Map oude status strings naar nieuwe codes
    const statusMap: Record<string, string> = {
      "2 - Aanrijdend": "ar",
      "3 - Ter plaatse": "tp",
      // Legacy mapping voor backwards compatibility
      "1 - Beschikbaar/vrij": "bs",
      "4 - Niet inzetbaar": "fd",
      "5 - Afmelden": "kz"
    };
    
    const statusCode = statusMap[newStatus] || newStatus.toLowerCase();
    setUnitStatus(roepnummer, statusCode);
  };

  // Function to update selected incident from external components
  const updateSelectedIncident = async (updatedIncident: GmsIncident) => {
    setSelectedIncident(updatedIncident);
    
    // Also update in the incidents list
    setIncidents(prev => prev.map(inc => 
      inc.id === updatedIncident.id ? updatedIncident : inc
    ));

    // Save to database if incident exists
    if (updatedIncident.id && typeof updatedIncident.id === 'number') {
      try {
        const saveData = {
          melderNaam: updatedIncident.melderNaam || "",
          melderAdres: updatedIncident.melderAdres || "",
          telefoonnummer: updatedIncident.telefoonnummer || "",
          straatnaam: updatedIncident.straatnaam || "",
          huisnummer: updatedIncident.huisnummer || "",
          toevoeging: updatedIncident.toevoeging || "",
          postcode: updatedIncident.postcode || "",
          plaatsnaam: updatedIncident.plaatsnaam || "",
          gemeente: updatedIncident.gemeente || "",
          mc1: updatedIncident.mc1 || "",
          mc2: updatedIncident.mc2 || "",
          mc3: updatedIncident.mc3 || "",
          tijdstip: updatedIncident.tijdstip || new Date().toISOString(),
          prioriteit: updatedIncident.prioriteit || priorityValue,
          status: updatedIncident.status || "Openstaand",
          meldingslogging: updatedIncident.meldingslogging || "",
          notities: updatedIncident.notities || "",
          assignedUnits: updatedIncident.assignedUnits || []
        };

        const response = await fetch(`/api/gms-incidents/${updatedIncident.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveData)
        });

        if (response.ok) {
          console.log(`✅ Incident ${updatedIncident.nr} assignments saved to database`);
          
          // Add logging entry for the assignment change
          const now = new Date();
          const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const assignedCount = updatedIncident.assignedUnits?.length || 0;
          
          addSystemLoggingEntry(`🚔 Eenheden bijgewerkt: ${assignedCount} eenhe${assignedCount === 1 ? 'id' : 'den'} gekoppeld`);
        } else {
          console.error('Failed to save incident assignments to database');
        }
      } catch (error) {
        console.error('Error saving incident assignments:', error);
      }
    }
    
    console.log(`Incident ${updatedIncident.nr} updated with ${updatedIncident.assignedUnits?.length || 0} unit assignments`);
  };

  // Expose state and functions to popup windows and child components for data sync
  useEffect(() => {
    (window as any).gms2SelectedIncident = selectedIncident;
    (window as any).gms2Incidents = incidents;
    (window as any).updateSelectedIncident = updateSelectedIncident;
    (window as any).updateUnitStatusTime = updateUnitStatusTime;
    (window as any).setUnitStatus = setUnitStatus;
  }, [selectedIncident, incidents]);

  // Automatische statusafhandeling op basis van beweging en incidenten
  useEffect(() => {
    if (!selectedIncident || !selectedIncident.assignedUnits || selectedIncident.assignedUnits.length === 0) {
      return;
    }

    // Luister naar statuswijzigingen van globalUnitMovement service
    const handleUnitStatusChanged = (event: CustomEvent) => {
      const { roepnummer, oldStatusCode, newStatusCode, incidentId } = event.detail;
      
      console.log(`📥 GMS2 ontvangt unitStatusChanged event:`, { roepnummer, oldStatusCode, newStatusCode, incidentId, selectedIncidentId: selectedIncident?.id });
      
      // Normaliseer roepnummer voor matching (zoals in globalUnitMovement)
      const normalizeRoepnummer = (rn: string) => {
        if (!rn) return '';
        let normalized = rn.trim().toLowerCase();
        normalized = normalized.replace(/\s+/g, '-');
        if (/^\d{6}$/.test(normalized)) {
          normalized = normalized.slice(0, 2) + '-' + normalized.slice(2);
        }
        return normalized;
      };
      
      const normalizedEventRoepnummer = normalizeRoepnummer(roepnummer);
      
      // Check of deze eenheid bij het geselecteerde incident hoort
      const unit = selectedIncident.assignedUnits?.find(u => {
        const normalizedUnitRoepnummer = normalizeRoepnummer(u.roepnummer);
        // Exacte match op genormaliseerd roepnummer
        if (normalizedUnitRoepnummer === normalizedEventRoepnummer) return true;
        // Fallback: probeer exacte match
        if (u.roepnummer === roepnummer) return true;
        // Fallback: case-insensitive match
        if (u.roepnummer.toLowerCase() === roepnummer.toLowerCase()) return true;
        // Fallback: zonder spaties/strepjes
        const uClean = u.roepnummer.replace(/[\s-]/g, '').toLowerCase();
        const rClean = roepnummer.replace(/[\s-]/g, '').toLowerCase();
        return uClean === rClean;
      });
      
      if (!unit) {
        console.log(`⚠️ Eenheid ${roepnummer} (genormaliseerd: ${normalizedEventRoepnummer}) niet gevonden in assignedUnits. Beschikbare eenheden:`, 
          selectedIncident.assignedUnits?.map(u => `${u.roepnummer} (${normalizeRoepnummer(u.roepnummer)})`));
        return; // Eenheid niet bij dit incident
      }
      
      if (incidentId && incidentId !== selectedIncident.id) {
        console.log(`⚠️ Incident ID mismatch bij statusChanged: event=${incidentId}, selected=${selectedIncident.id}`);
        return; // Verkeerd incident
      }

      // Map interne statuscode naar UI code (ut -> ar voor AR kolom)
      const uiStatusCode = newStatusCode === 'ut' ? 'ar' : newStatusCode;
      
      // Update status alleen als deze is veranderd
      if (unit.huidige_status !== newStatusCode) {
        console.log(`🔄 Update status voor ${unit.roepnummer}: ${unit.huidige_status || 'geen'} -> ${newStatusCode} (UI: ${uiStatusCode})`);
        setUnitStatus(unit.roepnummer, uiStatusCode);
      } else {
        console.log(`⏭️ Status niet gewijzigd voor ${unit.roepnummer} (al ${newStatusCode})`);
      }
    };

    // Luister naar movement events van de kaart
    const handleUnitMovement = (event: CustomEvent) => {
      const { roepnummer, status, coordinates, incidentId } = event.detail;
      
      console.log(`📥 GMS2 ontvangt unitMovement event:`, { roepnummer, status, incidentId, selectedIncidentId: selectedIncident?.id });
      
      // Check of deze eenheid bij het geselecteerde incident hoort
      const unit = selectedIncident.assignedUnits?.find(u => {
        // Probeer exacte match eerst
        if (u.roepnummer === roepnummer) return true;
        // Probeer case-insensitive match
        if (u.roepnummer.toLowerCase() === roepnummer.toLowerCase()) return true;
        // Probeer zonder spaties/strepjes
        const uClean = u.roepnummer.replace(/[\s-]/g, '').toLowerCase();
        const rClean = roepnummer.replace(/[\s-]/g, '').toLowerCase();
        return uClean === rClean;
      });
      
      if (!unit) {
        console.log(`⚠️ Eenheid ${roepnummer} niet gevonden in assignedUnits. Beschikbare eenheden:`, 
          selectedIncident.assignedUnits?.map(u => u.roepnummer));
        return;
      }
      
      if (incidentId && incidentId !== selectedIncident.id) {
        console.log(`⚠️ Incident ID mismatch: event=${incidentId}, selected=${selectedIncident.id}`);
        return;
      }

      // Status is al in GMS formaat (ut, tp, etc.)
      // Map "ut" naar "ar" voor UI (AR kolom toont UT status)
      const gmsStatus = status === 'ut' ? 'ar' : status;
      const internalStatus = status; // Gebruik interne status (ut) voor opslag
      console.log(`✅ Eenheid ${roepnummer} gevonden, huidige status: ${unit.huidige_status}, nieuwe status: ${internalStatus}`);
      
      if (internalStatus && unit.huidige_status !== internalStatus) {
        console.log(`🔄 Update status voor ${roepnummer}: ${unit.huidige_status} -> ${internalStatus}`);
        // setUnitStatus verwacht UI code (ar), maar slaat intern op als ut
        setUnitStatus(roepnummer, gmsStatus);
      } else {
        console.log(`⏭️ Status niet gewijzigd voor ${roepnummer} (al ${internalStatus})`);
      }
    };

    // Luister naar arrival events
    const handleUnitArrival = (event: CustomEvent) => {
      const { roepnummer, incidentId } = event.detail;
      
      console.log(`📥 GMS2 ontvangt unitArrival event:`, { roepnummer, incidentId, selectedIncidentId: selectedIncident?.id });
      
      const unit = selectedIncident.assignedUnits?.find(u => {
        // Probeer exacte match eerst
        if (u.roepnummer === roepnummer) return true;
        // Probeer case-insensitive match
        if (u.roepnummer.toLowerCase() === roepnummer.toLowerCase()) return true;
        // Probeer zonder spaties/strepjes
        const uClean = u.roepnummer.replace(/[\s-]/g, '').toLowerCase();
        const rClean = roepnummer.replace(/[\s-]/g, '').toLowerCase();
        return uClean === rClean;
      });
      
      if (!unit) {
        console.log(`⚠️ Eenheid ${roepnummer} niet gevonden in assignedUnits voor arrival. Beschikbare eenheden:`, 
          selectedIncident.assignedUnits?.map(u => u.roepnummer));
        return;
      }
      
      if (incidentId && incidentId !== selectedIncident.id) {
        console.log(`⚠️ Incident ID mismatch bij arrival: event=${incidentId}, selected=${selectedIncident.id}`);
        return;
      }
      
      // Eenheid is aangekomen op incidentlocatie
      if (unit.huidige_status !== 'tp') {
        console.log(`🔄 Update status voor ${roepnummer} naar TP (ter plaatse)`);
        setUnitStatus(roepnummer, 'tp');
      } else {
        console.log(`⏭️ Status al TP voor ${roepnummer}`);
      }
    };

    // Luister naar custom events
    window.addEventListener('unitStatusChanged', handleUnitStatusChanged as EventListener);
    window.addEventListener('unitMovement', handleUnitMovement as EventListener);
    window.addEventListener('unitArrival', handleUnitArrival as EventListener);

    return () => {
      window.removeEventListener('unitStatusChanged', handleUnitStatusChanged as EventListener);
      window.removeEventListener('unitMovement', handleUnitMovement as EventListener);
      window.removeEventListener('unitArrival', handleUnitArrival as EventListener);
    };
  }, [selectedIncident, setUnitStatus]);

  // Automatische status updates bij koppeling incident
  useEffect(() => {
    if (!selectedIncident || !selectedIncident.assignedUnits) {
      return;
    }

    // Check of er nieuwe eenheden zijn gekoppeld (zonder huidige_status)
    const newUnits = selectedIncident.assignedUnits.filter(
      unit => !unit.huidige_status && unit.ov_tijd
    );

    if (newUnits.length > 0) {
      // Nieuwe eenheden krijgen automatisch status 'ov' (Opdracht verstrekt)
      newUnits.forEach(unit => {
        if (!unit.huidige_status) {
          setUnitStatus(unit.roepnummer, 'ov');
        }
      });
    }
  }, [selectedIncident?.assignedUnits?.length, setUnitStatus]);

  // Enhanced shortcode mapping with official LMC codes
  const shortcodeMappings = {
    // Officiële LMC codes
    '-vkweoi': { MC1: 'Verkeer', MC2: 'Wegvervoer', MC3: 'Onder invloed', code: 'vkweoi' },
    '-ogovls': { MC1: 'Ongeval', MC2: 'Overig', MC3: 'Letsel', code: 'ogovls' },
    '-ogwels': { MC1: 'Ongeval', MC2: 'Wegvervoer', MC3: 'Letsel', code: 'ogwels' },
    '-ogspls': { MC1: 'Ongeval', MC2: 'Spoorvervoer', MC3: 'Letsel', code: 'ogspls' },
    '-ogwtls': { MC1: 'Ongeval', MC2: 'Water', MC3: 'Letsel', code: 'ogwtls' },

    // Geweld & Veiligheid codes
    '-steekpartij': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Steekpartij', code: 'vogwst' },
    '-vogwst': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Steekpartij', code: 'vogwst' },
    '-htd': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Heterdaad', code: 'vogwht' },
    '-schietpartij': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Schietpartij', code: 'vogwsi' },
    '-vogwsi': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Schietpartij', code: 'vogwsi' },
    '-mishandeling': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Mishandeling', code: 'vogwmh' },
    '-vechtpartij': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Vechtpartij', code: 'vogwve' },
    '-bedreiging': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Bedreiging', code: 'vogwbd' },
    '-gijzeling': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Gijzeling', code: 'vogwgz' },
    '-ontvoering': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Ontvoering', code: 'vogwon' },

    // Brand codes
    '-brgb01': { MC1: 'Brand', MC2: 'Gebouw', MC3: '01 Woning/Woongebouw', code: 'brgb01' },
    '-brwe': { MC1: 'Brand', MC2: 'Wegvervoer', MC3: '', code: 'brwe' },
    '-brsp': { MC1: 'Brand', MC2: 'Spoorvervoer', MC3: '', code: 'brsp' },
    '-brsh': { MC1: 'Brand', MC2: 'Scheepvaart', MC3: '', code: 'brsh' },
    '-brnt': { MC1: 'Brand', MC2: 'Natuur', MC3: '', code: 'brnt' },
    '-brbt': { MC1: 'Brand', MC2: 'Buiten', MC3: '', code: 'brbt' },

    // Bezitsaantasting codes  
    '-bzibwn': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Woning', code: 'bzibwn' },
    '-bzibbi': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Bedrijf/Instelling', code: 'bzibbi' },
    '-bzibvo': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Voertuig', code: 'bzibvo' },
    '-bzdsbr': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Beroving', code: 'bzdsbr' },
    '-bzdsvo': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Voertuig', code: 'bzdsvo' },
    '-bzdswk': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Winkeldiefstal', code: 'bzdswk' },
    '-bzovbi': { MC1: 'Bezitsaantasting', MC2: 'Overval', MC3: 'Bedrijf/Instelling', code: 'bzovbi' },
    '-bzovwn': { MC1: 'Bezitsaantasting', MC2: 'Overval', MC3: 'Woning', code: 'bzovwn' },

    // Verkeer codes
    '-vkweav': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Achtervolging', code: 'vkweav' },
    '-vkwesr': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Spookrijder', code: 'vkwesr' },
    '-vkweps': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Persoon o/b rijbaan', code: 'vkweps' },
    '-vkwest': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Verkeersstremming', code: 'vkwest' },

    // Gezondheid codes
    '-gzra': { MC1: 'Gezondheid', MC2: 'Reanimatie', MC3: '', code: 'gzra' },
    '-gzpz': { MC1: 'Gezondheid', MC2: 'Poging zelfdoding', MC3: '', code: 'gzpz' },
    '-gzsp': { MC1: 'Gezondheid', MC2: 'Suicidaal persoon', MC3: '', code: 'gzsp' },
    '-gzoz': { MC1: 'Gezondheid', MC2: 'Onwel/Ziekte', MC3: '', code: 'gzoz' },

    // Alarm codes
    '-alraib': { MC1: 'Alarm', MC2: 'RAC alarm', MC3: 'Inbraakalarm', code: 'alraib' },
    '-alraov': { MC1: 'Alarm', MC2: 'RAC alarm', MC3: 'Overvalalarm', code: 'alraov' },
    '-alabab': { MC1: 'Alarm', MC2: 'Autom. brand', MC3: 'Autom. brand OMS', code: 'alabab' },

    // Dienstverlening
    '-dvpoav': { MC1: 'Dienstverlening', MC2: 'Politie', MC3: 'Aantreffen van', code: 'dvpoav' },
    '-dvpovm': { MC1: 'Dienstverlening', MC2: 'Politie', MC3: 'Vermissing', code: 'dvpovm' },

    // Leefmilieu
    '-lmol': { MC1: 'Leefmilieu', MC2: 'Overlast van/door', MC3: '', code: 'lmol' },
    '-lmolje': { MC1: 'Leefmilieu', MC2: 'Overlast van/door', MC3: 'Jeugd', code: 'lmolje' },
    '-lmolps': { MC1: 'Leefmilieu', MC2: 'Overlast van/door', MC3: 'Persoon', code: 'lmolps' },

    // Gemakkelijke synoniemen/alternatieve namen
    '-inbraak': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Woning', code: 'bzibwn' },
    '-woningbrand': { MC1: 'Brand', MC2: 'Gebouw', MC3: '01 Woning/Woongebouw', code: 'brgb01' },
    '-autobrand': { MC1: 'Brand', MC2: 'Wegvervoer', MC3: '', code: 'brwe' },
    '-reanimatie': { MC1: 'Gezondheid', MC2: 'Reanimatie', MC3: '', code: 'gzra' },
    '-ambulance': { MC1: 'Gezondheid', MC2: 'Onwel/Ziekte', MC3: '', code: 'gzoz' },
    '-overval': { MC1: 'Bezitsaantasting', MC2: 'Overval', MC3: 'Bedrijf/Instelling', code: 'bzovbi' },
    '-autodiefstal': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Voertuig', code: 'bzdsvo' },
    '-spookrijder': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Spookrijder', code: 'vkwesr' },
    
    // Snelweg en verkeer gerelateerde shortcuts
    '-a1': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-a2': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-a4': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-a12': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-a13': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-a15': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-a16': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-a20': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' },
    '-snelweg': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: '', code: 'vkwesr' }
  };

  // Function to translate building function from English/Dutch to Dutch
  const translateBuildingFunction = (functionName: string | null | undefined): string => {
    if (!functionName) return '';
    
    const functionLower = functionName.toLowerCase().trim();
    
    // Handle shop_ prefix (e.g., shop_supermarket -> Supermarkt)
    if (functionLower.startsWith('shop_')) {
      const shopType = functionLower.substring(5);
      const shopTranslations: Record<string, string> = {
        'supermarket': 'Supermarkt',
        'convenience': 'Buurtwinkel',
        'bakery': 'Bakkerij',
        'butcher': 'Slagerij',
        'clothes': 'Kledingwinkel',
        'shoes': 'Schoenwinkel',
        'jewelry': 'Juwelier',
        'pharmacy': 'Apotheek',
        'florist': 'Bloemenwinkel',
        'bookstore': 'Boekwinkel',
        'electronics': 'Electronica winkel',
        'department_store': 'Warenhuis',
        'mall': 'Winkelcentrum',
        'alcohol': 'Slijterij',
        'beverages': 'Drankenwinkel',
        'car_repair': 'Autowerkplaats',
        'car': 'Autobedrijf',
        'fuel': 'Tankstation',
        'hardware': 'Gereedschapswinkel',
        'furniture': 'Meubelwinkel'
      };
      
      if (shopTranslations[shopType]) {
        return shopTranslations[shopType];
      }
      // If specific shop type not found, return "Winkel"
      return 'Winkel';
    }
    
    // Handle office_ prefix (e.g., office_government -> Overheidskantoor)
    if (functionLower.startsWith('office_')) {
      const officeType = functionLower.substring(7);
      const officeTranslations: Record<string, string> = {
        'government': 'Overheidskantoor',
        'company': 'Kantoor',
        'estate_agent': 'Makelaarskantoor',
        'lawyer': 'Advocatenkantoor',
        'accountant': 'Accountantskantoor',
        'insurance': 'Verzekeringskantoor',
        'tax_advisor': 'Belastingadvieskantoor',
        'financial': 'Financieel kantoor'
      };
      
      if (officeTranslations[officeType]) {
        return officeTranslations[officeType];
      }
      return 'Kantoor';
    }
    
    // Translation mapping for common building functions
    const translations: Record<string, string> = {
      // BAG gebruiksfunctie translations
      'woonfunctie': 'Woning',
      'bijeenkomstfunctie': 'Bijeenkomstgebouw',
      'celfunctie': 'Cellencomplex',
      'gezondheidszorgfunctie': 'Zorginstelling',
      'industriefunctie': 'Industriegebouw',
      'kantoorfunctie': 'Kantoorgebouw',
      'logiesfunctie': 'Hotel/Logies',
      'onderwijsfunctie': 'Onderwijsinstelling',
      'sportfunctie': 'Sportaccommodatie',
      'winkelfunctie': 'Winkel',
      'overige gebruiksfunctie': 'Overig gebouw',
      
      // OSM amenity translations
      'hospital': 'Ziekenhuis',
      'school': 'School',
      'university': 'Universiteit',
      'college': 'Hogeschool',
      'kindergarten': 'Kleuterschool',
      'library': 'Bibliotheek',
      'police': 'Politiebureau',
      'fire_station': 'Brandweerkazerne',
      'post_office': 'Postkantoor',
      'bank': 'Bank',
      'atm': 'Geldautomaat',
      'restaurant': 'Restaurant',
      'cafe': 'Café',
      'fast_food': 'Fastfood',
      'bar': 'Café',
      'pub': 'Café',
      'pharmacy': 'Apotheek',
      'doctor': 'Huisartspraktijk',
      'dentist': 'Tandartspraktijk',
      'veterinary': 'Dierenartspraktijk',
      'fuel': 'Tankstation',
      'parking': 'Parkeerplaats',
      'cinema': 'Bioscoop',
      'theatre': 'Theater',
      'museum': 'Museum',
      'gallery': 'Galerij',
      'community_centre': 'Buurtcentrum',
      'townhall': 'Gemeentehuis',
      'courthouse': 'Rechtbank',
      'place_of_worship': 'Gebedshuis',
      'church': 'Kerk',
      'mosque': 'Moskee',
      'synagogue': 'Synagoge',
      'temple': 'Tempel',
      'marketplace': 'Markt',
      'supermarket': 'Supermarkt',
      'convenience': 'Buurtwinkel',
      'shop': 'Winkel',
      
      // OSM building/office types
      'office': 'Kantoor',
      'commercial': 'Commercieel gebouw',
      'retail': 'Winkel',
      'industrial': 'Industrie',
      'warehouse': 'Magazijn',
      'garage': 'Garage',
      'hangar': 'Hangaar',
      'train_station': 'Treinstation',
      'bus_station': 'Busstation',
      'airport': 'Luchthaven',
      'sports_centre': 'Sportcentrum',
      'stadium': 'Stadion',
      'swimming_pool': 'Zwembad',
      'hotel': 'Hotel',
      'hostel': 'Hostel',
      'apartment': 'Appartement',
      'house': 'Woning',
      'residential': 'Woning',
      'farm': 'Boerderij',
      'barn': 'Schuur',
      'greenhouse': 'Kas',
      'bunker': 'Bunker'
    };
    
    // Direct match
    if (translations[functionLower]) {
      return translations[functionLower];
    }
    
    // Partial match (contains)
    for (const [key, translation] of Object.entries(translations)) {
      if (functionLower.includes(key) || key.includes(functionLower)) {
        return translation;
      }
    }
    
    // If no translation found, capitalize first letter and return as-is
    return functionName.charAt(0).toUpperCase() + functionName.slice(1).toLowerCase();
  };

  // Function to get building function from coordinates using reverse geocoding
  const getBuildingFunctionFromCoordinates = async (coordinates: [number, number]): Promise<string> => {
    if (!coordinates || coordinates.length !== 2) return '';
    
    try {
      const [lng, lat] = coordinates;
      
      // Try OSM reverse geocoding first (usually faster and more detailed)
      try {
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const osmResponse = await fetch(osmUrl);
        
        if (osmResponse.ok) {
          const osmData = await osmResponse.json();
          
          // Check for amenity (most common for public buildings)
          if (osmData.amenity) {
            return translateBuildingFunction(osmData.amenity);
          }
          
          // Check for building type
          if (osmData.building) {
            return translateBuildingFunction(osmData.building);
          }
          
          // Check for shop
          if (osmData.shop) {
            return translateBuildingFunction(`shop_${osmData.shop}`);
          }
          
          // Check for office
          if (osmData.office) {
            return translateBuildingFunction(`office_${osmData.office}`);
          }
          
          // Check for tourism
          if (osmData.tourism) {
            return translateBuildingFunction(osmData.tourism);
          }
          
          // Check for leisure
          if (osmData.leisure) {
            return translateBuildingFunction(osmData.leisure);
          }
        }
      } catch (osmError) {
        console.log('OSM reverse geocoding not available:', osmError);
      }
      
      // Try BAG API for gebruiksfunctie
      try {
        const bagUrl = `/api/bag/search?q=${lat},${lng}&limit=1`;
        const bagResponse = await fetch(bagUrl);
        
        if (bagResponse.ok) {
          const bagData = await bagResponse.json();
          if (bagData.features && bagData.features.length > 0) {
            const feature = bagData.features[0];
            // BAG properties might have gebruiksdoel or gebruiksfunctie
            if (feature.properties?.gebruiksdoel) {
              return translateBuildingFunction(feature.properties.gebruiksdoel);
            }
            if (feature.properties?.gebruiksfunctie) {
              return translateBuildingFunction(feature.properties.gebruiksfunctie);
            }
          }
        }
      } catch (bagError) {
        console.log('BAG API not available:', bagError);
      }
      
    } catch (error) {
      console.error('Error getting building function:', error);
    }
    
    return '';
  };

  // PDOK Locatieserver API functions with RWS highway integration
  const searchBAGAddress = async (query: string) => {
    try {
      console.log(`🔍 searchBAGAddress called with query: "${query}"`);
      const results = [];
      
      // First try RWS highway search if query contains highway patterns
      const highwayPattern = /\b(A\d+|N\d+)\b/i;
      if (highwayPattern.test(query)) {
        console.log(`🛣️ Detected highway pattern in query: "${query}"`);
        const rwsResults = await searchRWSHighways(query);
        if (rwsResults.length > 0) {
          results.push(...rwsResults);
          console.log(`🛣️ Found ${rwsResults.length} RWS highway results`);
        }
      }
      
      // Then search BAG for regular addresses
      const encodedQuery = encodeURIComponent(query);
      const apiUrl = `/api/bag/search?q=${encodedQuery}&limit=20`;
      console.log(`📡 Fetching BAG API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      console.log(`📡 BAG API Response status: ${response.status}`);
      
      const data = await response.json();
      console.log(`📡 BAG API Data received:`, data);

      if (data.features && data.features.length > 0) {
        console.log(`📍 Processing ${data.features.length} BAG features...`);
        
        const bagResults = data.features.map((feature: any, index: number) => {
          const coords = feature.properties.coordinates;
          console.log(`  [${index}] ${feature.properties.weergavenaam}`, {
            hasCoordinates: !!coords,
            coordinates: coords,
            isArray: Array.isArray(coords),
            length: coords?.length
          });
          
          // Extract building function if available
          const gebruiksfunctie = feature.properties?.gebruiksfunctie || 
                                   feature.properties?.gebruiksdoel || 
                                   feature.properties?.type?.gebruiksfunctie || 
                                   '';
          
          return {
            id: feature.properties.id || '',
            weergavenaam: feature.properties.weergavenaam || '',
            straatnaam: feature.properties.straatnaam || '',
            huisnummer: feature.properties.huisnummer || '',
            huisletter: feature.properties.huisletter || '',
            huisnummertoevoeging: feature.properties.huisnummertoevoeging || '',
            postcode: feature.properties.postcode || '',
            plaatsnaam: feature.properties.plaatsnaam || '',
            gemeente: feature.properties.gemeentenaam || '',
            provincie: feature.properties.provincienaam || '',
            coordinates: coords,
            score: feature.properties.score || 0,
            volledigAdres: feature.properties.weergavenaam || 
              `${feature.properties.straatnaam || ''} ${feature.properties.huisnummer || ''}${feature.properties.huisletter || ''}${feature.properties.huisnummertoevoeging ? '-' + feature.properties.huisnummertoevoeging : ''}, ${feature.properties.postcode || ''} ${feature.properties.plaatsnaam || ''}`,
            wegType: 'address',
            gebruiksfunctie: gebruiksfunctie,
            functie: gebruiksfunctie ? translateBuildingFunction(gebruiksfunctie) : ''
          };
        });
        
        results.push(...bagResults);
        console.log(`✅ Found ${bagResults.length} BAG address results`);
        console.log(`✅ First result coordinates:`, bagResults[0]?.coordinates);
      }
      
      // Sort results: highways first, then by score
      return results.sort((a, b) => {
        if (a.wegType === 'highway' && b.wegType !== 'highway') return -1;
        if (b.wegType === 'highway' && a.wegType !== 'highway') return 1;
        return (b.score || 0) - (a.score || 0);
      });
      
    } catch (error) {
      console.error('Combined search error:', error);
      return [];
    }
  };

  // OSM Objects search function
  const searchOSMObjects = async (query: string) => {
    try {
      console.log(`🏢 Searching OSM objects for: "${query}"`);
      
      const encodedQuery = encodeURIComponent(query);
      const apiUrl = `/api/osm/search?q=${encodedQuery}&limit=20`;
      console.log(`📡 Fetching OSM API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      console.log(`📡 OSM API Response status: ${response.status}`);
      
      const data = await response.json();
      console.log(`📡 OSM API Data received:`, data);

      if (data.features && data.features.length > 0) {
        console.log(`🏢 Processing ${data.features.length} OSM object features...`);
        
        const osmResults = data.features.map((feature: any, index: number) => {
          const coords = feature.coordinates;
          console.log(`  [${index}] ${feature.weergavenaam}`, {
            hasCoordinates: !!coords,
            coordinates: coords,
            amenity: feature.amenity,
            type: feature.type
          });
          
          // Extract function from OSM data (prioritize amenity, then category, then class)
          let osmFunctie = feature.amenity || feature.category || feature.class || feature.type || '';
          if (feature.office) osmFunctie = `office_${feature.office}`;
          if (feature.shop) osmFunctie = `shop_${feature.shop}`;
          if (feature.tourism) osmFunctie = feature.tourism;
          if (feature.leisure) osmFunctie = feature.leisure;
          
          return {
            id: feature.id || '',
            weergavenaam: feature.weergavenaam || '',
            naam: feature.naam || '',
            straatnaam: feature.straatnaam || '',
            huisnummer: feature.huisnummer || '',
            huisletter: '',
            huisnummertoevoeging: '',
            postcode: feature.postcode || '',
            plaatsnaam: feature.plaatsnaam || '',
            gemeente: feature.gemeente || '',
            provincie: feature.provincie || '',
            coordinates: coords,
            score: feature.score || 0,
            volledigAdres: feature.volledigAdres || feature.weergavenaam,
            wegType: 'object',
            amenity: feature.amenity || '',
            category: feature.category || '',
            osm_type: feature.osm_type || '',
            osm_id: feature.osm_id || '',
            class: feature.class || '',
            extratags: feature.extratags || {},
            functie: osmFunctie ? translateBuildingFunction(osmFunctie) : (feature.naam || '')
          };
        });
        
        console.log(`✅ Found ${osmResults.length} OSM object results`);
        return osmResults;
      }
      
      return [];
      
    } catch (error) {
      console.error('OSM search error:', error);
      return [];
    }
  };

  // PDOK Hydrografie – Netwerk: zoek waternetwerk nabij coördinaten
  const searchHydrografieNear = async (lat: number, lng: number, radiusMeters: number = 1500) => {
    try {
      // Benadering: 1° lat ~ 111.32 km; 1° lon ~ 111.32 km * cos(lat)
      const dLat = radiusMeters / 111320; // meters -> graden
      const dLng = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

      const minLng = lng - dLng;
      const minLat = lat - dLat;
      const maxLng = lng + dLng;
      const maxLat = lat + dLat;
      const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;

      // Probeer meerdere mogelijke typeNames voor PDOK HY Netwerk
      const candidateTypes = ['hy:Network', 'hy:HydroLink', 'hy:HydroNode', 'hy:HydroGraphicNetwork'];
      let data: any = null;
      let usedType = '';
      let lastError: string = '';
      for (const t of candidateTypes) {
        const url = `/api/pdok/hydrografie/features?typeNames=${encodeURIComponent(t)}&bbox=${encodeURIComponent(bbox)}&srsName=EPSG:4326&count=500`;
        console.log(`🌊 Hydrografie search URL: ${url}`);
        try {
          const response = await fetch(url);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            console.warn(`Hydrografie WFS ${t} response not ok:`, response.status, errorData);
            lastError = errorData.error || errorData.details || `HTTP ${response.status}`;
            continue;
          }
          const json = await response.json();
          if (json?.features?.length) {
            data = json;
            usedType = t;
            break;
          } else if (json?.features && json.features.length === 0) {
            // Empty result but valid response
            console.log(`🌊 ${t} returned empty result`);
          }
        } catch (err: any) {
          console.error(`Error fetching ${t}:`, err);
          lastError = err.message || String(err);
        }
      }
      
      if (!data && lastError) {
        console.error(`🌊 All hydrografie typeNames failed. Last error: ${lastError}`);
      }

      if (!data || !data.features || data.features.length === 0) {
        return [] as any[];
      }

      // Map features naar generieke resultaten voor locatietreffers
      const results = data.features.slice(0, 50).map((feature: any, index: number) => {
        const geom = feature.geometry;
        let reprCoords: [number, number] | null = null;
        if (geom?.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
          // Pak middenpunt van de lijn benaderend
          const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
          reprCoords = [mid[0], mid[1]]; // [lng, lat]
        } else if (geom?.type === 'MultiLineString' && Array.isArray(geom.coordinates) && geom.coordinates[0]?.length > 0) {
          const first = geom.coordinates[0];
          const mid = first[Math.floor(first.length / 2)] || first[0];
          reprCoords = [mid[0], mid[1]];
        }

        const name = feature.properties?.naam || feature.properties?.label || feature.id || `Watersegment ${index + 1}`;

        return {
          id: feature.id || `${Date.now()}-${index}`,
          weergavenaam: name,
          naam: name,
          coordinates: reprCoords,
          wegType: 'hydro',
          source: `PDOK Hydrografie – Netwerk (${usedType})`,
          volledigAdres: name
        };
      });

      return results;
    } catch (error) {
      console.error('Hydrografie search error:', error);
      return [] as any[];
    }
  };

  // PDOK NWB Wegen WFS: zoek wegvakken nabij coördinaten
  const searchNwbWegenNear = async (lat: number, lng: number, radiusMeters: number = 1500, typeNames: string = 'nwb:Wegvakken', filter?: string) => {
    try {
      const dLat = radiusMeters / 111320;
      const dLng = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

      const minLng = lng - dLng;
      const minLat = lat - dLat;
      const maxLng = lng + dLng;
      const maxLat = lat + dLat;
      const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;

      const params = new URLSearchParams({
        typeNames,
        bbox,
        srsName: 'EPSG:4326',
        count: '500',
      });
      if (filter) params.set('filter', filter);
      const url = `/api/pdok/nwb-wegen/features?${params.toString()}`;
      console.log(`🛣️ NWB Wegen search URL: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.warn(`NWB Wegen WFS response not ok:`, response.status, errorData);
        return [] as any[];
      }

      const json = await response.json();
      if (!json?.features?.length) return [] as any[];

      // Map features naar generieke locatietreffers
      const results = json.features.slice(0, 50).map((feature: any, index: number) => {
        const geom = feature.geometry;
        let reprCoords: [number, number] | null = null;
        if (geom?.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
          const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
          reprCoords = [mid[0], mid[1]];
        } else if (geom?.type === 'MultiLineString' && Array.isArray(geom.coordinates) && geom.coordinates[0]?.length > 0) {
          const first = geom.coordinates[0];
          const mid = first[Math.floor(first.length / 2)] || first[0];
          reprCoords = [mid[0], mid[1]];
        }

        const p = feature.properties || {};
        const wegNummer = p.WEGNUMMER || p.wegNummer || p.wegnummer || p.WGK_NAAM || p.naam || 'Wegsegment';
        const name = `${wegNummer}`;

        return {
          id: feature.id || `${Date.now()}-${index}`,
          weergavenaam: name,
          naam: name,
          coordinates: reprCoords,
          wegType: 'highway',
          source: 'PDOK NWB Wegen – Wegvakken',
          volledigAdres: name
        };
      });

      return results;
    } catch (error) {
      console.error('NWB Wegen search error:', error);
      return [] as any[];
    }
  };

  // RWS NWB Highway search functions with hectometer support
  const searchRWSHighways = async (query: string) => {
    try {
      const encodedQuery = encodeURIComponent(query);
      console.log(`🛣️ Searching RWS highways for: "${query}"`);
      
      // Check if query contains highway pattern with possible hectometer (A1 125, A20 17.1, A20 17,1, etc.)
      const highwayHectoMatch = query.match(/\b(A\d+|N\d+)(?:\s+(\d+(?:[\.,]\d+)?))?\b/i);
      
      if (highwayHectoMatch) {
        const highway = highwayHectoMatch[1].toUpperCase();
        const hectometerRaw = highwayHectoMatch[2];
        const hectometer = hectometerRaw ? hectometerRaw.replace(',', '.') : undefined;
        
        // Try to get road infrastructure data
        const response = await fetch(`/api/rws/infrastructure?roadName=${highway}&includeHectometers=true&includeJunctions=true&limit=50`);
        
        if (response.ok) {
          const data = await response.json();
          const results = [];
          
          // Add highway segments
          if (data.highways?.features?.length > 0) {
            results.push(...data.highways.features.slice(0, 5).map((feature: any) => ({
              id: feature.properties?.id || '',
              weergavenaam: `${highway} (Snelweg)`,
              straatnaam: highway,
              huisnummer: '',
              huisletter: '',
              huisnummertoevoeging: '',
              postcode: '',
              plaatsnaam: 'Nederland',
              gemeente: 'Rijkswegen',
              provincie: 'Nederland',
              coordinates: feature.geometry?.coordinates?.[0] || null,
              score: 1.0,
              volledigAdres: `${highway} (Rijksweg)`,
              wegType: 'highway',
              hectometer: feature.properties?.hectometrering
            })));
          }
          
          // Add specific hectometer if requested
          if (hectometer && data.hectometers?.features?.length > 0) {
            const matchingHectometer = data.hectometers.features.find((feature: any) => {
              const featureHecto = feature.properties?.AFSTAND || feature.properties?.KM_AFSTAND;
              const featureVal = featureHecto ? parseFloat(String(featureHecto).toString().replace(',', '.')) : undefined;
              const targetVal = parseFloat(hectometer);
              return featureVal !== undefined && !Number.isNaN(targetVal) && Math.abs(featureVal - targetVal) < 0.5;
            });
            
            if (matchingHectometer) {
              results.unshift({
                id: matchingHectometer.properties?.id || '',
                weergavenaam: `${highway} hectometer ${hectometer}`,
                straatnaam: highway,
                huisnummer: hectometer,
                huisletter: '',
                huisnummertoevoeging: '',
                postcode: '',
                plaatsnaam: 'Nederland',
                gemeente: 'Rijkswegen',
                provincie: 'Nederland',
                coordinates: matchingHectometer.geometry?.coordinates || null,
                score: 1.5,
                volledigAdres: `${highway} hectometer ${hectometer} (Rijksweg)`,
                wegType: 'hectometer',
                markerType: 'hectometerpaaltje'
              });
            }
          }
          
          // Add nearby junctions
          if (data.junctions?.features?.length > 0) {
            results.push(...data.junctions.features.slice(0, 3).map((feature: any) => ({
              id: feature.properties?.id || '',
              weergavenaam: `${feature.properties?.label || 'Knooppunt'} (${highway})`,
              straatnaam: highway,
              huisnummer: '',
              huisletter: '',
              huisnummertoevoeging: '',
              postcode: '',
              plaatsnaam: 'Nederland',
              gemeente: 'Rijkswegen',
              provincie: 'Nederland',
              coordinates: feature.geometry?.coordinates || null,
              score: 0.9,
              volledigAdres: `${feature.properties?.label || 'Knooppunt'} (${highway})`,
              wegType: 'junction',
              markerType: 'knooppunt'
            })));
          }
          
          if (results.length > 0) {
            return results;
          }
        }
      }
      
      // Fallback: search all highways
      const response = await fetch(`/api/rws/highways?limit=50`);
      if (response.ok) {
        const data = await response.json();
        
        const filtered = data.features.filter((feature: any) => 
          feature.properties?.wegNummer?.toLowerCase().includes(query.toLowerCase())
        );
        
        return filtered.slice(0, 10).map((feature: any) => ({
          id: feature.properties?.id || '',
          weergavenaam: `${feature.properties?.wegNummer || 'Onbekende weg'} (Snelweg)`,
          straatnaam: feature.properties?.wegNummer || 'Onbekende weg',
          huisnummer: '',
          huisletter: '',
          huisnummertoevoeging: '',
          postcode: '',
          plaatsnaam: 'Nederland',
          gemeente: 'Rijkswegen',
          provincie: 'Nederland',
          coordinates: feature.geometry?.coordinates?.[0] || null,
          score: 0.8,
          volledigAdres: `${feature.properties?.wegNummer || 'Onbekende weg'} (Rijksweg)`,
          wegType: 'highway',
          hectometer: feature.properties?.hectometrering
        }));
      }
      
      return [];
    } catch (error) {
      console.error('RWS NWB highway search error:', error);
      return [];
    }
  };

  const searchRoadsByLocation = async (lat: number, lng: number, radius: number = 1000) => {
    try {
      console.log(`🛣️ Searching roads near ${lat}, ${lng} within ${radius}m`);
      
      const response = await fetch(`/api/rws/roads/near?lat=${lat}&lon=${lng}&radius=${radius}&roadType=highway`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          return data.features.map((feature: any) => ({
            id: feature.properties?.identificatie || '',
            weergavenaam: `${feature.properties?.eigenschappen?.WGK_NAAM || 'Onbekende weg'} (Nabij locatie)`,
            straatnaam: feature.properties?.eigenschappen?.WGK_NAAM || 'Onbekende weg',
            huisnummer: '',
            plaatsnaam: 'Nederland',
            gemeente: 'Rijkswegen',
            coordinates: feature.geometry?.coordinates?.[0] || null,
            score: 0.9,
            volledigAdres: `${feature.properties?.eigenschappen?.WGK_NAAM || 'Onbekende weg'} (Rijksweg nabij locatie)`,
            wegType: 'highway'
          }));
        }
      }
      
      return [];
    } catch (error) {
      console.error('RWS roads near location error:', error);
      return [];
    }
  };

  // Enhanced PDOK Locatieserver search for specific address parts
  // Function to get detailed location information from BAG and OSM
  const getDetailedLocationInfo = async (coordinates: [number, number]) => {
    try {
      const [lng, lat] = coordinates;
      
      // Get BAG information for the coordinates
      const bagUrl = `https://api.pdok.nl/bag/v2/nummeraanduiding?geometrie=contains&geometrie=${encodeURIComponent(`POINT(${lng} ${lat})`)}&format=json`;
      
      let bagInfo = null;
      try {
        const bagResponse = await fetch(bagUrl);
        if (bagResponse.ok) {
          const bagData = await bagResponse.json();
          if (bagData.results && bagData.results.length > 0) {
            bagInfo = bagData.results[0];
          }
        }
      } catch (error) {
        console.log('BAG API not available or no results');
      }

      // Get OSM information for the coordinates (reverse geocoding)
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      
      let osmInfo = null;
      try {
        const osmResponse = await fetch(osmUrl);
        if (osmResponse.ok) {
          osmInfo = await osmResponse.json();
        }
      } catch (error) {
        console.log('OSM API not available');
      }

      // Combine information
      const locationInfo = {
        coordinates: { lat, lng },
        bag: bagInfo,
        osm: osmInfo,
        timestamp: new Date().toISOString()
      };

      return locationInfo;
    } catch (error) {
      console.error('Error fetching location details:', error);
      return null;
    }
  };

  const searchBAGSpecific = async (stad: string, straat: string, huisnummer: string = '') => {
    try {
      let query: string;
      let encodedQuery: string;
      let response: Response;
      let data: any;

      if (huisnummer) {
        // Try exact match with house number first
        query = `${straat} ${huisnummer} ${stad}`;
        encodedQuery = encodeURIComponent(query);
        response = await fetch(`/api/bag/search?q=${encodedQuery}&limit=5`);
        data = await response.json();

        if (data.features && data.features.length > 0) {
          return data.features.map((feature: any) => {
            const gebruiksfunctie = feature.properties?.gebruiksfunctie || 
                                     feature.properties?.gebruiksdoel || 
                                     feature.properties?.type?.gebruiksfunctie || 
                                     '';
            return {
              id: feature.properties.id || '',
              weergavenaam: feature.properties.weergavenaam || '',
              straatnaam: feature.properties.straatnaam || '',
              huisnummer: feature.properties.huisnummer || '',
              huisletter: feature.properties.huisletter || '',
              huisnummertoevoeging: feature.properties.huisnummertoevoeging || '',
              postcode: feature.properties.postcode || '',
              plaatsnaam: feature.properties.plaatsnaam || '',
              gemeente: feature.properties.gemeentenaam || '',
              provincie: feature.properties.provincienaam || '',
              coordinates: feature.properties.coordinates || null,
              score: feature.properties.score || 0,
              volledigAdres: feature.properties.weergavenaam || 
                `${feature.properties.straatnaam || ''} ${feature.properties.huisnummer || ''}${feature.properties.huisletter || ''}${feature.properties.huisnummertoevoeging ? '-' + feature.properties.huisnummertoevoeging : ''}, ${feature.properties.postcode || ''} ${feature.properties.plaatsnaam || ''}`,
              gebruiksfunctie: gebruiksfunctie,
              functie: gebruiksfunctie ? translateBuildingFunction(gebruiksfunctie) : ''
            };
          });
        }
      }

      // Try broader search (street + city, with or without house number filter)
      query = `${straat} ${stad}`;
      encodedQuery = encodeURIComponent(query);
      response = await fetch(`/api/bag/search?q=${encodedQuery}&limit=10`);
      data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features
          .filter((feature: any) => !huisnummer || feature.properties.huisnummer == huisnummer)
          .map((feature: any) => {
            const gebruiksfunctie = feature.properties?.gebruiksfunctie || 
                                     feature.properties?.gebruiksdoel || 
                                     feature.properties?.type?.gebruiksfunctie || 
                                     '';
            return {
              id: feature.properties.id || '',
              weergavenaam: feature.properties.weergavenaam || '',
              straatnaam: feature.properties.straatnaam || '',
              huisnummer: feature.properties.huisnummer || '',
              huisletter: feature.properties.huisletter || '',
              huisnummertoevoeging: feature.properties.huisnummertoevoeging || '',
              postcode: feature.properties.postcode || '',
              plaatsnaam: feature.properties.plaatsnaam || '',
              gemeente: feature.properties.gemeentenaam || '',
              provincie: feature.properties.provincienaam || '',
              coordinates: feature.properties.coordinates || null,
              score: feature.properties.score || 0,
              volledigAdres: feature.properties.weergavenaam || 
                `${feature.properties.straatnaam || ''} ${feature.properties.huisnummer || ''}${feature.properties.huisletter || ''}${feature.properties.huisnummertoevoeging ? '-' + feature.properties.huisnummertoevoeging : ''}, ${feature.properties.postcode || ''} ${feature.properties.plaatsnaam || ''}`,
              gebruiksfunctie: gebruiksfunctie,
              functie: gebruiksfunctie ? translateBuildingFunction(gebruiksfunctie) : ''
            };
          });
      }

      return [];
    } catch (error) {
      console.error('PDOK Locatieserver Error:', error);
      return [];
    }
  };

  const fillAddressFromBAG = async (stad: string, straatnaam: string, huisnummer: string) => {
    console.log(`🔍 Zoeken naar adres: ${straatnaam} ${huisnummer}, ${stad}`);

    const results = await searchBAGSpecific(stad, straatnaam, huisnummer);

    if (results.length > 0) {
      const bestMatch = results[0];

      // Combine number and additions properly
      const fullHuisnummer = `${bestMatch.huisnummer}${bestMatch.huisletter || ''}${bestMatch.huisnummertoevoeging ? '-' + bestMatch.huisnummertoevoeging : ''}`;

      // Get building function - first try from result, then from coordinates
      let buildingFunctie = bestMatch.functie || '';
      
      // If no function in result but coordinates available, fetch it
      if (!buildingFunctie && bestMatch.coordinates && Array.isArray(bestMatch.coordinates) && bestMatch.coordinates.length === 2) {
        console.log(`🏢 Ophalen gebouwfunctie van coördinaten...`);
        buildingFunctie = await getBuildingFunctionFromCoordinates(bestMatch.coordinates as [number, number]);
        if (buildingFunctie) {
          console.log(`✅ Gebouwfunctie opgehaald: ${buildingFunctie}`);
        }
      }

      const completeAddressData = {
        straatnaam: bestMatch.straatnaam,
        huisnummer: fullHuisnummer,
        postcode: bestMatch.postcode,
        plaatsnaam: bestMatch.plaatsnaam,
        gemeente: bestMatch.gemeente,
        coordinates: bestMatch.coordinates,
        object: '', // BAG addresses don't have object names, only functions
        functie: buildingFunctie || ''
      };

      console.log(`✅ Adres gevonden via PDOK Locatieserver:`, completeAddressData);
      console.log(`📊 Match score: ${bestMatch.score}, Coördinaten: ${bestMatch.coordinates ? bestMatch.coordinates.join(', ') : 'Niet beschikbaar'}`);
      console.log(`🏢 Gebouwfunctie: ${buildingFunctie}`);

      setFormData(prev => ({
        ...prev,
        ...completeAddressData
      }));

      if (selectedIncident) {
        setSelectedIncident({
          ...selectedIncident,
          ...completeAddressData
        });
      }

      // Enhanced logging with coordinates and function
      if (bestMatch.coordinates) {
        console.log(`📍 Coördinaten opgeslagen via fillAddressFromBAG: [${bestMatch.coordinates[0]}, ${bestMatch.coordinates[1]}]`);
        if (buildingFunctie) {
          addSystemLoggingEntry(`📍 Adres automatisch aangevuld via PDOK Locatieserver: ${bestMatch.volledigAdres} (${bestMatch.coordinates[0].toFixed(4)}, ${bestMatch.coordinates[1].toFixed(4)}) - ${buildingFunctie}`);
        } else {
          addSystemLoggingEntry(`📍 Adres automatisch aangevuld via PDOK Locatieserver: ${bestMatch.volledigAdres} (${bestMatch.coordinates[0].toFixed(4)}, ${bestMatch.coordinates[1].toFixed(4)})`);
        }
      } else {
        addSystemLoggingEntry(`📍 Adres automatisch aangevuld via PDOK Locatieserver: ${bestMatch.volledigAdres} (score: ${bestMatch.score})`);
      }

      // Switch to Locatietreffers tab and clear search
      setActiveLoggingTab('locatietreffers');
      setBagSearchQuery("");
      setBagSearchResults([]);

      return completeAddressData;
    } else {
      console.log(`❌ Geen adres gevonden voor: ${straatnaam} ${huisnummer}, ${stad}`);
      addSystemLoggingEntry(`❌ Geen adres gevonden in PDOK Locatieserver voor: ${straatnaam} ${huisnummer}, ${stad}`);
      return null;
    }
  };

  // Function to process karakteristieken from kladblok text
  const processKarakteristieken = (text: string) => {
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1].trim();

    console.log(`🏷️ Processing karakteristieken for: "${lastLine}"`);

    // Check if karakteristieken database is loaded
    if (!Array.isArray(karakteristiekenDatabase) || karakteristiekenDatabase.length === 0) {
      console.warn('⚠️ Karakteristieken database not loaded yet');
      return false;
    }

    // Check if line contains karakteristieken codes (starts with -)
    if (!lastLine.startsWith('-')) {
      return false;
    }

    // GEEN woordlimiet meer - karakteristieken kunnen ook meerdere woorden hebben
    // Bijvoorbeeld: "-inzet brw off van dienst"
    // De volgorde van verwerking (eerst classificaties, dan karakteristieken) voorkomt verkeerde matches

    // Improved parsing - handle "-code value" patterns
    const codePattern = /-(\w+)(?:\s+(.+?))?(?=\s+-|\s*$)/g;
    let processed = false;
    let match;

    while ((match = codePattern.exec(lastLine)) !== null) {
      const code = match[1];
      const value = match[2] ? match[2].trim() : '';

      console.log(`🔍 Parsing karakteristiek: code="${code}", value="${value}"`);
      processed = processKarakteristiekCode(code, value) || processed;
    }

    // Fallback: if no matches with regex, try simple space-based parsing
    if (!processed) {
      const parts = lastLine.split(/\s+/).map(part => part.trim()).filter(part => part.length > 0);
      let currentCode = '';
      let currentValue = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part.startsWith('-')) {
          // Process previous code if exists
          if (currentCode) {
            processed = processKarakteristiekCode(currentCode, currentValue) || processed;
          }

          // Start new code
          currentCode = part.substring(1); // Remove the -
          currentValue = '';
        } else if (currentCode) {
          // Add to current value
          currentValue = currentValue ? `${currentValue} ${part}` : part;
        }
      }

      // Process the last code
      if (currentCode) {
        processed = processKarakteristiekCode(currentCode, currentValue) || processed;
      }
    }

    return processed;
  };

  // Common abbreviations mapping for better shortcode detection
  const commonAbbreviations: Record<string, string[]> = {
      'pol': ['politie', 'police'],
      'brw': ['brandweer', 'brand'],
      'ambu': ['ambulance', 'ambu'],
      'gew': ['gewonden', 'gewond'],
      'dd': ['doden', 'dood'],
      'pers': ['personen', 'persoon'],
      'ovdp': ['overval', 'diefstal', 'poging'],
      'betr': ['betreft'],
      'opgelp': ['opgelost', 'oplosing'],
      'vtgs': ['vracht', 'tank', 'gevaarlijke stof'],
      'ddrs': ['daders', 'dader'],
      'nzrz': ['niet zelfredding', 'zelfreddend'],
      'iobj': ['in object', 'object'],
      'tewt': ['te water', 'water'],
      'verm': ['vermist', 'vermissing'],
      'aanh': ['aanhouding', 'aanhouden']
    };

    function processKarakteristiekCode(code: string, value: string) {
    console.log(`🔍 Looking for karakteristiek with code: "${code}", value: "${value}"`);

    const fullInput = `${code} ${value}`.toLowerCase().trim();
    console.log(`🔍 Full input: "${fullInput}"`);

    let foundKarakteristiek = null;
    let finalValue = value;

    // Step 1: Try parser-based exact matching first (highest priority)
    foundKarakteristiek = karakteristiekenDatabase.find(k => {
      if (!k.ktParser) return false;
      const parser = k.ktParser.toLowerCase().trim();
      const searchInput = `-${fullInput}`.toLowerCase().trim();
      console.log(`🔍 Comparing parser "${parser}" with input "${searchInput}"`);
      return parser === searchInput;
    });

    if (foundKarakteristiek) {
      console.log(`✅ Found exact parser match: "${foundKarakteristiek.ktNaam}" via parser "${foundKarakteristiek.ktParser}"`);
      finalValue = foundKarakteristiek.ktWaarde || value;
    }

    // Step 1b: Partial matching voor karakteristieken (bijv. "-auto" matcht "personenauto")
    // Dit is nodig omdat gebruikers vaak korte termen gebruiken, maar we moeten mis-matches voorkomen
    if (!foundKarakteristiek) {
      const partialMatches = karakteristiekenDatabase.filter(k => {
        if (!k.ktParser && !k.ktNaam) return false;
        
        const parser = (k.ktParser || '').toLowerCase().trim().replace(/^-/, ''); // Verwijder leading '-'
        const naam = (k.ktNaam || '').toLowerCase().trim();
        const searchInput = fullInput.toLowerCase().trim();
        
        // Minimum lengte check: zoekterm moet minimaal 3 karakters zijn
        if (searchInput.length < 3) return false;
        
        // Check 1: Exacte substring match (bijv. "auto" in "personenauto" of "inzet brw off van dienst" in parser/naam)
        // Dit is de meest betrouwbare match
        const parserExactSubstring = parser && parser.includes(searchInput);
        const naamExactSubstring = naam && naam.includes(searchInput);
        
        // Check 1b: Exacte match (volledige overeenkomst)
        const parserExact = parser && parser === searchInput;
        const naamExact = naam && naam === searchInput;
        
        // Check 2: Volledige parser/naam komt voor in zoekterm (bijv. "dubbeldekkerbus" in "soort voertuig dubbeldekkerbus")
        // Alleen als de parser/naam minimaal 5 karakters is (om te korte matches te voorkomen)
        const parserInSearch = parser && parser.length >= 5 && searchInput.includes(parser);
        const naamInSearch = naam && naam.length >= 5 && searchInput.includes(naam);
        
        // Check 3: Woord-voor-woord matching voor meerdere woorden
        // Voor meerdere woorden: alle belangrijke woorden (minimaal 3 karakters) moeten matchen
        const searchWords = searchInput.split(/\s+/).filter(w => w.length >= 3);
        if (searchWords.length > 1) {
          const parserWords = parser.split(/\s+/);
          const naamWords = naam.split(/\s+/);
          
          // Alle belangrijke woorden moeten voorkomen in parser of naam
          // Bijvoorbeeld: "inzet brw off van dienst" moet matchen met "inzet brw off van dienst"
          const allWordsInParser = searchWords.every(word => 
            parserWords.some(pw => pw === word || pw.includes(word) || word.includes(pw))
          );
          const allWordsInNaam = searchWords.every(word => 
            naamWords.some(nw => nw === word || nw.includes(word) || word.includes(nw))
          );
          
          if (allWordsInParser || allWordsInNaam) {
            return true;
          }
        }
        
        // Alleen accepteren als het een exacte match, exacte substring match, of een volledige parser/naam match is
        return parserExact || naamExact || parserExactSubstring || naamExactSubstring || parserInSearch || naamInSearch;
      });

      if (partialMatches.length > 0) {
        // Sorteer op beste match (exacte matches eerst, dan op beste overlap)
        partialMatches.sort((a, b) => {
          const aParser = (a.ktParser || '').toLowerCase().replace(/^-/, '');
          const bParser = (b.ktParser || '').toLowerCase().replace(/^-/, '');
          const aNaam = (a.ktNaam || '').toLowerCase();
          const bNaam = (b.ktNaam || '').toLowerCase();
          const searchInput = fullInput.toLowerCase();
          
          // Exacte match krijgt hoogste score
          const aExact = (aParser === searchInput || aNaam === searchInput) ? 1000 : 0;
          const bExact = (bParser === searchInput || bNaam === searchInput) ? 1000 : 0;
          
          // Exacte substring match (volledige zoekterm komt voor) krijgt ook hoge score
          const aExactSubstring = (aParser.includes(searchInput) || aNaam.includes(searchInput)) ? 500 : 0;
          const bExactSubstring = (bParser.includes(searchInput) || bNaam.includes(searchInput)) ? 500 : 0;
          
          // Bereken overlap score (hoeveel van de zoekterm komt overeen)
          // Hogere score = betere match
          const aParserOverlap = aParser.includes(searchInput) ? (searchInput.length / Math.max(aParser.length, 1)) * 100 : 0;
          const aNaamOverlap = aNaam.includes(searchInput) ? (searchInput.length / Math.max(aNaam.length, 1)) * 100 : 0;
          const aOverlap = Math.max(aParserOverlap, aNaamOverlap);
          
          const bParserOverlap = bParser.includes(searchInput) ? (searchInput.length / Math.max(bParser.length, 1)) * 100 : 0;
          const bNaamOverlap = bNaam.includes(searchInput) ? (searchInput.length / Math.max(bNaam.length, 1)) * 100 : 0;
          const bOverlap = Math.max(bParserOverlap, bNaamOverlap);
          
          // Check of de match aan het begin staat (betere match)
          const aStartsAtBeginning = (aParser.startsWith(searchInput) || aNaam.startsWith(searchInput)) ? 50 : 0;
          const bStartsAtBeginning = (bParser.startsWith(searchInput) || bNaam.startsWith(searchInput)) ? 50 : 0;
          
          // Sorteer: exacte match eerst, dan exacte substring match, dan matches die beginnen met de zoekterm, dan beste overlap, dan kortere matches (specifieker)
          const aLength = Math.min(aParser.length || 999, aNaam.length || 999);
          const bLength = Math.min(bParser.length || 999, bNaam.length || 999);
          
          return (bExact - aExact) || (bExactSubstring - aExactSubstring) || (bStartsAtBeginning - aStartsAtBeginning) || (bOverlap - aOverlap) || (aLength - bLength);
        });

        foundKarakteristiek = partialMatches[0];
        console.log(`✅ Found partial match: "${foundKarakteristiek.ktNaam}" via parser "${foundKarakteristiek.ktParser}" or naam "${foundKarakteristiek.ktNaam}"`);
        finalValue = foundKarakteristiek.ktWaarde || value;
      }
    }

    // Step 2: Direct code match (kt_code)
    if (!foundKarakteristiek) {
      foundKarakteristiek = karakteristiekenDatabase.find(k =>
        k.ktCode?.toLowerCase() === code.toLowerCase()
      );
      if (foundKarakteristiek) {
        console.log(`✅ Found direct kt_code match: "${foundKarakteristiek.ktNaam}" for code "${code}"`);
        // Use ktWaarde as default value if no specific value provided
        if (!finalValue && foundKarakteristiek.ktWaarde) {
          finalValue = foundKarakteristiek.ktWaarde;
        }
      }
    }

    // Step 3: Direct name match
    if (!foundKarakteristiek) {
      foundKarakteristiek = karakteristiekenDatabase.find(k =>
        k.ktNaam?.toLowerCase() === code.toLowerCase()
      );
      if (foundKarakteristiek) {
        console.log(`✅ Found direct name match: "${foundKarakteristiek.ktNaam}" for name "${code}"`);
      }
    }

    // Step 4: Handle "aantal [type] [number]" patterns specifically
    if (!foundKarakteristiek && code === 'aantal') {
      const aantalMatch = fullInput.match(/aantal\s+(\w+)\s+(\d+)/);
      if (aantalMatch) {
        const [, type, number] = aantalMatch;
        finalValue = number;

        const typeToCodeMap = {
          'verdachten': 'ddrs', 'daders': 'ddrs', 'dader': 'ddrs',
          'doden': 'dd', 'dood': 'dd',
          'gewonden': 'gew', 'gewond': 'gew',
          'aanhoudingen': 'aanh', 'aanhouding': 'aanh',
          'personen': 'pers', 'persoon': 'pers',
          'vermisten': 'verm', 'vermist': 'verm',
          'water': 'tewt', 'nzrz': 'nzrz', 'object': 'iobj', 'dieren': 'dier'
        };

        const targetCode = typeToCodeMap[type];
        if (targetCode) {
          foundKarakteristiek = karakteristiekenDatabase.find(k => 
            k.ktCode && k.ktCode.toLowerCase() === targetCode.toLowerCase()
          );
          if (foundKarakteristiek) {
            console.log(`✅ Found "aantal [type] [number]" match: "${type}" -> "${targetCode}" with value "${finalValue}"`);
          }
        }
      }

      // Handle "aantal [type]" without number
      if (!foundKarakteristiek) {
        const aantalSimpleMatch = fullInput.match(/aantal\s+(\w+)$/);
        if (aantalSimpleMatch) {
          const [, type] = aantalSimpleMatch;
          finalValue = '1';

          const typeToCodeMap = {
            'verdachten': 'ddrs', 'daders': 'ddrs', 'dader': 'ddrs',
            'doden': 'dd', 'dood': 'dd',
            'gewonden': 'gew', 'gewond': 'gew',
            'aanhoudingen': 'aanh', 'aanhouding': 'aanh',
            'personen': 'pers', 'persoon': 'pers',
            'vermisten': 'verm', 'vermist': 'verm'
          };

          const targetCode = typeToCodeMap[type];
          if (targetCode) {
            foundKarakteristiek = karakteristiekenDatabase.find(k => 
              k.ktCode && k.ktCode.toLowerCase() === targetCode.toLowerCase()
            );
            if (foundKarakteristiek) {
              console.log(`✅ Found "aantal [type]" match: "${type}" -> "${targetCode}" with default value "${finalValue}"`);
            }
          }
        }
      }
    }

    // Step 5: Handle special "inzet pol [specific]" patterns
    if (!foundKarakteristiek && code === 'inzet' && value.startsWith('pol ')) {
      const specificPart = value.substring(4);
      foundKarakteristiek = karakteristiekenDatabase.find(k => 
        k.ktCode && k.ktCode.toLowerCase() === 'ipa'
      );
      if (foundKarakteristiek) {
        finalValue = specificPart;
        console.log(`✅ Found "inzet pol [specific]" match: "${specificPart}" for Inzet Pol algemeen`);
      }
    }

    // Step 6: Enhanced fuzzy matching by name content with improved precision
    if (!foundKarakteristiek) {
      const searchWords = fullInput.toLowerCase().split(' ').filter(w => w.length > 2);

      const fuzzyMatches = karakteristiekenDatabase.filter(k => {
        const name = k.ktNaam?.toLowerCase() || '';
        const ktCode = k.ktCode?.toLowerCase() || '';

        // Check abbreviation mappings first
        const codeAbbrevs = commonAbbreviations[ktCode] || [];
        for (const abbrev of codeAbbrevs) {
          if (fullInput.toLowerCase().includes(abbrev.toLowerCase()) || abbrev.toLowerCase().includes(fullInput.toLowerCase())) {
            return true;
          }
        }

        // Calculate word-based similarity score with higher precision
        let exactWordMatches = 0;
        let partialWordMatches = 0;
        const nameWords = name.split(' ').filter(w => w.length > 2);

        for (const searchWord of searchWords) {
          for (const nameWord of nameWords) {
            if (searchWord === nameWord) {
              exactWordMatches += 3; // Higher weight for exact matches
            } else if (searchWord.includes(nameWord) || nameWord.includes(searchWord)) {
              partialWordMatches += 1;
            }
          }
        }

        const totalScore = exactWordMatches + partialWordMatches;

        // Require higher threshold and prioritize exact word matches
        return totalScore >= 4 && exactWordMatches >= 2;
      });

      if (fuzzyMatches.length > 0) {
        // Sort by relevance: prioritize exact word matches and shorter names
        fuzzyMatches.sort((a, b) => {
          const aName = a.ktNaam?.toLowerCase() || '';
          const bName = b.ktNaam?.toLowerCase() || '';
          const searchLower = fullInput.toLowerCase();

          // Calculate exact word match scores
          const aWords = aName.split(' ').filter(w => w.length > 2);
          const bWords = bName.split(' ').filter(w => w.length > 2);

          let aExactMatches = 0;
          let bExactMatches = 0;

          for (const searchWord of searchWords) {
            if (aWords.includes(searchWord)) aExactMatches++;
            if (bWords.includes(searchWord)) bExactMatches++;
          }

          // First priority: more exact word matches
          if (aExactMatches !== bExactMatches) {
            return bExactMatches - aExactMatches;
          }

          // Second priority: shorter names (more specific)
          return aName.length - bName.length;
        });

        foundKarakteristiek = fuzzyMatches[0];
        console.log(`✅ Found precise fuzzy match: "${foundKarakteristiek.ktNaam}" for input "${fullInput}"`);
      }
    }

    if (!foundKarakteristiek) {
      console.log(`❌ No karakteristiek found for code: ${code}`);
      return false;
    }

    console.log(`✅ Found karakteristiek: ${foundKarakteristiek.ktNaam} for code: ${code} (type: ${foundKarakteristiek.ktType})`);

    // Determine final value based on type
    if (foundKarakteristiek.ktType === 'Vrije tekst' || foundKarakteristiek.ktType === 'Getal') {
      if (!finalValue) {
        finalValue = value || '';
      }
      console.log(`📝 Using determined value for ${foundKarakteristiek.ktType}: "${finalValue}"`);
    } else if (foundKarakteristiek.ktType === 'Ja/Nee') {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || 'Ja';
    } else if (foundKarakteristiek.ktType === 'Enkelvoudige opsom') {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || '';
    } else if (foundKarakteristiek.ktType === 'Meervoudige opsom') {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || '';
    } else {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || '';
    }

    // Check if this exact karakteristiek already exists
    const existingIndex = selectedKarakteristieken.findIndex(k => 
      k.ktCode === foundKarakteristiek.ktCode && k.ktNaam === foundKarakteristiek.ktNaam
    );

    if (existingIndex !== -1) {
      // Update existing karakteristiek 
      setSelectedKarakteristieken(prev => {
        const updated = [...prev];
        const existing = updated[existingIndex];

        // Always append with comma for any karakteristiek type when adding a new value
        if (finalValue && existing.waarde && !existing.waarde.includes(finalValue)) {
          updated[existingIndex] = {
            ...existing,
            waarde: `${existing.waarde}, ${finalValue}`
          };
          console.log(`📝 Appended value to existing karakteristiek: ${existing.waarde} + ${finalValue}`);
        } else if (finalValue && !existing.waarde) {
          updated[existingIndex] = {
            ...existing,
            waarde: finalValue
          };
          console.log(`📝 Set first value for existing karakteristiek: ${finalValue}`);
        }

        // Check for OVD-OC activation on existing karakteristiek update
        if (foundKarakteristiek.ktNaam === "Inzet Pol algemeen" && finalValue === "OVD-OC") {
          console.log("🚨 OVD-OC detected in existing karakteristiek update!");
          addSystemLoggingEntry('🚨 OVD-OC karakteristiek geactiveerd - Operationeel Centrum geïnformeerd');
          
          // Trigger OVD-OC popup notification
          if (onOvdOcActivation) {
            console.log('🚨 Calling onOvdOcActivation callback');
            onOvdOcActivation();
          } else {
            console.log('❌ onOvdOcActivation callback not available');
          }
        }

        // Check for Persalarm activation on existing karakteristiek update
        if (code.toLowerCase() === 'persalarm' && finalValue.toLowerCase() === 'ja') {
          console.log('🚨 Persalarm detected in existing karakteristiek update - triggering automatic PROC!');
          addSystemLoggingEntry('🚨 Persalarm karakteristiek geactiveerd - automatische PROC uitgevoerd');
          
          // Generate automatic PROC text
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          
          // Create PROC text based on current incident data
          const priority = selectedIncident?.prio || priorityValue;
          const classification = selectedMC3 || selectedMC2 || selectedMC1 || selectedIncident?.mc || "ALARM";
          const adres = selectedIncident?.straatnaam && selectedIncident?.huisnummer 
            ? `${selectedIncident.straatnaam.toUpperCase()} ${selectedIncident.huisnummer}${selectedIncident.toevoeging ? selectedIncident.toevoeging : ''}`
            : formData.straatnaam && formData.huisnummer 
              ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
              : (selectedIncident?.locatie || "").toUpperCase();
          const plaatsnaam = (selectedIncident?.plaatsnaam || formData.plaatsnaam || "").toUpperCase();
          const roepnummers = selectedIncident?.assignedUnits?.length ? selectedIncident.assignedUnits.map(u => u.roepnummer).join(" ") : "";
          
          // Check for gespreksgroep karakteristiek (code "gg")
          const gespreksgroepKarakteristiek = [...selectedKarakteristieken, ...(selectedIncident?.karakteristieken || [])].find(
            k => k.ktCode === 'gg' || k.ktCode === 'GG'
          );
          
          // Use gespreksgroep waarde if available, otherwise use default "1"
          const kanaalOfGroep = gespreksgroepKarakteristiek?.waarde 
            ? gespreksgroepKarakteristiek.waarde.toUpperCase()
            : "1";
          
          const parts = [
            `P${priority}`,
            kanaalOfGroep,
            classification,
            adres,
            plaatsnaam,
            roepnummers
          ].filter(part => part && part.trim() !== "");
          
          const autoProcText = parts.join(" ");
          
          // Set the PROC text
          setPagerText(autoProcText);
          
          // Dispatch P2000 alarm event to lightboard
          const incidentNr = selectedIncident?.nr || getNextIncidentNumber();
          const location = adres && plaatsnaam ? `${adres} ${plaatsnaam}` : "LOCATIE ONBEKEND";
          const alarmEvent = new CustomEvent('p2000-alarm', {
            detail: {
              id: incidentNr.toString(),
              type: classification,
              location: location,
              pagerText: autoProcText
            }
          });
          window.dispatchEvent(alarmEvent);
          
          // Add to logging
          addLoggingEntry(`🚨 AUTOMATISCHE PROC VERZONDEN: "${autoProcText}" om ${timeStr}`);
          
          console.log(`✅ Automatic PROC sent: "${autoProcText}"`);
        }

        // Check for Inzet Pol recherche FO activation on existing karakteristiek update
        // Try multiple variations of the name
        const isInzetPolRechercheFO = foundKarakteristiek.ktNaam === 'Inzet Pol recherche FO' ||
                                     foundKarakteristiek.ktNaam === 'Inzet Pol Recherche FO' ||
                                     foundKarakteristiek.ktNaam === 'inzet pol recherche fo' ||
                                     foundKarakteristiek.ktNaam === 'Inzet Pol recherche' ||
                                     foundKarakteristiek.ktNaam?.toLowerCase().includes('inzet pol recherche') ||
                                     foundKarakteristiek.ktCode === 'ipr' ||
                                     foundKarakteristiek.ktCode === 'IPR';
        
        if (isInzetPolRechercheFO) {
          console.log('🕵️ Inzet Pol recherche FO detected in existing karakteristiek update - triggering automatic FO piket Rotterdam selection!');
          console.log('🕵️ Matched on:', foundKarakteristiek.ktNaam, 'Code:', foundKarakteristiek.ktCode);
          addSystemLoggingEntry('🕵️ Inzet Pol recherche FO karakteristiek geactiveerd - FO piket Rotterdam automatisch geselecteerd');
          
          // Directly add capcode to pager text and check the checkbox
          setPagerText(prev => {
            const newText = prev + " 1430100";
            console.log('📝 Adding capcode 1430100 to pager text:', newText);
            return newText;
          });
          setFoPiketChecked(true);
          addSystemLoggingEntry("🕵️ FO piket Rotterdam (capcode: 1430100) toegevoegd");
          
          console.log('✅ FO piket Rotterdam capcode added and checkbox checked');
        }

        // Check for gespreksgroep karakteristiek - automatically generate PROC text
        if ((foundKarakteristiek.ktCode === 'gg' || foundKarakteristiek.ktCode === 'GG') && finalValue) {
          console.log('📞 Gespreksgroep karakteristiek detected - automatically generating PROC text');
          // Generate PROC text with the new gespreksgroep value
          const prio = selectedIncident?.prio || priorityValue;
          const mc = selectedIncident?.mc3 || selectedMC3 || selectedIncident?.mc2 || selectedMC2 || selectedIncident?.mc1 || selectedMC1 || "";
          const adres = selectedIncident?.straatnaam && selectedIncident?.huisnummer 
            ? `${selectedIncident.straatnaam.toUpperCase()} ${selectedIncident.huisnummer}${selectedIncident.toevoeging ? selectedIncident.toevoeging : ''}`
            : formData.straatnaam && formData.huisnummer
            ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
            : (selectedIncident?.locatie || "").toUpperCase();
          const plaatsnaam = (selectedIncident?.plaatsnaam || formData.plaatsnaam || "").toUpperCase();
          const roepnummers = selectedIncident?.assignedUnits?.length ? selectedIncident.assignedUnits.map(u => u.roepnummer).join(" ") : "";
          
          const parts = [
            `P${prio}`,
            finalValue.toUpperCase(),
            mc ? mc : "",
            adres,
            plaatsnaam,
            roepnummers
          ].filter(part => part && part.trim() !== "");
          
          const formattedText = parts.join(" ");
          setPagerText(formattedText);
          addSystemLoggingEntry(`📝 PROC tekst automatisch gegenereerd met gespreksgroep "${finalValue}": "${formattedText}"`);
        }

        return updated;
      });
    } else {
      // Add new karakteristiek
      const newKarakteristiek = {
        id: Date.now() + Math.random(),
        ktNaam: foundKarakteristiek.ktNaam,
        ktType: foundKarakteristiek.ktType,
        waarde: finalValue,
        ktCode: foundKarakteristiek.ktCode
      };

      console.log(`📝 Added new karakteristiek:`, newKarakteristiek);
      setSelectedKarakteristieken(prev => [...prev, newKarakteristiek]);
      
      // Special case: Heterdaad karakteristiek sets priority to 1
      if (foundKarakteristiek.ktCode === 'htd' && foundKarakteristiek.ktNaam === 'Heterdaad' && finalValue === 'Ja') {
        setPriorityValue(1);
        addSystemLoggingEntry('🚨 Heterdaad karakteristiek geselecteerd - prioriteit automatisch ingesteld op 1');
        
        // Update incident if one is selected
        if (selectedIncident) {
          const updatedIncident = {
            ...selectedIncident,
            prio: 1
          };
          setSelectedIncident(updatedIncident);
        }
      }

      // Special case: OVD-OC karakteristiek triggers popup notification
      if (foundKarakteristiek.ktNaam === "Inzet Pol algemeen" && finalValue === "OVD-OC") {
        console.log("🚨 OVD-OC detected in new karakteristiek!");
        addSystemLoggingEntry('🚨 OVD-OC karakteristiek geactiveerd - Operationeel Centrum geïnformeerd');
        
        // Trigger OVD-OC popup notification
        if (onOvdOcActivation) {
          console.log('🚨 Calling onOvdOcActivation callback');
          onOvdOcActivation();
        } else {
          console.log('❌ onOvdOcActivation callback not available');
        }
      }

      // Special case: Persalarm karakteristiek triggers automatic PROC
      if (code.toLowerCase() === 'persalarm' && finalValue.toLowerCase() === 'ja') {
        console.log('🚨 Persalarm detected - triggering automatic PROC!');
        addSystemLoggingEntry('🚨 Persalarm karakteristiek geactiveerd - automatische PROC uitgevoerd');
        
        // Generate automatic PROC text
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // Create PROC text based on current incident data
        const priority = selectedIncident?.prio || priorityValue;
        const classification = selectedMC3 || selectedMC2 || selectedMC1 || selectedIncident?.mc || "ALARM";
        const adres = selectedIncident?.straatnaam && selectedIncident?.huisnummer 
          ? `${selectedIncident.straatnaam.toUpperCase()} ${selectedIncident.huisnummer}${selectedIncident.toevoeging ? selectedIncident.toevoeging : ''}`
          : formData.straatnaam && formData.huisnummer 
            ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
            : (selectedIncident?.locatie || "").toUpperCase();
        const plaatsnaam = (selectedIncident?.plaatsnaam || formData.plaatsnaam || "").toUpperCase();
        const roepnummers = selectedIncident?.assignedUnits?.length ? selectedIncident.assignedUnits.map(u => u.roepnummer).join(" ") : "";
        
        // Check for gespreksgroep karakteristiek (code "gg")
        const gespreksgroepKarakteristiek = [...selectedKarakteristieken, ...(selectedIncident?.karakteristieken || [])].find(
          k => k.ktCode === 'gg' || k.ktCode === 'GG'
        );
        
        // Use gespreksgroep waarde if available, otherwise use default "1"
        const kanaalOfGroep = gespreksgroepKarakteristiek?.waarde 
          ? gespreksgroepKarakteristiek.waarde.toUpperCase()
          : "1";
        
        const parts = [
          `P${priority}`,
          kanaalOfGroep,
          classification,
          adres,
          plaatsnaam,
          roepnummers
        ].filter(part => part && part.trim() !== "");
        
        const autoProcText = parts.join(" ");
        
        // Set the PROC text
        setPagerText(autoProcText);
        
        // Dispatch P2000 alarm event to lightboard
        const alarmEvent = new CustomEvent('p2000-alarm', {
          detail: {
            id: incidentNr.toString(),
            type: classification,
            location: location,
            pagerText: autoProcText
          }
        });
        window.dispatchEvent(alarmEvent);
        
        // Add to logging
        addLoggingEntry(`🚨 AUTOMATISCHE PROC VERZONDEN: "${autoProcText}" om ${timeStr}`);
        
        console.log(`✅ Automatic PROC sent: "${autoProcText}"`);
      }

      // Debug: Log all karakteristiek names to see what's available
      console.log('🔍 Found karakteristiek:', foundKarakteristiek.ktNaam, 'Code:', foundKarakteristiek.ktCode);
      
      // Special case: Inzet Pol recherche FO triggers automatic FO piket Rotterdam selection
      // Try multiple variations of the name
      const isInzetPolRechercheFO = foundKarakteristiek.ktNaam === 'Inzet Pol recherche FO' ||
                                   foundKarakteristiek.ktNaam === 'Inzet Pol Recherche FO' ||
                                   foundKarakteristiek.ktNaam === 'inzet pol recherche fo' ||
                                   foundKarakteristiek.ktNaam === 'Inzet Pol recherche' ||
                                   foundKarakteristiek.ktNaam?.toLowerCase().includes('inzet pol recherche') ||
                                   foundKarakteristiek.ktCode === 'ipr' ||
                                   foundKarakteristiek.ktCode === 'IPR';
      
      if (isInzetPolRechercheFO) {
        console.log('🕵️ Inzet Pol recherche FO detected - triggering automatic FO piket Rotterdam selection!');
        console.log('🕵️ Matched on:', foundKarakteristiek.ktNaam, 'Code:', foundKarakteristiek.ktCode);
        addSystemLoggingEntry('🕵️ Inzet Pol recherche FO karakteristiek geactiveerd - FO piket Rotterdam automatisch geselecteerd');
        
        // Directly add capcode to pager text and check the checkbox
        setPagerText(prev => {
          const newText = prev + " 1430100";
          console.log('📝 Adding capcode 1430100 to pager text:', newText);
          return newText;
        });
        setFoPiketChecked(true);
        addSystemLoggingEntry("🕵️ FO piket Rotterdam (capcode: 1430100) toegevoegd");
        
        console.log('✅ FO piket Rotterdam capcode added and checkbox checked');
      }

      // Check for gespreksgroep karakteristiek - automatically generate PROC text
      if ((foundKarakteristiek.ktCode === 'gg' || foundKarakteristiek.ktCode === 'GG') && finalValue) {
        console.log('📞 Gespreksgroep karakteristiek detected - automatically generating PROC text');
        // Generate PROC text with the new gespreksgroep value
        const prio = selectedIncident?.prio || priorityValue;
        const mc = selectedIncident?.mc3 || selectedMC3 || selectedIncident?.mc2 || selectedMC2 || selectedIncident?.mc1 || selectedMC1 || "";
        const adres = selectedIncident?.straatnaam && selectedIncident?.huisnummer 
          ? `${selectedIncident.straatnaam.toUpperCase()} ${selectedIncident.huisnummer}${selectedIncident.toevoeging ? selectedIncident.toevoeging : ''}`
          : formData.straatnaam && formData.huisnummer
          ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
          : (selectedIncident?.locatie || "").toUpperCase();
        const plaatsnaam = (selectedIncident?.plaatsnaam || formData.plaatsnaam || "").toUpperCase();
        const roepnummers = selectedIncident?.assignedUnits?.length ? selectedIncident.assignedUnits.map(u => u.roepnummer).join(" ") : "";
        
        const parts = [
          `P${prio}`,
          finalValue.toUpperCase(),
          mc ? mc : "",
          adres,
          plaatsnaam,
          roepnummers
        ].filter(part => part && part.trim() !== "");
        
        const formattedText = parts.join(" ");
        setPagerText(formattedText);
        addSystemLoggingEntry(`📝 PROC tekst automatisch gegenereerd met gespreksgroep "${finalValue}": "${formattedText}"`);
      }
    }

    return true;
  };

  // Enhanced function to detect and apply shortcodes for classification, address, and caller info
  const detectAndApplyShortcodes = async (text: string) => {
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1].trim();

    const incidentContext = selectedIncident ? `incident ${selectedIncident.nr}` : 'NIEUWE MELDING';
    console.log(`Shortcode detection for: "${lastLine}" | Context: ${incidentContext}`);

    // Address shortcode: =[stad]/[straatnaam] [huisnummer] OR =highway (A1, A2, etc.)
    if (lastLine.startsWith('=')) {
      // Highway shortcode: =A1, =A20, etc.
      const highwayMatch = lastLine.match(/^=(A\d+|N\d+)(?:\s+(.+))?$/i);
      if (highwayMatch) {
        const [, highway, additional] = highwayMatch;

        console.log(`🛣️ Highway shortcode detected: ${highway}${additional ? ' ' + additional : ''}`);

        // Switch to Locatietreffers tab immediately
        setActiveLoggingTab('locatietreffers');

        // Search for highway information
        const fullQuery = additional ? `${highway} ${additional}` : highway;
        const results = await searchRWSHighways(fullQuery);
        if (results.length > 0) {
          setBagSearchResults(results);
          addSystemLoggingEntry(`🛣️ Snelweg ${highway} gevonden via RWS Wegenbestand`);
          
          // Auto-fill if only one result and no additional info
          if (results.length === 1 && !additional) {
            const result = results[0];
            const addressData = {
              straatnaam: result.straatnaam,
              huisnummer: additional || '',
              plaatsnaam: result.plaatsnaam,
              gemeente: result.gemeente
            };

            setFormData(prev => ({ ...prev, ...addressData }));
            if (selectedIncident) {
              setSelectedIncident({ ...selectedIncident, ...addressData });
            }

            addSystemLoggingEntry(`🛣️ Snelweglocatie automatisch ingevuld: ${result.volledigAdres}`);
            setBagSearchQuery("");
            setBagSearchResults([]);
          }
        } else {
          addSystemLoggingEntry(`❌ Snelweg ${highway} niet gevonden in RWS Wegenbestand`);
        }

        return true;
      }

      // Regular address shortcode: =[stad]/[straatnaam] [huisnummer]
      const addressMatch = lastLine.match(/^=([^\/]+)\/(.+?)\s+(\d+)$/i);
      if (addressMatch) {
        const [, stad, straatnaam, huisnummer] = addressMatch;

        console.log(`📍 Address shortcode detected: ${stad} / ${straatnaam} ${huisnummer}`);

        // Switch to Locatietreffers tab immediately
        setActiveLoggingTab('locatietreffers');

        // Fill address data from BAG API
        await fillAddressFromBAG(stad, straatnaam, huisnummer);

        return true;
      }
    }

    // Caller info shortcode: m/[meldernaam];[telefoonnummer]
    if (lastLine.startsWith('m/')) {
      const callerMatch = lastLine.match(/^m\/([^;]+);(.+)$/i);
      if (callerMatch) {
        const [, meldernaam, telefoonnummer] = callerMatch;

        console.log(`Caller shortcode detected: ${meldernaam} / ${telefoonnummer}`);

        // ALWAYS update form data regardless of incident selection
        const newCallerData = {
          melderNaam: meldernaam.trim(),
          telefoonnummer: telefoonnummer.trim()
        };

        setFormData(prev => {
          const updated = {
            ...prev,
            ...newCallerData
          };
          console.log(`Form data updated for ${incidentContext}:`, updated);
          return updated;
        });

        // Only update selected incident if one exists (editing mode)
        if (selectedIncident) {
          const updatedIncident = {
            ...selectedIncident,
            ...newCallerData
          };
          setSelectedIncident(updatedIncident);
          console.log(`Existing incident updated: ${selectedIncident.nr}`);
        }

        return true;
      }
    }

    // Object shortcode: o/[object/gebouw] - Search OSM for public objects
    if (lastLine.startsWith('o/')) {
      const objectMatch = lastLine.match(/^o\/(.+)$/i);
      if (objectMatch) {
        const [, objectQuery] = objectMatch;

        console.log(`🏢 Object shortcode detected: ${objectQuery}`);

        // Switch to Locatietreffers tab immediately
        setActiveLoggingTab('locatietreffers');

        // Search OSM for public objects
        const results = await searchOSMObjects(objectQuery);
        if (results.length > 0) {
          setBagSearchResults(results);
          addSystemLoggingEntry(`🏢 ${results.length} openbare objecten gevonden voor "${objectQuery}"`);
          
          // Auto-fill if only one result
          if (results.length === 1) {
            const result = results[0];
            // Use object name (naam) for object field, and translated function for functie field
            const objectNaam = result.naam || result.weergavenaam || '';
            const buildingFunctie = result.functie || '';
            const addressData = {
              straatnaam: result.straatnaam,
              huisnummer: result.huisnummer,
              plaatsnaam: result.plaatsnaam,
              gemeente: result.gemeente,
              postcode: result.postcode,
              coordinates: result.coordinates,
              object: objectNaam,
              functie: buildingFunctie
            };

            setFormData(prev => ({ ...prev, ...addressData }));
            if (selectedIncident) {
              setSelectedIncident({ ...selectedIncident, ...addressData });
            }

            addSystemLoggingEntry(`🏢 Object automatisch ingevuld: ${result.weergavenaam}`);
            setBagSearchQuery("");
            setBagSearchResults([]);
          }
        } else {
          addSystemLoggingEntry(`❌ Geen openbare objecten gevonden voor "${objectQuery}"`);
          
          // Fallback: just set the function field
          const newObjectData = {
            functie: objectQuery.trim()
          };

          setFormData(prev => {
            const updated = { ...prev, ...newObjectData };
            console.log(`🏢 Object field updated for ${incidentContext}:`, updated);
            return updated;
          });

          if (selectedIncident) {
            const updatedIncident = { ...selectedIncident, ...newObjectData };
            setSelectedIncident(updatedIncident);
            console.log(`🏢 Existing incident updated: ${selectedIncident.nr}`);
          }
        }

        return true;
      }

    // Hydrografie shortcode: l/  → twee modi
    // 1) l/<meters>  → zoek nabij huidige coördinaten met straal
    // 2) l/<vrije tekst>  → geocodeer tekst naar coördinaten en zoek nabij
    if (lastLine.startsWith('l/')) {
      setActiveLoggingTab('locatietreffers');

      const arg = lastLine.substring(2).trim();
      const radiusOnly = arg.match(/^(\d{3,5})$/);
      const radius = radiusOnly ? parseInt(radiusOnly[1], 10) : 1500;

      let targetCoords: [number, number] | null = null;

      if (radiusOnly) {
        // Gebruik bestaande coördinaten
        const coords = selectedIncident?.coordinates || formData.coordinates;
        if (!coords) {
          addSystemLoggingEntry('❌ Geen coördinaten beschikbaar voor Hydrografie-zoekopdracht. Vul eerst een locatie in.');
          return true;
        }
        targetCoords = coords as [number, number];
      } else if (arg.length > 0) {
        // Vrije tekst: probeer BAG en OSM
        addSystemLoggingEntry(`🔎 Zoeken naar locatie: "${arg}"`);
        try {
          const [bag, osm] = await Promise.all([
            searchBAGAddress(arg),
            searchOSMObjects(arg)
          ]);
          const combined = [...bag, ...osm];
          const withCoords = combined.find((r: any) => Array.isArray(r.coordinates) && r.coordinates.length === 2);
          if (withCoords) {
            targetCoords = withCoords.coordinates as [number, number];
            addSystemLoggingEntry(`📍 Locatie gevonden: ${withCoords.weergavenaam || withCoords.naam}`);
          } else {
            addSystemLoggingEntry('❌ Geen coördinaten gevonden voor deze zoekopdracht');
            return true;
          }
        } catch (e) {
          console.error('Hydrografie free-text geocoding error:', e);
          addSystemLoggingEntry('❌ Fout bij geocoderen van zoekopdracht');
          return true;
        }
      } else {
        // Alleen 'l/' zonder argument: gebruik standaard coördinaten indien aanwezig
        const coords = selectedIncident?.coordinates || formData.coordinates;
        if (!coords) {
          addSystemLoggingEntry('❌ Geen coördinaten beschikbaar voor Hydrografie-zoekopdracht. Voeg argument toe of vul eerst een locatie in.');
          return true;
        }
        targetCoords = coords as [number, number];
      }

      if (targetCoords) {
        const [lng, lat] = targetCoords;
        addSystemLoggingEntry(`🌊 Hydrografie zoeken binnen ~${radius}m...`);
        const results = await searchHydrografieNear(lat, lng, radius);
        if (results.length > 0) {
          setBagSearchResults(results);
          addSystemLoggingEntry(`🌊 ${results.length} waternetwerk-segmenten gevonden`);
        } else {
          setBagSearchResults([]);
          addSystemLoggingEntry('❌ Geen hydrografie gevonden');
        }
      }

      return true;
    }

    // NWB Wegen shortcode: nwb / nwb <meters>
    if (lastLine.startsWith('=nwb')) {
      setActiveLoggingTab('locatietreffers');

      // Parse optional radius: "=nwb 2000"
      const arg = lastLine.substring(4).trim();
      const radiusOnly = arg.match(/^(\d{3,5})$/);
      const radius = radiusOnly ? parseInt(radiusOnly[1], 10) : 1500;

      const coords = selectedIncident?.coordinates || formData.coordinates;
      if (!coords) {
        addSystemLoggingEntry('❌ Geen coördinaten beschikbaar voor NWB-zoekopdracht. Vul eerst een locatie in.');
        return true;
      }

      const [lng, lat] = coords as [number, number];
      addSystemLoggingEntry(`🛣️ NWB Wegen zoeken binnen ~${radius}m...`);
      const results = await searchNwbWegenNear(lat, lng, radius);
      if (results.length > 0) {
        setBagSearchResults(results);
        addSystemLoggingEntry(`🛣️ ${results.length} wegsegmenten gevonden (PDOK NWB WFS)`);
      } else {
        setBagSearchResults([]);
        addSystemLoggingEntry('❌ Geen NWB-wegsegmenten gevonden');
      }

      return true;
    }

    // Snelweg (NWB-only) shortcode: s/<opties>
    // Voorbeelden:
    //  - s/            → gebruik huidige coördinaten, radius 1500m
    //  - s/2000        → gebruik huidige coördinaten, radius 2000m
    //  - s/A20         → filter op wegnummer A20 binnen 1500m bbox
    //  - s/A20 2000    → filter op A20 binnen 2000m bbox
    if (lastLine.toLowerCase().startsWith('s/')) {
      setActiveLoggingTab('locatietreffers');

      const arg = lastLine.substring(2).trim();
      // Support:
      // s/A20 Maasland
      // s/A20 17,1 Maasland
      // s/A20
      const roadPlaceMatch = arg.match(/^(A\d+|N\d+)(?:\s+(\d+(?:[\.,]\d+)?))?(?:\s+(.+))?$/i);

      let results: any[] = [];
      if (roadPlaceMatch) {
        const road = (roadPlaceMatch[1] || '').toUpperCase();
        const hectoRaw = roadPlaceMatch[2];
        const place = (roadPlaceMatch[3] || '').trim();

        if (hectoRaw) {
          // Direct hectometer punt
          const hecto = hectoRaw.replace(',', '.');
          const tol = 0.5;
          const clauses = [
            `WEGNUMMER ILIKE '%${road}%'`,
            `(AFSTAND >= ${parseFloat(hecto) - tol} AND AFSTAND <= ${parseFloat(hecto) + tol})`
          ];
          if (place) clauses.push(`(GEMEENTE ILIKE '%${place}%' OR PLAATS ILIKE '%${place}%' OR NAAM ILIKE '%${place}%')`);
          const cql = clauses.join(' AND ');
          addSystemLoggingEntry(`🛣️ NWB hectometer zoeken: ${road} ${hecto}${place ? ' ' + place : ''}`);
          const hectoTypes = ['nwb:Hectometerpunten', 'nwb:hectometerpunten', 'hectometerpunten'];
          for (const tn of hectoTypes) {
            const resp = await fetch(`/api/pdok/nwb-wegen/features?typeNames=${encodeURIComponent(tn)}&srsName=EPSG:4326&count=200&cql_filter=${encodeURIComponent(cql)}`);
            if (!resp.ok) continue;
            const json = await resp.json();
            const feats = (json.features || []);
            if (!feats.length && place) {
              // Fallback: try without place filter
              const cqlNoPlace = [`WEGNUMMER ILIKE '%${road}%'`, `(AFSTAND >= ${parseFloat(hecto) - tol} AND AFSTAND <= ${parseFloat(hecto) + tol})`].join(' AND ');
              const resp2 = await fetch(`/api/pdok/nwb-wegen/features?typeNames=${encodeURIComponent(tn)}&srsName=EPSG:4326&count=200&cql_filter=${encodeURIComponent(cqlNoPlace)}`);
              if (!resp2.ok) continue;
              const json2 = await resp2.json();
              feats.push(...(json2.features || []));
            }
            if (!feats.length) continue;
            results = feats.map((feature: any, index: number) => {
              const geom = feature.geometry;
              let coord: [number, number] | null = null;
              if (geom?.type === 'Point' && Array.isArray(geom.coordinates)) {
                coord = [geom.coordinates[0], geom.coordinates[1]];
              }
              const p = feature.properties || {};
              return {
                id: feature.id || `${Date.now()}-${index}`,
                weergavenaam: `${road} hectometer ${hecto}${place ? ' ' + place : ''}`,
                naam: `${road} hectometer ${hecto}`,
                coordinates: coord,
                wegType: 'hectometer',
                source: `PDOK NWB – Hectometerpunten (${tn})`,
                volledigAdres: `${road} hectometer ${hecto}`,
                straatnaam: road,
                huisnummer: hecto,
                plaatsnaam: place || 'Nederland',
                gemeente: place || 'Rijkswegen',
                postcode: ''
              };
            });
            break;
          }
          // As last resort: use infrastructure endpoint to find hectometer by numeric distance
          if (results.length === 0) {
            try {
              const infraResp = await fetch(`/api/rws/infrastructure?roadName=${encodeURIComponent(road)}&includeHectometers=true&limit=1000`);
              if (infraResp.ok) {
                const infra = await infraResp.json();
                const targetVal = parseFloat(hecto);
                const feats = (infra.hectometers?.features || []).filter((f: any) => {
                  const v = f.properties?.AFSTAND || f.properties?.KM_AFSTAND || f.properties?.afstand || f.properties?.km_afstand;
                  const num = v ? parseFloat(String(v).replace(',', '.')) : NaN;
                  return !Number.isNaN(num) && Math.abs(num - targetVal) < 0.5;
                });
                results = feats.map((f: any, idx: number) => ({
                  id: f.properties?.id || `${Date.now()}-${idx}`,
                  weergavenaam: `${road} hectometer ${hecto}${place ? ' ' + place : ''}`,
                  naam: `${road} hectometer ${hecto}`,
                  coordinates: f.geometry?.coordinates || null,
                  wegType: 'hectometer',
                  source: 'RWS NWB OGC (fallback)',
                  volledigAdres: `${road} hectometer ${hecto}`,
                  straatnaam: road,
                  huisnummer: hecto,
                  plaatsnaam: place || 'Nederland',
                  gemeente: place || 'Rijkswegen',
                  postcode: ''
                }));
              }
            } catch (e) {
              console.warn('Hectometer OGC fallback failed', e);
            }
          }
        } else if (road) {
          // Wegvakken voor wegnummer, optioneel plaats filter
          const clauses = [`WEGNUMMER ILIKE '%${road}%'`];
          if (place) clauses.push(`(GEMEENTE ILIKE '%${place}%' OR PLAATS ILIKE '%${place}%' OR NAAM ILIKE '%${place}%')`);
          const cql = clauses.join(' AND ');
          addSystemLoggingEntry(`🛣️ NWB wegvakken zoeken: ${road}${place ? ' ' + place : ''}`);
          const typeCandidates = ['nwb:Wegvakken', 'nwb:wegvakken', 'wegvakken'];
          for (const tn of typeCandidates) {
            const resp = await fetch(`/api/pdok/nwb-wegen/features?typeNames=${encodeURIComponent(tn)}&srsName=EPSG:4326&count=1000&cql_filter=${encodeURIComponent(cql)}`);
            if (!resp.ok) continue;
            const json = await resp.json();
            let feats = (json.features || []);
            if (!feats.length && place) {
              // Fallback: try without place clause
              const cqlNoPlace = [`WEGNUMMER ILIKE '%${road}%'`].join(' AND ');
              const resp2 = await fetch(`/api/pdok/nwb-wegen/features?typeNames=${encodeURIComponent(tn)}&srsName=EPSG:4326&count=1000&cql_filter=${encodeURIComponent(cqlNoPlace)}`);
              if (resp2.ok) {
                const json2 = await resp2.json();
                feats = (json2.features || []);
              }
            }
            if (!feats.length) continue;
            results = feats.slice(0, 100).map((feature: any, index: number) => {
              const geom = feature.geometry;
              let reprCoords: [number, number] | null = null;
              if (geom?.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
                const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
                reprCoords = [mid[0], mid[1]];
              } else if (geom?.type === 'MultiLineString' && Array.isArray(geom.coordinates) && geom.coordinates[0]?.length > 0) {
                const first = geom.coordinates[0];
                const mid = first[Math.floor(first.length / 2)] || first[0];
                reprCoords = [mid[0], mid[1]];
              }
              const p = feature.properties || {};
              const wegNummer = p.WEGNUMMER || p.wegNummer || p.wegnummer || p.WGK_NAAM || p.naam || road;
              return {
                id: feature.id || `${Date.now()}-${index}`,
                weergavenaam: `${wegNummer}`,
                naam: `${wegNummer}`,
                coordinates: reprCoords,
                wegType: 'highway',
                source: `PDOK NWB – Wegvakken (${tn})`,
                volledigAdres: `${wegNummer}`,
                straatnaam: wegNummer,
                huisnummer: '',
                plaatsnaam: place || 'Nederland',
                gemeente: place || 'Rijkswegen',
                postcode: ''
              };
            });
            break;
          }
          // Fallback to OGC API features if still empty
          if (results.length === 0) {
            try {
              const ogc = await fetch(`/api/rws/highways?limit=200`);
              if (ogc.ok) {
                const data = await ogc.json();
                const filtered = (data.features || []).filter((f: any) => (f.properties?.wegNummer || '').toUpperCase().includes(road));
                results = filtered.slice(0, 50).map((feature: any) => ({
                  id: feature.properties?.id || '',
                  weergavenaam: `${feature.properties?.wegNummer || road}`,
                  naam: `${feature.properties?.wegNummer || road}`,
                  coordinates: feature.geometry?.coordinates?.[0] || null,
                  wegType: 'highway',
                  source: 'RWS NWB OGC',
                  volledigAdres: `${feature.properties?.wegNummer || road}`,
                  straatnaam: feature.properties?.wegNummer || road,
                  huisnummer: '',
                  plaatsnaam: place || 'Nederland',
                  gemeente: place || 'Rijkswegen',
                  postcode: ''
                }));
              }
            } catch (e) {
              console.warn('OGC fallback failed', e);
            }
          }
        }
      }

      if (results.length > 0) {
        setBagSearchResults(results);
        addSystemLoggingEntry(`🛣️ ${results.length} resultaten (PDOK NWB WFS)`);
      } else {
        setBagSearchResults([]);
        addSystemLoggingEntry('❌ Geen NWB-resultaten gevonden');
      }

      return true;
    }
    }

    // Classification shortcode: -[code]
    // Alleen verwerken als het een exacte match is (geen keyword matching)
    // Dit voorkomt dat "-persoon te water" wordt veranderd naar "persoon in drijfzand"
    if (lastLine.startsWith('-')) {
      const inputCode = lastLine.split(' ')[0].toLowerCase(); // Alleen eerste woord (code), normalize to lowercase

      console.log(`Zoeken naar classificatie shortcode: ${inputCode} voor ${incidentContext}`);

      // Direct shortcode match (case-insensitive) - alleen exacte matches
      let matchedMapping = null;
      for (const [code, mapping] of Object.entries(shortcodeMappings)) {
        if (code.toLowerCase() === inputCode) {
          matchedMapping = mapping;
          break;
        }
      }

      if (matchedMapping) {
        console.log(`Shortcode gevonden voor ${incidentContext}:`, matchedMapping);
        applyClassification(matchedMapping.MC1, matchedMapping.MC2, matchedMapping.MC3, inputCode);
        return true;
      }

      // Try to find by LMC code directly - alleen exacte code matches
      const directCodeMatch = lmcClassifications.find(c => 
        c.Code.toLowerCase() === inputCode.substring(1) // Remove the '-' prefix
      );

      if (directCodeMatch) {
        console.log(`Directe LMC code gevonden voor ${incidentContext}:`, directCodeMatch);
        applyClassification(directCodeMatch.MC1, directCodeMatch.MC2, directCodeMatch.MC3, inputCode);
        return true;
      }

      // Keyword matching voor volledige tekst (bijv. "-persoon te water")
      // Alleen gebruiken als de volledige tekst wordt gebruikt, niet alleen het eerste woord
      if (lastLine.split(' ').length > 1) {
        const fullText = lastLine.substring(1).toLowerCase().trim(); // Verwijder '-' en normalize
        const keywords = fullText.split(/\s+/).filter(word => word.length > 2);
        
        // Zoek naar classificaties die alle belangrijke woorden bevatten
        const possibleMatches = lmcClassifications.filter(c => {
          const classificationText = `${c.MC1} ${c.MC2} ${c.MC3} ${c.DEFINITIE}`.toLowerCase();
          
          // Alle belangrijke keywords moeten voorkomen in de classificatie tekst
          const allKeywordsMatch = keywords.every(keyword => 
            classificationText.includes(keyword)
          );
          
          return allKeywordsMatch;
        });

        if (possibleMatches.length > 0) {
          // Sorteer op beste match (meeste overeenkomende woorden)
          possibleMatches.sort((a, b) => {
            const aText = `${a.MC1} ${a.MC2} ${a.MC3}`.toLowerCase();
            const bText = `${b.MC1} ${b.MC2} ${b.MC3}`.toLowerCase();
            
            // Tel hoeveel keywords exact voorkomen in MC1/MC2/MC3 (niet alleen in DEFINITIE)
            const aScore = keywords.filter(kw => aText.includes(kw)).length;
            const bScore = keywords.filter(kw => bText.includes(kw)).length;
            
            return bScore - aScore;
          });

          const bestMatch = possibleMatches[0];
          console.log(`Keyword match gevonden voor ${incidentContext}:`, bestMatch);
          applyClassification(bestMatch.MC1, bestMatch.MC2, bestMatch.MC3, lastLine);
          return true;
        }
      }

      // Geen match gevonden
      console.log(`Geen classificatie match gevonden voor: ${inputCode} - laat karakteristieken verwerking toe`);
      return false;
    }

    return false;
  };

  // Function to find classification by keywords
  const findClassificationByKeywords = (keywords: string[]) => {
    for (const classification of lmcClassifications) {
      const classificationText = `${classification.MC1} ${classification.MC2} ${classification.MC3} ${classification.DEFINITIE}`.toLowerCase();

      let matchCount = 0;
      for (const keyword of keywords) {
        if (classificationText.includes(keyword)) {
          matchCount++;
        }
      }

      // If at least 60% of keywords match, consider it a match
      if (matchCount >= Math.ceil(keywords.length * 0.6)) {
        return classification;
      }
    }

    return null;
  };

  // Enhanced function to apply classification to dropdowns with persistence
  const applyClassification = (mc1: string, mc2: string, mc3: string, detectedCode: string) => {
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (!mc1Select || !mc2Select || !mc3Select || lmcClassifications.length === 0) {
      console.warn('Classification dropdowns not found or no classifications loaded');
      return;
    }

    console.log(`Applying classification: ${mc1} > ${mc2} > ${mc3} (code: ${detectedCode})`);
    console.log(`Debug: detectedCode = "${detectedCode}", checking for htd...`);

    // Step 1: Validate and find exact match in classifications
    const exactMatch = lmcClassifications.find(c => 
      c.MC1 === mc1 && 
      (mc2 === '' || c.MC2 === mc2) && 
      (mc3 === '' || c.MC3 === mc3)
    );

    if (!exactMatch) {
      console.warn(`No exact match found for ${mc1} > ${mc2} > ${mc3}`);
      return;
    }

    // Step 2: Update state immediately to prevent race conditions
    setSelectedMC1(mc1);
    if (mc2) setSelectedMC2(mc2);
    if (mc3) setSelectedMC3(mc3);

    // Step 3: Populate MC1 dropdown and set value
    const mc1Options = Array.from(new Set(
      lmcClassifications.map(c => c.MC1).filter(Boolean)
    )).sort();

    mc1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
    mc1Options.forEach(mc1Option => {
      const option = document.createElement('option');
      option.value = mc1Option;
      option.textContent = mc1Option;
      mc1Select.appendChild(option);
    });
    mc1Select.value = mc1;

    // Step 4: Populate MC2 dropdown if MC1 is set
    mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
    if (mc1) {
      const mc2Options = Array.from(new Set(
        lmcClassifications
          .filter(c => c.MC1 === mc1 && c.MC2)
          .map(c => c.MC2)
      )).sort();

      mc2Options.forEach(mc2Option => {
        const option = document.createElement('option');
        option.value = mc2Option;
        option.textContent = mc2Option;
        mc2Select.appendChild(option);
      });

      if (mc2) {
        mc2Select.value = mc2;
      }
    }

    // Step 5: Populate MC3 dropdown if MC2 is set
    mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
    if (mc1 && mc2) {
      const mc3Options = Array.from(new Set(
        lmcClassifications
          .filter(c => c.MC1 === mc1 && c.MC2 === mc2 && c.MC3 && c.MC3.trim() !== "")
          .map(c => c.MC3)
      )).sort();

      mc3Options.forEach(mc3Option => {
        const option = document.createElement('option');
        option.value = mc3Option;
        option.textContent = mc3Option;
        mc3Select.appendChild(option);
      });

      if (mc3) {
        mc3Select.value = mc3;
      }
    }

    // Step 6: Apply priority from classification
    const finalClassification = lmcClassifications.find(c => 
      c.MC1 === mc1 && 
      c.MC2 === (mc2 || '') && 
      c.MC3 === (mc3 || '')
    );

    if (finalClassification) {
      // Special case: -htd (heterdaad) always gets priority 1
      let finalPriority = finalClassification.PRIO;
      if (detectedCode.toLowerCase() === '-htd' || detectedCode.toLowerCase() === 'htd') {
        finalPriority = 1;
        console.log('🚨 Heterdaad shortcode detected - setting priority to 1');
        addSystemLoggingEntry('🚨 Heterdaad shortcode gebruikt - prioriteit automatisch ingesteld op 1');
      }

      setPriorityValue(finalPriority);
      console.log(`🎯 Priority set to: ${finalPriority} (original: ${finalClassification.PRIO})`);

      // Update incident if one is selected
      if (selectedIncident) {
        const updatedIncident = {
          ...selectedIncident,
          mc: finalClassification.Code.toUpperCase(),
          mc1: mc1,
          mc2: mc2 || '',
          mc3: mc3 || '',
          prio: finalPriority
        };
        setSelectedIncident(updatedIncident);
      }

      }
  };

  const handleKladblokKeyPress = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = kladblokText.trim();
      if (message) {
        console.log(`🎯 Processing kladblok input: "${message}"`);

        // Special handling for address commands - enhanced to support both with and without house number
        if (message.startsWith('=')) {
          // This will be handled by detectAndApplyShortcodes, but we process it here first for immediate feedback
          const cleanInput = message.substring(1).trim();

          if (cleanInput.includes('/')) {
            console.log(`📍 Manual address command via Enter: ${message}`);

            // Switch to Locatietreffers tab
            setActiveLoggingTab('locatietreffers');

            // Let detectAndApplyShortcodes handle the actual processing
            const processed = await detectAndApplyShortcodes(message);
            if (processed) {
              // Clear kladblok and search results
              setKladblokText("");
              setBagSearchResults([]);
              return; // Exit early, address was processed
            }
          }
        }



        // Eerst proberen classificatie shortcode (alleen exacte matches)
        // Als dat niet werkt, dan karakteristieken verwerken
        const shortcodeDetected = await detectAndApplyShortcodes(message);
        
        // Alleen karakteristieken verwerken als er geen classificatie shortcode werd gedetecteerd
        // Dit voorkomt dat karakteristieken worden aangemaakt wanneer een classificatie wordt getypt
        let karakteristiekProcessed = false;
        if (!shortcodeDetected) {
          karakteristiekProcessed = processKarakteristieken(message);
        }

        // Always add user input to log, regardless of processing
        addLoggingEntry(message);

        // Log karakteristieken processing to console only
        if (karakteristiekProcessed) {
          console.log(`Karakteristieken successfully processed for: "${message}"`);
        }

        // Add feedback for shortcode detection
        if (shortcodeDetected && !karakteristiekProcessed) {
          console.log(`Shortcode successfully processed for: "${message}"`);
        }

        // If nothing was processed, log it
        if (!karakteristiekProcessed && !shortcodeDetected) {
          console.log(`ℹ️ No processing applied to: "${message}" - added to logging only`);
        }

        setKladblokText("");

        // Clear any search results if we processed something
        if (bagSearchResults.length > 0) {
          setBagSearchResults([]);
        }
      }
    }
  };

  // Debounce timer for search requests
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle kladblok text changes for real-time BAG API integration
  const handleKladblokChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setKladblokText(newText);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Check if user is typing an address query (starts with =)
    if (newText.startsWith('=')) {
      // Switch to Locatietreffers tab immediately
      setActiveLoggingTab('locatietreffers');

      // Extract the search query (remove the = prefix)
      const searchQuery = newText.substring(1);

      if (searchQuery.length >= 2) {
        console.log(`Real-time BAG search for: "${searchQuery}"`);

        // Update the search input and trigger search
        setBagSearchQuery(searchQuery);

        try {
          const results = await searchBAGAddress(searchQuery);
          setBagSearchResults(results);
          console.log(`📍 Found ${results.length} addresses for "${searchQuery}"`);
        } catch (error) {
          console.error('Error during real-time BAG search:', error);
          setBagSearchResults([]);
        }
      } else {
        // Clear results if query is too short
        setBagSearchResults([]);
      }
    } else if (newText.startsWith('o/')) {
      // Check if user is typing an object query (starts with o/)
      setActiveLoggingTab('locatietreffers');

      // Extract the search query (remove the o/ prefix)
      const searchQuery = newText.substring(2);

      // Only search if query is long enough and user has stopped typing
      if (searchQuery.length >= 4) {
        // Debounce the search request
        const timeout = setTimeout(async () => {
          console.log(`Real-time OSM search for: "${searchQuery}"`);

          // Update the search input and trigger search
          setBagSearchQuery(searchQuery);

          try {
            const results = await searchOSMObjects(searchQuery);
            setBagSearchResults(results);
            console.log(`🏢 Found ${results.length} objects for "${searchQuery}"`);
          } catch (error) {
            console.error('Error during real-time OSM search:', error);
            setBagSearchResults([]);
          }
        }, 500); // Wait 500ms after user stops typing

        setSearchTimeout(timeout);
      } else {
        // Clear results if query is too short
        setBagSearchResults([]);
      }
    } else if (newText.startsWith('l/')) {
      // Real-time hydrografie zoeken
      setActiveLoggingTab('locatietreffers');

      const arg = newText.substring(2).trim();
      const radiusOnly = arg.match(/^(\d{3,5})$/);
      const radius = radiusOnly ? parseInt(radiusOnly[1], 10) : 1500;

      try {
        let targetCoords: [number, number] | null = null;
        if (radiusOnly) {
          const coords = selectedIncident?.coordinates || formData.coordinates;
          if (coords && Array.isArray(coords) && coords.length === 2) {
            targetCoords = coords as [number, number];
          }
        } else if (arg.length > 0) {
          const [bag, osm] = await Promise.all([
            searchBAGAddress(arg),
            searchOSMObjects(arg)
          ]);
          const combined = [...bag, ...osm];
          const withCoords = combined.find((r: any) => Array.isArray(r.coordinates) && r.coordinates.length === 2);
          if (withCoords) {
            targetCoords = withCoords.coordinates as [number, number];
          }
        } else {
          const coords = selectedIncident?.coordinates || formData.coordinates;
          if (coords && Array.isArray(coords) && coords.length === 2) {
            targetCoords = coords as [number, number];
          }
        }

        if (targetCoords) {
          const [lng, lat] = targetCoords;
          const results = await searchHydrografieNear(lat, lng, radius);
          setBagSearchResults(results);
        } else {
          setBagSearchResults([]);
        }
      } catch (error) {
        console.error('Error during hydrografie real-time search:', error);
        setBagSearchResults([]);
      }
    } else {
      // If not an address or object query, clear search results
      if (bagSearchResults.length > 0) {
        setBagSearchResults([]);
      }
    }
  };

  // Improved dropdown initialization with stable event handlers and persistent values
  const initializeLMCDropdowns = () => {
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (!mc1Select || !mc2Select || !mc3Select) {
      console.warn('MC dropdowns not found in DOM');
      return;
    }

    const context = selectedIncident ? `incident ${selectedIncident.nr}` : 'nieuwe melding';
    console.log(`🔧 Initializing LMC dropdowns for ${context} with ${lmcClassifications.length} classifications`);

    // Remove existing event listeners to prevent duplicates
    mc1Select.replaceWith(mc1Select.cloneNode(true));
    mc2Select.replaceWith(mc2Select.cloneNode(true));
    mc3Select.replaceWith(mc3Select.cloneNode(true));

    // Get fresh references after replacement
    const freshMC1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const freshMC2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const freshMC3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    // Store current values before reinitializing (but only if we're NOT doing a fresh reset)
    const currentMC1 = selectedIncident ? selectedMC1 : "";
    const currentMC2 = selectedIncident ? selectedMC2 : "";
    const currentMC3 = selectedIncident ? selectedMC3 : "";

    // Populate MC1 dropdown
    const mc1Options = Array.from(new Set(lmcClassifications.map(c => c.MC1).filter(Boolean))).sort();
    freshMC1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
    mc1Options.forEach(mc1 => {
      const option = document.createElement('option');
      option.value = mc1;
      option.textContent = mc1;
      freshMC1Select.appendChild(option);
    });

    // Restore MC1 value if it was previously set (only for existing incidents)
    if (currentMC1 && selectedIncident) {
      freshMC1Select.value = currentMC1;
    }

    // MC1 change handler with persistence
    freshMC1Select.addEventListener('change', (e) => {
      const selectedMC1Value = (e.target as HTMLSelectElement).value;
      setSelectedMC1(selectedMC1Value);

      // Clear and populate MC2
      freshMC2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
      freshMC3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
      setSelectedMC2("");
      setSelectedMC3("");

      if (selectedMC1Value) {
        const mc2Options = Array.from(new Set(
          lmcClassifications
            .filter(c => c.MC1 === selectedMC1Value && c.MC2)
            .map(c => c.MC2)
        )).sort();

        mc2Options.forEach(mc2 => {
          const option = document.createElement('option');
          option.value = mc2;
          option.textContent = mc2;
          freshMC2Select.appendChild(option);
        });

        // Update priority based on MC1
        updatePriorityFromClassification(selectedMC1Value, "", "");
      }
    });

    // MC2 change handler with persistence
    freshMC2Select.addEventListener('change', (e) => {
      const selectedMC2Value = (e.target as HTMLSelectElement).value;
      setSelectedMC2(selectedMC2Value);

      // Clear and populate MC3
      freshMC3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
      setSelectedMC3("");

      if (selectedMC2Value && selectedMC1) {
        const mc3Options = Array.from(new Set(
          lmcClassifications
            .filter(c => c.MC1 === selectedMC1 && c.MC2 === selectedMC2Value && c.MC3 && c.MC3.trim() !== "")
            .map(c => c.MC3)
        )).sort();

        mc3Options.forEach(mc3 => {
          const option = document.createElement('option');
          option.value = mc3;
          option.textContent = mc3;
          freshMC3Select.appendChild(option);
        });

        // Update priority based on MC1 + MC2
        updatePriorityFromClassification(selectedMC1, selectedMC2Value, "");
      }
    });

    // MC3 change handler with persistence
    freshMC3Select.addEventListener('change', (e) => {
      const selectedMC3Value = (e.target as HTMLSelectElement).value;
      setSelectedMC3(selectedMC3Value);

      // Update priority and incident with full classification
      if (selectedMC3Value && selectedMC2 && selectedMC1) {
        updatePriorityFromClassification(selectedMC1, selectedMC2, selectedMC3Value);

        const matchingClassification = lmcClassifications.find(c => 
          c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && c.MC3 === selectedMC3Value
        );

        if (matchingClassification) {
          setPriorityValue(matchingClassification.PRIO);

          if (selectedIncident) {
            const updatedIncident = {
              ...selectedIncident,
              mc: matchingClassification.Code.toUpperCase(),
              mc1: selectedMC1,
              mc2: selectedMC2,
              mc3: selectedMC3Value,
              prio: matchingClassification.PRIO
            };
            setSelectedIncident(updatedIncident);
          }

          }
      }
    });

    // Only restore previously selected values if we're editing an existing incident
    if (selectedIncident && currentMC1) {
      setTimeout(() => {
        // First populate all dropdowns properly
        freshMC1Select.value = currentMC1;
        freshMC1Select.dispatchEvent(new Event('change'));

        setTimeout(() => {
          if (currentMC2) {
            freshMC2Select.value = currentMC2;
            freshMC2Select.dispatchEvent(new Event('change'));

            setTimeout(() => {
              if (currentMC3) {
                freshMC3Select.value = currentMC3;
                // Update state to ensure MC3 is preserved
                setSelectedMC3(currentMC3);
                console.log(`🔧 Dropdown initialization: MC3 restored and state updated to "${currentMC3}"`);
              }
            }, 100);
          }
        }, 100);
      }, 100);
    }

    console.log(`LMC dropdowns initialized for ${context} - ready for shortcodes`);
  };

  // Helper function to update priority from classification
  const updatePriorityFromClassification = (mc1: string, mc2: string, mc3: string) => {
    const matchingClassification = lmcClassifications.find(c => 
      c.MC1 === mc1 && 
      (mc2 === "" || c.MC2 === mc2) && 
      (mc3 === "" || c.MC3 === mc3)
    );

    if (matchingClassification) {
      setPriorityValue(matchingClassification.PRIO);
    }
  };

  //Karakteristieken database (duplicate - uses same data as karakteristiekenDatabase)
  const [karakteristiekenDb, setKarakteristiekenDb] = useState<any[]>([]);
  useEffect(() => {
    const loadKarakteristieken = async () => {
      try {
        console.log('Loading karakteristieken from JSON...');
        const response = await fetch('/karakteristieken.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Transform field names from snake_case to camelCase
        const transformedData = data.map((k: any) => ({
          ktNaam: k.kt_naam || '',
          ktType: k.kt_type || '',
          ktWaarde: k.kt_waarde || null,
          ktCode: k.kt_code || null,
          ktParser: k.kt_parser || null
        }));
        
        console.log(`✅ Loaded ${transformedData.length} karakteristieken from JSON`);

        // Test: show sample data
        if (transformedData.length > 0) {
          console.log('Sample karakteristiek:', {
            naam: transformedData[0].ktNaam,
            type: transformedData[0].ktType,
            waarde: transformedData[0].ktWaarde,
            parser: transformedData[0].ktParser
          });

          // Test: look for common patterns
          const inzetPatterns = transformedData.filter(k => k.ktParser && k.ktParser.toLowerCase().includes('inzet'));
          console.log(`Found ${inzetPatterns.length} 'inzet' patterns`);

          const polPatterns = transformedData.filter(k => k.ktParser && k.ktParser.toLowerCase().includes('pol'));
          console.log(`Found ${polPatterns.length} 'pol' patterns`);
        }

        setKarakteristiekenDb(transformedData);
      } catch (error) {
        console.error('❌ Error loading karakteristieken from JSON:', error);
      }
    };

    loadKarakteristieken();
  }, []);

  // Function to find matching karakteristieken for input text
  const findMatchingKarakteristieken = (inputText: string) => {
    if (!inputText || !karakteristiekenDb.length) {
      console.log("No input text or karakteristieken database");
      return [];
    }

    const searchText = inputText.toLowerCase().trim();
    console.log(`Searching for: "${searchText}" in ${karakteristiekenDb.length} karakteristieken`);

    const matches = karakteristiekenDb.filter(k => {
      if (!k.ktParser) return false;

      const parser = k.ktParser.toLowerCase();
      // Remove leading dash if present
      const cleanParser = parser.startsWith('-') ? parser.substring(1).trim() : parser.trim();

      // More flexible matching - check if any word in the search matches any word in the parser
      const searchWords = searchText.split(/\s+/);
      const parserWords = cleanParser.split(/\s+/);

      // Check for exact phrase match first
      if (cleanParser.includes(searchText) || searchText.includes(cleanParser)) {
        return true;
      }

      // Check for word matches
      const hasWordMatch = searchWords.some(searchWord => 
        parserWords.some(parserWord => 
          parserWord.includes(searchWord) || searchWord.includes(parserWord)
        )
      );

      return hasWordMatch;
    });

    console.log(`Found ${matches.length} matches for "${searchText}"`);
    if (matches.length > 0) {
      console.log('First few matches:', matches.slice(0, 3).map(m => m.ktParser));
    }
    return matches;
  };

  // Function to search karakteristieken for dialog
  const searchKarakteristiekenForDialog = (query: string) => {
    if (!query.trim()) {
      setFilteredKarakteristieken([]);
      return;
    }

    const searchLower = query.toLowerCase().trim();
    const results = karakteristiekenDatabase.filter(k => {
      const nameMatch = k.ktNaam?.toLowerCase().includes(searchLower);
      const codeMatch = k.ktCode?.toLowerCase().includes(searchLower);
      const parserMatch = k.ktParser?.toLowerCase().includes(searchLower);
      const typeMatch = k.ktType?.toLowerCase().includes(searchLower);
      
      return nameMatch || codeMatch || parserMatch || typeMatch;
    });

    // Sort by relevance: exact name matches first, then code matches, then partial matches
    results.sort((a, b) => {
      const aNameExact = a.ktNaam?.toLowerCase() === searchLower ? 1 : 0;
      const bNameExact = b.ktNaam?.toLowerCase() === searchLower ? 1 : 0;
      
      if (aNameExact !== bNameExact) return bNameExact - aNameExact;
      
      const aCodeExact = a.ktCode?.toLowerCase() === searchLower ? 1 : 0;
      const bCodeExact = b.ktCode?.toLowerCase() === searchLower ? 1 : 0;
      
      if (aCodeExact !== bCodeExact) return bCodeExact - aCodeExact;
      
      return (a.ktNaam || '').localeCompare(b.ktNaam || '');
    });

    setFilteredKarakteristieken(results.slice(0, 50)); // Limit to 50 results
  };

  // Function to add karakteristiek from dialog
  const addKarakteristiekFromDialog = (karakteristiek: any) => {
    // Check if this karakteristiek already exists
    const existingIndex = selectedKarakteristieken.findIndex(k => 
      k.ktCode === karakteristiek.ktCode && k.ktNaam === karakteristiek.ktNaam
    );

    if (existingIndex === -1) {
      // Add new karakteristiek
      const newKarakteristiek = {
        id: Date.now() + Math.random(),
        ktNaam: karakteristiek.ktNaam,
        ktType: karakteristiek.ktType,
        waarde: karakteristiek.ktWaarde || '',
        ktCode: karakteristiek.ktCode
      };

      setSelectedKarakteristieken(prev => [...prev, newKarakteristiek]);
      addSystemLoggingEntry(`📋 Karakteristiek toegevoegd: ${karakteristiek.ktNaam}`);
      
      // Special case: Heterdaad karakteristiek sets priority to 1
      if (karakteristiek.ktCode === 'htd' && karakteristiek.ktNaam === 'Heterdaad' && karakteristiek.ktWaarde === 'Ja') {
        setPriorityValue(1);
        addSystemLoggingEntry('🚨 Heterdaad karakteristiek geselecteerd - prioriteit automatisch ingesteld op 1');
        
        // Update incident if one is selected
        if (selectedIncident) {
          const updatedIncident = {
            ...selectedIncident,
            prio: 1
          };
          setSelectedIncident(updatedIncident);
        }
      }
    } else {
      addSystemLoggingEntry(`⚠️ Karakteristiek "${karakteristiek.ktNaam}" is al toegevoegd`);
    }

    // Close dialog
    setShowKarakteristiekenDialog(false);
    setKarakteristiekenSearchQuery("");
    setFilteredKarakteristieken([]);
  };

  /**
   * Centrale check of een voertuig beschikbaar is voor nieuw incident
   * Een voertuig is beschikbaar als:
   * - Status is KZ, IR of BS
   * - activeIncidentId is null (niet gekoppeld aan een incident)
   */
  const isAvailable = (roepnummer: string, status?: string): boolean => {
    // Haal unit positie op uit globalUnitMovement service
    const unitPosition = getUnitPosition(roepnummer);
    
    // Check activeIncidentId - moet null zijn
    if (unitPosition && unitPosition.activeIncidentId != null) {
      return false;
    }
    
    // Gebruik status uit unitPosition als beschikbaar, anders gebruik parameter
    const actualStatus = unitPosition?.statusCode || status || '';
    const statusLower = actualStatus.toLowerCase();
    
    // Alleen KZ, IR of BS zijn beschikbaar
    if (statusLower === 'kz' || statusLower === 'ir' || statusLower === 'bs') {
      return true;
    }
    
    // OV, UT, TP zijn altijd niet beschikbaar
    if (statusLower === 'ov' || statusLower === 'ut' || statusLower === 'tp') {
      return false;
    }
    
    // Fallback: gebruik status definitie als beschikbaar
    const statusDef = getStatusDef(actualStatus);
    if (statusDef) {
      return statusDef.beschikbaar_voor_nieuw_incident === true;
    }
    
    return false;
  };

  // Helper: Check of een status beschikbaar is voor inzet (gebruikt brw-statussen.json)
  // DEPRECATED: Gebruik isAvailable() in plaats daarvan voor volledige check inclusief activeIncidentId
  const isUnitAvailable = (status: string, roepnummer?: string): boolean => {
    // Als roepnummer beschikbaar is, gebruik centrale isAvailable functie
    if (roepnummer) {
      return isAvailable(roepnummer, status);
    }
    
    // Fallback voor oude code zonder roepnummer
    const statusDef = getStatusDef(status);
    
    // Als status definitie gevonden, gebruik beschikbaar_voor_nieuw_incident
    if (statusDef) {
      return statusDef.beschikbaar_voor_nieuw_incident === true;
    }
    
    // Fallback voor oude status strings (backwards compatibility)
    const statusLower = (status || '').toLowerCase();
    
    // Directe status code matches
    if (statusLower === 'bs' || statusLower === 'kz' || statusLower === 'ir') {
      return true;
    }
    
    // Status string matches (zoals "1 - Beschikbaar/vrij")
    if (statusLower.includes('beschikbaar') || statusLower.includes('vrij')) {
      return true;
    }
    if (statusLower.includes('kazerne')) {
      return true;
    }
    
    // Niet beschikbaar: ov, ut, tp, fd, GA, afmelden
    if (statusLower === 'ov' || statusLower === 'ut' || statusLower === 'ar' || statusLower === 'tp' || 
        statusLower === 'fd' || statusLower === 'ga' ||
        statusLower.includes('afmelden') || statusLower.includes('aanrijdend') ||
        statusLower.includes('ter plaatse')) {
      return false;
    }
    
    // Default: niet beschikbaar als onbekend
    return false;
  };

  // Helper: Haal coördinaten op van een eenheid via Leaflet marker
  // BELANGRIJK: Maakt GEEN nieuwe markers aan - gebruikt alleen bestaande markers uit voertuigMarkers Map
  const getUnitCoordinates = async (roepnummer: string, post?: string): Promise<{ lat: number; lng: number } | null> => {
    // Normaliseer roepnummer voor consistente matching
    const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
    
    // Probeer eerst Leaflet marker positie (LIVE positie op kaart)
    // Gebruikt ALLEEN bestaande markers - maakt GEEN nieuwe markers aan
    const markers = getVoertuigMarkers();
    const marker = markers.get(normalizedRoepnummer);
    
    // Check of marker bestaat en een getLatLng methode heeft
    if (marker && typeof marker.getLatLng === 'function') {
      const pos = marker.getLatLng();
      if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
        return { lat: pos.lat, lng: pos.lng };
      }
    }
    
    // Fallback: probeer uit a1Units (actieve eenheden)
    const a1Unit = a1Units.find(u => {
      const a1Normalized = normalizeRoepnummer(u.roepnummer);
      return a1Normalized === normalizedRoepnummer;
    });
    
    if (a1Unit?.coordinates && Array.isArray(a1Unit.coordinates) && a1Unit.coordinates.length === 2) {
      // a1Units gebruiken [lng, lat] formaat
      return { lat: a1Unit.coordinates[1], lng: a1Unit.coordinates[0] };
    }
    
    // Fallback: probeer kazerne coördinaten op basis van post
    if (post) {
      try {
        const kazerneResponse = await fetch('/attached_assets/63_kazernes_complete.json');
        if (kazerneResponse.ok) {
          const kazernes: any[] = await kazerneResponse.json();
          const normalizedPost = post.toLowerCase().trim();
          
          // Zoek kazerne op basis van post naam
          for (const kazerne of kazernes) {
            const kazernePlaats = (kazerne.plaats || '').toLowerCase().trim();
            const kazerneNaam = (kazerne.naam || '').toLowerCase().trim();
            
            if (kazernePlaats.includes(normalizedPost) || 
                normalizedPost.includes(kazernePlaats) ||
                kazerneNaam.includes(normalizedPost) ||
                normalizedPost.includes(kazerneNaam)) {
              const lat = typeof kazerne.latitude === 'string' 
                ? parseFloat(kazerne.latitude) 
                : kazerne.latitude;
              const lng = typeof kazerne.longitude === 'string' 
                ? parseFloat(kazerne.longitude) 
                : kazerne.longitude;
              
              if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
                console.log(`📍 Kazerne coördinaten gevonden voor ${roepnummer} (post: ${post}): ${lat}, ${lng}`);
                return { lat, lng };
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Fout bij ophalen kazerne coördinaten voor ${roepnummer}:`, error);
      }
    }
    
    // Geen coördinaten gevonden
    console.warn(`⚠️ Geen coördinaten gevonden voor eenheid ${roepnummer}${post ? ` (post: ${post})` : ''}`);
    return null;
  };

  // Helper: Bereken ETA van een eenheid naar een incident (gebruikt Leaflet marker positie)
  const calculateETAForUnit = async (
    unitRoepnummer: string, 
    incidentCoordinates: [number, number] | { lat: number; lng: number },
    unitPost?: string
  ): Promise<number | null> => {
    try {
      const unitCoords = await getUnitCoordinates(unitRoepnummer, unitPost);
      if (!unitCoords) {
        console.warn(`⚠️ Geen coördinaten gevonden voor eenheid ${unitRoepnummer}`);
        return null;
      }
      
      // Converteer incident coördinaten naar { lat, lng } formaat
      const incidentCoords = Array.isArray(incidentCoordinates)
        ? { lat: incidentCoordinates[1], lng: incidentCoordinates[0] } // [lng, lat] -> { lat, lng }
        : incidentCoordinates;
      
      // Gebruik de vaste calculateETA functie uit routingService
      const eta = await calculateETAService(unitCoords, incidentCoords);
      
      if (eta !== null) {
        console.log(`✅ ETA berekend voor ${unitRoepnummer}: ${formatETAService(eta)} (${eta}s)`);
      }
      
      return eta;
    } catch (error) {
      console.error(`❌ Fout bij ETA berekening voor ${unitRoepnummer}:`, error);
      return null;
    }
  };

  // Alias voor backward compatibility
  const formatETA = formatETAService;

  // Function to generate inzetvoorstel (IV) based on MAR standard
  const generateInzetvoorstel = async (extended: boolean = false) => {
    if (!selectedIncident && !selectedMC1 && !selectedMC2 && !selectedMC3) {
      addSystemLoggingEntry("⚠️ Selecteer eerst een classificatie of incident voor inzetvoorstel");
      return;
    }

    const mc1 = selectedIncident?.mc1 || selectedMC1 || '';
    const mc2 = selectedIncident?.mc2 || selectedMC2 || '';
    const mc3 = selectedIncident?.mc3 || selectedMC3 || '';
    const functie = selectedIncident?.functie || formData.functie || '';
    // Gebruik altijd selectedKarakteristieken (de huidige state) in plaats van incident.karakteristieken
    // Dit voorkomt dat oude karakteristieken blijven hangen bij nieuwe meldingen
    const karakteristieken = selectedKarakteristieken || [];
    
    console.log(`🔍 Gebruikte karakteristieken voor IV:`, karakteristieken.map((k: any) => ({ 
      naam: k.ktNaam, 
      code: k.ktCode, 
      waarde: k.ktWaarde,
      parser: k.ktParser 
    })));

    console.log(`🚒 Generating inzetvoorstel: MC1="${mc1}", MC2="${mc2}", MC3="${mc3}", Extended=${extended}`);

    // Haal voertuigen op uit Inzetvoorstellen RT basis.json
    const rtVoertuigen = await getVoertuigenFromInzetvoorstellenRT(
      mc1,
      mc2 || undefined,
      mc3 || undefined,
      karakteristieken
    );
    
    // Gebruik de mapping functie om inzetvoorstel te genereren
    const result = generateInzetvoorstelFromMapping(
      mc1,
      mc2 || undefined,
      mc3 || undefined,
      karakteristieken,
      functie || undefined,
      extended
    );
    
    // Voeg voertuigen uit RT basis.json toe aan het resultaat
    if (rtVoertuigen.length > 0) {
      // Parse voertuigen (verwijder eventuele [D] markers en extract alleen type)
      const parsedRtVoertuigen = rtVoertuigen.map(v => {
        // Bijv. "1 TS[D]" -> "1 TS" of "1 DV-AGS[4]" -> "1 DV-AGS"
        // Maar nu zijn markers al verwijderd, dus alleen aantal verwijderen als nodig
        return v.replace(/^\d+\s*/, '').trim();
      });
      
      // Combineer met bestaande voertuigen, maar RT basis heeft prioriteit
      const alleVoertuigen = new Set([...parsedRtVoertuigen, ...result.totaal]);
      result.totaal = Array.from(alleVoertuigen);
      result.base = Array.from(new Set([...parsedRtVoertuigen, ...result.base]));
      console.log(`✅ ${rtVoertuigen.length} voertuigen toegevoegd uit RT basis.json:`, parsedRtVoertuigen);
    }

    // Koppel BRW-eenheden op basis van rollen uit brw-eenheden dataset (bijv. TS-6)
    // 1) helper om BRW data te laden
    type RawBrwEntry = {
      "GMS-naam": string;
      "nummering op eenheid": string;
      "inzetrollen GMS": string[];
      post: string;
      "alternatief benaming": string[];
    };
    type BrwDataset = { [roepnummer: string]: RawBrwEntry };
    type BrwUnit = {
      roepnummer: string;
      gmsNaam: string;
      nummeringOpEenheid: string;
      post: string;
      rollen: string[];
      alternatieven: string[];
      status: string;
    };

    const normalize = (s: string) => (s || '').toLowerCase().trim();
    const compact = (s: string) => normalize(s).replace(/[^a-z0-9+]/g, '');

    const findUnitsForRole = (all: BrwUnit[], role: string): BrwUnit[] => {
      // Strip eventuele aantallen voor het type, bv. "1 TS-6" -> "TS-6"
      const r = role.replace(/^\d+\s*/, '').trim();
      if (!r) return [];
      const rNorm = normalize(r);
      
      const matched = all.filter(u => {
        const pools = [
          ...(Array.isArray(u.rollen) ? u.rollen : []),
          ...(Array.isArray(u.alternatieven) ? u.alternatieven : []),
        ];
        
        const matches = pools.some(rr => {
          const rn = normalize(rr);
          
          // 1. Exact match (case-insensitive) - highest priority
          if (rn === rNorm) return true;
          
          // 2. For simple codes without hyphens (WO, TS, DA, etc.)
          if (!r.includes('-') && !rr.includes('-')) {
            // Exact match only to avoid false positives (WO should NOT match WOV)
            return rn === rNorm;
          }
          
          // 3. For compound codes (DA-OD, TS-4, etc.) - exact prefix match
          if (r.includes('-')) {
            // Exact match: "DA-OD" matches "DA-OD" but NOT "DA-ODH"
            if (rn === rNorm) return true;
            // Prefix match with word boundary: "DA-OD" matches "DA-OD" prefix
            // but we already handled exact match above
            return false;
          }
          
          // 4. Base code matching compound (TS matches TS-4, TS-AED, etc.)
          if (!r.includes('-') && rr.includes('-')) {
            const rrBase = rr.split('-')[0].toLowerCase();
            return rrBase === rNorm;
          }
          
          return false;
        });
        
        return matches;
      });
      
      return matched;
    };

    const loadBrwUnits = async (): Promise<BrwUnit[]> => {
      try {
        // Load the updated BRW eenheden file (TSV-like content, not real JSON)
        const res = await fetch('/data/BRW%20eenheden.json');
        if (!res.ok) return [];
        const rawText = await res.text();

        // Parse the TSV-like content into the expected dataset shape
        const lines = rawText
          .split(/\r?\n/)
          .map((l) => l.trimEnd())
          .filter((l) => l.length > 0);

        const ds: BrwDataset = {};

        for (const line of lines) {
          // Columns appear to be separated by tabs
          const cols = line.split(/\t+/);
          if (cols.length === 0) continue;

          // Correct structure:
          // [0] = GMS-naam (e.g. 171111) of SK-nummer (e.g. SK03) of leeg
          // [1] = roepnummer (e.g. 17-1111) of leeg
          // [2] = eerste rol (e.g. MP, TS, DAT) - dit is vaak het voertuigtype
          // [3..n-2] = rollen (e.g. TS-AED, TS-4, TS-6, DA-OD)
          // [n-1] = post (e.g. Rotterdam)

          const gmsNaam = (cols[0] || "").trim();
          let roepnummer = (cols[1] || "").trim();

          // If roepnummer is empty but GMS-naam exists, use GMS-naam as roepnummer
          if (!roepnummer && gmsNaam) {
            roepnummer = gmsNaam;
          }

          // Als beide leeg zijn, probeer te kijken of er een identifier in kolom 2 staat
          // (bijvoorbeeld voor SK-nummers of andere speciale eenheden)
          if (!gmsNaam && !roepnummer) {
            // Check of er een identifier in kolom 2 staat (zoals SK03, CO-C/PLI, etc.)
            const potentialId = (cols[2] || "").trim();
            if (potentialId && potentialId.length > 0) {
              // Gebruik deze als roepnummer
              roepnummer = potentialId;
            } else {
              // Geen identifier gevonden, skip deze regel
              continue;
            }
          }
          
          // Kolom 2 bevat vaak het voertuigtype (MP, TS, DAT, etc.) - dit is ook een rol!
          // Bijvoorbeeld: "170121	17-0121	MP		DA-WVD" - MP is een rol

          // Find last non-empty column as post
          let post = "";
          for (let i = cols.length - 1; i >= 0; i--) {
            const v = (cols[i] || "").trim();
            if (v) { post = v; break; }
          }

          // Collect roles from columns 2 onwards (until last non-empty which is post)
          const roles: string[] = [];
          const roleStartIndex = 2;
          let roleEndIndex = cols.length;
          
          // Find where roles end (where post starts)
          for (let i = cols.length - 1; i >= roleStartIndex; i--) {
            const v = (cols[i] || "").trim();
            if (v === post) {
              roleEndIndex = i;
              break;
            }
          }

          // Als roepnummer uit kolom 2 komt (bijv. SK03), start rollen vanaf kolom 3
          // Anders start rollen vanaf kolom 2 (die bevat vaak het voertuigtype als eerste rol)
          const actualRoleStartIndex = (!gmsNaam && !cols[1]?.trim() && roepnummer === (cols[2] || "").trim()) ? 3 : roleStartIndex;
          
          // Kolom 2 bevat vaak het voertuigtype (MP, TS, DAT, etc.) - voeg dit toe als rol
          // Alleen als roepnummer NIET uit kolom 2 komt
          if (actualRoleStartIndex === roleStartIndex && cols[2]) {
            const voertuigType = (cols[2] || "").trim();
            if (voertuigType && voertuigType !== post && voertuigType !== roepnummer) {
              // Split op " / " voor meerdere types
              const types = voertuigType.split(/\s*\/\s*/);
              types.forEach(t => {
                const trimmed = t.trim();
                if (trimmed) roles.push(trimmed);
              });
            }
          }

          // Start vanaf actualRoleStartIndex (kolom 3 als roepnummer in kolom 2 staat, anders kolom 2)
          // Als we al kolom 2 hebben toegevoegd, start vanaf kolom 3
          const startIndex = (actualRoleStartIndex === roleStartIndex && roles.length > 0) ? 3 : actualRoleStartIndex;
          
          for (let i = startIndex; i < roleEndIndex; i++) {
            const cell = (cols[i] || "").trim();
            if (!cell) continue;
            
            // Skip als dit de post is
            if (cell === post) continue;
            
            // Skip als dit het roepnummer zelf is
            if (cell === roepnummer) continue;
            
            // Handle cells that may contain multiple roles separated by " / " or just a single role
            const parts = cell.split(/\s*\/\s*/);
            for (const part of parts) {
              const trimmed = part.trim();
              if (trimmed && trimmed !== post && trimmed !== roepnummer) {
                // Voorkom duplicaten
                if (!roles.includes(trimmed)) {
                  roles.push(trimmed);
                }
              }
            }
          }
          
          // Als er geen rollen zijn gevonden maar er wel een roepnummer is, 
          // probeer de eerste niet-lege kolom na roepnummer als rol te gebruiken
          if (roles.length === 0 && roepnummer) {
            for (let i = actualRoleStartIndex; i < cols.length; i++) {
              const cell = (cols[i] || "").trim();
              if (cell && cell !== post && cell !== roepnummer) {
                roles.push(cell);
                break;
              }
            }
          }

          const entry: RawBrwEntry = {
            "GMS-naam": gmsNaam || roepnummer, // Gebruik roepnummer als fallback voor GMS-naam
            "nummering op eenheid": roepnummer,
            "inzetrollen GMS": roles,
            post,
            "alternatief benaming": [],
          };

          // Debug: log eenheden met rollen
          if (roles.length > 0) {
            console.log(`✅ Eenheid ${roepnummer} (${post}): rollen =`, roles);
          }

          // Gebruik roepnummer als key, maar voorkom duplicaten
          // Als roepnummer al bestaat, voeg een suffix toe (zou niet moeten voorkomen)
          let key = roepnummer;
          if (ds[key] && ds[key]["GMS-naam"] !== gmsNaam) {
            // Duplicaat gevonden, voeg post toe aan key om uniek te maken
            key = `${roepnummer}_${post}`;
          }
          ds[key] = entry;
        }

        // status overrides uit localStorage meenemen
        let overrides: Record<string, string> = {};
        try {
          const raw = localStorage.getItem('brwStatusOverrides');
          if (raw) overrides = JSON.parse(raw);
        } catch {}
        
        // Haal status op uit brwUnitsMap als die beschikbaar is, anders gebruik default 'kz' (op kazerne)
        const defaultStatus = getDefaultStatus();
        return Object.entries(ds).map(([roepnummer, v]) => {
          // Prioriteit: 1) override uit localStorage, 2) status uit brwUnitsMap, 3) default 'kz' (op kazerne)
          let status = defaultStatus.afkorting; // Default naar "kz" (op kazerne)
          if (overrides[roepnummer]) {
            status = overrides[roepnummer];
          } else if (brwUnitsMap[roepnummer]?.status) {
            status = brwUnitsMap[roepnummer].status;
          }
          
          return {
            roepnummer,
            gmsNaam: v["GMS-naam"] || '',
            nummeringOpEenheid: v["nummering op eenheid"] || '',
            post: v.post || '',
            rollen: Array.isArray(v["inzetrollen GMS"]) ? v["inzetrollen GMS"] : [],
            alternatieven: Array.isArray(v["alternatief benaming"]) ? v["alternatief benaming"] : [],
            status
          };
        });
      } catch (e) {
        console.error('Error loading BRW units:', e);
        return [];
      }
    };

    // 2) build mapping role -> beschikbare eenheden (gesorteerd op ETA)
    const buildRoleMatches = async () => {
      const allUnits = await loadBrwUnits();
      console.log(`📊 Totaal aantal BRW eenheden geladen: ${allUnits.length}`);
      console.log(`📋 Voorbeeld eenheid:`, allUnits[0] ? {
        roepnummer: allUnits[0].roepnummer,
        rollen: allUnits[0].rollen,
        status: allUnits[0].status
      } : 'geen eenheden');
      
      const roleList = Array.from(new Set((result.totaal || []).filter(Boolean)));
      console.log(`🎯 Rollen uit inzetvoorstel:`, roleList);
      
      const matches: Record<string, { beschikbaar: Array<{ roepnummer: string; eta: number | null }>; alle: string[] }> = {};
      
      // Haal incident coördinaten op
      const incidentCoords = selectedIncident?.coordinates || formData.coordinates;
      console.log(`📍 Incident coördinaten:`, incidentCoords);
      
      if (!incidentCoords || !Array.isArray(incidentCoords) || incidentCoords.length !== 2) {
        console.warn('⚠️ Geen incident coördinaten beschikbaar voor ETA berekening - gebruik fallback zonder ETA');
        // Fallback naar oude logica zonder ETA
        for (const role of roleList) {
          const units = findUnitsForRole(allUnits, role);
          console.log(`🔍 Rol "${role}": ${units.length} eenheden gevonden`, units.map(u => u.roepnummer));
          const sorted = units.sort((a, b) => a.roepnummer.localeCompare(b.roepnummer));
          const beschikbaar = sorted.filter(u => isAvailable(u.roepnummer, u.status)).map(u => ({ roepnummer: u.roepnummer, eta: null }));
          console.log(`✅ Rol "${role}": ${beschikbaar.length} beschikbare eenheden`, beschikbaar.map(u => u.roepnummer));
          const alle = sorted.map(u => u.roepnummer);
          matches[role] = { beschikbaar, alle };
        }
        const brwAll = allUnits
          .sort((a, b) => a.roepnummer.localeCompare(b.roepnummer))
          .map(u => u.roepnummer);
        return { matches, brwAll };
      }
      
      // Bereken ETA's voor alle beschikbare eenheden per rol
      for (const role of roleList) {
        const units = findUnitsForRole(allUnits, role);
        console.log(`🔍 Rol "${role}": ${units.length} eenheden gevonden`, units.map(u => ({ roepnummer: u.roepnummer, rollen: u.rollen, status: u.status })));
        
        // Filter op beschikbare eenheden (gebruik centrale isAvailable functie)
        const beschikbareUnits = units.filter(u => {
          const available = isAvailable(u.roepnummer, u.status);
          if (!available) {
            const unitPosition = getUnitPosition(u.roepnummer);
            console.log(`❌ Eenheid ${u.roepnummer} niet beschikbaar (status: ${u.status}, activeIncidentId: ${unitPosition?.activeIncidentId || 'null'})`);
          }
          return available;
        });
        console.log(`✅ Rol "${role}": ${beschikbareUnits.length} beschikbare eenheden`, beschikbareUnits.map(u => u.roepnummer));
        
        // Bereken ETA voor elke beschikbare eenheid (gebruikt Leaflet marker positie)
        const unitsWithETA = await Promise.all(
          beschikbareUnits.map(async (unit) => {
            const eta = await calculateETAForUnit(unit.roepnummer, incidentCoords as [number, number], unit.post);
            console.log(`⏱️ ETA voor ${unit.roepnummer}: ${eta !== null ? formatETA(eta) : 'N/A'}`);
            return { roepnummer: unit.roepnummer, eta };
          })
        );
        
        // Sorteer op ETA (kortste eerst), null ETA's naar achteren
        unitsWithETA.sort((a, b) => {
          if (a.eta === null && b.eta === null) return 0;
          if (a.eta === null) return 1;
          if (b.eta === null) return -1;
          return a.eta - b.eta;
        });
        
        console.log(`📊 Rol "${role}" gesorteerd:`, unitsWithETA.map(u => `${u.roepnummer} (${u.eta !== null ? formatETA(u.eta) : 'N/A'})`));
        
        // Alle eenheden (voor volledige lijst)
        const alle = units
          .sort((a, b) => a.roepnummer.localeCompare(b.roepnummer))
          .map(u => u.roepnummer);
        
        matches[role] = { beschikbaar: unitsWithETA, alle };
      }
      
      // Voeg volledige lijst van BRW-eenheden toe (alle roepnummers)
      const brwAll = allUnits
        .sort((a, b) => a.roepnummer.localeCompare(b.roepnummer))
        .map(u => u.roepnummer);
      
      return { matches, brwAll } as { matches: Record<string, { beschikbaar: Array<{ roepnummer: string; eta: number | null }>; alle: string[] }>; brwAll: string[] };
    };

    // 3) afronden en UI/state bijwerken
    return (async () => {
      const { matches: roleMatches, brwAll } = await buildRoleMatches();

      // Sla ETA's op in state voor gebruik in UI
      const etaMap: Record<string, number> = {};
      Object.values(roleMatches).forEach((match) => {
        match.beschikbaar.forEach((unit) => {
          if (unit.eta !== null && unit.eta !== undefined) {
            etaMap[unit.roepnummer] = unit.eta;
            console.log(`💾 ETA opgeslagen in state voor ${unit.roepnummer}: ${unit.eta} seconden (${formatETA(unit.eta)})`);
          }
        });
      });
      console.log(`📦 Totaal ${Object.keys(etaMap).length} ETA's opgeslagen in state:`, etaMap);
      setUnitETAs(etaMap);

      const voorstel = {
        base: result.base,
        extra: result.extra,
        totaal: result.totaal,
        toelichting: result.toelichting,
        mc1,
        mc2,
        mc3,
        functie,
        extended,
        timestamp: new Date().toLocaleString('nl-NL'),
        brwMatches: roleMatches,
        brwAll
      } as any;

      console.log('📦 Inzetvoorstel data:', {
        brwMatches: roleMatches,
        unitETAs: etaMap,
        totalRoles: Object.keys(roleMatches).length,
        sampleMatch: Object.keys(roleMatches).length > 0 ? roleMatches[Object.keys(roleMatches)[0]] : null
      });

      setInzetvoorstel(voorstel);
      
      // Laad alle BRW units voor de volledige tabel
      const incidentCoordsForETA = selectedIncident?.coordinates || formData.coordinates;
      const allBrwUnitsData = await loadBrwUnits();
      const allBrwUnitsWithETA = await Promise.all(
        allBrwUnitsData.map(async (unit) => {
          let eta: number | null = null;
          if (incidentCoordsForETA && Array.isArray(incidentCoordsForETA) && incidentCoordsForETA.length === 2) {
            eta = await calculateETAForUnit(unit.roepnummer, incidentCoordsForETA as [number, number], unit.post);
          }
          return {
            ...unit,
            eta,
            type: unit.rollen[0] || ''
          };
        })
      );
      setIvAllBrwUnits(allBrwUnitsWithETA);
      
      // Auto-select beste eenheden voor elke rol (op basis van ETA)
      const autoSelected = new Set<string>();
      Object.values(roleMatches).forEach((match) => {
        const beschikbaar = Array.isArray(match?.beschikbaar) ? match.beschikbaar : [];
        if (beschikbaar.length > 0) {
          const bestUnit = beschikbaar[0]; // Eerste eenheid heeft laagste ETA
          const roepnummer = typeof bestUnit === 'string' ? bestUnit : bestUnit.roepnummer;
          autoSelected.add(roepnummer);
        }
      });
      setIvSelectedUnits(autoSelected);
      
      // Force re-render door state update
      console.log('🔄 Inzetvoorstel state bijgewerkt, verwacht re-render met ETA data');
      setShowInzetvoorstel(true);
      setActiveLoggingTab('hist-meldblok');
      
      // Start live ETA updates (elke 30 seconden)
      if (etaUpdateIntervalRef.current) {
        clearInterval(etaUpdateIntervalRef.current);
      }
      etaUpdateIntervalRef.current = setInterval(async () => {
        if (selectedIncident?.coordinates) {
          const newEtaMap: Record<string, number> = {};
          // Gebruik Promise.all voor parallelle updates
          const updatePromises: Promise<void>[] = [];
          Object.values(roleMatches).forEach((match) => {
            match.beschikbaar.forEach((unit) => {
              const roepnummer = typeof unit === 'string' ? unit : unit.roepnummer;
              // Vind post voor deze eenheid uit allBrwUnitsData
              const unitData = allBrwUnitsData.find(u => u.roepnummer === roepnummer);
              const unitPost = unitData?.post;
              updatePromises.push(
                calculateETAForUnit(roepnummer, selectedIncident.coordinates as [number, number], unitPost).then((eta) => {
                  if (eta !== null) {
                    newEtaMap[roepnummer] = eta;
                  }
                })
              );
            });
          });
          await Promise.all(updatePromises);
          setUnitETAs(prev => ({ ...prev, ...newEtaMap }));
        }
      }, 30000); // Update elke 30 seconden

      const tijdStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
      addSystemLoggingEntry(`🚒 ${extended ? 'Uitgebreid ' : ''}Inzetvoorstel gegenereerd: ${voorstel.totaal.join(', ')}`);

      // Logging per rol met gevonden roepnummers (voorkeur beschikbaar)
      Object.entries(roleMatches).forEach(([role, lists]) => {
        const beschikbaar = Array.isArray(lists.beschikbaar) ? lists.beschikbaar : [];
        if (beschikbaar.length > 0) {
          const eenhedenMetETA = beschikbaar.map((unit: any) => {
            const roepnummer = typeof unit === 'string' ? unit : unit.roepnummer;
            const eta = typeof unit === 'object' && unit.eta !== null ? formatETA(unit.eta) : '';
            return eta ? `${roepnummer} (${eta})` : roepnummer;
          }).join(', ');
          addSystemLoggingEntry(`🔥 ${role}: ${eenhedenMetETA}`);
        } else {
          addSystemLoggingEntry(`🔥 ${role}: geen beschikbare BRW-eenheden gevonden`);
        }
      });

      console.log('✅ Inzetvoorstel + BRW matches:', voorstel);
    })();

    // return direct een minimale structuur; volledige wordt async gezet
    return {
      base: result.base,
      extra: result.extra,
      totaal: result.totaal,
      toelichting: result.toelichting,
      mc1,
      mc2,
      mc3,
      functie,
      extended,
      timestamp: new Date().toLocaleString('nl-NL')
    };
  };

  // Toggle selectie van eenheid in IV-scherm (zonder koppelen)
  const toggleIvUnitSelection = async (roepnummer: string) => {
    setIvSelectedUnits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roepnummer)) {
        // Deselecteren: verwijder ook inzetrol
        newSet.delete(roepnummer);
        setIvUnitRoles(prevRoles => {
          const newRoles = new Map(prevRoles);
          newRoles.delete(roepnummer);
          return newRoles;
        });
      } else {
        // Selecteren: bepaal en wijs inzetrol toe
        newSet.add(roepnummer);
        
        // Bepaal inzetrol op basis van incident en voertuigtype
        void (async () => {
          if (!selectedIncident) return;
          
          // Haal voertuigtype op uit brwUnitsMap of ivAllBrwUnits
          const unit = brwUnitsMap[roepnummer] || ivAllBrwUnits.find(u => u.roepnummer === roepnummer);
          if (!unit) {
            console.warn(`⚠️ Eenheid ${roepnummer} niet gevonden voor inzetrol bepaling`);
            return;
          }
          
          // Bepaal voertuigtype (eerste rol of type)
          const voertuigtype = unit.type || unit.rollen[0] || 'Onbekend';
          
          // Haal MC1 en MC2 op uit incident
          const mc1 = selectedIncident.mc1 || selectedMC1 || '';
          const mc2 = selectedIncident.mc2 || selectedMC2 || '';
          
          // Haal karakteristieken op
          const karakteristieken = selectedKarakteristieken || [];
          
          try {
            // Bepaal inzetrol
            const inzetrol = await getInzetrolForIncidentAndVehicle(
              mc1,
              mc2,
              karakteristieken,
              voertuigtype
            );
            
            if (inzetrol) {
              // Sla inzetrol op
              setIvUnitRoles(prevRoles => {
                const newRoles = new Map(prevRoles);
                newRoles.set(roepnummer, inzetrol);
                return newRoles;
              });
              
              console.log(`✅ Inzetrol "${inzetrol}" toegewezen aan ${roepnummer} voor MC1="${mc1}", MC2="${mc2}", voertuigtype="${voertuigtype}"`);
            } else {
              console.warn(`⚠️ Geen inzetrol gevonden voor ${roepnummer}`);
            }
          } catch (error) {
            console.error(`❌ Fout bij bepalen inzetrol voor ${roepnummer}:`, error);
          }
        })();
      }
      return newSet;
    });
  };

  // Herbereken inzetrollen voor alle geselecteerde eenheden
  const recalculateInzetrollen = async () => {
    if (!selectedIncident || ivSelectedUnits.size === 0) {
      return;
    }

    const mc1 = selectedIncident.mc1 || selectedMC1 || '';
    const mc2 = selectedIncident.mc2 || selectedMC2 || '';
    const karakteristieken = selectedKarakteristieken || [];

    const newRoles = new Map<string, string>();

    // Herbereken voor alle geselecteerde eenheden
    for (const roepnummer of ivSelectedUnits) {
      const unit = brwUnitsMap[roepnummer] || ivAllBrwUnits.find(u => u.roepnummer === roepnummer);
      if (!unit) continue;

      const voertuigtype = unit.type || unit.rollen[0] || 'Onbekend';

      try {
        const inzetrol = await getInzetrolForIncidentAndVehicle(
          mc1,
          mc2,
          karakteristieken,
          voertuigtype
        );

        if (inzetrol) {
          newRoles.set(roepnummer, inzetrol);
          console.log(`✅ Inzetrol herberekend voor ${roepnummer}: "${inzetrol}"`);
        }
      } catch (error) {
        console.error(`❌ Fout bij herberekenen inzetrol voor ${roepnummer}:`, error);
      }
    }

    // Update state
    setIvUnitRoles(newRoles);
    console.log(`🔄 Inzetrollen herberekend voor ${newRoles.size} eenheden`);
  };

  // Auto-select beste eenheid (laagste ETA) voor key roles in IV-scherm
  const autoSelectKeyBrwUnits = () => {
    if (!inzetvoorstel || !inzetvoorstel.brwMatches) return;

    const normalizeRole = (s: string) => (s || '').replace(/^\d+\s*/, '').trim().toUpperCase();
    const desiredRoles = ['TS-6', 'RV', 'WO', 'DA-OD'];

    const newSelected = new Set(ivSelectedUnits);

    for (const desired of desiredRoles) {
      // Find the matching role key in brwMatches (keys may include counts like "1 TS-6")
      const roleKey = Object.keys(inzetvoorstel.brwMatches).find(k => normalizeRole(k) === desired);
      if (!roleKey) continue;
      const m = inzetvoorstel.brwMatches[roleKey];
      
      // m.beschikbaar is nu een array van { roepnummer, eta } objecten, gesorteerd op ETA
      const beschikbaar = Array.isArray(m?.beschikbaar) ? m.beschikbaar : [];
      
      // Zoek de eerste beschikbare eenheid met de laagste ETA die nog niet is geselecteerd
      const candidate = beschikbaar.find((unit: any) => {
        const roepnummer = typeof unit === 'string' ? unit : unit.roepnummer;
        return !newSelected.has(roepnummer);
      });
      
      if (candidate) {
        const roepnummer = typeof candidate === 'string' ? candidate : candidate.roepnummer;
        newSelected.add(roepnummer);
      }
    }
    
    setIvSelectedUnits(newSelected);
  };

  // Accepteer IV: koppel alle geselecteerde eenheden en start movement
  const handleAcceptIV = async () => {
    if (!selectedIncident) {
      addSystemLoggingEntry('❌ Geen incident geselecteerd');
      return;
    }

    if (ivSelectedUnits.size === 0) {
      addSystemLoggingEntry('⚠️ Geen eenheden geselecteerd om te koppelen');
      return;
    }

    // Verzamel eerst alle units die gekoppeld moeten worden
    const unitsToAdd: AssignedUnit[] = [];
    const now = new Date().toTimeString().slice(0, 5);
    const existingRoepnummers = new Set((selectedIncident.assignedUnits || []).map(u => u.roepnummer));

    // Koppel alle geselecteerde eenheden
    for (const roepnummer of ivSelectedUnits) {
      // Skip als al gekoppeld
      if (existingRoepnummers.has(roepnummer)) {
        addSystemLoggingEntry(`⚠️ Eenheid ${roepnummer} is al gekoppeld aan incident #${selectedIncident.nr}`);
        continue;
      }

      const unit = brwUnitsMap[roepnummer] || ivAllBrwUnits.find(u => u.roepnummer === roepnummer);
      const soort_voertuig = unit?.gmsNaam || (unit?.rollen?.[0] || 'BRW-eenheid');
      
      // Haal inzetrol op uit ivUnitRoles
      const inzetrol = ivUnitRoles.get(roepnummer);

      const newUnit: AssignedUnit = { 
        roepnummer, 
        soort_voertuig,
        inzetrol: inzetrol || undefined, // Voeg inzetrol toe als beschikbaar
        huidige_status: 'ov', // Opdracht verstrekt
        ov_tijd: now 
      };
      
      // Gebruik centrale statusmodule
      setUnitStatusCentral(newUnit, 'ov', {
        incidentId: selectedIncident.id
      });

      unitsToAdd.push(newUnit);
      addSystemLoggingEntry(`🧩 Eenheid ${roepnummer} gekoppeld aan incident #${selectedIncident.nr} - Status: OV`);
    }

    // Voeg alle units in één keer toe aan het incident
    if (unitsToAdd.length > 0) {
      const updatedAssigned = Array.isArray(selectedIncident.assignedUnits) 
        ? [...selectedIncident.assignedUnits, ...unitsToAdd]
        : unitsToAdd;
      
      const updatedIncident = { ...selectedIncident, assignedUnits: updatedAssigned } as any;
      setSelectedIncident(updatedIncident);
      setIncidents(prev => prev.map(inc => inc.id === updatedIncident.id ? updatedIncident : inc));
      
      // Update database
      await updateSelectedIncident(updatedIncident);

      // Start movement engine voor alle gekoppelde units als coördinaten beschikbaar zijn
      if (selectedIncident.coordinates && Array.isArray(selectedIncident.coordinates) && selectedIncident.coordinates.length === 2) {
        const [lng, lat] = selectedIncident.coordinates;
        
        for (const unit of unitsToAdd) {
          // Dispatch event om movement te starten (wordt opgepikt door globalUnitMovement)
          window.dispatchEvent(new CustomEvent('unitMovementStarted', {
            detail: { 
              roepnummer: unit.roepnummer, 
              targetLat: lat, 
              targetLng: lng, 
              targetType: 'incident', 
              targetId: selectedIncident.id 
            }
          }));
        }
      }
    }

    addSystemLoggingEntry(`✅ IV geaccepteerd: ${unitsToAdd.length} eenhe${unitsToAdd.length === 1 ? 'id' : 'den'} gekoppeld`);
    
    // Sluit IV-scherm en reset selectie
    setShowInzetvoorstel(false);
    setInzetvoorstel(null);
    setIvSelectedUnits(new Set());
  };

  // Auto-assign beste eenheid (laagste ETA) voor key roles (oude functie, behouden voor backwards compatibility)
  const autoAssignKeyBrwUnits = () => {
    if (!inzetvoorstel || !inzetvoorstel.brwMatches) return;
    if (!selectedIncident) return;

    const normalizeRole = (s: string) => (s || '').replace(/^\d+\s*/, '').trim().toUpperCase();
    const desiredRoles = ['TS-6', 'RV', 'WO', 'DA-OD'];

    const alreadyPicked = new Set<string>();

    for (const desired of desiredRoles) {
      // Find the matching role key in brwMatches (keys may include counts like "1 TS-6")
      const roleKey = Object.keys(inzetvoorstel.brwMatches).find(k => normalizeRole(k) === desired);
      if (!roleKey) continue;
      const m = inzetvoorstel.brwMatches[roleKey];
      
      // m.beschikbaar is nu een array van { roepnummer, eta } objecten, gesorteerd op ETA
      const beschikbaar = Array.isArray(m?.beschikbaar) ? m.beschikbaar : [];
      
      // Zoek de eerste beschikbare eenheid met de laagste ETA die nog niet is toegewezen
      const candidate = beschikbaar.find((unit: any) => {
        const roepnummer = typeof unit === 'string' ? unit : unit.roepnummer;
        return !isBrwUnitAssigned(roepnummer) && !alreadyPicked.has(roepnummer);
      });
      
      if (candidate) {
        const roepnummer = typeof candidate === 'string' ? candidate : candidate.roepnummer;
        const eta = typeof candidate === 'object' && candidate.eta !== null ? formatETA(candidate.eta) : '';
        toggleAssignBrwUnit(roepnummer);
        alreadyPicked.add(roepnummer);
        addSystemLoggingEntry(`🔗 Automatisch gekoppeld (${desired}): ${roepnummer}${eta ? ` - Aanrijdtijd: ${eta}` : ''}`);
      } else {
        addSystemLoggingEntry(`⚠️ Geen geschikte eenheid gevonden voor ${desired}`);
      }
    }
  };

  // Function to merge incidents (DUB functionality)
  const handleDubMerge = (targetIncident: GmsIncident) => {
    if (!selectedIncident) {
      addSystemLoggingEntry("❌ Geen hoofdincident geselecteerd voor samenvoegen");
      return;
    }

    if (selectedIncident.id === targetIncident.id) {
      addSystemLoggingEntry("❌ Kan incident niet met zichzelf samenvoegen");
      return;
    }

    console.log(`🔗 DUB: Merging incident ${targetIncident.nr} into ${selectedIncident.nr}`);

    // Create timestamp for merge operation
    const now = new Date();
    const dateStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = now.getFullYear();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const timestamp = `${dateStr}:${monthStr} ${yearStr} ${timeStr} OC RTD`;

    // Combine karakteristieken (remove duplicates based on ktCode)
    const combinedKarakteristieken = [
      ...(selectedIncident.karakteristieken || []),
      ...(targetIncident.karakteristieken || []).filter(targetKar => 
        !(selectedIncident.karakteristieken || []).some(existingKar => 
          existingKar.ktCode === targetKar.ktCode && existingKar.ktNaam === targetKar.ktNaam
        )
      )
    ];

    // Combine assigned units (remove duplicates based on roepnummer)
    const combinedUnits = [
      ...(selectedIncident.assignedUnits || []),
      ...(targetIncident.assignedUnits || []).filter(targetUnit => 
        !(selectedIncident.assignedUnits || []).some(existingUnit => 
          existingUnit.roepnummer === targetUnit.roepnummer
        )
      )
    ];

    // Combine notes with proper formatting
    const combinedNotes = [
      selectedIncident.notities || '',
      `\n[DUB ${new Date().toLocaleString('nl-NL')}] Incident ${targetIncident.nr} samengevoegd`,
      targetIncident.notities || ''
    ].filter(note => note.trim()).join('\n').trim();

    // Parse and combine logging entries
    const existingLoggingEntries = selectedIncident.meldingslogging ? 
      selectedIncident.meldingslogging.split('\n').filter(line => line.trim()) : [];
    const targetLoggingEntries = targetIncident.meldingslogging ? 
      targetIncident.meldingslogging.split('\n').filter(line => line.trim()) : [];

    // Create merge log entry
    const mergeLogEntry = `${timestamp} [DUB] Incident ${targetIncident.nr} samengevoegd`;
    
    // Combine all logging entries
    const combinedLogging = [
      ...existingLoggingEntries,
      mergeLogEntry,
      ...targetLoggingEntries
    ].join('\n');

    // Create merged incident with all combined data
    const mergedIncident: GmsIncident = {
      ...selectedIncident,
      karakteristieken: combinedKarakteristieken,
      assignedUnits: combinedUnits,
      notities: combinedNotes,
      meldingslogging: combinedLogging
    };

    console.log(`🔗 Creating merged incident:`, {
      originalId: selectedIncident.id,
      targetId: targetIncident.id,
      combinedKarakteristieken: combinedKarakteristieken.length,
      combinedUnits: combinedUnits.length,
      combinedNotesLength: combinedNotes.length
    });

    // Update incidents list - remove target, update selected
    setIncidents(prev => {
      const updatedIncidents = prev
        .filter(inc => inc.id !== targetIncident.id) // Remove target incident
        .map(inc => inc.id === selectedIncident.id ? mergedIncident : inc); // Update selected incident
      
      console.log(`🔗 Updated incidents list: removed incident ${targetIncident.nr}, ${updatedIncidents.length} incidents remaining`);
      return updatedIncidents;
    });

    // Update all related state
    setSelectedIncident(mergedIncident);
    setNotitiesText(combinedNotes);
    setSelectedKarakteristieken(combinedKarakteristieken);

    // Update logging entries display
    const allLoggingLines = combinedLogging.split('\n').filter(line => line.trim());
    const parsedEntries = allLoggingLines.map((line, index) => ({
      id: Date.now() + index + Math.random(),
      timestamp: line.length >= 20 ? line.substring(0, 20) : timestamp,
      message: line.length >= 20 ? line.substring(21) : line
    }));

    // Add current merge status to logging entries
    const mergeStatusEntries = [
      {
        id: Date.now() + 10000,
        timestamp,
        message: `🔗 Incident ${targetIncident.nr} succesvol samengevoegd`
      },
      {
        id: Date.now() + 10001,
        timestamp,
        message: `📊 ${(targetIncident.assignedUnits?.length || 0)} eenheden overgenomen`
      },
      {
        id: Date.now() + 10002,
        timestamp,
        message: `📋 ${(targetIncident.karakteristieken?.length || 0)} karakteristieken overgenomen`
      }
    ];

    setLoggingEntries([...mergeStatusEntries, ...parsedEntries]);

    // Close DUB content and switch back to logging tab
    setShowDubContent(false);
    setActiveLoggingTab('hist-meldblok');

    // Show success message
    addSystemLoggingEntry(`✅ DUB voltooid: Incident ${targetIncident.nr} samengevoegd met ${selectedIncident.nr}`);

    console.log(`✅ DUB: Incident ${targetIncident.nr} successfully merged into ${selectedIncident.nr}`);
  };

  // Generate P2000 format: P[urgentiecijfer] [GESPREKSGROEP] [MC3] [ADRES] [PLAATSNAAM] [ROEPNUMMERS]
  const generateP2000Format = () => {
    const prio = selectedIncident?.prio || priorityValue;
    const mc = selectedIncident?.mc3 || selectedMC3 || selectedIncident?.mc2 || selectedMC2 || selectedIncident?.mc1 || selectedMC1 || "";
    const adres = selectedIncident?.straatnaam && selectedIncident?.huisnummer 
      ? `${selectedIncident.straatnaam.toUpperCase()} ${selectedIncident.huisnummer}${selectedIncident.toevoeging ? selectedIncident.toevoeging : ''}`
      : formData.straatnaam && formData.huisnummer
      ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
      : (selectedIncident?.locatie || "").toUpperCase();
    const plaatsnaam = (selectedIncident?.plaatsnaam || formData.plaatsnaam || "").toUpperCase();
    const roepnummers = selectedIncident?.assignedUnits?.length ? selectedIncident.assignedUnits.map(u => u.roepnummer).join(" ") : "";

    // Check for gespreksgroep karakteristiek (code "gg")
    const gespreksgroepKarakteristiek = [...selectedKarakteristieken, ...(selectedIncident?.karakteristieken || [])].find(
      k => k.ktCode === 'gg' || k.ktCode === 'GG'
    );
    
    // Use gespreksgroep waarde if available, otherwise use default "1"
    const kanaalOfGroep = gespreksgroepKarakteristiek?.waarde 
      ? gespreksgroepKarakteristiek.waarde.toUpperCase()
      : "1";

    const parts = [
      `P${prio}`,
      kanaalOfGroep,
      mc ? mc : "",
      adres,
      plaatsnaam,
      roepnummers
    ].filter(part => part && part.trim() !== "");

    return parts.join(" ");
  };

  return (
    <div className="gms2-container">
      {/* P2000 Alarm Screen Popup */}
      {showP2000Screen && (
        <div className="gms2-p2000-overlay">
          <div className="gms2-p2000-window">
            <div className="gms2-p2000-header">
              <span className="gms2-p2000-title">P2000 Alarmering</span>
              <button 
                className="gms2-p2000-close"
                onClick={() => setShowP2000Screen(false)}
              >
                ✕
              </button>
            </div>

            <div className="gms2-p2000-content">
              <div className="gms2-p2000-info-bar">
                <span>🚨 ALARMERING ACTIEF</span>
                <span className="gms2-p2000-time">
                  {String(currentTime.getHours()).padStart(2, '0')}:
                  {String(currentTime.getMinutes()).padStart(2, '0')}:
                  {String(currentTime.getSeconds()).padStart(2, '0')}
                </span>
              </div>

              {/* Editable Pager Text Section */}
              <div className="gms2-p2000-current-incident">
                <div className="gms2-p2000-section-header">
                  Pagertext Editor
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                    className="gms2-btn"
                    onClick={() => {
                      const now = new Date();
                      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                      
                      // Add to logging
                      addLoggingEntry(`🚨 ALARMERING VERZONDEN: "${pagerText}" om ${timeStr}`);
                      
                      // Dispatch P2000 alarm event to lightboard
                      const alarmEvent = new CustomEvent('p2000-alarm', {
                        detail: {
                          id: selectedIncident?.nr?.toString() || getNextIncidentNumber().toString(),
                          type: selectedMC3 || selectedMC2 || selectedMC1 || "ALARM",
                          location: formData.straatnaam && formData.huisnummer 
                            ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}, ${formData.plaatsnaam?.toUpperCase() || 'ONBEKEND'}`
                            : "LOCATIE ONBEKEND",
                          pagerText: pagerText
                        }
                      });
                      window.dispatchEvent(alarmEvent);
                      
                      // Create new P2000 entry for current incident/melding
                      const currentIncident = selectedIncident || {
                        nr: getNextIncidentNumber(),
                        prio: priorityValue,
                        tijd: timeStr,
                        mc: selectedMC3 || selectedMC2 || selectedMC1 || "Onbekend",
                        locatie: formData.straatnaam && formData.huisnummer 
                          ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
                          : "Locatie onbekend",
                        plaatsnaam: formData.plaatsnaam || "Plaats onbekend",
                        tijdstip: new Date().toISOString(),
                        mc1: selectedMC1,
                        mc2: selectedMC2,
                        mc3: selectedMC3
                      };
                      
                      // Add current melding to incidents list if it's not already there
                      if (!selectedIncident) {
                        const newIncident: GmsIncident = {
                          id: Date.now(),
                          nr: currentIncident.nr,
                          prio: currentIncident.prio,
                          tijd: currentIncident.tijd,
                          mc: currentIncident.mc,
                          locatie: currentIncident.locatie,
                          plaats: formData.plaatsnaam?.substring(0, 3).toUpperCase() || "",
                          roepnr: formData.roepnummer || "",
                          positie: "",
                          melderNaam: formData.melderNaam,
                          melderAdres: formData.melderAdres,  
                          telefoonnummer: formData.telefoonnummer,
                          straatnaam: formData.straatnaam,
                          huisnummer: formData.huisnummer,
                          toevoeging: formData.toevoeging,
                          postcode: formData.postcode,
                          plaatsnaam: formData.plaatsnaam,
                          gemeente: formData.gemeente,
                          coordinates: formData.coordinates,
                          functie: formData.functie,
                          mc1: selectedMC1,
                          mc2: selectedMC2,
                          mc3: selectedMC3,
                          notities: notitiesText,
                          karakteristieken: selectedKarakteristieken,
                          status: "Gealarmeerd",
                          meldingslogging: loggingEntries.map(entry => `${entry.timestamp} ${entry.message}`).join('\n'),
                          tijdstip: new Date().toISOString(),
                          prioriteit: priorityValue
                        };
                        
                        setIncidents(prev => [newIncident, ...prev]);
                        setSelectedIncident(newIncident);
                        
                        // Dispatch custom event voor real-time map updates
                        window.dispatchEvent(new CustomEvent('gms2IncidentsUpdated'));
                        
                        // Dispatch P2000 alarm event to lightboard
                        const alarmEvent = new CustomEvent('p2000-alarm', {
                          detail: {
                            id: newIncident.nr.toString(),
                            type: selectedMC3 || selectedMC2 || selectedMC1 || "ALARM",
                            location: formData.straatnaam && formData.huisnummer 
                              ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}, ${formData.plaatsnaam?.toUpperCase() || 'ONBEKEND'}`
                              : "LOCATIE ONBEKEND",
                            pagerText: pagerText || `${selectedMC3 || selectedMC2 || selectedMC1 || "ALARM"} - ${formData.straatnaam || "ONBEKEND"}`
                          }
                        });
                        window.dispatchEvent(alarmEvent);
                      } else {
                        // Update existing incident status
                        const updatedIncident = {
                          ...selectedIncident,
                          status: "Gealarmeerd"
                        };
                        setIncidents(prev => prev.map(inc => 
                          inc.id === selectedIncident.id ? updatedIncident : inc
                        ));
                        setSelectedIncident(updatedIncident);
                        
                        // Dispatch P2000 alarm event to lightboard for existing incident
                        const alarmEvent = new CustomEvent('p2000-alarm', {
                          detail: {
                            id: selectedIncident.nr.toString(),
                            type: selectedMC3 || selectedMC2 || selectedMC1 || selectedIncident.mc || "ALARM",
                            location: selectedIncident.straatnaam && selectedIncident.huisnummer 
                              ? `${selectedIncident.straatnaam.toUpperCase()} ${selectedIncident.huisnummer}${selectedIncident.toevoeging ? selectedIncident.toevoeging : ''}, ${selectedIncident.plaatsnaam?.toUpperCase() || 'ONBEKEND'}`
                              : selectedIncident.locatie || "LOCATIE ONBEKEND",
                            pagerText: pagerText || `${selectedMC3 || selectedMC2 || selectedMC1 || selectedIncident.mc || "ALARM"} - ${selectedIncident.locatie || "ONBEKEND"}`
                          }
                        });
                        window.dispatchEvent(alarmEvent);
                      }
                    }}
                    style={{ marginLeft: '10px', background: '#ff4444', color: 'white' }}
                  >
                    🚨 ALARMEER
                  </button>
                  </div>
                </div>
                <textarea 
                  className="gms2-p2000-pager-edit"
                  value={pagerText}
                  onChange={(e) => setPagerText(e.target.value)}
                  rows={2}
                  placeholder="P[prio] [gespreksgroep] [classificatie] [adres] [plaats] [roepnummers]"
                  style={{ 
                    width: '100%', 
                    background: '#000080', 
                    color: '#00ff00', 
                    fontFamily: 'Courier New', 
                    fontSize: '11px',
                    border: '1px solid #008000',
                    padding: '4px'
                  }}
                /></div>

              <div className="gms2-p2000-full-screen">
                {/* Realistic P2000 Feed like in the image */}
                <div className="gms2-p2000-feed">
                  

                  {/* Live P2000 Feed Entries */}
                  {/* Show current pager text as live entry when alarm is sent */}
                  {pagerText && (
                    <div className="gms2-p2000-entry live-alarm">
                      <div className="gms2-p2000-datetime">{new Date().toLocaleDateString('nl-NL')}</div>
                      <div className="gms2-p2000-time">{String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}</div>
                      <div className="gms2-p2000-message">{pagerText}</div>
                      <div className="gms2-p2000-capcode">GMS2 ALARMERING VERZONDEN</div>
                      <div className="gms2-p2000-unit">🚨 LIVE UITZENDERING</div>
                    </div>
                  )}

                  {/* Add current incident if selected */}
                  {selectedIncident && (
                    <div className="gms2-p2000-entry current">
                      <div className="gms2-p2000-datetime">{new Date().toLocaleDateString('nl-NL')}</div>
                      <div className={`gms2-p2000-priority prio-${selectedIncident.prio}`}>Prio {selectedIncident.prio}</div>
                      <div className="gms2-p2000-message">
                        Prio {selectedIncident.prio} {selectedIncident.mc3 || selectedIncident.mc2 || selectedIncident.mc1} {selectedIncident.locatie}
                      </div>
                      <div className="gms2-p2000-address">Adres: {selectedIncident.locatie}, {selectedIncident.plaatsnaam}</div>
                      <div className="gms2-p2000-capcode">1401{String(selectedIncident.nr).slice(-3)} {selectedIncident.tijd} Haaglanden</div>
                      <div className="gms2-p2000-unit">GMS Dispatch Systeem</div>
                    </div>
                  )}
                  {
                    incidents.slice(0, 7).map((incident) => (
                      <div key={incident.id} className="gms2-p2000-entry">
                      <div className="gms2-p2000-datetime">{new Date(incident.tijdstip).toLocaleDateString('nl-NL')}</div>
                      <div className={`gms2-p2000-priority prio-${incident.prio}`}>Prio {incident.prio}</div>
                      <div className="gms2-p2000-message">
                        Prio {incident.prio} {incident.mc3 || incident.mc2 || incident.mc1} {incident.locatie}
                      </div>
                      <div className="gms2-p2000-address">Adres: {incident.locatie}, {incident.plaatsnaam}</div>
                      <div className="gms2-p2000-capcode">1401{String(incident.nr).slice(-3)} {incident.tijd} Haaglanden</div>
                      <div className="gms2-p2000-unit">GMS Dispatch Systeem</div>
                    </div>
                    ))
                  }
                </div>

                {/* Functionarissen/Capcodes Panel */}
                <div className="gms2-p2000-functionarissen">
                  <div className="gms2-p2000-section-header">Functionarissen & Capcodes</div>
                  <div className="gms2-functionarissen-grid">
                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="persvoorlichting"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430020");
                            addSystemLoggingEntry("📢 Persalarm (capcode: 1430020) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430020", ""));
                            addSystemLoggingEntry("📢 Persalarm (capcode: 1430020) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="persvoorlichting" className="gms2-functionaris-label">
                        <span className="functionaris-name">Persalarm</span>
                        <span className="functionaris-capcode">(capcode: 1430020)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="tev-piket"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430050");
                            addSystemLoggingEntry("🔍 TEV piket (capcode: 1430050) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430050", ""));
                            addSystemLoggingEntry("🔍 TEV piket (capcode: 1430050) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="tev-piket" className="gms2-functionaris-label">
                        <span className="functionaris-name">TEV piket</span>
                        <span className="functionaris-capcode">(capcode: 1430050)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="officier-dienst"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430030");
                            addSystemLoggingEntry("👮 Officier van Dienst (capcode: 1430030) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430030", ""));
                            addSystemLoggingEntry("👮 Officier van Dienst (capcode: 1430030) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="officier-dienst" className="gms2-functionaris-label">
                        <span className="functionaris-name">Officier van Dienst</span>
                        <span className="functionaris-capcode">(capcode: 1430030)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="bvt"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430060");
                            addSystemLoggingEntry("🕵️ BVT (capcode: 1430060) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430060", ""));
                            addSystemLoggingEntry("🕵️ BVT (capcode: 1430060) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="bvt" className="gms2-functionaris-label">
                        <span className="functionaris-name">BVT</span>
                        <span className="functionaris-capcode">(capcode: 1430060)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="hovj"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430040");
                            addSystemLoggingEntry("⚖️ HOVJ (capcode: 1430040) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430040", ""));
                            addSystemLoggingEntry("⚖️ HOVJ (capcode: 1430040) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="hovj" className="gms2-functionaris-label">
                        <span className="functionaris-name">HOVJ</span>
                        <span className="functionaris-capcode">(capcode: 1430040)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="verkeersongevallenanalyse"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430070");
                            addSystemLoggingEntry("🚗 VOA (capcode: 1430070) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430070", ""));
                            addSystemLoggingEntry("🚗 VOA (capcode: 1430070) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="verkeersongevallenanalyse" className="gms2-functionaris-label">
                        <span className="functionaris-name">VOA</span>
                        <span className="functionaris-capcode">(capcode: 1430070)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="coordinatie-centrum"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430080");
                            addSystemLoggingEntry("📞 Coördinatie Centrum (capcode: 1430080) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430080", ""));
                            addSystemLoggingEntry("📞 Coördinatie Centrum (capcode: 1430080) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="coordinatie-centrum" className="gms2-functionaris-label">
                        <span className="functionaris-name">Coördinatie Centrum</span>
                        <span className="functionaris-capcode">(capcode: 1430080)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="forensische-opsporing"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430090");
                            addSystemLoggingEntry("🔬 Forensische Opsporing (capcode: 1430090) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430090", ""));
                            addSystemLoggingEntry("🔬 Forensische Opsporing (capcode: 1430090) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="forensische-opsporing" className="gms2-functionaris-label">
                        <span className="functionaris-name">Forensische Opsporing</span>
                        <span className="functionaris-capcode">(capcode: 1430090)</span>
                      </label>
                    </div>

                    <div className="gms2-functionaris-item">
                      <input 
                        type="checkbox" 
                        id="fo-piket-rotterdam"
                        checked={foPiketChecked}
                        onChange={(e) => {
                          setFoPiketChecked(e.target.checked);
                          if (e.target.checked) {
                            setPagerText(prev => prev + " 1430100");
                            addSystemLoggingEntry("🕵️ FO piket Rotterdam (capcode: 1430100) toegevoegd");
                          } else {
                            setPagerText(prev => prev.replace(" 1430100", ""));
                            addSystemLoggingEntry("🕵️ FO piket Rotterdam (capcode: 1430100) verwijderd");
                          }
                        }}
                      />
                      <label htmlFor="fo-piket-rotterdam" className="gms2-functionaris-label">
                        <span className="functionaris-name">FO piket Rotterdam</span>
                        <span className="functionaris-capcode">(capcode: 1430100)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gms2-p2000-controls">
                <button className="gms2-btn">Filter POL</button>
                <button className="gms2-btn">Filter BRW</button>
                <button className="gms2-btn">Filter AMB</button>
                <button className="gms2-btn">Alle</button>
                <button className="gms2-btn">Pause</button>
                <button className="gms2-btn">Clear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inzetvoorstel Modal Popup - GMS Style */}
      {showInzetvoorstel && inzetvoorstel && (() => {
        // Bereken gefilterde en gesorteerde eenheden voor de tabel
        const filteredUnits = ivAllBrwUnits
          .filter(unit => {
            // Filter op zichtbaarheid en status
            if (unit.visible === false) return false;
            
            // Filter op status (buiten dienst units niet tonen)
            const statusDef = getStatusDef(unit.status);
            if (statusDef?.afkorting === 'fd' || unit.status === '4 - Niet inzetbaar') {
              return false;
            }
            
            // Alleen filteren als filtersEnabled = true
            if (ivFiltersEnabled) {
              // Filter op type
              if (ivFilterType && !unit.rollen.some(r => r.includes(ivFilterType))) {
                return false;
              }
              // Filter op status
              if (ivFilterStatus) {
                const statusLower = (unit.status || '').toLowerCase();
                if (ivFilterStatus === 'BS' && !statusLower.includes('beschikbaar') && !statusLower.includes('vrij')) return false;
                if (ivFilterStatus === 'KZ' && !statusLower.includes('kazerne')) return false;
                if (ivFilterStatus === 'NB' && !statusLower.includes('niet beschikbaar') && !statusLower.includes('inzetbaar')) return false;
              }
              // Filter op beschikbaarheid
              if (ivShowOnlyAvailable && !isAvailable(unit.roepnummer, unit.status)) {
                return false;
              }
              // Filter op max ETA
              if (unit.eta !== null && unit.eta !== undefined && unit.eta > ivFilterMaxETA) {
                return false;
              }
            }
            return true;
          })
          .map(unit => ({
            ...unit,
            eta: unit.eta ?? unitETAs[unit.roepnummer] ?? null
          }))
          .sort((a, b) => {
            // Sorteer op ETA (kortste eerst) - GEEN OVD-preferentie
            if (a.eta === null && b.eta === null) return 0;
            if (a.eta === null) return 1;
            if (b.eta === null) return -1;
            return a.eta - b.eta;
          });

        // Haal eenheden uit inzetvoorstel op met ETA's
        const inzetvoorstelUnits: Array<{ role: string; count: number; bestUnit?: { roepnummer: string; eta: number | null } }> = [];
        const roleCounts: Record<string, number> = {};
        (inzetvoorstel.totaal || []).forEach((u: string) => {
          const key = (u || '').trim();
          if (!key) return;
          roleCounts[key] = (roleCounts[key] || 0) + 1;
        });

        Object.entries(roleCounts).forEach(([role, count]) => {
          const match = inzetvoorstel.brwMatches?.[role];
          const bestUnit = match?.beschikbaar?.[0];
          inzetvoorstelUnits.push({
            role,
            count,
            bestUnit: bestUnit ? {
              roepnummer: typeof bestUnit === 'string' ? bestUnit : bestUnit.roepnummer,
              eta: typeof bestUnit === 'object' && bestUnit !== null ? bestUnit.eta : null
            } : undefined
          });
        });

        // Bereken snelste ETA
        const fastestETA = inzetvoorstelUnits
          .map(u => u.bestUnit?.eta)
          .filter((eta): eta is number => eta !== null && eta !== undefined)
          .sort((a, b) => a - b)[0];

        return (
          <div 
            className="gms2-p2000-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowInzetvoorstel(false);
                setInzetvoorstel(null);
              }
            }}
          >
            <div 
              className="gms2-p2000-window" 
              style={{ 
                maxWidth: '1000px', 
                maxHeight: '90vh',
                width: '95%',
                overflow: 'auto',
                background: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                fontSize: '11px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* GMS Blauwe Header */}
              <div style={{ 
                background: '#0066CC', 
                color: '#ffffff', 
                padding: '4px 8px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleAcceptIV}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      background: '#ffffff',
                      color: '#0066CC',
                      border: '1px solid #ffffff',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    title="Accepteer inzetvoorstel en koppel geselecteerde eenheden"
                  >
                    IV accepteren
                  </button>
                  <span>Inzetvoorstel (MAR)</span>
                </div>
                <button 
                  onClick={() => {
                    setShowInzetvoorstel(false);
                    setInzetvoorstel(null);
                    setIvSelectedUnits(new Set());
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 4px'
                  }}
                  title="Sluiten (ESC)"
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '12px', background: '#ffffff' }}>
                {/* SECTIE 0: VOORGESTELDE INZET (AUTOMATISCH OP BASIS VAN ETA) */}
                <div style={{ 
                  marginBottom: '16px', 
                  border: '1px solid #d0d0d0', 
                  background: '#f0f0f0', 
                  padding: '10px'
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    color: '#333'
                  }}>
                    VOORGESTELDE INZET (AUTOMATISCH OP BASIS VAN ETA)
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '6px',
                    fontSize: '10px'
                  }}>
                    {inzetvoorstelUnits.map((item, idx) => {
                      if (!item.bestUnit) return null;
                      const unit = ivAllBrwUnits.find(u => u.roepnummer === item.bestUnit!.roepnummer);
                      const type = unit?.type || unit?.rollen[0] || 'Onbekend';
                      const role = item.role;
                      return (
                        <div 
                          key={idx}
                          style={{
                            border: '1px solid #ccc',
                            background: '#ffffff',
                            padding: '4px 8px',
                            fontSize: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span style={{ fontWeight: 'bold' }}>{item.bestUnit.roepnummer}</span>
                          <span>|</span>
                          <span>{type} — {role}</span>
                          {item.bestUnit.eta !== null && (
                            <>
                              <span>|</span>
                              <span style={{ 
                                color: '#0066CC', 
                                fontFamily: 'monospace',
                                fontSize: '9px'
                              }}>
                                ETA: {formatETA(item.bestUnit.eta)}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {inzetvoorstelUnits.filter(item => item.bestUnit).length === 0 && (
                      <div style={{ fontSize: '9px', color: '#999', fontStyle: 'italic' }}>
                        Geen eenheden beschikbaar
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTIE 1: INZETVOORSTEL */}
                <div style={{ 
                  marginBottom: '16px', 
                  border: '1px solid #d0d0d0', 
                  background: '#f5f5f5', 
                  padding: '10px'
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    color: '#333'
                  }}>
                    INZETVOORSTEL
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    {inzetvoorstelUnits.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{
                          border: '1px solid #ccc',
                          background: '#ffffff',
                          padding: '6px 10px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ fontWeight: 'bold' }}>{item.count}× {item.role}</span>
                        {item.bestUnit && item.bestUnit.eta !== null && (
                          <span style={{ 
                            color: '#0066CC', 
                            fontFamily: 'monospace',
                            fontSize: '10px'
                          }}>
                            ETA: {formatETA(item.bestUnit.eta)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {fastestETA !== undefined && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#666',
                      marginTop: '4px'
                    }}>
                      Snelste aanrijdtijd: <strong>{formatETA(fastestETA)}</strong>
                    </div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={autoSelectKeyBrwUnits}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        background: '#0066CC',
                        color: '#ffffff',
                        border: '1px solid #0052A3',
                        cursor: 'pointer'
                      }}
                      title="Selecteer automatisch TS-6, RV, WO en DA-OD"
                    >
                      Automatisch selecteren
                    </button>
                  </div>
                </div>

                {/* SECTIE 2: FILTERS */}
                <div style={{ 
                  marginBottom: '16px', 
                  border: '1px solid #d0d0d0', 
                  background: ivFiltersEnabled ? '#f5f5f5' : '#e8e8e8', 
                  padding: '10px',
                  opacity: ivFiltersEnabled ? 1 : 0.7
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      color: '#333'
                    }}>
                      FILTERS
                    </div>
                    <button
                      onClick={() => setIvFiltersEnabled(!ivFiltersEnabled)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '9px',
                        background: ivFiltersEnabled ? '#0066CC' : '#999',
                        color: '#ffffff',
                        border: '1px solid #ccc',
                        cursor: 'pointer'
                      }}
                    >
                      {ivFiltersEnabled ? 'Filters verbergen' : 'Filters tonen'}
                    </button>
                  </div>
                  {ivFiltersEnabled && (
                    <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    {/* Type filters */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {['TS-6', 'RV', 'HV', 'WO', 'DA-OD', 'SI', 'OvD'].map(type => (
                        <button
                          key={type}
                          onClick={() => setIvFilterType(ivFilterType === type ? '' : type)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '9px',
                            background: ivFilterType === type ? '#0066CC' : '#e0e0e0',
                            color: ivFilterType === type ? '#ffffff' : '#333',
                            border: '1px solid #ccc',
                            cursor: 'pointer'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    {/* Status filters */}
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                      {['BS', 'KZ', 'NB'].map(status => (
                        <button
                          key={status}
                          onClick={() => setIvFilterStatus(ivFilterStatus === status ? '' : status)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '9px',
                            background: ivFilterStatus === status ? '#0066CC' : '#e0e0e0',
                            color: ivFilterStatus === status ? '#ffffff' : '#333',
                            border: '1px solid #ccc',
                            cursor: 'pointer'
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    {/* Max ETA filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                      <span style={{ fontSize: '9px' }}>ETA ≤</span>
                      <input
                        type="number"
                        value={ivFilterMaxETA === 999999 ? '' : Math.floor(ivFilterMaxETA / 60)}
                        onChange={(e) => {
                          const minutes = parseInt(e.target.value) || 0;
                          setIvFilterMaxETA(minutes > 0 ? minutes * 60 : 999999);
                        }}
                        placeholder="min"
                        style={{
                          width: '50px',
                          padding: '2px 4px',
                          fontSize: '9px',
                          border: '1px solid #ccc'
                        }}
                      />
                      <span style={{ fontSize: '9px' }}>min</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '9px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={ivShowAllUnits}
                        onChange={(e) => setIvShowAllUnits(e.target.checked)}
                      />
                      Alle eenheden tonen
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={ivShowOnlyAvailable}
                        onChange={(e) => setIvShowOnlyAvailable(e.target.checked)}
                      />
                      Alleen inzetbare eenheden
                    </label>
                  </div>
                    </>
                  )}
                  {!ivFiltersEnabled && (
                    <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic' }}>
                      Filters zijn uitgeschakeld. Klik op "Filters tonen" om filters te activeren.
                    </div>
                  )}
                </div>

                {/* SECTIE 3: ALLE BESCHIKBARE EENHEDEN (GMS-STYLE TABEL) */}
                <div style={{ 
                  marginBottom: '16px'
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    color: '#333'
                  }}>
                    ALLE BESCHIKBARE EENHEDEN (GESORTEERD OP ETA)
                  </div>
                  <div style={{ 
                    border: '1px solid #d0d0d0',
                    background: '#ffffff',
                    fontSize: '10px'
                  }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '10px',
                      fontFamily: 'Arial, sans-serif'
                    }}>
                      <thead>
                        <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #d0d0d0' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #d0d0d0', width: '30px' }}></th>
                          <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #d0d0d0' }}>Roepnummer</th>
                          <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #d0d0d0' }}>Type — Rol</th>
                          <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #d0d0d0' }}>Post</th>
                          <th style={{ padding: '4px 6px', textAlign: 'left', borderRight: '1px solid #d0d0d0' }}>Status</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>ETA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnits.map((unit, idx) => {
                          const isSelected = ivSelectedUnits.has(unit.roepnummer);
                          const type = unit.type || unit.rollen[0] || 'Onbekend';
                          
                          // Haal inzetrol op uit ivUnitRoles (als toegewezen)
                          let inzetrol = ivUnitRoles.get(unit.roepnummer);
                          
                          // Als geen inzetrol is toegewezen, gebruik fallback logica
                          if (!inzetrol) {
                            // Zoek de rol die deze eenheid heeft in het inzetvoorstel
                            let role = 'Onbekend';
                            if (inzetvoorstel?.brwMatches) {
                              for (const [roleKey, match] of Object.entries(inzetvoorstel.brwMatches)) {
                                const beschikbaar = Array.isArray(match?.beschikbaar) ? match.beschikbaar : [];
                                const found = beschikbaar.find((u: any) => {
                                  const roepnummer = typeof u === 'string' ? u : u.roepnummer;
                                  return roepnummer === unit.roepnummer;
                                });
                                if (found) {
                                  // Strip eventuele aantallen voor het type, bv. "1 TS-6" -> "TS-6"
                                  role = roleKey.replace(/^\d+\s*/, '').trim();
                                  break;
                                }
                              }
                            }
                            // Fallback naar eerste rol als niet gevonden in inzetvoorstel
                            if (role === 'Onbekend') {
                              role = unit.rollen.find(r => r !== type) || unit.rollen[0] || 'Onbekend';
                            }
                            inzetrol = role;
                          }
                          return (
                            <tr
                              key={idx}
                              onClick={() => toggleIvUnitSelection(unit.roepnummer)}
                              style={{
                                background: isSelected ? '#e3f2fd' : idx % 2 === 0 ? '#ffffff' : '#f9f9f9',
                                borderBottom: '1px solid #e0e0e0',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isSelected ? '#c5e1f5' : '#f0f0f0';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isSelected ? '#e3f2fd' : idx % 2 === 0 ? '#ffffff' : '#f9f9f9';
                              }}
                            >
                              <td style={{ padding: '4px 6px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleIvUnitSelection(unit.roepnummer)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td style={{ padding: '4px 6px', borderRight: '1px solid #e0e0e0', fontWeight: isSelected ? 'bold' : 'normal' }}>
                                {unit.roepnummer}
                              </td>
                              <td style={{ padding: '4px 6px', borderRight: '1px solid #e0e0e0' }}>
                                {type} — <strong style={{ color: isSelected ? '#0066cc' : '#333' }}>{inzetrol}</strong>
                              </td>
                              <td style={{ padding: '4px 6px', borderRight: '1px solid #e0e0e0' }}>
                                {unit.post || '-'}
                              </td>
                              <td style={{ padding: '4px 6px', borderRight: '1px solid #e0e0e0' }}>
                                {unit.status || '-'}
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace', color: unit.eta !== null ? '#0066CC' : '#999' }}>
                                {unit.eta !== null ? formatETA(unit.eta) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredUnits.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
                              Geen eenheden gevonden met de huidige filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTIE 4: EXTRA EENHEDEN TOEVOEGEN */}
                <div style={{ 
                  marginBottom: '16px',
                  fontSize: '10px',
                  color: '#666'
                }}>
                  Selecteer extra BRW-eenheden per rol om aan de melding toe te voegen (gesorteerd op aanrijdtijd).
                </div>

                {/* Footer */}
                <div style={{ 
                  fontSize: '9px', 
                  color: '#999', 
                  textAlign: 'center', 
                  paddingTop: '12px', 
                  borderTop: '1px solid #d0d0d0',
                  marginTop: '16px'
                }}>
                  Gegenereerd: {inzetvoorstel.timestamp} | MAR Standaard Brandweer Nederland
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top Menu Bar */}
      <div className="gms2-menu-bar">
        <div className="gms2-menu-left">
          <span className="gms2-menu-item">Start</span>
          <span className="gms2-menu-item">Beheer</span>
          <span className="gms2-menu-item">Incident</span>
          <span 
            className="gms2-menu-item" 
            onClick={handleWerkplekClick}
            style={{ cursor: 'pointer' }}
          >
            Werkplek
          </span>
          <span className="gms2-menu-item">Mail</span>
          <span className="gms2-menu-item">Configuratie</span>
          <span className="gms2-menu-item">GIS</span>
          <span className="gms2-menu-item">Telefoon</span>
          <span className="gms2-menu-item">Koppeling</span>
          <span className="gms2-menu-item">Help</span>
        </div>
        <div className="gms2-menu-right">
          <span className="gms2-menu-item">A</span>
          <span className="gms2-menu-item">m</span>
          <span className="gms2-menu-item">⊗</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="gms2-tab-bar">
        <div className="gms2-tab active">Oproepen</div>
        <div className="gms2-tab">Incidenten POL</div>
      </div>

      {/* Main Content Area */}
      <div className="gms2-main-content">
        {/* Left Panel - Incidents Table */}
        <div className="gms2-left-panel">
          {/* Lopende incidenten section */}
          <div className="gms2-section">
            <div className="gms2-section-header">Lopende incidenten</div>
            <div className="gms2-incidents-table">
              <div className="gms2-table-header">
                <span>Prio</span>
                <span>Locatie (Object - Straat)</span>
                <span>Plaats</span>
                <span>Classificatie</span>
                <span>Roepnr</span>
                <span>Nr</span>
                <span>Tijd</span>
                <span>Pos</span>
              </div>
              {/* Show incidents with assigned units */}
              {incidents.filter(incident => incident.assignedUnits && incident.assignedUnits.length > 0).map((incident) => {
                // Determine the most specific MC classification
                const mcClassification = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || '';
                // Get roepnummers of assigned units
                const assignedRoepnummers = incident.assignedUnits?.map(unit => unit.roepnummer).join(', ') || '';

                return (
                  <div 
                    key={incident.id} 
                    className={`gms2-table-row priority-${incident.prio} ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
                    onClick={() => handleIncidentSelect(incident)}
                  >
                    <span>{incident.prio}</span>
                    <span>{incident.locatie}</span>
                    <span>{incident.plaatsnaam || incident.plaats}</span>
                    <span className="gms2-mc-cell">{mcClassification}</span>
                    <span>{assignedRoepnummers}</span>
                    <span>{incident.nr}</span>
                    <span>{incident.tijd}</span>
                    <span>{incident.positie}</span>
                  </div>
                );
              })}
              {/* Fill remaining rows */}
              {Array.from({ length: Math.max(0, 8 - incidents.filter(incident => incident.assignedUnits && incident.assignedUnits.length > 0).length) }).map((_, index) => (
                <div key={`empty-lopend-${Date.now()}-${index}-${Math.random()}`} className="gms2-table-row">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Openstaande incidenten section */}
          <div className="gms2-section">
            <div className="gms2-section-header">Openstaande incidenten</div>
            <div className="gms2-incidents-table">
              <div className="gms2-table-header">
                <span>Prio</span>
                <span>Locatie (Object - Straat)</span>
                <span>Plaats</span>
                <span>Classificatie</span>
                <span>Roepnr</span>
                <span>Nr</span>
                <span>Tijd</span>
                <span>Pos</span>
              </div>
              {incidents.filter(incident => !incident.assignedUnits || incident.assignedUnits.length === 0).map((incident) => {
                // Determine the most specific MC classification
                const mcClassification = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || '';
                // Get roepnummers of assigned units (even for openstaande incidents in case they have units)
                const assignedRoepnummers = incident.assignedUnits?.map(unit => unit.roepnummer).join(', ') || incident.roepnr || '';

                return (
                  <div 
                    key={incident.id} 
                    className={`gms2-table-row priority-${incident.prio} ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
                    onClick={() => handleIncidentSelect(incident)}
                  >
                    <span>{incident.prio}</span>
                    <span>{incident.locatie}</span>
                    <span>{incident.plaatsnaam || incident.plaats}</span>
                    <span className="gms2-mc-cell">{mcClassification}</span>
                    <span>{assignedRoepnummers}</span>
                    <span>{incident.nr}</span>
                    <span>{incident.tijd}</span>
                    <span>{incident.positie}</span>
                  </div>
                );
              })}
              {/* Fill remaining rows */}
              {Array.from({ length: Math.max(0, 15 - incidents.filter(incident => !incident.assignedUnits || incident.assignedUnits.length === 0).length) }).map((_, index) => (
                <div key={`empty-openstaand-${Date.now()}-${index}-${Math.random()}`} className="gms2-table-row">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Map Component - synchroon met map.tsx */}
          <div className="gms2-section" style={{ height: '400px', minHeight: '400px' }}>
            <div className="gms2-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Kaart Overzicht</span>
              <button 
                className="gms2-btn small"
                onClick={() => setShowVoertuigen(!showVoertuigen)}
                style={{ 
                  marginLeft: '8px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  backgroundColor: showVoertuigen ? '#0066CC' : '#f0f0f0',
                  color: showVoertuigen ? '#fff' : '#333',
                  border: '1px solid #ccc',
                  cursor: 'pointer'
                }}
              >
                {showVoertuigen ? "Verberg Voertuigen" : "Toon Voertuigen"}
              </button>
            </div>
            <div style={{ height: 'calc(100% - 30px)', width: '100%', position: 'relative' }}>
              <MapComponent
                eenheden={[]}
                eenhedenPosities={{}}
                incidenten={mapIncidenten}
                kazernes={kazernes}
                showVoertuigen={showVoertuigen}
                center={[52.1, 5.3]}
                zoom={8}
                onMapReady={(map) => {
                  mapInstanceRef.current = map;
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Incident Details */}
        <div className="gms2-right-panel">
          {/* Incident Header */}
          <div className="gms2-incident-header">
            {selectedIncident ? `P:${selectedIncident.locatie || selectedIncident.mc || 'Bestaande melding'}` : 'P: Nieuwe melding'}
          </div>

              {/* Incident Form */}
          <div className="gms2-incident-form">
                {/* Title Row */}
                <div className="gms2-title-section">
                  <span className="gms2-title-text">P: {selectedIncident?.mc2 || 'Nieuwe melding'}</span>
                  <span className="gms2-incident-id">{selectedIncident?.nr || 'Nieuw'}</span>
                </div>

                {/* Time Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Tijd:</span>
                  <span className="gms2-time-display">
                    {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
                  </span>
                  <span className="gms2-field-label">Aangemaakt:</span>
                  <input type="text" className="gms2-input medium" value="OC-RT" readOnly />
                </div>

                {/* === MELDERGEGEVENS SECTIE === */}
                <div className="gms2-section-header">
                  <span className="gms2-section-title">Meldergegevens</span>
                </div>

                {/* Melder Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Melder:</span>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    value={formData.melderNaam}
                    onChange={(e) => handleFormChange('melderNaam', e.target.value)}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <span className="gms2-field-label">Tel:</span>
                  <input 
                    type="text" 
                    className="gms2-input medium" 
                    value={formData.telefoonnummer}
                    onChange={(e) => handleFormChange('telefoonnummer', e.target.value)}
                  />
                  <button 
                    className="gms2-btn small"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        melderNaam: "ANONIEM"
                      }));
                    }}
                  >
                    Anoniem
                  </button>
                </div>

                {/* Melder Adres Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Adres:</span>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    value={formData.melderAdres}
                    onChange={(e) => handleFormChange('melderAdres', e.target.value)}
                    style={{ width: '100px' }}
                  />
                  <span className="gms2-field-label">Gem:</span>
                  <input 
                    type="text" 
                    className="gms2-input small" 
                    value={formData.gemeente}
                    onChange={(e) => handleFormChange('gemeente', e.target.value)}
                    style={{ width: '90px' }}
                  />
                </div>

                {/* Visual separator between melder and location sections */}
                <div className="gms2-section-separator"></div>

                {/* === INCIDENTLOCATIE SECTIE === */}
                <div className="gms2-section-header">
                  <span className="gms2-section-title">Incidentlocatie</span>
                </div>

                {/* Row 1 - Straat, Nr and Object */}
                <div className="gms2-form-row">
                  <button className="gms2-btn small" style={{ minWidth: '30px', padding: '2px 4px' }}>1 S</button>
                  <input 
                    type="text" 
                    className="gms2-input" 
                    value={formData.straatnaam}
                    onChange={(e) => handleFormChange('straatnaam', e.target.value)}
                    placeholder="Straatnaam"
                    style={{ textTransform: 'uppercase', width: '50%', maxWidth: '200px' }}
                  />
                  <span className="gms2-field-label compact">Nr:</span>
                  <input 
                    type="text" 
                    className="gms2-input extra-small" 
                    value={formData.huisnummer}
                    onChange={(e) => handleFormChange('huisnummer', e.target.value)}
                  />
                  <span className="gms2-field-label compact">Obj:</span>
                  <input 
                    type="text" 
                    className="gms2-input" 
                    value={formData.object}
                    onChange={(e) => handleFormChange('object', e.target.value)}
                    placeholder="Object"
                    style={{ textTransform: 'uppercase', width: '60%', maxWidth: '300px' }}
                  />
                </div>

                {/* Row 2 - PC, Plts, Gem, Func */}
                <div className="gms2-form-row">
                  <input 
                    type="text" 
                    className="gms2-input postal" 
                    value={formData.postcode}
                    onChange={(e) => handleFormChange('postcode', e.target.value)}
                    placeholder="1234AB"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <span className="gms2-field-label compact">Plts:</span>
                  <input 
                    type="text" 
                    className="gms2-input place-wide" 
                    value={formData.plaatsnaam}
                    onChange={(e) => handleFormChange('plaatsnaam', e.target.value)}
                    placeholder="Plaats"
                    style={{ textTransform: 'uppercase', width: '140px' }}
                  />
                  <span className="gms2-field-label compact">Gem:</span>
                  <input 
                    type="text" 
                    className="gms2-input place-wide" 
                    value={formData.gemeente}
                    onChange={(e) => handleFormChange('gemeente', e.target.value)}
                    placeholder="Gemeente"
                    style={{ textTransform: 'uppercase', width: '180px' }}
                  />
                  <span className="gms2-field-label compact">Func:</span>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    value={formData.functie}
                    onChange={(e) => handleFormChange('functie', e.target.value)}
                    placeholder="Functie"
                    style={{ width: '50px' }}
                  />
                </div>

                {/* Row 3 - Empty entry line */}
                <div className="gms2-form-row">
                  <button className="gms2-btn small" style={{ minWidth: '30px', padding: '2px 4px' }}>2</button>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    placeholder=""
                    value={formData.extra}
                    onChange={(e) => handleFormChange('extra', e.target.value)}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                {/* Action Buttons Row */}
                <div className="gms2-button-row">
                  <button className="gms2-btn small">COM</button>
                  <button className="gms2-btn small">EDB</button>
                  <button 
                    className={`gms2-btn small ${showDubContent ? 'active' : ''}`}
                    onClick={() => {
                      setShowDubContent(!showDubContent);
                      if (!showDubContent) {
                        setActiveLoggingTab('hist-meldblok');
                      }
                    }}
                    title="Duplicaat - Voeg meldingen samen"
                  >
                    DUB
                  </button>
                  <button className="gms2-btn small">AOL</button>
                  <button className="gms2-btn small">OGS</button>
                  <button className="gms2-btn small">OBJ</button>
                  <button 
                    className="gms2-btn small"
                    onClick={async () => {
                      if (selectedIncident?.coordinates) {
                        setShowLocationDetails(true);
                        addSystemLoggingEntry("📍 Locatiegegevens worden opgehaald...");
                        
                        const details = await getDetailedLocationInfo(selectedIncident.coordinates);
                        if (details) {
                          setLocationDetails(details);
                          addSystemLoggingEntry("📍 Locatiegegevens opgehaald uit BAG en OSM");
                        } else {
                          addSystemLoggingEntry("❌ Geen locatiegegevens beschikbaar");
                        }
                      } else {
                        addSystemLoggingEntry("❌ Geen locatie geselecteerd");
                      }
                    }}
                    disabled={!selectedIncident?.coordinates}
                  >
                    LOC
                  </button>
                  <button 
                    className="gms2-btn small"
                    onClick={() => setShowP2000Screen(true)}
                  >
                    PROC
                  </button>
                  <button 
                    className="gms2-btn small"
                    onClick={() => void generateInzetvoorstel(false)}
                    title="Inzetvoorstel genereren (MAR standaard)"
                  >
                    IV
                  </button>
                  <button 
                    className="gms2-btn small"
                    onClick={() => void generateInzetvoorstel(true)}
                    title="Uitgebreid inzetvoorstel met opschalingsniveaus"
                  >
                    IV+
                  </button>
                  <button className="gms2-btn small">TK</button>
                  <button className="gms2-btn small">OMS</button>
                  <button className="gms2-btn small">RND</button>
                </div>

                {/* Tab Row */}
                <div className="gms2-button-row">
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'hist-meldblok' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('hist-meldblok')}
                  >
                    Kladblok
                  </button>
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'locatietreffers' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('locatietreffers')}
                  >
                    Locatietreffers
                  </button>
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'statusoverzicht' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('statusoverzicht')}
                  >
                    Statusoverzicht
                  </button>
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'overige-inzet' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('overige-inzet')}
                  >
                    Overige inzet
                  </button>
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'logging' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('logging')}
                  >
                    Logging
                  </button>
                </div>

                {/* Dynamic Tabbed Content */}
                <div className="gms2-history-section">
                  {/* Show DUB content when DUB button is active */}
                  {showDubContent ? (
                    <div className="gms2-dub-content">
                      <div className="gms2-dub-header">
                        <div className="gms2-dub-title">🔗 DUB - Incident Samenvoegen</div>
                        <div className="gms2-dub-info">
                          <div className="gms2-dub-selected">
                            <strong>Hoofdincident:</strong> #{selectedIncident?.nr || 'Geen'} - {selectedIncident?.mc3 || selectedIncident?.mc2 || selectedIncident?.mc1 || 'Onbekend'}
                            <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                              📍 {selectedIncident?.locatie || 'Geen locatie'} | 📞 {selectedIncident?.melderNaam || 'Geen melder'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedIncident ? (
                        <>
                          <div className="gms2-dub-instructions">
                            Selecteer het incident dat moet worden samengevoegd met het hoofdincident:
                          </div>

                          <div className="gms2-dub-incidents-list">
                            {incidents.filter(inc => inc.id !== selectedIncident?.id).map((incident) => {
                              const mcClassification = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || 'Onbekend';
                              const timeAgo = incident.tijdstip ? 
                                `${Math.floor((Date.now() - new Date(incident.tijdstip).getTime()) / 60000)} min geleden` : 
                                'Onbekend';
                              
                              return (
                                <div
                                  key={`dub-incident-${incident.id}`}
                                  className="gms2-dub-incident-item"
                                  onClick={() => {
                                    if (window.confirm(`Weet u zeker dat u incident #${incident.nr} wilt samenvoegen met #${selectedIncident.nr}?\n\nDit kan niet ongedaan worden gemaakt.`)) {
                                      handleDubMerge(incident);
                                    }
                                  }}
                                  title="Klik om samen te voegen"
                                >
                                  <div className="gms2-dub-incident-header">
                                    <span className="gms2-dub-incident-number">🚨 Incident #{incident.nr}</span>
                                    <span className="gms2-dub-incident-priority">P{incident.prio} | {mcClassification}</span>
                                  </div>
                                  <div className="gms2-dub-incident-details">
                                    <div className="gms2-dub-incident-location">📍 {incident.locatie || 'Geen locatie'}</div>
                                    <div className="gms2-dub-incident-time">⏰ {timeAgo}</div>
                                  </div>
                                  <div className="gms2-dub-incident-meta">
                                    👤 {incident.melderNaam || 'Geen melder'} | 
                                    🚔 {incident.assignedUnits?.length || 0} eenheden | 
                                    📋 {incident.karakteristieken?.length || 0} karakteristieken
                                  </div>
                                </div>
                              );
                            })}

                            {incidents.filter(inc => inc.id !== selectedIncident?.id).length === 0 && (
                              <div className="gms2-dub-no-incidents">
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                                  ℹ️ Geen andere incidenten beschikbaar om samen te voegen
                                </div>
                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '12px' }}>
                                  Er zijn momenteel {incidents.length === 1 ? 'alleen dit incident' : 'geen andere openstaande incidenten'}
                                </div>
                                <div style={{ fontSize: '10px', background: '#f0f8ff', padding: '8px', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
                                  <strong>💡 Tips voor DUB (samenvoegen):</strong><br/>
                                  • Maak eerst een tweede incident aan met "Nieuw" + "Uitgifte"<br/>
                                  • Of wacht tot er een nieuwe melding binnenkomt<br/>
                                  • DUB wordt gebruikt om dubbele meldingen samen te voegen
                                </div>
                                <button 
                                  className="gms2-btn" 
                                  onClick={() => {
                                    setShowDubContent(false);
                                    handleNieuw();
                                    addSystemLoggingEntry("🆕 Nieuwe melding aangemaakt voor mogelijke DUB samenvoeg");
                                  }}
                                  style={{ 
                                    marginTop: '10px', 
                                    width: '100%', 
                                    background: '#4CAF50', 
                                    color: 'white',
                                    fontSize: '10px',
                                    padding: '6px'
                                  }}
                                >
                                  🆕 Maak nieuwe melding aan
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="gms2-dub-warning">
                            ⚠️ Let op: Het geselecteerde incident wordt permanent samengevoegd en kan niet ongedaan worden gemaakt
                          </div>
                        </>
                      ) : (
                        <div className="gms2-dub-no-selection">
                          <div>⚠️ Selecteer eerst een hoofdincident om mee samen te voegen</div>
                          <div style={{ fontSize: '10px', marginTop: '6px', color: '#666' }}>
                            Klik op een incident in de lijst links om het te selecteren
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Show normal tab content when DUB is not active */
                    <>
                      {activeLoggingTab === 'hist-meldblok' && (
                        <div className="gms2-history-scrollbox" id="gms2-logging-display">
                          {/* Show logging entries */}
                          {loggingEntries.map((entry) => (
                            <div key={entry.id} className="gms2-history-entry">
                              {entry.timestamp} {entry.message}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeLoggingTab === 'locatietreffers' && (
                        <div className="gms2-locatietreffers">
                          <div className="gms2-search-container">
                            <input
                              type="text"
                              className="gms2-search-input"
                              placeholder="Zoek adres via BAG API... (bijv. Rotterdam Kleiweg 12)"
                              value={bagSearchQuery}
                              onChange={async (e) => {
                                const query = e.target.value;
                                setBagSearchQuery(query);

                                if (query.length >= 2) {
                                  console.log(`Manual search for: "${query}"`);
                                  const results = await searchBAGAddress(query);
                                  setBagSearchResults(results);
                                } else {
                                  setBagSearchResults([]);
                                }
                              }}
                              onKeyPress={async (e) => {
                                if (e.key === 'Enter' && bagSearchQuery.length > 0) {
                                  if (bagSearchResults.length === 1) {
                                    // Auto-select if only one result
                                    const result = bagSearchResults[0];
                                    const fullHuisnummer = `${result.huisnummer}${result.huisletter || ''}${result.huisnummertoevoeging ? '-' + result.huisnummertoevoeging : ''}`;

                                    const addressData = {
                                      straatnaam: result.straatnaam,
                                      huisnummer: fullHuisnummer,
                                      postcode: result.postcode,
                                      plaatsnaam: result.plaatsnaam,
                                      gemeente: result.gemeente,
                                      coordinates: result.coordinates
                                    };

                                    setFormData(prev => ({ ...prev, ...addressData }));
                                    if (selectedIncident) {
                                      setSelectedIncident({ ...selectedIncident, ...addressData });
                                    }

                                    // Log coordinates if available
                                    if (result.coordinates) {
                                      console.log(`📍 Coördinaten opgeslagen: [${result.coordinates[0]}, ${result.coordinates[1]}]`);
                                      addSystemLoggingEntry(`📍 Adres geselecteerd: ${result.volledigAdres} (${result.coordinates[0].toFixed(4)}, ${result.coordinates[1].toFixed(4)})`);
                                    } else {
                                      addSystemLoggingEntry(`📍 Adres geselecteerd: ${result.volledigAdres}`);
                                    }
                                    
                                    setBagSearchQuery("");
                                    setBagSearchResults([]);
                                  } else if (bagSearchResults.length === 0) {
                                    // Try fallback search
                                    const fallbackResults = await searchBAGAddress(bagSearchQuery);
                                    if (fallbackResults.length > 0) {
                                      const result = fallbackResults[0];
                                      setFormData(prev => ({ ...prev, postcode: result.postcode }));
                                      addSystemLoggingEntry(`Postcode automatisch ingevuld: ${result.postcode}`);
                                    } else {
                                      addSystemLoggingEntry(`Geen adres gevonden voor: "${bagSearchQuery}"`);
                                    }
                                  }
                                }
                              }}
                            />
                          </div>

                          <div className="gms2-search-help">
                            💡 Tips: 
                            <br/>• Type <strong>=</strong> in het kladblok voor adres zoeken
                            <br/>• Type <strong>o/</strong> in het kladblok voor openbare objecten
                          </div>

                          <div className="gms2-search-results">
                            {bagSearchResults.map((result, index) => {
                              const fullHuisnummer = `${result.huisnummer}${result.huisletter || ''}${result.huisnummertoevoeging ? '-' + result.huisnummertoevoeging : ''}`;
                              return (
                                <div
                                  key={index}
                                  className="gms2-address-result"
                                  onClick={async () => {
                                    console.log(`🖱️ Adres geselecteerd:`, result);
                                    console.log(`🖱️ Result coordinates type:`, typeof result.coordinates);
                                    console.log(`🖱️ Result coordinates value:`, result.coordinates);
                                    console.log(`🖱️ Result coordinates isArray:`, Array.isArray(result.coordinates));
                                    
                                    // Get building function - first try from result, then from coordinates
                                    let buildingFunctie = result.functie || '';
                                    
                                    // If no function in result but coordinates available, fetch it
                                    if (!buildingFunctie && result.coordinates && Array.isArray(result.coordinates) && result.coordinates.length === 2) {
                                      console.log(`🏢 Ophalen gebouwfunctie van coördinaten...`);
                                      buildingFunctie = await getBuildingFunctionFromCoordinates(result.coordinates as [number, number]);
                                      if (buildingFunctie) {
                                        console.log(`✅ Gebouwfunctie opgehaald: ${buildingFunctie}`);
                                        addSystemLoggingEntry(`🏢 Gebouwfunctie automatisch gedetecteerd: ${buildingFunctie}`);
                                      }
                                    }
                                    
                                    // Get object name - prioritize naam (OSM), then weergavenaam
                                    const objectNaam = result.wegType === 'object' 
                                      ? (result.naam || result.weergavenaam || '')
                                      : '';
                                    
                                    const addressData = {
                                      straatnaam: result.straatnaam,
                                      huisnummer: fullHuisnummer,
                                      postcode: result.postcode,
                                      plaatsnaam: result.plaatsnaam,
                                      gemeente: result.gemeente,
                                      coordinates: result.coordinates,
                                      object: objectNaam || formData.object || '',
                                      functie: buildingFunctie || formData.functie || ''
                                    };

                                    console.log(`💾 AddressData being saved:`, addressData);
                                    console.log(`💾 Coordinates in addressData:`, addressData.coordinates);
                                    console.log(`💾 Gebouwfunctie:`, addressData.functie);

                                    setFormData(prev => {
                                      const updated = { ...prev, ...addressData };
                                      console.log(`💾 FormData updated:`, updated);
                                      console.log(`💾 FormData.coordinates:`, updated.coordinates);
                                      console.log(`💾 FormData.functie:`, updated.functie);
                                      return updated;
                                    });
                                    
                                    if (selectedIncident) {
                                      const updatedIncident = { ...selectedIncident, ...addressData };
                                      console.log(`💾 Incident updated:`, updatedIncident);
                                      console.log(`💾 Incident.coordinates:`, updatedIncident.coordinates);
                                      console.log(`💾 Incident.functie:`, updatedIncident.functie);
                                      setSelectedIncident(updatedIncident);
                                    }

                                    // Log coordinates if available
                                    if (result.coordinates) {
                                      console.log(`✅ Coördinaten opgeslagen: [${result.coordinates[0]}, ${result.coordinates[1]}]`);
                                      if (buildingFunctie) {
                                        addSystemLoggingEntry(`📍 Adres geselecteerd: ${result.volledigAdres} (${result.coordinates[0].toFixed(4)}, ${result.coordinates[1].toFixed(4)}) - ${buildingFunctie}`);
                                      } else {
                                        addSystemLoggingEntry(`📍 Adres geselecteerd: ${result.volledigAdres} (${result.coordinates[0].toFixed(4)}, ${result.coordinates[1].toFixed(4)})`);
                                      }
                                    } else {
                                      console.warn(`⚠️ GEEN COÖRDINATEN in result!`);
                                      addSystemLoggingEntry(`📍 Adres geselecteerd: ${result.volledigAdres} (GEEN COÖRDINATEN)`);
                                    }
                                    
                                    setBagSearchQuery("");
                                    setBagSearchResults([]);

                                    // Clear any =address query from kladblok
                                    if (kladblokText.startsWith('=')) {
                                      setKladblokText('');
                                    }
                                  }}
                                >
                                  <div className="gms2-address-main">
                                    {result.wegType === 'object' ? (
                                      <>
                                        🏢 {result.naam || result.amenity || 'Object'}
                                        {result.amenity && result.amenity !== result.naam && (
                                          <span style={{ fontSize: '10px', color: '#666' }}> ({result.amenity})</span>
                                        )}
                                      </>
                                    ) : result.wegType === 'hydro' ? (
                                      <>
                                        🌊 {result.naam || result.weergavenaam || result.volledigAdres}
                                      </>
                                    ) : (
                                      result.volledigAdres
                                    )}
                                  </div>
                                  <div className="gms2-address-details">
                                    {result.wegType === 'object' ? (
                                      <>
                                        {result.straatnaam && `${result.straatnaam} ${result.huisnummer || ''}`.trim()}
                                        {result.plaatsnaam && ` | ${result.plaatsnaam}`}
                                        {result.gemeente && ` | ${result.gemeente}`}
                                      </>
                                    ) : result.wegType === 'hydro' ? (
                                      <>
                                        {result.source || 'PDOK Hydrografie – Netwerk'}
                                        {result.coordinates && ` | ${result.coordinates[1]?.toFixed(4)}, ${result.coordinates[0]?.toFixed(4)}`}
                                      </>
                                    ) : (
                                      `${result.gemeente} | ${result.postcode}`
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {bagSearchQuery.length >= 2 && bagSearchResults.length === 0 && (
                              <div className="gms2-no-results">
                                <div>Geen adressen gevonden voor "{bagSearchQuery}"</div>
                                <div style={{ fontSize: '10px', marginTop: '4px', color: '#999' }}>
                                  Probeer een andere zoekterm of gebruik de volledige syntax
                                </div>
                              </div>
                            )}

                            {bagSearchQuery.length < 2 && bagSearchResults.length === 0 && (
                              <div className="gms2-search-instructions">
                                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Hoe te gebruiken:</div>
                                <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                                  <strong>Adressen zoeken:</strong><br/>
                                  • Type in het kladblok: <strong>=Rotterdam/Kleiweg 12</strong><br/>
                                  • Of zoek direct hier: <strong>Rotterdam Kleiweg</strong><br/><br/>
                                  <strong>Openbare objecten zoeken:</strong><br/>
                                  • Type in het kladblok: <strong>o/ziekenhuis</strong><br/>
                                  • Of zoek direct hier: <strong>ziekenhuis</strong><br/><br/>
                                  • Klik op een resultaat om automatisch in te vullen
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeLoggingTab === 'statusoverzicht' && (
                        <div className="gms2-status-overview">
                          <div className="gms2-status-table-container" style={{ 
                            overflowX: 'auto', 
                            width: '100%',
                            fontSize: '10px'
                          }}>
                            <table style={{ 
                              width: '100%', 
                              borderCollapse: 'collapse', 
                              border: '1px solid #ccc',
                              fontSize: '10px',
                              tableLayout: 'auto'
                            }}>
                              {/* Header row */}
                              <thead>
                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '20px', fontSize: '9px' }}>D<br/>P</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'left', width: 'auto', minWidth: '100px', fontSize: '9px' }}>Roepnaam</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '70px', fontSize: '9px' }}>Soort voe</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>ov</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>ar</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>tp</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>nb</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>ir</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>bs</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>kz</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>vr</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>fd</th>
                                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', width: '35px', fontSize: '9px' }}>GA</th>
                                </tr>
                              </thead>

                              <tbody>
                                {/* Dynamic rows for assigned units from selected incident */}
                                {selectedIncident && selectedIncident.assignedUnits && selectedIncident.assignedUnits.length > 0 ? (
                                  selectedIncident.assignedUnits.map((unit, index) => {
                                    // Helper functie om te bepalen of een status actief is
                                    // Rekening houdend met kolommapping (ar kolom toont ut status)
                                    const isStatusActive = (columnCode: string) => {
                                      const internalCode = STATUS_COLUMN_MAPPING[columnCode] || columnCode;
                                      return unit.huidige_status === internalCode;
                                    };

                                    // Helper functie om statusblokje te renderen
                                    const renderStatusCell = (columnCode: string) => {
                                      const isActive = isStatusActive(columnCode);
                                      // Voor tijdvelden: ar kolom gebruikt ar_tijd maar toont ut status
                                      const timeField = {
                                        'ov': unit.ov_tijd,
                                        'ar': unit.ar_tijd, // AR kolom toont UT status maar gebruikt ar_tijd
                                        'tp': unit.tp_tijd,
                                        'nb': unit.nb_tijd,
                                        'ir': unit.ir_tijd,
                                        'bs': unit.bs_tijd,
                                        'kz': unit.kz_tijd,
                                        'vr': unit.vr_tijd,
                                        'fd': unit.fd_tijd,
                                        'GA': unit.ga_tijd
                                      }[columnCode];

                                      return (
                                        <td 
                                          key={columnCode}
                                          style={{ 
                                            border: '1px solid #ccc', 
                                            padding: '2px', 
                                            textAlign: 'center', 
                                            fontSize: '8px',
                                            backgroundColor: isActive ? '#0066cc' : 'transparent',
                                            color: isActive ? 'white' : 'black',
                                            minWidth: '35px',
                                            height: '20px',
                                            position: 'relative'
                                          }}
                                          title={isActive ? `${columnCode.toUpperCase()} - ${timeField || 'Actief'}` : ''}
                                        >
                                          {isActive && timeField ? (
                                            <div style={{
                                              width: '100%',
                                              height: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              backgroundColor: '#0066cc',
                                              color: 'white',
                                              fontWeight: 'bold',
                                              fontSize: '8px',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {timeField}
                                            </div>
                                          ) : isActive ? (
                                            <div style={{
                                              width: '100%',
                                              height: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              backgroundColor: '#0066cc',
                                              color: 'white',
                                              fontWeight: 'bold',
                                              fontSize: '9px'
                                            }}>
                                              {columnCode === 'GA' ? 'GA' : columnCode.toUpperCase()}
                                            </div>
                                          ) : (
                                            ''
                                          )}
                                        </td>
                                      );
                                    };

                                    return (
                                      <tr key={`${unit.roepnummer}-${index}`} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f8f8' }}>
                                        <td style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', fontSize: '9px' }}>P</td>
                                        <td style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{unit.roepnummer}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', fontSize: '8px' }}>{unit.soort_voertuig || '-'}</td>
                                        {renderStatusCell('ov')}
                                        {renderStatusCell('ar')}
                                        {renderStatusCell('tp')}
                                        {renderStatusCell('nb')}
                                        {renderStatusCell('ir')}
                                        {renderStatusCell('bs')}
                                        {renderStatusCell('kz')}
                                        {renderStatusCell('vr')}
                                        {renderStatusCell('fd')}
                                        {renderStatusCell('GA')}
                                      </tr>
                                    );
                                  })
                                ) : (
                                  selectedIncident && (
                                    <tr>
                                      <td colSpan={13} style={{ 
                                        border: '1px solid #ccc', 
                                        padding: '10px', 
                                        textAlign: 'center', 
                                        fontStyle: 'italic', 
                                        color: '#666',
                                        fontSize: '9px'
                                      }}>
                                        Geen eenheden toegewezen aan dit incident
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {activeLoggingTab === 'overige-inzet' && (
                        <div className="gms2-tab-content">
                          <div className="gms2-content-placeholder">
                            Overige inzet - Inhoud volgt later
                          </div>
                        </div>
                      )}

                      {activeLoggingTab === 'logging' && (
                        <div className="gms2-tab-content">
                          <div className="gms2-logging-section">
                            <div className="gms2-logging-header">
                              <h3>📝 Logging Overzicht</h3>
                              <div className="gms2-logging-stats">
                                <span>📊 Totaal entries: {loggingTabEntries.length}</span>
                                <span>🕒 Laatste update: {new Date().toLocaleTimeString('nl-NL')}</span>
                              </div>
                            </div>
                            
                            <div className="gms2-logging-content">
                              <div className="gms2-logging-filters">
                                <input
                                  type="text"
                                  placeholder="🔍 Zoek in logging..."
                                  className="gms2-logging-search"
                                  onChange={(e) => {
                                    const query = e.target.value.toLowerCase();
                                    // Filter logging entries based on search query
                                    const filtered = loggingTabEntries.filter(entry => 
                                      entry.message.toLowerCase().includes(query)
                                    );
                                    // You could implement filtering logic here
                                  }}
                                />
                                <button 
                                  className="gms2-btn"
                                  onClick={() => {
                                    // Clear logging entries
                                    setLoggingTabEntries([]);
                                    addLoggingEntry('🗑️ Logging gewist');
                                  }}
                                >
                                  🗑️ Wissen
                                </button>
                              </div>
                              
                              <div className="gms2-logging-entries">
                                {loggingTabEntries.map((entry, index) => (
                                  <div 
                                    key={entry.id} 
                                    className={`gms2-logging-entry ${
                                      entry.message.includes('🚨') ? 'priority-high' : 
                                      entry.message.includes('📋') ? 'karakteristiek' :
                                      entry.message.includes('📍') ? 'location' :
                                      entry.message.includes('🏢') ? 'object' :
                                      entry.message.includes('🛣️') ? 'highway' :
                                      'normal'
                                    }`}
                                  >
                                    <span className="gms2-logging-time">
                                      {entry.timestamp}
                                    </span>
                                    <span className="gms2-logging-text">{entry.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* LMC Classification dropdowns row */}
                <div className="gms2-dropdown-tabs">
                  <div className="gms2-tab-group">
                    <select 
                      id="gms2-mc1-select" 
                      className="gms2-dropdown" 
                      style={{ backgroundColor: '#f5f5f5' }}
                    >
                      <option value="">Selecteer MC1...</option>
                    </select>
                  </div>
                  <div className="gms2-tab-group">
                    <select 
                      id="gms2-mc2-select" 
                      className="gms2-dropdown" 
                      style={{ backgroundColor: '#f5f5f5' }}
                    >
                      <option value="">Selecteer MC2...</option>
                    </select>
                  </div>
                  <div className="gms2-tab-group" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select 
                      id="gms2-mc3-select" 
                      className="gms2-dropdown" 
                      style={{ backgroundColor: '#f5f5f5', flex: 1 }}
                    >
                      <option value="">Selecteer MC3...</option>
                    </select>
                    <button 
                      className="gms2-btn small"
                      onClick={() => setShowKarakteristiekenDialog(true)}
                      style={{ 
                        minWidth: '24px', 
                        height: '22px', 
                        padding: '2px 4px',
                        fontSize: '10px',
                        backgroundColor: '#e0e0e0',
                        border: '1px solid #999'
                      }}
                      title="Zoek karakteristieken"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Main characteristics layout */}
                <div className="gms2-characteristics-layout">
                  <div className="gms2-characteristics-table">
                    <div className="gms2-char-header">
                      <span>Karakteristieken</span>
                      <span>Waarde</span>
                    </div>
                    {/* Dynamic karakteristieken rows */}
                    {selectedKarakteristieken.map((kar, index) => (
                      <div key={`kar-${kar.id || Date.now()}-${index}-${kar.ktCode || 'nocode'}-${Math.random()}`} className="gms2-char-row">
                        <span title={kar.ktCode ? `Code: ${kar.ktCode}` : ''}>{kar.ktNaam}</span>
                        <span>{kar.waarde || ''}</span>
                      </div>
                    ))}
                    {/* Fill remaining rows */}
                    {Array.from({ length: Math.max(0, 8 - selectedKarakteristieken.length) }).map((_, index) => (
                      <div key={`empty-char-${Date.now()}-${index}-${Math.random()}`} className="gms2-char-row">
                        <span></span>
                        <span></span>
                      </div>
                    ))}
                  </div>



                  <div className="gms2-kladblok-modern">
                    <textarea 
                      value={kladblokText}
                      onChange={handleKladblokChange}
                      onKeyPress={handleKladblokKeyPress}
                      className="gms2-kladblok-textarea"
                      placeholder="Kladblok - Snelcodes: -inbraak, -steekpartij | Karakteristieken: -aanh 1, -ovdp, -afkruisen rijstrook 1 | Adres: =Rotterdam/Kleiweg 12 | Melder: m/Naam;0612345678 | Object: o/Winkelcentrum (Enter om uit te voeren)"
                    />
                  </div>
                </div>

                {/* Bottom action section */}
                <div className="gms2-bottom-actions">
                  <div className="gms2-action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="gms2-service-options" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="gms2-service-col">
                          <input type="checkbox" checked readOnly />
                          <span>P</span>
                        </div>
                        <div className="gms2-service-col">
                          <input 
                            type="checkbox" 
                            id="share-brandweer"
                            onChange={(e) => {
                              const action = e.target.checked ? "gedeeld met" : "delen beëindigd met";
                              addLoggingEntry(`🚒 Melding ${action} Brandweer`);
                            }}
                          />
                          <span>B</span>
                        </div>
                        <div className="gms2-service-col">
                          <input 
                            type="checkbox" 
                            id="share-ambulance"
                            onChange={(e) => {
                              const action = e.target.checked ? "gedeeld met" : "delen beëindigd met";
                              addLoggingEntry(`🚑 Melding ${action} Ambulance`);
                            }}
                          />
                          <span>A</span>
                        </div>
                      </div>
                      <div className="gms2-priority-buttons">
                        <span>P:</span>
                        <select 
                          className="gms2-priority-dropdown" 
                          value={priorityValue}
                          onChange={(e) => setPriorityValue(parseInt(e.target.value))}
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </div>
                      {selectedIncident ? (
                        <button className="gms2-btn" onClick={handleUpdate} style={{ minWidth: '60px' }}>Update</button>
                      ) : (
                        <button className="gms2-btn" onClick={handleUitgifte} style={{ minWidth: '60px', backgroundColor: '#ffaa44', color: '#000' }}>Uitgifte</button>
                      )}
                      <button className="gms2-btn" onClick={handleArchiveer} style={{ minWidth: '70px' }}>Archiveer</button>
                      <button className="gms2-btn" onClick={handleNieuw} style={{ minWidth: '50px' }}>Nieuw</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <select className="gms2-dropdown" style={{ minWidth: '150px' }} defaultValue="7">
                        <option value="1">1 Autom. afgeh. MK</option>
                        <option value="2">2 Info bericht</option>
                        <option value="3">3 Test/oefening</option>
                        <option value="4">4 Vals/misbruik</option>
                        <option value="5">5 Overig afgeh. MK</option>
                        <option value="6">6 Afgebroken inzet</option>
                        <option value="7">7 Inzet</option>
                        <option value="8">8 Samengevoegd incident</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
        </div>
      </div>

      

      {/* Karakteristieken Search Dialog - Verbeterde Popup */}
      {showKarakteristiekenDialog && (
        <div className="gms2-karakteristieken-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowKarakteristiekenDialog(false);
            setKarakteristiekenSearchQuery("");
            setFilteredKarakteristieken([]);
          }
        }}>
          <div className="gms2-karakteristieken-dialog">
            <div className="gms2-dialog-header">
              <span className="gms2-dialog-title">🔍 Zoek Karakteristieken Database</span>
              <button 
                className="gms2-dialog-close"
                onClick={() => {
                  setShowKarakteristiekenDialog(false);
                  setKarakteristiekenSearchQuery("");
                  setFilteredKarakteristieken([]);
                }}
                title="Sluiten"
              >
                ✕
              </button>
            </div>
            
            <div className="gms2-dialog-content">
              <div className="gms2-search-section">
                <input
                  type="text"
                  className="gms2-karakteristieken-search"
                  placeholder="🔍 Zoek karakteristieken (bijv: aanh, gewond, pol, dader)..."
                  value={karakteristiekenSearchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setKarakteristiekenSearchQuery(query);
                    searchKarakteristiekenForDialog(query);
                  }}
                  autoFocus
                />
                <div className="gms2-search-info">
                  {filteredKarakteristieken.length > 0 && (
                    <span>📋 {filteredKarakteristieken.length} resultaten gevonden</span>
                  )}
                  {karakteristiekenSearchQuery.length > 0 && filteredKarakteristieken.length === 0 && (
                    <span style={{ color: '#ff6b6b' }}>❌ Geen resultaten</span>
                  )}
                </div>
              </div>

              <div className="gms2-karakteristieken-results">
                {karakteristiekenSearchQuery.length === 0 && (
                  <div className="gms2-search-hint">
                    <div className="gms2-hint-header">💡 <strong>Snelle zoektips:</strong></div>
                    <div className="gms2-hint-grid">
                      <div className="gms2-hint-item">
                        <strong>"aanh"</strong> → Aanhoudingen
                      </div>
                      <div className="gms2-hint-item">
                        <strong>"pol"</strong> → Politie inzet
                      </div>
                      <div className="gms2-hint-item">
                        <strong>"gewond"</strong> → Gewonden
                      </div>
                      <div className="gms2-hint-item">
                        <strong>"dader"</strong> → Daders
                      </div>
                      <div className="gms2-hint-item">
                        <strong>"ovdp"</strong> → Overval/Diefstal
                      </div>
                      <div className="gms2-hint-item">
                        <strong>"inzet"</strong> → Inzet types
                      </div>
                    </div>
                  </div>
                )}

                {filteredKarakteristieken.map((kar, index) => (
                  <div
                    key={`search-kar-${kar.ktCode}-${index}`}
                    className="gms2-karakteristiek-result"
                    onClick={() => addKarakteristiekFromDialog(kar)}
                    title="Klik om toe te voegen"
                  >
                    <div className="gms2-kar-result-main">
                      <span className="gms2-kar-name">📋 {kar.ktNaam}</span>
                      <span className="gms2-kar-type">({kar.ktType})</span>
                    </div>
                    <div className="gms2-kar-result-details">
                      {kar.ktCode && <span className="gms2-kar-code">🏷️ {kar.ktCode}</span>}
                      {kar.ktWaarde && <span className="gms2-kar-value">💾 {kar.ktWaarde}</span>}
                    </div>
                    {kar.ktParser && (
                      <div className="gms2-kar-parser">⚡ {kar.ktParser}</div>
                    )}
                  </div>
                ))}

                {karakteristiekenSearchQuery.length >= 2 && filteredKarakteristieken.length === 0 && (
                  <div className="gms2-no-results">
                    <div>❌ Geen karakteristieken gevonden voor "{karakteristiekenSearchQuery}"</div>
                    <div style={{ fontSize: '11px', marginTop: '8px', color: '#666' }}>
                      💡 Probeer kortere zoektermen zoals "aanh", "pol" of "gewond"
                    </div>
                  </div>
                )}
              </div>

              <div className="gms2-dialog-footer">
                <button 
                  className="gms2-btn" 
                  onClick={() => {
                    setShowKarakteristiekenDialog(false);
                    setKarakteristiekenSearchQuery("");
                    setFilteredKarakteristieken([]);
                  }}
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Details Popup */}
      {showLocationDetails && (
        <div className="gms2-p2000-overlay">
          <div className="gms2-p2000-window" style={{ maxWidth: '900px', maxHeight: '85vh' }}>
            <div className="gms2-p2000-header">
              <span className="gms2-p2000-title">📍 Locatiegegevens</span>
              <button 
                className="gms2-p2000-close"
                onClick={() => {
                  setShowLocationDetails(false);
                  setLocationDetails(null);
                }}
                title="Sluiten"
              >
                ✕
              </button>
            </div>
            
            <div className="gms2-p2000-content">
              {locationDetails ? (
                <div className="location-details-content">
                  {/* Coordinates */}
                  <div className="location-section">
                    <h3>📍 Coördinaten</h3>
                    <p><strong>Latitude:</strong> {locationDetails.coordinates.lat.toFixed(6)}</p>
                    <p><strong>Longitude:</strong> {locationDetails.coordinates.lng.toFixed(6)}</p>
                  </div>

                  {/* BAG Information */}
                  {locationDetails.bag && (
                    <div className="location-section">
                      <h3>🏢 BAG Gegevens</h3>
                      <div className="location-details-grid">
                        {locationDetails.bag.weergavenaam && (
                          <div><strong>Adres:</strong> {locationDetails.bag.weergavenaam}</div>
                        )}
                        {locationDetails.bag.huisnummer && (
                          <div><strong>Huisnummer:</strong> {locationDetails.bag.huisnummer}</div>
                        )}
                        {locationDetails.bag.huisletter && (
                          <div><strong>Huisletter:</strong> {locationDetails.bag.huisletter}</div>
                        )}
                        {locationDetails.bag.huisnummertoevoeging && (
                          <div><strong>Toevoeging:</strong> {locationDetails.bag.huisnummertoevoeging}</div>
                        )}
                        {locationDetails.bag.postcode && (
                          <div><strong>Postcode:</strong> {locationDetails.bag.postcode}</div>
                        )}
                        {locationDetails.bag.woonplaats && (
                          <div><strong>Woonplaats:</strong> {locationDetails.bag.woonplaats}</div>
                        )}
                        {locationDetails.bag.gemeente && (
                          <div><strong>Gemeente:</strong> {locationDetails.bag.gemeente}</div>
                        )}
                        {locationDetails.bag.provincie && (
                          <div><strong>Provincie:</strong> {locationDetails.bag.provincie}</div>
                        )}
                        {locationDetails.bag.status && (
                          <div><strong>Status:</strong> {locationDetails.bag.status}</div>
                        )}
                        {locationDetails.bag.gebruiksdoel && (
                          <div><strong>Gebruiksdoel:</strong> {locationDetails.bag.gebruiksdoel}</div>
                        )}
                        {locationDetails.bag.oppervlakte && (
                          <div><strong>Oppervlakte:</strong> {locationDetails.bag.oppervlakte} m²</div>
                        )}
                        {locationDetails.bag.bouwjaar && (
                          <div><strong>Bouwjaar:</strong> {locationDetails.bag.bouwjaar}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OSM Information */}
                  {locationDetails.osm && (
                    <div className="location-section">
                      <h3>🗺️ OpenStreetMap Gegevens</h3>
                      <div className="location-details-grid">
                        {locationDetails.osm.display_name && (
                          <div><strong>Volledige naam:</strong> {locationDetails.osm.display_name}</div>
                        )}
                        {locationDetails.osm.address && (
                          <>
                            {locationDetails.osm.address.house_number && (
                              <div><strong>Huisnummer:</strong> {locationDetails.osm.address.house_number}</div>
                            )}
                            {locationDetails.osm.address.road && (
                              <div><strong>Straat:</strong> {locationDetails.osm.address.road}</div>
                            )}
                            {locationDetails.osm.address.postcode && (
                              <div><strong>Postcode:</strong> {locationDetails.osm.address.postcode}</div>
                            )}
                            {locationDetails.osm.address.city && (
                              <div><strong>Stad:</strong> {locationDetails.osm.address.city}</div>
                            )}
                            {locationDetails.osm.address.town && (
                              <div><strong>Plaats:</strong> {locationDetails.osm.address.town}</div>
                            )}
                            {locationDetails.osm.address.municipality && (
                              <div><strong>Gemeente:</strong> {locationDetails.osm.address.municipality}</div>
                            )}
                            {locationDetails.osm.address.state && (
                              <div><strong>Provincie:</strong> {locationDetails.osm.address.state}</div>
                            )}
                            {locationDetails.osm.address.country && (
                              <div><strong>Land:</strong> {locationDetails.osm.address.country}</div>
                            )}
                          </>
                        )}
                        {locationDetails.osm.type && (
                          <div><strong>Type:</strong> {locationDetails.osm.type}</div>
                        )}
                        {locationDetails.osm.class && (
                          <div><strong>Class:</strong> {locationDetails.osm.class}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="location-section">
                    <p><em>Gegevens opgehaald op: {new Date(locationDetails.timestamp).toLocaleString('nl-NL')}</em></p>
                  </div>
                </div>
              ) : (
                <div className="location-loading">
                  <p>📍 Locatiegegevens worden opgehaald...</p>
                </div>
              )}
            </div>
            
            <div className="gms2-p2000-footer">
              <button 
                className="gms2-btn"
                onClick={() => {
                  setShowLocationDetails(false);
                  setLocationDetails(null);
                }}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="gms2-status-bar">
        <div className="gms2-status-left">
          <span>Bericht: 0000000000</span>
          <select className="gms2-select small">
            <option>Bericht</option>
          </select>
          <span>POL</span>
          <select className="gms2-select small">
            <option>⬜</option>
          </select>
        </div>
        <div className="gms2-status-center">
          <span>{formatDateTime(currentTime)}</span>
        </div>
        <div className="gms2-status-right">
          <span>7193</span>
          <button className="gms2-btn small">1</button>
          <button className="gms2-btn small">2</button>
          <button className="gms2-btn small">3</button>
          <button className="gms2-btn small">4</button>
        </div>
      </div>
    </div>
  );
}