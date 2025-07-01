import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/sidebar";
import StatsGrid from "../components/stats-grid";
import IncidentTable from "../components/incident-table";
import UnitsPanel from "../components/units-panel";
import GMS2 from "./gms2";
import GMSEenheden from "./gms-eenheden";
import { useLocalStorage } from "../hooks/use-local-storage";
import { Incident, Unit, Stats } from "../types";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Dynamic import for React Leaflet components
let MapContainer: any;
let TileLayer: any;  
let Marker: any;
let Popup: any;
let Polyline: any;

// Fix for default markers in React Leaflet
try {
  if (L.Icon.Default.prototype._getIconUrl) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (error) {
  console.error('Error configuring Leaflet icons:', error);
}

// Custom icons for different incident types and units
const createCustomIcon = (color: string, iconType: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: bold;">${iconType}</div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
};

const incidentIcons = {
  'brand': createCustomIcon('#ff4444', '🔥'),
  'medisch': createCustomIcon('#44ff44', '🏥'),
  'politie': createCustomIcon('#4444ff', '👮'),
  'verkeer': createCustomIcon('#ffaa44', '🚗'),
  'default': createCustomIcon('#888888', '⚠️'),
};

const unitIcons = {
  'Politie': createCustomIcon('#0066cc', 'P'),
  'Brandweer': createCustomIcon('#cc0000', 'B'),
  'Ambulance': createCustomIcon('#00cc66', 'A'),
  'default': createCustomIcon('#666666', 'E'),
};

interface Melding {
  id: string;
  classificatie: string;
  adres: string;
  coordinaten: [number, number];
  urgentie: 'Laag' | 'Middel' | 'Hoog' | 'Zeer Hoog';
  tijdstip: string;
  eenheden: string[];
  details?: string;
}

interface Eenheid {
  id: string;
  type: 'Politie' | 'Brandweer' | 'Ambulance';
  status: 'Beschikbaar' | 'Onderweg' | 'Bezig' | 'Uitruk';
  locatie: [number, number];
  bestemming?: string;
  naam?: string;
}

// Kaart Section Component
function KaartSection() {
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [eenheden, setEenheden] = useState<Eenheid[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('alle');
  const [urgentieFilter, setUrgentieFilter] = useState('alle');
  const [disciplineFilter, setDisciplineFilter] = useState('alle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Load React Leaflet components dynamically
  useEffect(() => {
    const loadMapComponents = async () => {
      try {
        const reactLeaflet = await import('react-leaflet');
        MapContainer = reactLeaflet.MapContainer;
        TileLayer = reactLeaflet.TileLayer;
        Marker = reactLeaflet.Marker;
        Popup = reactLeaflet.Popup;
        Polyline = reactLeaflet.Polyline;
        setMapLoaded(true);
      } catch (error) {
        console.error('Failed to load map components:', error);
        setError('Failed to load map components');
      }
    };

    loadMapComponents();
  }, []);

  // Load mock data
  useEffect(() => {
    if (!mapLoaded) return;

    const loadData = () => {
      try {
        setIsLoading(true);

        // Mock incidents data
        const mockMeldingen: Melding[] = [
          {
            id: "2025001234",
            classificatie: "Verkeersongeval",
            adres: "A16 ter hoogte van Breda Noord",
            coordinaten: [51.6000, 4.7500],
            urgentie: "Hoog",
            tijdstip: new Date().toISOString(),
            eenheden: ["1601", "1602"],
            details: "Aanrijding tussen 2 voertuigen, mogelijk gewonden"
          },
          {
            id: "2025001235", 
            classificatie: "Inbraak",
            adres: "Hoofdstraat 123, Rotterdam",
            coordinaten: [51.9225, 4.4792],
            urgentie: "Middel",
            tijdstip: new Date(Date.now() - 30000).toISOString(),
            eenheden: ["1603"],
            details: "Inbraak winkel, verdachte mogelijk nog aanwezig"
          },
          {
            id: "2025001236",
            classificatie: "Brand",
            adres: "Industrie terrein Botlek",  
            coordinaten: [51.8833, 4.2500],
            urgentie: "Zeer Hoog",
            tijdstip: new Date(Date.now() - 60000).toISOString(),
            eenheden: ["1604", "1605", "1606"],
            details: "Brand in chemische fabriek"
          }
        ];

        // Mock units data
        const mockEenheden: Eenheid[] = [
          {
            id: "1601",
            type: "Politie",
            status: "Onderweg",
            locatie: [51.5900, 4.7400],
            bestemming: "A16 ter hoogte van Breda Noord",
            naam: "Team Rotterdam Noord"
          },
          {
            id: "1602", 
            type: "Ambulance",
            status: "Onderweg",
            locatie: [51.5950, 4.7450],
            bestemming: "A16 ter hoogte van Breda Noord",
            naam: "AMB-16-01"
          },
          {
            id: "1603",
            type: "Politie", 
            status: "Bezig",
            locatie: [51.9200, 4.4800],
            naam: "Team Rotterdam Centrum"
          },
          {
            id: "1604",
            type: "Brandweer",
            status: "Bezig", 
            locatie: [51.8830, 4.2505],
            naam: "BW Rotterdam-Rijnmond"
          },
          {
            id: "1605",
            type: "Politie",
            status: "Bezig",
            locatie: [51.8840, 4.2490],
            naam: "Team Westland"
          },
          {
            id: "1606",   
            type: "Ambulance",
            status: "Beschikbaar",
            locatie: [51.8900, 4.2600],
            naam: "AMB-17-03"
          }
        ];

        setMeldingen(mockMeldingen);
        setEenheden(mockEenheden);
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [mapLoaded]);

  // Filter incidents and units
  const filteredMeldingen = meldingen.filter(melding => {
    if (selectedFilter !== 'alle' && !melding.classificatie.toLowerCase().includes(selectedFilter)) return false;
    if (urgentieFilter !== 'alle' && melding.urgentie !== urgentieFilter) return false;
    return true;
  });

  const filteredEenheden = eenheden.filter(eenheid => {
    if (disciplineFilter !== 'alle' && eenheid.type !== disciplineFilter) return false;
    return true;
  });

  // Get incident icon based on classification
  const getIncidentIcon = (classification: string) => {
    const lowerClass = classification.toLowerCase();
    if (lowerClass.includes('brand')) return incidentIcons.brand;
    if (lowerClass.includes('medisch') || lowerClass.includes('ambulance')) return incidentIcons.medisch;
    if (lowerClass.includes('politie') || lowerClass.includes('inbraak')) return incidentIcons.politie;
    if (lowerClass.includes('verkeer') || lowerClass.includes('ongeval')) return incidentIcons.verkeer;
    return incidentIcons.default;
  };

  // Get unit icon
  const getUnitIcon = (type: string) => {
    return unitIcons[type as keyof typeof unitIcons] || unitIcons.default;
  };

  // Get urgency color
  const getUrgentieColor = (urgentie: string) => {
    switch (urgentie) {
      case 'Zeer Hoog': return '#ff0000';
      case 'Hoog': return '#ff6600';
      case 'Middel': return '#ffaa00';
      case 'Laag': return '#00aa00';
      default: return '#666666';
    }
  };

  // Get connection lines between units and incidents
  const getConnectionLines = () => {
    const lines: JSX.Element[] = [];

    filteredMeldingen.forEach(melding => {
      melding.eenheden.forEach(eenheidId => {
        const eenheid = filteredEenheden.find(e => e.id === eenheidId);
        if (eenheid && eenheid.status === 'Onderweg') {
          lines.push(
            <Polyline
              key={`${melding.id}-${eenheid.id}`}
              positions={[eenheid.locatie, melding.coordinaten]}
              color="#007acc"
              weight={2}
              opacity={0.7}
              dashArray="5, 10"
            />
          );
        }
      });
    });

    return lines;
  };

  if (!mapLoaded) {
    return (
      <div className="kaart-loading">
        <div>Kaart wordt geladen...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kaart-error">
        <div>Fout bij laden van kaart: {error}</div>
      </div>
    );
  }

  return (
    <div className="kaart-container">
      {/* Header with filters */}
      <div className="kaart-header">
        <h3>Situatiekaart</h3>
        <div className="kaart-filters">
          <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
            <option value="alle">Alle incidenten</option>
            <option value="verkeer">Verkeer</option>
            <option value="brand">Brand</option>
            <option value="inbraak">Inbraak</option>
            <option value="medisch">Medisch</option>
          </select>

          <select value={urgentieFilter} onChange={(e) => setUrgentieFilter(e.target.value)}>
            <option value="alle">Alle urgentie</option>
            <option value="Zeer Hoog">Zeer Hoog</option>
            <option value="Hoog">Hoog</option>
            <option value="Middel">Middel</option>
            <option value="Laag">Laag</option>
          </select>

          <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)}>
            <option value="alle">Alle eenheden</option>
            <option value="Politie">Politie</option>
            <option value="Brandweer">Brandweer</option>
            <option value="Ambulance">Ambulance</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="kaart-stats">
        <div className="stat-item">
          <strong>Meldingen:</strong> {filteredMeldingen.length}
        </div>
        <div className="stat-item">
          <strong>Eenheden:</strong> {filteredEenheden.length}
        </div>
        <div className="stat-item">
          <strong>Onderweg:</strong> {filteredEenheden.filter(e => e.status === 'Onderweg').length}
        </div>
      </div>

      {/* Map */}
      <div className="kaart-map">
        <MapContainer
          center={[51.9225, 4.4792]} // Rotterdam center
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Connection lines between units and incidents */}
          {getConnectionLines()}

          {/* Incident markers */}
          {filteredMeldingen.map((melding) => (
            <Marker
              key={melding.id}
              position={melding.coordinaten}
              icon={getIncidentIcon(melding.classificatie)}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{melding.id}</h4>
                  <p><strong>Type:</strong> {melding.classificatie}</p>
                  <p><strong>Adres:</strong> {melding.adres}</p>
                  <p><strong>Urgentie:</strong> 
                    <span style={{ color: getUrgentieColor(melding.urgentie) }}> {melding.urgentie}</span>
                  </p>
                  <p><strong>Tijd:</strong> {new Date(melding.tijdstip).toLocaleTimeString()}</p>
                  {melding.details && <p><strong>Details:</strong> {melding.details}</p>}
                  <p><strong>Eenheden:</strong> {melding.eenheden.join(', ')}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Unit markers */}
          {filteredEenheden.map((eenheid) => (
            <Marker
              key={eenheid.id}
              position={eenheid.locatie}
              icon={getUnitIcon(eenheid.type)}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{eenheid.naam || eenheid.id}</h4>
                  <p><strong>Type:</strong> {eenheid.type}</p>
                  <p><strong>Status:</strong> {eenheid.status}</p>
                  {eenheid.bestemming && <p><strong>Bestemming:</strong> {eenheid.bestemming}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const [incidents, setIncidents] = useLocalStorage<Incident[]>(
    "policeIncidents",
    [],
  );

  // GMS Incidents database for complete incident lifecycle
  const [gmsIncidents, setGmsIncidents] = useState<any[]>([]);

  // Load GMS incidents from database on component mount
  useEffect(() => {
    const loadGmsIncidents = async () => {
      try {
        const response = await fetch('/api/gms-incidents');
        if (response.ok) {
          const incidents = await response.json();
          setGmsIncidents(incidents);
        }
      } catch (error) {
        console.error('Failed to load GMS incidents:', error);
      }
    };

    loadGmsIncidents();
  }, []);

  // Current active incident in GMS
  const [currentGmsIncident, setCurrentGmsIncident] = useState<any>(null);

  // Settings subtab state
  const [activeSettingsTab, setActiveSettingsTab] = useState("basisteams");

  // Phone numbers management with localStorage fallback
  const [phoneNumbers, setPhoneNumbers] = useLocalStorage<any[]>(
    "telefoonlijst",
    [],
  );

  // Ensure phoneNumbers is always an array
  const phoneNumbersArray = Array.isArray(phoneNumbers) ? phoneNumbers : [];

  // Chat state management
  const [activeChatTab, setActiveChatTab] = useState("burgers");
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Debug active chat tab changes
  useEffect(() => {
    console.log("Active chat tab changed to:", activeChatTab);
  }, [activeChatTab]);

  // Incoming calls state management
  const [incomingCalls, setIncomingCalls] = useState<any[]>([]);
  const [callTimers, setCallTimers] = useState<{ [key: number]: number }>({});

  // Enhanced AI Conversation Engine for Emergency Services
  const generateColleagueResponse = (
    contact: any,
    userMessage: string,
    conversationHistory: any[] = [],
  ) => {
    const message = userMessage.toLowerCase();

    // Enhanced Dutch emergency terminology analysis
    const isUrgent =
      /urgent|spoed|direct|nu|emergency|prio|meteen|code rood|code geel|alarm|acuut/.test(
        message,
      );
    const isLocation =
      /waar|locatie|adres|plaats|richting|straat|wijk|gebied|route/.test(
        message,
      );
    const isStatus = /status|situatie|stand|update|rapport|overzicht/.test(
      message,
    );
    const isRequest =
      /kun je|kan je|wil je|zou je|help|stuur|regel|informeer|activeer|mobiliseer/.test(
        message,
      );
    const isQuestion =
      /\?/.test(userMessage) || /wat|wie|waar|wanneer|waarom|hoe/.test(message);

    // Emergency incident types detection
    const incidentTypes = {
      fire: /brand|vuur|rook|brandweer|blussen|woningbrand|bedrijfsbrand/.test(
        message,
      ),
      medical:
        /ambulance|ziekenwagen|gewond|letsel|onwel|hartstilstand|reanimatie/.test(
          message,
        ),
      police:
        /politie|inbraak|diefstal|geweld|arrestatie|verdachte|overval/.test(
          message,
        ),
      traffic: /verkeer|ongeval|aanrijding|file|wegafsluiting|a20|snelweg/.test(
        message,
      ),
      public: /overlast|verstoring|openbare orde|relschoppers|vechtpartij/.test(
        message,
      ),
    };

    // Role-specific personality and knowledge base with incident-specific responses
    const roleProfiles = {
      Dienstchef: {
        tone: "autoritair en beslissend",
        expertise: [
          "operationeel overzicht",
          "resource management",
          "perscontacten",
          "escalatieprocedures",
        ],
        responses: {
          urgent: [
            "Urgent genoteerd. Ik schakel direct over naar code geel. Welke eenheden heb je nodig?",
            "Dit krijgt mijn onmiddellijke aandacht. Ik mobiliseer extra mankracht.",
            "Prioriteit 1 - ik neem persoonlijk de leiding over deze operatie.",
          ],
          location: [
            "Ik ken dat gebied goed. Laat me de beste aanrijroute voor je regelen.",
            "Die locatie valt onder district Zuid. Ik stuur de dichtstbijzijnde eenheden.",
            "Complexe locatie - ik regel coördinatie met verkeersdienst voor toegang.",
          ],
          status: [
            "Operationeel overzicht: 12 eenheden actief, 3 in reserve. Alles onder controle.",
            "Situatie is stabiel. Ik houd alle partijen geïnformeerd via het commandocentrum.",
            "Status groen op alle fronten. Pers is nog niet geïnformeerd.",
          ],
          request: [
            "Akkoord, ik regel dat direct via mijn kanalen.",
            "Geen probleem, ik heb de autoriteit om dat goed te keuren.",
            "Dat valt onder mijn verantwoordelijkheid - wordt onmiddellijk geregeld.",
          ],
          fire: [
            "Brand geregistreerd. Ik schakel direct de brandweer in en regel perimeter.",
            "Woningbrand - ik activeer tankautospuit en hoogwerker. Evacuatie nodig?",
            "Code rood brand. Ik regel omliggende korpsen voor bijstand.",
          ],
          medical: [
            "Medische nood - ambulance wordt direct ingezet. Traumahelikopter nodig?",
            "Ik schakel A1 ambulance in. MMT wordt gealarmeerd voor ondersteuning.",
            "Spoedeisende hulp geactiveerd. Ziekenhuis is geïnformeerd.",
          ],
          police: [
            "Politie-inzet geregeld. Hoeveel eenheden zijn ter plaatse nodig?",
            "Ik stuur surveillanceteams. Arrestatieteam wordt geactiveerd.",
            "Politieoptreden - ik coördineer met OvdD en regel ondersteuning.",
          ],
          default: [
            "Spreek je met urgentie? Dan neem ik direct actie.",
            "Ik heb volledige operationele autoriteit hier. Wat heb je nodig?",
            "Als dienstchef kan ik alle resources inzetten. Geef me de details.",
          ],
        },
      },
      Teamleider: {
        tone: "praktisch en operationeel",
        expertise: [
          "tactische operaties",
          "team coördinatie",
          "terreinkennis",
          "veiligheidsprocedures",
        ],
        responses: {
          urgent: [
            "Team alpha staat gereed! Geef me coördinaten en we rukken uit.",
            "Spoedmelding - ik stuur direct twee surveillanceauto's jouw kant op.",
            "Mijn team is al onderweg. ETA 4 minuten ter plaatse.",
          ],
          location: [
            "Die straat ken ik goed - smalle toegang, let op geparkeerde auto's.",
            "Wijk Rotterdam-Zuid, sector 7. Mijn eenheden patrouilleren daar nu.",
            "Moeilijk bereikbaar gebied. Ik stuur een motor vooruit voor verkenning.",
          ],
          status: [
            "Team operationeel: 6 man actief, 2 in voertuigen, alles 100% beschikbaar.",
            "Situatie ter plaatse onder controle. Verdachte aangehouden, geen incidenten.",
            "Gebied afgezet, forensisch onderzoek loopt. Verwachte afronding over 2 uur.",
          ],
          request: [
            "Roger dat. Mijn team pakt het op - wordt direct uitgevoerd.",
            "Komt voor elkaar. Ik delegeer naar surveillant De Jong, hij kent het protocol.",
            "Geen probleem, ik regel versterking en kom persoonlijk kijken.",
          ],
          fire: [
            "Brand - ik stuur direct een team ter ondersteuning van de brandweer.",
            "Mijn eenheden gaan assisteren bij evacuatie en perimeter bewaking.",
            "Team wordt ingezet voor crowd control en brandweer ondersteuning.",
          ],
          medical: [
            "Medisch incident - ik stuur surveillanten voor begeleiding ambulance.",
            "Team regelt vrije doorgang voor ambulancedienst.",
            "Mijn mensen assisteren bij medische noodhulp.",
          ],
          police: [
            "Politie-operatie - mijn team staat gereed voor ondersteuning.",
            "Ik coördineer met andere teams voor gezamenlijke actie.",
            "Team wordt ingezet volgens tactisch plan.",
          ],
          traffic: [
            "Verkeersincident - ik stuur team voor afsluiting en regeling.",
            "Mijn eenheden regelen verkeersomleidingen ter plaatse.",
            "Team gaat assisteren bij verkeersafhandeling.",
          ],
          public: [
            "Openbare orde - ik stuur extra patrouilles naar het gebied.",
            "Team wordt ingezet voor handhaving en deëscalatie.",
            "Mijn eenheden gaan assisteren bij ordehandhaving.",
          ],
          default: [
            "Teamleider hier - mijn jongens staan paraat voor elke klus.",
            "Operationeel team beschikbaar. Wat moet er gebeuren?",
            "Direct inzetbaar met volledig team. Geef instructies door.",
          ],
        },
      },
      Coördinator: {
        tone: "systematisch en ondersteunend",
        expertise: [
          "communicatie",
          "logistiek",
          "planning",
          "multi-agency coördinatie",
        ],
        responses: {
          urgent: [
            "Urgentie geregistreerd. Ik activeer het crisisteam en informeer alle betrokken diensten.",
            "Code rood procedures in werking. Ambulance, brandweer en bijzondere bijstand worden geactiveerd.",
            "Spoedsysteem actief - alle communicatie loopt nu via prioriteitskanaal.",
          ],
          location: [
            "Locatie geplot in het systeem. Ik coördineer toegangsroutes met verkeerscentrale.",
            "GPS coördinaten doorgestuurd naar alle eenheden. Kaartmateriaal beschikbaar.",
            "Gebied gemarkeerd als operationeel. Ik regel perimeter en verkeersomleidingen.",
          ],
          status: [
            "Realtime overview: 15 actieve incidenten, 23 eenheden ingezet, capaciteit 78%.",
            "Communicatie verloopt vlot. Alle diensten zijn sync en rapporteren volgens schema.",
            "Operationele status optimaal. Back-up systemen functioneren, geen verstoringen.",
          ],
          request: [
            "Verzoek genoteerd en doorgegeven. Ik monitor de voortgang en rapporteer terug.",
            "Coördinatie gestart. Ik breng alle partijen bij elkaar en regel de uitvoering.",
            "Opdracht in het systeem gezet. Ik zorg voor follow-up en statusupdates.",
          ],
          fire: [
            "Brand coördinatie - ik verbind brandweer met politie en ambulance.",
            "Ik regel logistieke ondersteuning voor brandbestrijding.",
            "Coördineer evacuatieprocedures met alle betrokken diensten.",
          ],
          medical: [
            "Medische coördinatie - ik schakel alle benodigde diensten in.",
            "Ik regel vrije toegang voor hulpdiensten naar locatie.",
            "Coördineer ziekenhuisopname en nazorg procedures.",
          ],
          police: [
            "Politie coördinatie - ik verbind alle operationele teams.",
            "Ik regel communicatie tussen verschillende politie-eenheden.",
            "Coördineer tactische ondersteuning en backup.",
          ],
          traffic: [
            "Verkeer coördinatie - ik schakel verkeerscentrale en wegbeheer in.",
            "Ik regel omleidingen en verkeersinformatie naar publiek.",
            "Coördineer berging en wegopruiming.",
          ],
          public: [
            "Openbare orde coördinatie - ik schakel ME en extra eenheden in.",
            "Ik regel communicatie met burgemeester en bestuur.",
            "Coördineer media-aanpak en informatievoorziening.",
          ],
          default: [
            "Coördinatiecentrum hier. Ik zorg voor de verbindingen tussen alle diensten.",
            "Alles loopt via mij - communicatie, planning en logistieke ondersteuning.",
            "Operationele coördinatie actief. Hoe kan ik de operatie ondersteunen?",
          ],
        },
      },
      Centralist: {
        tone: "alert en ondersteunend",
        expertise: [
          "meldingen",
          "communicatie",
          "protocollen",
          "administratie",
        ],
        responses: {
          urgent: [
            "Spoedmelding - ik schakel direct door naar de eerstvolgende beschikbare eenheid.",
            "112 lijn vrijgehouden. Alle nieuwe meldingen route ik om naar collega's.",
            "Prioriteit omhoog gezet. Ik monitor alle kanalen voor gerelateerde meldingen.",
          ],
          location: [
            "Adresgegevens geverifieerd in het systeem. Bewoners en bijzonderheden bekend.",
            "Locatie gekoppeld aan eerdere meldingen. Zie historiek in het dossier.",
            "Postcode gebied bekende probleemlocatie. Extra aandachtspunten genoteerd.",
          ],
          status: [
            "Meldkamer status: 23 open calls, gemiddelde wachttijd 45 seconden.",
            "Communicatielijn helder. Alle eenheden bereikbaar, systemen operationeel.",
            "Administratie bijgewerkt. Alle rapporten ingevoerd, dossier compleet.",
          ],
          request: [
            "Ik regel dat direct via het systeem. Koppeling naar de juiste dienstverlening.",
            "Verzoek gelogd en doorgestuurd. Ik houd de status bij en inform je over updates.",
            "Direct opgepakt. Ik neem contact op met de betreffende dienst namens jou.",
          ],
          fire: [
            "Brand melding ontvangen. Ik informeer direct de brandweer en regel coördinatie.",
            "Woningbrand - tankautospuit wordt gealarmeerd. Adres doorgestuurd.",
            "Brandmelding geregistreerd. Ik schakel automatisch door naar de kazerne.",
          ],
          medical: [
            "Ambulance wordt direct gealarmeerd. Ik geef de details door aan de bemanning.",
            "Medische spoed - A1 rit geactiveerd. ETA wordt doorgegeven.",
            "Ziekenwagen onderweg. Ik houd contact met de ambulancedienst.",
          ],
          police: [
            "Politiemelding doorgegeven. Surveillancewagen wordt naar locatie gestuurd.",
            "Ik schakel direct door naar de eerstvolgende politie-eenheid.",
            "Melding geregistreerd en doorgezet naar de wijkagent.",
          ],
          default: [
            "Meldkamer centraal - ik houd alle lijnen open en ondersteun waar nodig.",
            "Communicatie hub actief. Wat kan ik voor je betekenen in de operatie?",
            "Alle systemen online. Ik sta klaar voor ondersteuning en coördinatie.",
          ],
        },
      },
      "ACO OC Rotterdam": {
        tone: "operationeel commandocentrum",
        expertise: [
          "regionale coördinatie",
          "operationele commando",
          "eenheid dispatch",
          "situational awareness",
        ],
        responses: {
          urgent: [
            "ACO OC Rotterdam - spoedmelding genoteerd. Ik activeer onmiddellijk de benodigde eenheden.",
            "Operationeel commando geactiveerd. Welke ondersteuning is vereist ter plaatse?",
            "Rotterdam OC hier - ik schakel direct over naar spoedroutine.",
          ],
          location: [
            "Rotterdam gebied - ik ken de locatie. Beste aanrijroute wordt berekend.",
            "OC Rotterdam coördineert toegang tot die locatie. Verkeer wordt omgeleid.",
            "Gebied Rotterdam-centrum/zuid/noord - onze eenheden zijn in de buurt.",
          ],
          status: [
            "OC Rotterdam operationeel status: alle eenheden beschikbaar, systemen online.",
            "Huidige operaties Rotterdam: 8 actieve incidenten, voldoende capaciteit.",
            "Commandocentrum Rotterdam - alle communicatielijnen helder.",
          ],
          request: [
            "ACO Rotterdam regelt dat direct. Ik coördineer met de betreffende diensten.",
            "Operationeel commando Rotterdam neemt het over. Wordt direct uitgevoerd.",
            "OC Rotterdam heeft de autoriteit - ik handel dit persoonlijk af.",
          ],
          fire: [
            "Brandmelding Rotterdam - ik informeer direct de brandweer en regel ondersteuning.",
            "Woningbrand gemeld - ACO Rotterdam activeert tankautospuit en hoogwerker.",
            "Brand Rotterdam gebied - ik coördineer met kazerne Charlois voor snelle inzet.",
          ],
          medical: [
            "Medische noodsituatie - ACO Rotterdam schakelt ambulancedienst in.",
            "Rotterdam ambulancedienst wordt gealarmeerd. Ik regel spoedinzet.",
            "Medische spoed Rotterdam - ik activeer A1 rit en informeer het ziekenhuis.",
          ],
          police: [
            "Politie Rotterdam wordt ingeschakeld. Ik stuur surveillanceteam ter plaatse.",
            "ACO Rotterdam coördineert politie-inzet. Welke ondersteuning is nodig?",
            "Rotterdam politie ontvangt melding. Ik regel directe respons.",
          ],
          default: [
            "ACO OC Rotterdam operationeel. Hoe kan ik de situatie ondersteunen?",
            "Operationeel Commando Rotterdam staat klaar. Wat vereist onze aandacht?",
            "Rotterdam commandocentrum hier - alle middelen zijn beschikbaar.",
          ],
        },
      },
      "OVD OC": {
        tone: "kalm, autoritair, direct, professioneel",
        expertise: [
          "grote incidenten coördinatie",
          "eenheden informeren",
          "opschaling",
          "hulpdiensten afstemming",
          "politiecapaciteit inzet",
        ],
        responses: {
          urgent: [
            "OVD OC hier - spoedmelding ontvangen. Ik stuur direct de benodigde eenheden ter plaatse.",
            "Begrijpen, ik schakel onmiddellijk over naar code geel en mobiliseer extra mankracht.",
            "OVD OC neemt de leiding - ik coördineer alle beschikbare middelen voor deze situatie.",
          ],
          location: [
            "Locatie bekend - ik stuur het dichtstbijzijnde basisteam en regel toegang.",
            "Ik ken dat gebied, stuur direct verkeerspolitie voor afsluiting en begeleiding.",
            "Locatie genoteerd - ik coördineer met de wijkagent voor lokale kennis.",
          ],
          status: [
            "Status update: 6 eenheden actief, 3 basisteams beschikbaar, recherche stand-by.",
            "Operationele situatie stabiel - alle teams zijn bereikbaar en inzetbaar.",
            "Huidige capaciteit: voldoende mankracht, verkeerspolitie en ME beschikbaar.",
          ],
          request: [
            "Begrepen, ik regel dat direct via mijn bevoegdheden als OVD.",
            "Komt voor elkaar - ik neem contact op met de juiste diensten en houd je op de hoogte.",
            "Dat valt onder mijn verantwoordelijkheid, wordt onmiddellijk uitgevoerd.",
          ],
          fire: [
            "Begrijpelijk. Ik stem direct af met de brandweercentrale en regel de inzet.",
            "Woningbrand - ik informeer de brandweer en stuur politie ter ondersteuning voor afzetting.",
            "Brand gemeld - ik coördineer met brandweer, regel verkeersafsluiting en evacuatie.",
          ],
          medical: [
            "Medische nood - ik activeer ambulancedienst en stuur politie voor begeleiding.",
            "Ik schakel direct de ambulancedienst in en regel vrije doorgang.",
            "Ambulance wordt gealarmeerd - ik coördineer met ziekenhuis voor opname.",
          ],
          police: [
            "Dank je, ik licht de recherche direct in en stuur ter plaatse. Hou me op de hoogte van nieuwe info.",
            "Ik stuur direct een basisteam en verkeerspolitie ter ondersteuning. Ik blijf stand-by voor verdere instructies.",
            "Politie-inzet gecoördineerd - surveillanceteam en wijkagent zijn onderweg.",
          ],
          traffic: [
            "Verkeersongeval - ik stuur verkeerspolitie en regel berging via weginspectie.",
            "Ik coördineer met verkeerscentrale voor omleidingen en stuur toezicht ter plaatse.",
            "Verkeerssituatie - ik activeer wegbeheer en regel politiebegeleiding.",
          ],
          public: [
            "Openbare orde verstoring - ik stuur ME en basisteams voor handhaving.",
            "Overlast gemeld - ik coördineer met wijkteam en stuur extra patrouilles.",
            "Ik regel directe politie-inzet en neem contact op met burgemeester voor eventuele maatregelen.",
          ],
          default: [
            "OVD OC hier, wat vereist mijn aandacht?",
            "Officier van Dienst beschikbaar - geef me de situatieschets.",
            "OVD OC operationeel, hoe kan ik de operatie ondersteunen?",
          ],
        },
      },
    };

    // Get role profile or create custom one based on function and notes
    let profile = roleProfiles[contact.functie as keyof typeof roleProfiles];

    if (!profile) {
      // Create custom profile based on function name and notes
      profile = {
        tone: "professioneel en behulpzaam",
        expertise: ["algemene ondersteuning", "hulpverlening"],
        responses: {
          urgent: [
            `Als ${contact.functie} spring ik direct bij voor deze urgentie.`,
          ],
          location: [
            `Ik ken het gebied redelijk goed in mijn rol als ${contact.functie}.`,
          ],
          status: [
            `Vanuit mijn positie als ${contact.functie} kan ik bevestigen dat alles loopt.`,
          ],
          request: [
            `Natuurlijk, als ${contact.functie} kan ik dat voor je regelen.`,
          ],
          default: [`${contact.functie} hier, hoe kan ik je helpen?`],
        },
      };
    }

    // Enhance responses based on notes/comments
    if (contact.opmerkingen) {
      const notes = contact.opmerkingen.toLowerCase();

      if (notes.includes("specialist")) {
        profile.expertise.push("gespecialiseerde kennis");
        profile.responses.default.push(
          `Met mijn specialistische achtergrond kan ik hier specifiek advies over geven.`,
        );
      }

      if (notes.includes("ervaren")) {
        profile.responses.default.push(
          `Door mijn jarenlange ervaring herken ik dit soort situaties direct.`,
        );
      }

      if (notes.includes("verkeer")) {
        profile.expertise.push("verkeersmanagement");
        profile.responses.location.push(
          `Verkeerssituatie is mijn expertise - ik regel optimale routes.`,
        );
      }

      if (notes.includes("nacht")) {
        profile.responses.default.push(
          `Nachtdienst is mijn specialiteit, 24/7 beschikbaar.`,
        );
      }

      if (notes.includes("crisis")) {
        profile.responses.urgent.push(
          `Crisismanagement is precies waar ik voor opgeleid ben.`,
        );
      }
    }

    // Select appropriate response category based on context and incident type
    let selectedResponses;

    // Priority 1: Check for specific incident types (using optional chaining)
    if (incidentTypes.fire && (profile.responses as any).fire) {
      selectedResponses = (profile.responses as any).fire;
    } else if (incidentTypes.medical && (profile.responses as any).medical) {
      selectedResponses = (profile.responses as any).medical;
    } else if (incidentTypes.police && (profile.responses as any).police) {
      selectedResponses = (profile.responses as any).police;
    } else if (incidentTypes.traffic && (profile.responses as any).traffic) {
      selectedResponses = (profile.responses as any).traffic;
    } else if (incidentTypes.public && (profile.responses as any).public) {
      selectedResponses = (profile.responses as any).public;
    }
    // Priority 2: Check for context categories
    else if (isUrgent) {
      selectedResponses = profile.responses.urgent;
    } else if (isLocation) {
      selectedResponses = profile.responses.location;
    } else if (isStatus) {
      selectedResponses = profile.responses.status;
    } else if (isRequest) {
      selectedResponses = profile.responses.request;
    } else {
      selectedResponses = profile.responses.default;
    }

    // Add conversational context
    if (conversationHistory.length > 2) {
      const contextual = [
        `Zoals we eerder bespraken...`,
        `In aanvulling op mijn vorige bericht...`,
        `Update: de situatie ontwikkelt zich verder...`,
      ];
      if (Math.random() > 0.7) {
        selectedResponses = [...selectedResponses, ...contextual];
      }
    }

    // Return contextual response
    const randomIndex = Math.floor(Math.random() * selectedResponses.length);
    return selectedResponses[randomIndex];
  };

  const startConversationWithContact = (contact: any) => {
    // This function is specifically for colleague conversations only
    // Only switch to collega tab if we're not in an active 112 call
    if (currentConversation?.type !== "112-gesprek") {
      setActiveChatTab("collega");
    }

    // Clear any existing messages and set new colleague conversation
    setChatMessages([]);
    setCurrentConversation({
      ...contact,
      type: "collega-gesprek",
      isEmergencyCall: false
    });

    // Generate role-specific greeting
    const greetings = {
      Dienstchef: [
        "Dienstchef hier. Ik hoop dat het geen spoedgeval is?",
        "Je spreekt met de dienstchef. Wat vereist mijn aandacht?",
        "Dienstcommando beschikbaar. Geef me een situatieschets.",
      ],
      Teamleider: [
        "Teamleider operationeel. Mijn jongens staan klaar - wat is er aan de hand?",
        "Team alpha leader hier. Hebben we een operationele situatie?",
        "Teamcommando beschikbaar. Welke ondersteuning heb je nodig?",
      ],
      Coördinator: [
        "Coördinatiecentrum. Alle systemen zijn online - hoe kan ik helpen?",
        "Operationele coördinatie hier. Welke verbindingen moet ik leggen?",
        "Communicatiecentrale beschikbaar. Wat moet gecoördineerd worden?",
      ],
      Centralist: [
        "Meldkamer hier. Ik zie je oproep binnenkomen - wat is de situatie?",
        "Communicatie centraal. Alle lijnen zijn helder - ga je gang.",
        "112 centralist beschikbaar. Hoe kan ik je ondersteunen?",
      ],
    };

    let greeting = `Hallo, je spreekt met ${contact.functie}. Wat kan ik voor je doen?`;

    const roleGreetings = greetings[contact.functie as keyof typeof greetings];
    if (roleGreetings) {
      greeting =
        roleGreetings[Math.floor(Math.random() * roleGreetings.length)];
    }

    // Add context from notes if available
    if (contact.opmerkingen) {
      if (contact.opmerkingen.toLowerCase().includes("specialist")) {
        greeting += " Mijn specialistische kennis staat tot je beschikking.";
      }
      if (contact.opmerkingen.toLowerCase().includes("nacht")) {
        greeting += " Nachtdienst operationeel.";
      }
    }

    const initialMessage = {
      id: Date.now(),
      sender: contact.functie,
      content: greeting,
      timestamp: new Date().toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "incoming",
    };

    setChatMessages([initialMessage]);
  };

  // Incoming call management functions
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const simulateIncomingCall = () => {
    const phoneNumbers = [
      '06-12345678',
      '06-87654321', 
      '06-11223344',
      '010-1234567',
      '06-55667788',
      '070-9876543',
      '06-99887766',
      '06-44556677'
    ];

    const priorities = ['zeer-hoog', 'hoog', 'middel', 'laag'];

    const newCall = {
      id: Date.now(),
      line: Math.floor(Math.random() * 8) + 1,
      phoneNumber: phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      duration: '00:00',
      startTime: Date.now()
    };

    setIncomingCalls(prev => [...prev, newCall]);
    setCallTimers(prev => ({ ...prev, [newCall.id]: 0 }));

    showNotificationMessage(`Nieuwe 112-oproep op lijn ${newCall.line}`);
  };

  const acceptCall = (callId: number) => {
    console.log("🚨 ACCEPT CALL TRIGGERED - ID:", callId);
    const call = incomingCalls.find(c => c.id === callId);
    if (!call) {
      console.error("Call not found:", callId);
      return;
    }

    console.log("📞 Found call:", call);

    // Remove from incoming calls
    setIncomingCalls(prev => prev.filter(c => c.id !== callId));
    setCallTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[callId];
      return newTimers;
    });

    // Clear any existing conversation and messages first
    console.log("🧹 Clearing existing conversation state");
    setChatMessages([]);
    setCurrentConversation(null);

    // CRITICAL: Force switch to burgers tab for 112 conversations
    console.log("FORCING TAB SWITCH TO BURGERS");
    setActiveChatTab("burgers");

    // Generate scenario data immediately for 112 calls
    setTimeout(() => {
      console.log("🎯 Setting 112 conversation data");

      // Generate realistic scenario context based on LMC classifications
      const gemeenten = Object.keys(realisticAddresses);
      const selectedGemeente = gemeenten[Math.floor(Math.random() * gemeenten.length)];
      const addresses = realisticAddresses[selectedGemeente];
      const selectedAddress = addresses[Math.floor(Math.random() * addresses.length)];
      const scenario = generateRealistic112Scenario(selectedAddress, selectedGemeente);

      console.log("📍 Generated address:", selectedAddress, "in", selectedGemeente);
      console.log("🚨 Generated scenario:", scenario.type);

      // Set conversation with complete scenario data
      setCurrentConversation({
        id: callId,
        type: "112-gesprek",
        callerInfo: call.phoneNumber,
        priority: call.priority,
        startTime: Date.now(),
        isEmergencyCall: true,
        scenarioType: scenario.type,
        address: selectedAddress,
        gemeente: selectedGemeente,
        scenarioResponses: scenario.responses
      });

      showNotificationMessage(`112-gesprek aangenomen - lijn ${call.line}`);

      // Generate initial caller message
      const initialMessage = scenario.initialMessage;
      console.log("💬 Generated initial message:", initialMessage);

      // Add caller message after brief delay
      setTimeout(() => {
        const callerMessage = {
          id: Date.now(),
          sender: `Melder - ${call.phoneNumber}`,
          content: initialMessage,
          timestamp: new Date().toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "incoming",
        };
        setChatMessages([callerMessage]);
      }, 800);
    }, 200);
  };

  const declineCall = (callId: number) => {
    setIncomingCalls(prev => prev.filter(c => c.id !== callId));
    setCallTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[callId];
      return newTimers;
    });
    showNotificationMessage("Oproep doorgestuurd naar collega");
  };

  // Update call timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCallTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(callId => {
          updated[parseInt(callId)] = updated[parseInt(callId)] + 1;
        });
        return updated;
      });

      // Update call durations in display
      setIncomingCalls(prev => prev.map(call => ({
        ...call,
        duration: formatCallDuration(callTimers[call.id] || 0)
      })));
    }, 1000);

    return () => clearInterval(timer);
  }, [callTimers]);

  // Enhanced realistic Dutch addresses for emergency scenarios - BAG API compatible
  const realisticAddresses = {
    "Rotterdam": [
      "Coolsingel 125", "Witte de Withstraat 87", "Lijnbaan 234", "Blaak 555",
      "Mauritsweg 78", "Westzeedijk 167", "Kralingseweg 234", "Bergweg 89",
      "Oude Binnenweg 156", "Zuidplein 445", "Laan op Zuid 130", "Hobbemastraat 67",
      "Markthal bij de ingang", "Centraal Station perron 3", "Erasmusbrug voetpad",
      "Euromast parkeerplaats", "Diergaarde Blijdorp hoofdingang", "Feyenoord Stadion De Kuip"
    ],
    "Schiedam": [
      "Lange Haven 45", "Broersveld 123", "Korte Kerkstraat 78", "Marktplein 12",
      "Maasboulevard 234", "Rotterdamseweg 567", "Vijf Eikenweg 89", "Parkweg 156",
      "Grote Kerk voorplein", "Stedelijk Museum ingang", "Noletmolen parkeerplaats"
    ],
    "Vlaardingen": [
      "Oosthavenkade 89", "Maasboulevard 123", "Mathenesserlaan 456", "Hoflaan 234",
      "Schiedamseweg 78", "Hugo de Grootstraat 167", "Vlaardingervaart 345",
      "Westzijde winkelcentrum", "Station Vlaardingen Oost", "Broekpolder recreatiegebied"
    ],
    "Barendrecht": [
      "Middenbaan Noord 123", "Carnisselaan 456", "Smitshoek 78", "Raadhuislaan 234",
      "Wijngaardlaan 89", "Dorpsstraat 167", "Industrieweg 345",
      "Promenade winkelcentrum", "Station Barendrecht", "Binnenmaas sportpark"
    ],
    "Ridderkerk": [
      "Ridderhaven 123", "Kerkplein 45", "Slinge 234", "Zwijndrechtseweg 567",
      "Dr. Zamenhofstraat 89", "Donkerslootweg 156", "Molenlaan 78",
      "De Ridderhof winkelcentrum", "Slikkerveer industrieterrein"
    ],
    "Capelle aan den IJssel": [
      "Hoofdweg 234", "Fascinatio Boulevard 123", "Kanaalpark 456", "Schollevaar 78",
      "Terpenpad 167", "Beukendreef 89", "Molenstraat 234",
      "Passage winkelcentrum", "Station Capelle Schollevaar", "Hitland natuurgebied"
    ],
    "Albrandswaard": [
      "Dorpsstraat 45", "Kerkplein 12", "Molenstraat 67", "Schoolstraat 89",
      "Nieuweland 156", "Polderweg 234", "Gemeentehuis voorplein"
    ],
    "Maassluis": [
      "Hoogstraat 78", "Markt 23", "Koningin Julianaweg 145", "Zuidbuurt 67",
      "Havenstraat 89", "Station Maassluis ingang", "Futureland themapark"
    ],
    "Krimpen aan den IJssel": [
      "Krimpenerhout 123", "Stormpolder 456", "Prinses Beatrixlaan 78",
      "Kon. Wilhelminaweg 234", "Bergboezem natuurgebied", "Station Krimpen"
    ],
    "Lansingerland": [
      "Dorpsstraat Berkel 45", "Bleiswijk centrum 123", "Bergschenhoek markt 67",
      "Industrieweg 234", "Station Berkel-Westpolder", "Recreatiegebied Buytenland"
    ],
    "Nissewaard": [
      "Lange Nieuwstraat Spijkenisse 89", "Bernisse dorpsplein 45",
      "Heenvliet kerkstraat 123", "Industrieterrein Botlek", "Strand Rockanje"
    ],
    "Goeree-Overflakkee": [
      "Voorstraat Middelharnis 67", "Markt Sommelsdijk 23", "Stellendam haven 145",
      "Ouddorp boulevard 78", "Grevelingendam 234", "Vuurtoren Goedereede"
    ],
    "Voorne aan Zee": [
      "Boulevard Rockanje 123", "Kustweg Oostvoorne 456", "Dorpsstraat Tinte 78",
      "Strand Noordzeebad 234", "Voornse Duin natuurgebied", "Haven Stellendam"
    ]
  };

  // Function to generate realistic 112 scenarios with police classification weighting
  const generateRealistic112Scenario = (address: string, gemeente: string) => {
    // Create weighted scenario pool based on frequency
    const weightedScenarios: any[] = [];
    realistic112Scenarios.forEach(scenario => {
      const frequency = scenario.frequency || 1;
      for (let i = 0; i < frequency; i++) {
        weightedScenarios.push(scenario);
      }
    });

    // Select from weighted pool
    const selectedScenario = weightedScenarios[Math.floor(Math.random() * weightedScenarios.length)];

    return {
      type: selectedScenario.type,
      classification: selectedScenario.classification,
      priority: selectedScenario.priority,
      initialMessage: selectedScenario.initialMessage(address, gemeente),
      responses: selectedScenario.responses
    };
  };

  // Load police priority classifications for enhanced scenario generation
  const [policeClassifications, setPoliceClassifications] = useState<any[]>([]);

  useEffect(() => {
    const loadPoliceClassifications = async () => {
      try {
        const response = await fetch('/politie_meldingen_prioriteit.json');
        if (response.ok) {
          const data = await response.json();
          setPoliceClassifications(data.politie_meldingen || []);
          console.log('Loaded police classifications:', data.politie_meldingen?.length || 0);
        }
      } catch (error) {
        console.warn('Could not load police classifications:', error);
      }
    };

    loadPoliceClassifications();
  }, []);

  // Enhanced realistic 112 scenarios with official LMC classification support
  const realistic112Scenarios = [
    // High-priority police incidents (weighted higher)
    {
      type: "beroving",
      classification: "bzdsbr",
      priority: 1,
      frequency: 3, // Higher frequency
      initialMessage: (address: string, gemeente: string) => {
        const messages = [
          `Help! Ik word beroofd op ${address} in ${gemeente}! Hij heeft een mes!`,
          `112? Iemand probeert mijn tas af te pakken op ${address} in ${gemeente}! Kom snel!`,
          `Er wordt iemand beroofd vlakbij ${address} in ${gemeente}! Ze bedreigen hem!`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      },
      responses: {
        "locatie": [`Op straat voor het station`, `Bij de bushalt`, `Op het plein, veel mensen aanwezig`],
        "gewonden": [`Het slachtoffer ligt op de grond!`, `Hij bloeit uit zijn hoofd`, `Ze hebben hem geslagen!`],
        "dader": [`Een man in donkere kleding`, `Twee mannen op een scooter`, `Jongeman met bivakmuts`],
        "wapen": [`Hij heeft een mes!`, `Ik zie iets glimmends`, `Hij bedreigt met een voorwerp`],
        "situatie": [`Ze zijn nog hier!`, `Ze zijn net weggerend`, `Ze staan nog bij het slachtoffer`]
      }
    },
    {
      type: "inbraak",
      classification: "bzibwn",
      priority: 2,
      frequency: 2,
      initialMessage: (address: string, gemeente: string) => {
        const messages = [
          `Er wordt ingebroken in ${address} in ${gemeente}! Ik zie iemand rondlopen in het huis!`,
          `112? Ik zie inbrekers in het huis op ${address} in ${gemeente}! Kom snel!`,
          `Help! Er zijn mensen in mijn huis die er niet horen! ${address} in ${gemeente}!`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      },
      responses: {
        "locatie": [`In het huis van de buren`, `Op de eerste verdieping`, `Via de achterdeur naar binnen`],
        "dader": [`Twee personen in donkere kleding`, `Een man met een bivakmuts`, `Ik kan ze niet goed zien, maar ze hebben zaklampen`],
        "situatie": [`Ze zijn nog binnen`, `Ik hoorde glas breken`, `Ze doorzoeken de kamers`],
        "voertuig": [`Er staat een donkere auto voor de deur`, `Ik heb geen auto gezien`, `Er staat een busje om de hoek`]
      }
    },
    {
      type: "geweldsincident", 
      classification: "vogwve",
      priority: 1,
      frequency: 3,
      initialMessage: (address: string, gemeente: string) => {
        const panicMessages = [
          `Help! Er wordt iemand mishandeld op ${address} in ${gemeente}! Kom snel!`,
          `112? Er is een vechtpartij gaande op ${address} in ${gemeente}! Het is heel gewelddadig!`,
          `Hallo... er is ruzie en nu slaan ze elkaar! ${address} in ${gemeente}. Ik ben bang!`
        ];
        return panicMessages[Math.floor(Math.random() * panicMessages.length)];
      },
      responses: {
        "locatie": [`Op straat voor het huis`, `Bij de hoofdingang van het gebouw`, `Op het plein, iedereen kan het zien`],
        "gewonden": [`Ja! Er ligt iemand op de grond met bloed aan zijn hoofd!`, `Iemand schreeuwt van de pijn... er is veel bloed`, `Er zijn gewonden! Een man beweegt niet meer!`],
        "dader": [`Een man in donkere kleding, ik durfde niet goed te kijken`, `Twee mannen, een met een rode jas`, `Lange blonde man, ongeveer 25-30 jaar`],
        "wapen": [`Ik heb iets glimmends gezien... misschien een mes?`, `Nee, alleen met vuisten en geschreeuw`, `Hij had iets in zijn hand maar ik weet niet wat`],
        "situatie": [`Ze zijn nog steeds aan het vechten!`, `Een van hen is weggerend`, `Er staan veel mensen omheen die kijken`]
      }
    },
    {
      type: "verdachte_situatie",
      classification: "vovs",
      priority: 2,
      frequency: 2,
      initialMessage: (address: string, gemeente: string) => {
        const messages = [
          `Er gebeurt iets vreemds op ${address} in ${gemeente}. Ik zie verdachte personen`,
          `112? Er zijn mensen aan het inbreken denk ik, op ${address} in ${gemeente}`,
          `Verdachte situatie op ${address} in ${gemeente}. Mensen lopen rond een gebouw`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      },
      responses: {
        "locatie": [`Rond het gebouw`, `In de steeg`, `Bij de parkeerplaats`],
        "personen": [`Drie mannen in donkere kleding`, `Twee vrouwen die rondkijken`, `Een groep jongeren`],
        "gedrag": [`Ze kijken steeds om zich heen`, `Ze proberen ergens in te komen`, `Ze hebben tassen bij zich`],
        "voertuigen": [`Er staat een busje`, `Twee auto's met draaiende motor`, `Een scooter`]
      }
    },
    // Standard emergency scenarios (lower frequency)
    {
      type: "verkeersongeval", 
      classification: "ogwels",
      priority: 2,
      frequency: 1,
      initialMessage: (address: string, gemeente: string) => {
        const urgentMessages = [
          `112! Er is een zwaar ongeval op ${address} in ${gemeente}! Auto's zijn op elkaar gebotst!`,
          `Help! Verkeersongeval op ${address} in ${gemeente}! Er liggen mensen op de weg!`,
          `Er zijn auto's gecrasht op ${address} in ${gemeente}! Kom snel, er zijn gewonden!`
        ];
        return urgentMessages[Math.floor(Math.random() * urgentMessages.length)];
      },
      responses: {
        "locatie": [`Ter hoogte van het kruispunt`, `Vlak bij de verkeerslichten`, `Op de hoofdweg, de hele rijbaan is geblokkeerd`],
        "gewonden": [`Ja! Er liggen twee mensen naast de auto's en ze bewegen niet`, `Iemand zit nog vast in de auto, hij reageert niet`, `Ik zie mensen die gewond zijn... er is bloed`],
        "voertuigen": [`Een rode personenauto en een witte bestelwagen`, `Twee auto's, een ligt op zijn kant`, `Drie voertuigen betrokken, veel schade`],
        "verkeer": [`De hele weg is afgesloten`, `Er ontstaat een lange file`, `Niemand kan er nog doorheen`]
      }
    },
    {
      type: "brand",
      initialMessage: (address: string, gemeente: string) => {
        const fireMessages = [
          `Brand! Brand! ${address} in ${gemeente} staat in lichterlaaie!`,
          `112? Er is brand uitgebroken in ${address} in ${gemeente}! De vlammen slaan uit de ramen!`,
          `Help! Het huis op ${address} in ${gemeente} staat in brand! Er zijn mensen binnen!`
        ];
        return fireMessages[Math.floor(Math.random() * fireMessages.length)];
      },
      responses: {
        "locatie": [`Het is een rijtjeshuis in een woonwijk`, `Een appartementengebouw, derde verdieping`, `Een winkelpand met woningen erboven`],
        "gewonden": [`Ik weet niet of er mensen binnen zijn!`, `Er zijn mensen die uit de ramen springen!`, `Mensen hoesten van de rook, ze kunnen niet ademen!`],
        "brand": [`De vlammen zijn meters hoog!`, `Het hele huis staat nu in brand`, `Zwarte rook komt uit alle ramen`],
        "verspreiding": [`Het vuur springt over naar de buurhuizen!`, `De buren evacueren hun huizen`, `De hele straat staat vol rook`]
      }
    },
    {
      type: "medische_noodsituatie",
      initialMessage: (address: string, gemeente: string) => {
        const medicalMessages = [
          `Help! Er ligt iemand bewusteloos op ${address} in ${gemeente}!`,
          `112? Iemand is zomaar in elkaar gezakt op ${address} in ${gemeente}! Hij reageert niet!`,
          `Er is iemand flauwgevallen op ${address} in ${gemeente}! Stuur een ambulance!`
        ];
        return medicalMessages[Math.floor(Math.random() * medicalMessages.length)];
      },
      responses: {
        "locatie": [`Op de stoep voor het huis`, `In de winkel, bij de kassa`, `Op straat, mensen lopen eromheen`],
        "gewonden": [`Hij beweegt helemaal niet en reageert op niets`, `Ze ademt nog maar heel zwak`, `Er is bloed... ik denk dat hij gevallen is`],
        "bewustzijn": [`Helemaal bewusteloos`, `Reageert niet als ik zijn naam roep`, `Ogen zijn dicht, geen reactie op wat dan ook`],
        "ademhaling": [`Ik zie zijn borst nog wel bewegen`, `Heel zwakke ademhaling`, `Ik weet niet zeker of hij nog ademt... stuur snel hulp!`]
      }
    },
    {
      type: "inbraak",
      initialMessage: (address: string, gemeente: string) => {
        const burglaryMessages = [
          `Er wordt ingebroken in ${address} in ${gemeente}! Ik zie iemand rondlopen in het huis!`,
          `112? Ik zie inbrekers in het huis op ${address} in ${gemeente}! Kom snel!`,
          `Help! Er zijn mensen in mijn huis die er niet horen! ${address} in ${gemeente}!`
        ];
        return messages[Math.floor(Math.random() * burglaryMessages.length)];
      },
      responses: {
        "locatie": [`In het huis van de buren`, `Op de eerste verdieping`, `Via de achterdeur naar binnen`],
        "dader": [`Twee personen in donkere kleding`, `Een man met een bivakmuts`, `Ik kan ze niet goed zien, maar ze hebben zaklampen`],
        "situatie": [`Ze zijn nog binnen`, `Ik hoorde glas breken`, `Ze doorzoeken de kamers`],
        "voertuig": [`Er staat een donkere auto voor de deur`, `Ik heb geen auto gezien`, `Er staat een busje om de hoek`]
      }
    },
    {
      type: "verdrinking",
      initialMessage: (address: string, gemeente: string) => {
        const drowningMessages = [
          `Help! Iemand verdrinkt in het water bij ${address} in ${gemeente}!`,
          `112! Er ligt iemand in het water bij ${address} in ${gemeente} en hij beweegt niet!`,
          `Snel! Er is iemand in het water gevallen bij ${address} in ${gemeente}!`
        ];
        return drowningMessages[Math.floor(Math.random() * drowningMessages.length)];
      },
      responses: {
        "locatie": [`In de rivier bij de brug`, `In de haven`, `Bij de waterkant, vlak bij het pad`],
        "persoon": [`Een man, hij spartelt in het water`, `Iemand drijft roerloos`, `Een vrouw, ze roept om hulp maar gaat kopje onder`],
        "situatie": [`Het water is hier diep`, `Er is sterke stroming`, `Ik durf niet het water in`],
        "hulp": [`Andere mensen proberen te helpen`, `Niemand durft erin`, `Iemand gooit een reddingsboei`]
      }
    },
    {
      type: "overdosis",
      initialMessage: (address: string, gemeente: string) => {
        const overdoseMessages = [
          `Er ligt iemand bewusteloos op ${address} in ${gemeente}! Ik denk drugs!`,
          `112? Iemand heeft te veel gebruikt bij ${address} in ${gemeente}! Hij reageert nergens op!`,
          `Help! Er ligt een persoon met schuim op de mond op ${address} in ${gemeente}!`
        ];
        return overdoseMessages[Math.floor(Math.random() * overdoseMessages.length)];
      },
      responses: {
        "locatie": [`In het park op een bankje`, `In de steeg achter de winkels`, `Bij de bushalte`],
        "persoon": [`Een jongeman, hij beweegt niet`, `Vrouw van middelbare leeftijd`, `Tiener, lijkt heel jong`],
        "symptomen": [`Schuim uit de mond`, `Heel bleek en koud`, `Hijgt heel zwaar`],
        "spullen": [`Er liggen spullen naast hem`, `Ik zie naalden en zakjes`, `Er ligt een lepel en andere dingen`]
      }
    }
  ];

  // This function is no longer needed as scenario generation is handled in acceptCall
  const simulateCallerMessage = () => {
    console.log("🎭 simulateCallerMessage called but scenario already generated");
  };

  // Enhanced 112 emergency caller AI - realistic Dutch civilian responses
  const generate112Response = (operatorMessage: string, conversationHistory: any[] = []) => {
    const message = operatorMessage.toLowerCase();

    // Get current scenario context
    const scenarioType = currentConversation?.scenarioType;
    const address = currentConversation?.address;
    const gemeente = currentConversation?.gemeente;
    const scenarioResponses = currentConversation?.scenarioResponses;

    console.log("🤖 AI Response Context - Scenario:", scenarioType, "Address:", address, "Gemeente:", gemeente);

    // Enhanced emotion detection based on scenario urgency
    const getEmotionalTone = () => {
      const urgentScenarios = ["brand", "geweldsincident", "verkeersongeval", "verdrinking", "beroving"];
      const isUrgent = urgentScenarios.includes(scenarioType);
      const conversationLength = conversationHistory.length;

      // Emotion evolves during conversation - more realistic progression
      if (conversationLength === 0 && isUrgent) return "panic";
      if (conversationLength <= 2 && isUrgent) return "urgent";
      if (conversationLength <= 4) return "concerned";
      return "calming";
    };

    const emotionalTone = getEmotionalTone();

    // Dispatcher asking for location/address
    if (message.includes("locatie") || message.includes("waar") || message.includes("adres") || 
        message.includes("exacte") || message.includes("straat")) {

      const locationResponses = {
        panic: [
          `${address} in ${gemeente}! Ik sta hier vlakbij!`,
          `Eh... ${address}, ${gemeente}! Kom snel!`,
          `${gemeente}... eh... ${address}! Help ons!`
        ],
        urgent: [
          `${address} in ${gemeente}, ter hoogte van de ingang`,
          `Het is ${address} in ${gemeente}, bij de voorkant van het gebouw`,
          `${gemeente}, ${address}. Ik zie jullie al aankomen?`
        ],
        concerned: [
          `Het adres is ${address} in ${gemeente}`,
          `${address}, dat is in ${gemeente}`,
          `We zijn op ${address} in ${gemeente}`
        ]
      };

      const responses = locationResponses[emotionalTone] || locationResponses.concerned;
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Asking about injuries/victims
    if (message.includes("gewond") || message.includes("slachtoffer") || message.includes("letsel") || 
        message.includes("pijn") || message.includes("beweegt") || message.includes("ademt") || 
        message.includes("bewust")) {

      const injuryResponses = {
        geweldsincident: [
          "Ja! Hij ligt op de grond en beweegt niet veel!",
          "Er is veel bloed... ik durf niet dichterbij te komen",
          "Iemand schreeuwt van de pijn! Het ziet er erg uit!",
          "Ja, er zijn gewonden! Stuur snel een ambulance!"
        ],
        beroving: [
          "Het slachtoffer ligt op de grond!",
          "Hij bloeit uit zijn hoofd",
          "Ze hebben hem geslagen!",
          "De man beweegt wel maar hij heeft pijn"
        ],
        verkeersongeval: [
          "Ja, er liggen mensen naast de auto's!",
          "Iemand zit nog vast in de auto, hij reageert niet",
          "Er ligt iemand op straat, ik zie bloed",
          "Twee mensen zijn uit de auto gestapt, maar een persoon beweegt niet"
        ],
        brand: [
          "Mensen hoesten van de rook!",
          "Ik zie mensen uit de ramen springen!",
          "Er zijn mensen vast op de bovenste verdieping!",
          "Iemand heeft rook ingeademd, hij hoest heel erg"
        ],
        medische_noodsituatie: [
          "Ja! Deze persoon is bewusteloos!",
          "Hij reageert helemaal niet, ook niet als ik roep",
          "Ze ademt nog maar heel zwak",
          "Er is iets heel ergs aan de hand, hij viel plotseling neer"
        ],
        verdrinking: [
          "Hij spartelt in het water maar gaat steeds kopje onder!",
          "Iemand drijft roerloos in het water!",
          "Ze roept om hulp maar ik kan haar niet bereiken!",
          "Hij beweegt niet meer... ik denk dat hij bewusteloos is!"
        ],
        inbraak: [
          "Nee, ik zie geen gewonden, maar de bewoners zijn niet thuis",
          "Ik weet niet of er iemand gewond is, ik durf niet te kijken",
          "De inbrekers zijn nog binnen, ik zie ze bewegen"
        ]
      };

      const responses = injuryResponses[scenarioType] || [
        "Ik weet het niet zeker... het ziet er niet goed uit",
        "Er zijn mensen die hulp nodig hebben",
        "Ja, er zijn gewonden hier"
      ];

      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Asking about number of people involved
    if (message.includes("hoeveel") || message.includes("personen") || message.includes("mensen") || 
        message.includes("aantal")) {

      const countResponses = [
        "Ik zie... eh... twee, misschien drie personen",
        "Er zijn een paar mensen betrokken, ik kan niet goed tellen",
        "Moeilijk te zeggen... er staan veel mensen omheen",
        "Twee mensen direct betrokken, maar er zijn meer omstanders",
        "Ik tel ongeveer vier personen hier"
      ];

      if (emotionalTone === "panic") {
        return "Ik... ik weet het niet! Er zijn veel mensen! Help!";
      }

      return countResponses[Math.floor(Math.random() * countResponses.length)];
    }

    // Asking about weapons or danger
    if (message.includes("wapen") || message.includes("gevaarlijk") || message.includes("bedreig") || 
        message.includes("mes") || message.includes("vuurwapen")) {

      const weaponResponses = {
        geweldsincident: [
          "Ik heb iets glimmends gezien in zijn hand!",
          "Het leek op een mes... ik ben weggerend!",
          "Ik durf niet te kijken, maar het zag er gevaarlijk uit",
          "Nee, alleen met vuisten en geschreeuw",
          "Hij had iets vast, maar ik kon niet zien wat"
        ],
        default: [
          "Ik heb geen wapen gezien",
          "Nee, volgens mij niet",
          "Ik durf niet goed te kijken",
          "Het ging allemaal zo snel..."
        ]
      };

      const responses = weaponResponses[scenarioType] || weaponResponses.default;
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Asking for description of suspects/people involved
    if (message.includes("beschrijv") || message.includes("dader") || message.includes("persoon") || 
        message.includes("uiterlijk") || message.includes("kleding")) {

      const descriptionResponses = [
        "Een man in donkere kleding, ik kon zijn gezicht niet goed zien",
        "Blonde vrouw, ongeveer 30 jaar, zwarte jas",
        "Lange man met een rode hoodie",
        "Ik kon niet goed kijken... het ging zo snel",
        "Twee mannen, een met een donkere jas, de ander in het wit",
        "Het was een oudere man, grijs haar, donkere broek"
      ];

      if (emotionalTone === "panic") {
        return "Ik... ik weet het niet! Ik was zo bang!";
      }

      return descriptionResponses[Math.floor(Math.random() * descriptionResponses.length)];
    }

    // Dispatcher trying to calm the caller
    if (message.includes("rustig") || message.includes("kalm") || message.includes("adem") || 
        message.includes("goed") || message.includes("luister")) {

      const calmingResponses = {
        panic: [
          "Oké... oké... ik probeer rustig te blijven...",
          "Het is moeilijk, maar ik doe mijn best...",
          "Ja... ik adem diep in... en uit...",
          "Oké, ik luister naar u"
        ],
        urgent: [
          "Ja, ik probeer kalm te blijven",
          "Oké, ik doe wat u zegt",
          "Ik blijf hier wachten op jullie",
          "Dank u, dat helpt"
        ],
        concerned: [
          "Ja, ik voel me al wat rustiger",
          "Dank u, ik blijf kalm",
          "Ik wacht hier op de hulpdiensten",
          "Oké, ik snap het"
        ]
      };

      const responses = calmingResponses[emotionalTone] || calmingResponses.calming;
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Asking for personal details
    if (message.includes("naam") || message.includes("telefoonnummer") || message.includes("gegevens") ||
        message.includes("heet") || message.includes("bent u")) {
      const dutchNames = [
        "Sandra de Vries", "Mark Jansen", "Linda van der Berg", "Peter Willems", 
        "Fatima el Bakri", "Ahmed Hassan", "Marieke Visser", "Tom van Dijk",
        "Nadia Oussama", "Dennis Bakker", "Yasmin Özdemir", "Jan Koster",
        "Emma Vermeulen", "Lars de Boer", "Sanne Hendriks", "Daan Mulder"
      ];
      const selectedName = dutchNames[Math.floor(Math.random() * dutchNames.length)];
      return `Mijn naam is ${selectedName}, en u belt naar ${currentConversation?.callerInfo}`;
    }

    // Asking if they are safe
    if (message.includes("veilig") || message.includes("veiligheid") || message.includes("gevaar") ||
        message.includes("wegga") || message.includes("weggaan")) {
      const safetyResponses = {
        panic: [
          "Ik... ik weet het niet! Moet ik wegrennen?",
          "Nee, ik ben niet veilig! Wat moet ik doen?",
          "Ik sta nog steeds hier, is dat gevaarlijk?"
        ],
        urgent: [
          "Ik sta op afstand, maar ik zie alles",
          "Ik ben weg van de gevaarlijke situatie",
          "Ja, ik ben veilig maar ik kan het nog zien"
        ],
        concerned: [
          "Ja, ik sta op veilige afstand",
          "Ik ben veilig, maak je geen zorgen",
          "Ik houd afstand zoals u zei"
        ]
      };

      const responses = safetyResponses[emotionalTone] || safetyResponses.concerned;
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Asking what happened
    if (message.includes("gebeurd") || message.includes("situatie") || message.includes("wat is er") || 
        message.includes("zie") || message.includes("wat zie")) {
      const situationResponses = {
        geweldsincident: [
          "Er wordt gevochten! Twee mannen slaan elkaar!",
          "Iemand wordt aangevallen! Er is veel geschreeuw!",
          "Er is een vechtpartij gaande, het escaleert steeds meer!"
        ],
        beroving: [
          "Ze proberen zijn tas af te pakken!",
          "Een man bedreigt iemand met een mes!",
          "Twee mannen vallen een voorbijganger aan!"
        ],
        verkeersongeval: [
          "Er zijn auto's op elkaar gebotst!",
          "Een auto heeft een fietser aangereden!",
          "Er is een ongeval, auto's liggen op hun kant!"
        ],
        brand: [
          "Er komen vlammen uit de ramen!",
          "Het hele gebouw staat in brand!",
          "Ik zie rook en vuur, het verspreidt zich snel!"
        ],
        medische_noodsituatie: [
          "Iemand is plotseling neergevallen!",
          "Een persoon is bewusteloos geraakt!",
          "Er ligt iemand roerloos op de grond!"
        ],
        verdrinking: [
          "Er is iemand in het water gevallen!",
          "Iemand spartelt in het water en gaat kopje onder!",
          "Er drijft een persoon in het water die niet beweegt!"
        ],
        inbraak: [
          "Er lopen mensen rond in het huis die er niet horen!",
          "Ik zie zaklampen bewegen binnen, het zijn inbrekers!",
          "Ze hebben de achterdeur opengebroken en zijn naar binnen!"
        ],
        verdachte_situatie: [
          "Er staan mensen verdacht rond te kijken",
          "Twee mannen proberen ergens in te breken denk ik",
          "Ze hebben tassen bij zich en kijken steeds om zich heen"
        ]
      };

      const responses = situationResponses[scenarioType] || [
        "Er is iets ergs gebeurd, stuur snel hulp!",
        "Ik weet niet precies wat er aan de hand is, maar het ziet er slecht uit"
      ];

      return responses[Math.floor(Math.random() * responses.length)];
    }

    // More natural conversation flow based on operator questions
    if (message.includes("rustig") || message.includes("kalm") || message.includes("blijf") || 
        message.includes("adem")) {
      const calmingResponses = {
        panic: [
          "Ik... ik probeer kalm te blijven maar het is zo eng!",
          "Oké... oké... ik adem diep in...",
          "Moeilijk om rustig te blijven maar ik doe mijn best"
        ],
        urgent: [
          "Ja, ik probeer kalm te blijven",
          "Oké, ik luister naar u",
          "Ik doe wat u zegt"
        ],
        concerned: [
          "Ja, ik ben wat rustiger nu",
          "Dank u, dat helpt",
          "Ik blijf hier wachten"
        ],
        calming: [
          "Ik voel me al veel beter nu u er bent",
          "Dank u wel voor uw hulp",
          "Ik blijf kalm tot de hulpdiensten er zijn"
        ]
      };

      const responses = calmingResponses[emotionalTone] || calmingResponses.concerned;
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Time-based emotional progression responses
    const progressiveResponses = {
      early: [
        "Help! Er is iets vreselijks gebeurd!",
        "Kom snel! Dit is een noodsituatie!", 
        "Ik weet niet wat ik moet doen!",
        "Het is heel erg hier!"
      ],
      middle: [
        "Wanneer komen jullie ongeveer?",
        "Ik blijf hier in de buurt wachten",
        "Moet ik nog iets doen tot jullie er zijn?",
        "Ik hoor sirenes in de verte, zijn dat jullie?"
      ],
      late: [
        "Ik zie jullie lichten! Zijn jullie dat?",
        "De hulpdiensten zijn er! Dank jullie wel!",
        "Gelukkig, ik zie ze aankomen!",
        "Jullie zijn er snel! Dank u wel!"
      ]
    };

    const conversationStage = conversationHistory.length < 2 ? "early" : 
                             conversationHistory.length < 5 ? "middle" : "late";

    // Scenario-specific final responses
    if (scenarioResponses?.situatie && message.includes("nog")) {
      return scenarioResponses.situatie[Math.floor(Math.random() * scenarioResponses.situatie.length)];
    }

    // Default responses based on conversation stage and emotion
    const defaultResponses = progressiveResponses[conversationStage];

    // Add emotional stuttering for panic situations
    if (emotionalTone === "panic" && Math.random() > 0.7) {
      const response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
      return response.replace(/^(\w)/, "$1... $1");
    }

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const sendMessageToColleague = (message: string) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "Meldkamer",
      content: message,
      timestamp: new Date().toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "outgoing",
    };

    setChatMessages((prev) => [...prev, userMessage]);

    // Handle responses based on conversation type and current tab
    if (currentConversation?.type === "112-gesprek" || 
        (currentConversation?.isEmergencyCall && activeChatTab === "burgers")) {
      // This is a 112 emergency call - generate realistic caller response
      setTimeout(() => {
        const callerResponse = generate112Response(message, chatMessages);
        const responseMessage = {
          id: Date.now() + 1,
          sender: `Melder - ${currentConversation.callerInfo}`,
          content: callerResponse,
          timestamp: new Date().toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "incoming",
        };
        setChatMessages((prev) => [...prev, responseMessage]);
      }, 800 + Math.random() * 1500); // Quick response for 112 calls
    } else if (currentConversation?.type === "collega-gesprek" && 
               currentConversation?.functie && 
               activeChatTab === "collega") {
      // This is a colleague conversation - generate professional response
      setTimeout(
        () => {
          const aiResponse = generateColleagueResponse(
            currentConversation,
            message,
            chatMessages,
          );
          const responseMessage = {
            id: Date.now() + 1,
            sender: currentConversation.functie,
            content: aiResponse,
            timestamp: new Date().toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: "incoming",
          };
          setChatMessages((prev) => [...prev, responseMessage]);
        },
        1000 + Math.random() * 2000,
      ); // Random delay between 1-3 seconds
    }
  };
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState({
    functie: "",
    omschrijving: "",
    telefoonnummer: "",
    beginDienst: "",
    eindeDienst: "",
    bereikbaar24u: false,
    opmerkingen: "",
  });
  interface PoliceUnit {
    roepnummer: string;
    aantal_mensen: number;
    rollen: string[];
    soort_auto: string;
    team: string;
    status: string;
    locatie?: string;
    incident?: string;
    lastUpdate?: string;
  }

  // Default JSON database from provided file
  const defaultPoliceUnitsData: PoliceUnit[] = [
    {
      roepnummer: "RT 11.01",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.02",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.03",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.04",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.05",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.06",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.07",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.08",
      aantal_mensen: 2,
      rollen: ["Noodhulp"],
      soort_auto: "BPV - bus",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.09",
      aantal_mensen: 1,
      rollen: ["Senior", "ACO"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.10",
      aantal_mensen: 1,
      rollen: ["Opr. Expert", "OPCO"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.11",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Solo"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.12",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Solo"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.13",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Solo"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.14",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Solo"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.15",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Solo"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.16",
      aantal_mensen: 2,
      rollen: ["Noodhulp", "Onopvallend"],
      soort_auto: "BPV-onopvallend",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.17",
      aantal_mensen: 2,
      rollen: ["Noodhulp", "Onopvallend"],
      soort_auto: "BPV-onopvallend",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.18",
      aantal_mensen: 2,
      rollen: ["Noodhulp", "Onopvallend"],
      soort_auto: "BPV-onopvallend",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.19",
      aantal_mensen: 2,
      rollen: ["Noodhulp", "Onopvallend"],
      soort_auto: "BPV-onopvallend",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.20",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "OSA"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.21",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Motor"],
      soort_auto: "BPV-motor",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.22",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Motor"],
      soort_auto: "BPV-motor",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.23",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Motor"],
      soort_auto: "BPV-motor",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.24",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Motor"],
      soort_auto: "BPV-motor",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.25",
      aantal_mensen: 1,
      rollen: ["Noodhulp", "Motor"],
      soort_auto: "BPV-motor",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.26",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.27",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.28",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.29",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.30",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.31",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.32",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.33",
      aantal_mensen: 2,
      rollen: ["Voet/fiets"],
      soort_auto: "Fiets",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.34",
      aantal_mensen: 3,
      rollen: ["Noodhulp", "Studenten"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.35",
      aantal_mensen: 3,
      rollen: ["Noodhulp", "Studenten"],
      soort_auto: "BPV-auto",
      team: "Basisteam Waterweg (A1)",
      status: "Beschikbaar"
    },
    {
      roepnummer: "RT 11.36",
      aantal_mensen: 2,
      rollen: ["Noodhulp", "Studenten"],
      soort_auto: "BPV-auto",
      team: "Basisteam Rotterdam",
      status: "Beschikbaar"
    }
  ];

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p>Welcome to the Dutch Police Emergency Dispatch System</p>
    </div>
  );
}