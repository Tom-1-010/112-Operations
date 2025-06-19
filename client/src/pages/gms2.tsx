
import { useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";

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
  plaatsnaam?: string;
  mc1?: string;
  mc2?: string;
  notities?: string;
  karakteristieken?: any[];
  status?: string;
}

export default function GMS2() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedIncident, setSelectedIncident] = useState<GmsIncident | null>(null);
  const [kladblokText, setKladblokText] = useState("");
  const [mc1Value, setMc1Value] = useState("Bezitsaantasting");
  const [mc2Value, setMc2Value] = useState("Inbraak");
  const [notitiesText, setNotitiesText] = useState("");
  const [loggingEntries, setLoggingEntries] = useState<Array<{
    id: number;
    timestamp: string;
    message: string;
  }>>([]);
  
  // Sample incidents data matching the interface
  const [incidents] = useLocalStorage<GmsIncident[]>("gms2Incidents", [
    {
      id: 1,
      nr: 161,
      prio: 2,
      tijd: "08:28",
      mc: "BZIBBWN",
      locatie: "CANADASTRAAT 3",
      plaats: "EIN",
      roepnr: "5802",
      positie: "218",
      melderNaam: "Janssen",
      melderAdres: "",
      telefoonnummer: "",
      straatnaam: "CANADASTRAAT",
      huisnummer: "3",
      plaatsnaam: "EINDHOVEN",
      mc1: "Bezitsaantasting",
      mc2: "Inbraak",
      notities: "",
      karakteristieken: [],
      status: "Openstaand"
    }
  ]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set initial selected incident
  useEffect(() => {
    if (incidents.length > 0 && !selectedIncident) {
      setSelectedIncident(incidents[0]);
    }
  }, [incidents, selectedIncident]);

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
    setSelectedIncident(incident);
  };

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
  };

  const handleKladblokKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = kladblokText.trim();
      if (message) {
        addLoggingEntry(message);
        setKladblokText("");
      }
    }
  };

  return (
    <div className="gms2-container">
      {/* Top Menu Bar */}
      <div className="gms2-menu-bar">
        <div className="gms2-menu-left">
          <span className="gms2-menu-item">Start</span>
          <span className="gms2-menu-item">Beheer</span>
          <span className="gms2-menu-item">Incident</span>
          <span className="gms2-menu-item">Werkplek</span>
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
                <span>Nr</span>
                <span>Pri</span>
                <span>MC</span>
                <span>Locatie (Object - Straat)</span>
                <span>Plaats</span>
                <span>Roepnr</span>
                <span>Tijd</span>
                <span>PC</span>
              </div>
              {/* Empty rows for lopende incidenten */}
              <div className="gms2-empty-rows">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="gms2-table-row">
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
          </div>

          {/* Openstaande incidenten section */}
          <div className="gms2-section">
            <div className="gms2-section-header">Openstaande incidenten</div>
            <div className="gms2-incidents-table">
              <div className="gms2-table-header">
                <span>Nr</span>
                <span>Pri</span>
                <span>Tijd</span>
                <span>MC</span>
                <span>Locatie (Object - Straat)</span>
                <span>Plaats</span>
                <span>Roepnr</span>
                <span>Pos</span>
              </div>
              {incidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className={`gms2-table-row ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
                  onClick={() => handleIncidentSelect(incident)}
                >
                  <span>{incident.nr}</span>
                  <span>{incident.prio}</span>
                  <span>{incident.tijd}</span>
                  <span className="gms2-mc-cell">{incident.mc}</span>
                  <span>{incident.locatie}</span>
                  <span>{incident.plaats}</span>
                  <span>{incident.roepnr}</span>
                  <span>{incident.positie}</span>
                </div>
              ))}
              {/* Fill remaining rows */}
              {Array.from({ length: Math.max(0, 15 - incidents.length) }).map((_, index) => (
                <div key={`empty-${index}`} className="gms2-table-row">
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
        </div>

        {/* Right Panel - Incident Details */}
        <div className="gms2-right-panel">
          {selectedIncident && (
            <>
              {/* Incident Header */}
              <div className="gms2-incident-header">
                P:Canadastraat 3
              </div>

              {/* Incident Form */}
              <div className="gms2-incident-form">
                {/* Title Row */}
                <div className="gms2-title-section">
                  <span className="gms2-title-text">P: Inbraak woning</span>
                  <span className="gms2-incident-id">161</span>
                </div>

                {/* Time Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Tijd:</span>
                  <span className="gms2-time-display">08:23</span>
                  <span className="gms2-field-label">Aangemaakt:</span>
                  <input type="text" className="gms2-input medium" value="Janssen" readOnly />
                  <span className="gms2-field-label">Koppie</span>
                  <button className="gms2-btn small">Koppie</button>
                </div>

                {/* Melder Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Melder:</span>
                  <input type="text" className="gms2-input wide" value="Janssen" readOnly />
                  <span className="gms2-field-label">Tel:</span>
                  <input type="text" className="gms2-input medium" />
                  <button className="gms2-btn small">Anoniem</button>
                </div>

                {/* Adres Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Adres:</span>
                  <input type="text" className="gms2-input wide" />
                  <span className="gms2-field-label">Nr:</span>
                  <input type="text" className="gms2-input small" />
                  <span className="gms2-field-label">L/C:</span>
                  <input type="text" className="gms2-input small" />
                  <span className="gms2-field-label">Gem:</span>
                </div>

                {/* Location Details Row 1 */}
                <div className="gms2-form-row">
                  <span className="gms2-code-field">115</span>
                  <input type="text" className="gms2-input wide" value="CANADASTRAAT" readOnly />
                  <span className="gms2-field-label">Nr:</span>
                  <input type="text" className="gms2-input small" value="3" readOnly />
                </div>

                {/* Location Details Row 2 */}
                <div className="gms2-form-row">
                  <span className="gms2-code-field">5651CE</span>
                  <span className="gms2-field-label">Pts:</span>
                  <input type="text" className="gms2-input wide" value="EINDHOVEN" readOnly />
                  <span className="gms2-field-label">Gem:</span>
                  <input type="text" className="gms2-input wide" value="EINDHOVEN" readOnly />
                </div>

                {/* Function Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Func:</span>
                  <input type="text" className="gms2-input wide" />
                </div>

                {/* Action Buttons Row */}
                <div className="gms2-button-row">
                  <button className="gms2-btn small">COM</button>
                  <button className="gms2-btn small">EDB</button>
                  <button className="gms2-btn small">DUB</button>
                  <button className="gms2-btn small">AOL</button>
                  <button className="gms2-btn small">OGS</button>
                  <button className="gms2-btn small">OBJ</button>
                  <button className="gms2-btn small">LOC</button>
                  <button className="gms2-btn small">PROC</button>
                  <button className="gms2-btn small">IV</button>
                  <button className="gms2-btn small">IV+</button>
                  <button className="gms2-btn small">TK</button>
                  <button className="gms2-btn small">OMS</button>
                  <button className="gms2-btn small">RND</button>
                </div>

                {/* Tab Row */}
                <div className="gms2-button-row">
                  <button className="gms2-btn tab-btn">Hist. Meldblok</button>
                  <button className="gms2-btn tab-btn">Locatietreffpte</button>
                  <button className="gms2-btn tab-btn">Statusoverzicht</button>
                  <button className="gms2-btn tab-btn">Overige inzet</button>
                </div>

                {/* Logging Section */}
                <div className="gms2-history-section">
                  <div className="gms2-history-scrollbox" id="gms2-logging-display">
                    {loggingEntries.map((entry) => (
                      <div key={entry.id} className="gms2-history-entry">
                        {entry.timestamp} {entry.message}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dropdown tabs row */}
                <div className="gms2-dropdown-tabs">
                  <div className="gms2-tab-group">
                    <label>Hints/Kar</label>
                    <select className="gms2-dropdown">
                      <option>MC</option>
                    </select>
                  </div>
                  <div className="gms2-tab-group">
                    <select className="gms2-dropdown" style={{ backgroundColor: '#f5f5f5' }}>
                      <option>Dienstverlening</option>
                    </select>
                  </div>
                  <div className="gms2-tab-group">
                    <select className="gms2-dropdown" style={{ backgroundColor: '#f5f5f5' }}>
                      <option>Scenario</option>
                    </select>
                  </div>
                  <div className="gms2-tab-group">
                    <select className="gms2-dropdown" style={{ backgroundColor: '#f5f5f5' }}>
                      <option>Testmelding</option>
                    </select>
                  </div>
                </div>

                {/* Main characteristics layout */}
                <div className="gms2-characteristics-layout">
                  <div className="gms2-characteristics-table">
                    <div className="gms2-table-header">
                      <span>Karakteristieken</span>
                      <span>Waarde</span>
                      <span>Bro</span>
                    </div>
                    <div className="gms2-table-row">
                      <span>RTIC</span>
                      <span>nee</span>
                      <span>PC</span>
                    </div>
                    <div className="gms2-table-row">
                      <span>Meldercontact</span>
                      <span>teruggebeld</span>
                      <span>PC</span>
                    </div>
                    <div className="gms2-table-row">
                      <span>Delaycode pol</span>
                      <span>geen eenheid</span>
                      <span>PC</span>
                    </div>
                    <div className="gms2-table-row">
                      <span>Instantie</span>
                      <span>cent meldg bp</span>
                      <span>PC</span>
                    </div>
                    <div className="gms2-table-row">
                      <span>Instantie</span>
                      <span>verkeerscentr</span>
                      <span>PC</span>
                    </div>
                  </div>

                  

                  <div className="gms2-kladblok-modern">
                    <textarea 
                      value={kladblokText}
                      onChange={(e) => setKladblokText(e.target.value)}
                      onKeyPress={handleKladblokKeyPress}
                      className="gms2-kladblok-textarea"
                      placeholder="Kladblok, hierin kan je alle relevante info vermelden (Enter om toe te voegen aan logging)"
                    />
                  </div>
                </div>

                {/* Bottom action section */}
                <div className="gms2-bottom-actions">
                  <div className="gms2-service-options">
                    <div className="gms2-service-col">
                      <input type="checkbox" />
                      <span>P</span>
                      <input type="checkbox" />
                    </div>
                    <div className="gms2-service-col">
                      <input type="checkbox" />
                      <span>B</span>
                      <input type="checkbox" />
                    </div>
                    <div className="gms2-service-col">
                      <input type="checkbox" />
                      <span>A</span>
                      <input type="checkbox" />
                    </div>
                  </div>

                  <div className="gms2-action-buttons">
                    <select className="gms2-dropdown">
                      <option>Testmelding</option>
                    </select>
                    <button className="gms2-btn">Uitgifte</button>
                    <button className="gms2-btn">Archiveer</button>
                    <button className="gms2-btn">Sluit</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
