
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
  const [kladblokText, setKladblokText] = useState("Inbrekers zijn nog binnen");
  const [mc1Value, setMc1Value] = useState("Bezitsaantasting");
  const [mc2Value, setMc2Value] = useState("Inbraak");
  const [notitiesText, setNotitiesText] = useState("Zitten vast in schoorstee");
  
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
      notities: "Zitten vast in schoorstee",
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
    
    return `${dayName}, ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  };

  const handleIncidentSelect = (incident: GmsIncident) => {
    setSelectedIncident(incident);
  };

  const handleEindrapport = () => {
    console.log("Eindrapport clicked");
    // Functionality for Eindrapport
  };

  const handleUitgifte = () => {
    console.log("Uitgifte clicked");
    // Functionality for Uitgifte
  };

  const handleSluitAf = () => {
    console.log("Sluit af clicked");
    // Functionality for Sluit af
  };

  const handleSluit = () => {
    console.log("Sluit clicked");
    // Functionality for Sluit
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
                {/* Time and ID Row */}
                <div className="gms2-form-row">
                  <span>08:23</span>
                  <span style={{ marginLeft: 'auto' }}>161</span>
                </div>

                {/* Melder Row */}
                <div className="gms2-form-row">
                  <span>Melder</span>
                  <input type="text" className="gms2-input wide" value="Janssen" readOnly />
                  <span>Tel</span>
                  <input type="text" className="gms2-input" />
                  <button className="gms2-btn small">Anoniem</button>
                  <button className="gms2-btn small">Kopie</button>
                </div>

                {/* Adres Row */}
                <div className="gms2-form-row">
                  <span>Adres</span>
                  <input type="text" className="gms2-input wide" />
                  <span>Nr</span>
                  <input type="text" className="gms2-input small" />
                  <span>L/C</span>
                  <input type="text" className="gms2-input small" />
                  <span>Gem</span>
                </div>

                {/* Location Details */}
                <div className="gms2-form-row">
                  <span>115</span>
                  <input type="text" className="gms2-input wide" value="CANADASTRAAT" readOnly />
                  <span>Nr</span>
                  <input type="text" className="gms2-input small" value="3" readOnly />
                </div>

                <div className="gms2-form-row">
                  <span>5651CE</span>
                  <span>Pts</span>
                  <input type="text" className="gms2-input wide" value="EINDHOVEN" readOnly />
                  <span>Gem</span>
                  <input type="text" className="gms2-input wide" value="EINDHOVEN" readOnly />
                </div>

                {/* Function Row */}
                <div className="gms2-form-row">
                  <span>Func</span>
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
                  <button className="gms2-btn">Hist. Meldblok</button>
                  <button className="gms2-btn">Locatietreffpte</button>
                  <button className="gms2-btn">Statusoverzicht</button>
                  <button className="gms2-btn">Overige inzet</button>
                </div>

                {/* Kladblok */}
                <div className="gms2-kladblok">
                  <textarea 
                    value={kladblokText}
                    onChange={(e) => setKladblokText(e.target.value)}
                    className="gms2-kladblok-text"
                  />
                </div>

                {/* Hints/Kar and MC Row */}
                <div className="gms2-form-row">
                  <span>Hints/Kar</span>
                  <select className="gms2-select" style={{ backgroundColor: '#90EE90' }}>
                    <option value="Bezitsaantasting">{mc1Value}</option>
                  </select>
                  <select className="gms2-select" style={{ backgroundColor: '#90EE90' }}>
                    <option value="Inbraak">{mc2Value}</option>
                  </select>
                </div>

                {/* Karakteristieken */}
                <div className="gms2-karakteristieken-row">
                  <div className="gms2-karakteristieken-left">
                    <span>Karakteristieken</span>
                    <textarea className="gms2-karakteristieken-textarea" />
                  </div>
                  <div className="gms2-karakteristieken-right">
                    <span>Waarde</span>
                    <span>"08:26**"</span>
                    <div className="gms2-notities-area">
                      <textarea 
                        value={notitiesText}
                        onChange={(e) => setNotitiesText(e.target.value)}
                        className="gms2-notities-textarea"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="gms2-bottom-actions">
                  <div className="gms2-bottom-left">
                    <div className="gms2-form-row">
                      <span>P</span>
                      <button className="gms2-btn small">2</button>
                      <button className="gms2-btn small">3</button>
                      <button className="gms2-btn small">P</button>
                      <button className="gms2-btn small">A</button>
                      <button className="gms2-btn small">⬜</button>
                      <button className="gms2-btn small">⬜</button>
                      <span>DEC</span>
                    </div>
                    <div className="gms2-form-row">
                      <input type="checkbox" />
                      <span>P</span>
                      <input type="checkbox" />
                    </div>
                    <div className="gms2-form-row">
                      <input type="checkbox" />
                      <span>B</span>
                      <input type="checkbox" />
                    </div>
                    <div className="gms2-form-row">
                      <input type="checkbox" />
                      <span>A</span>
                      <input type="checkbox" />
                    </div>
                  </div>
                  <div className="gms2-bottom-right">
                    <select className="gms2-select">
                      <option>Eindrapport</option>
                    </select>
                    <button className="gms2-btn" onClick={handleUitgifte}>Uitgifte</button>
                    <button className="gms2-btn" onClick={handleSluitAf}>Sluit af</button>
                    <button className="gms2-btn" onClick={handleSluit}>Sluit</button>
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
