
import { useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";

interface TelefoonContact {
  id: number;
  naam: string;
  telefoonnummer: string;
  laatstGebeld?: string;
  status: 'beschikbaar' | 'bezet' | 'offline';
}

interface Gesprek {
  id: number;
  telefoonnummer: string;
  startTijd: string;
  eindTijd?: string;
  status: 'actief' | 'afgerond' | 'mislukt';
  berichten: ChatBericht[];
  melderInfo?: {
    naam?: string;
    locatie?: string;
  };
}

interface ChatBericht {
  id: number;
  tijdstip: string;
  afzender: 'melder' | 'centralist';
  inhoud: string;
}

const defaultContacts: TelefoonContact[] = [
  { id: 1, naam: "Spoednummer - Brandweer", telefoonnummer: "112", status: 'beschikbaar' },
  { id: 2, naam: "Spoednummer - Ambulance", telefoonnummer: "112", status: 'beschikbaar' },
  { id: 3, naam: "Dienstdoende OvD", telefoonnummer: "06-12345678", status: 'beschikbaar' },
  { id: 4, naam: "Teamleider A-shift", telefoonnummer: "06-87654321", status: 'bezet' },
  { id: 5, naam: "Coördinator", telefoonnummer: "06-11223344", status: 'beschikbaar' },
];

export default function Telefonie() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeGesprek, setActiveGesprek] = useState<Gesprek | null>(null);
  const [gesprekGeschiedenis, setGesprekGeschiedenis] = useLocalStorage<Gesprek[]>("gesprek-geschiedenis", []);
  const [contacts] = useLocalStorage<TelefoonContact[]>("telefoon-contacten", defaultContacts);
  const [belNummer, setBelNummer] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");

  // Update tijd elke seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startNieuwGesprek = (telefoonnummer: string) => {
    const nieuwGesprek: Gesprek = {
      id: Date.now(),
      telefoonnummer,
      startTijd: new Date().toISOString(),
      status: 'actief',
      berichten: [],
      melderInfo: {
        locatie: 'Locatie wordt bepaald...'
      }
    };
    setActiveGesprek(nieuwGesprek);
    setBelNummer("");
  };

  const beeindigGesprek = () => {
    if (activeGesprek) {
      const afgerondGesprek = {
        ...activeGesprek,
        eindTijd: new Date().toISOString(),
        status: 'afgerond' as const
      };
      setGesprekGeschiedenis(prev => [afgerondGesprek, ...prev]);
      setActiveGesprek(null);
    }
  };

  const verstuurBericht = () => {
    if (!currentMessage.trim() || !activeGesprek) return;

    const nieuwBericht: ChatBericht = {
      id: Date.now(),
      tijdstip: new Date().toISOString(),
      afzender: 'centralist',
      inhoud: currentMessage
    };

    setActiveGesprek(prev => prev ? {
      ...prev,
      berichten: [...prev.berichten, nieuwBericht]
    } : null);

    setCurrentMessage("");

    // Simuleer antwoord van melder na 2-3 seconden
    setTimeout(() => {
      const melderAntwoorden = [
        "Ja, er is een inbraak gaande in mijn huis",
        "Ik zie verdachte personen bij de buren",
        "Er is een ongeval gebeurd op de kruising",
        "Ik hoor geschreeuw uit het appartement hiernaast",
        "Er staat een auto in brand",
        "Ja, ik ben de persoon die gebeld heeft"
      ];
      
      const antwoordBericht: ChatBericht = {
        id: Date.now() + 1,
        tijdstip: new Date().toISOString(),
        afzender: 'melder',
        inhoud: melderAntwoorden[Math.floor(Math.random() * melderAntwoorden.length)]
      };

      setActiveGesprek(prev => prev ? {
        ...prev,
        berichten: [...prev.berichten, antwoordBericht]
      } : null);
    }, 2000 + Math.random() * 1000);
  };

  const formatTijd = (tijdString: string) => {
    return new Date(tijdString).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDatum = (tijdString: string) => {
    return new Date(tijdString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'beschikbaar': return '🟢';
      case 'bezet': return '🔴';
      case 'offline': return '⚫';
      default: return '⚪';
    }
  };

  return (
    <div className="telefonie-container">
      {/* Header */}
      <div className="telefoon-header">
        <div className="telefoon-header-left">
          <h1 className="telefoon-title">
            <i className="bi bi-telephone-fill"></i>
            Telefonie - Meldkamer
          </h1>
          <div className="telefoon-datetime">
            {currentTime.toLocaleString('nl-NL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
        <div className="telefoon-header-buttons">
          <button className="telefoon-header-btn gms-btn">
            <i className="bi bi-window"></i>
            GMS
          </button>
          <button className="telefoon-header-btn new-tab-btn">
            <i className="bi bi-plus-square"></i>
            Nieuw Tabblad
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="telefoon-status-bar">
        <div className="status-left">
          <span className="call-status">Status: Beschikbaar</span>
          <span className="active-calls">Actieve gesprekken: {activeGesprek ? '1' : '0'}</span>
        </div>
        <div className="status-right">
          <span className="queue-count">Wachtrij: 0</span>
          <span>Lijn: 112</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="telefoon-main-grid">
        
        {/* Live Gesprekspaneel */}
        <div className="telefoon-chat-section">
          <div className="telefoon-panel-header">
            <h2 className="panel-title">
              <i className="bi bi-chat-dots"></i>
              Actief Gesprek
            </h2>
            {activeGesprek && (
              <div className="gesprek-info">
                <span>📞 {activeGesprek.telefoonnummer}</span>
                <span>🕐 Gestart: {formatTijd(activeGesprek.startTijd)}</span>
                {activeGesprek.melderInfo?.locatie && (
                  <span>📍 {activeGesprek.melderInfo.locatie}</span>
                )}
              </div>
            )}
          </div>

          {activeGesprek ? (
            <>
              {/* Chat Venster */}
              <div className="chat-messages">
                {activeGesprek.berichten.length === 0 ? (
                  <div className="no-messages">
                    <i className="bi bi-telephone"></i>
                    <p>Gesprek gestart. Wacht op eerste bericht...</p>
                  </div>
                ) : (
                  activeGesprek.berichten.map((bericht) => (
                    <div
                      key={bericht.id}
                      className={`chat-message ${bericht.afzender === 'centralist' ? 'outgoing' : 'incoming'}`}
                    >
                      <div className="message-content">
                        <p>{bericht.inhoud}</p>
                        <span className="message-time">
                          {formatTijd(bericht.tijdstip)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bericht Input */}
              <div className="chat-input-container">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && verstuurBericht()}
                  placeholder="Typ uw bericht..."
                  className="chat-input"
                />
                <button
                  onClick={verstuurBericht}
                  className="chat-send-btn"
                >
                  <i className="bi bi-send"></i>
                </button>
              </div>

              {/* Actie Knoppen */}
              <div className="gesprek-acties">
                <button
                  onClick={beeindigGesprek}
                  className="actie-btn beeindig-btn"
                >
                  <i className="bi bi-telephone-x"></i>
                  Beëindig Gesprek
                </button>
                <button className="actie-btn doorverbind-btn">
                  <i className="bi bi-arrow-right-circle"></i>
                  Doorverbind naar GMS
                </button>
                <button className="actie-btn opslaan-btn">
                  <i className="bi bi-save"></i>
                  Opslaan Melding
                </button>
              </div>
            </>
          ) : (
            <div className="no-active-gesprek">
              <i className="bi bi-telephone"></i>
              <h3>Geen actief gesprek</h3>
              <p>Start een nieuw gesprek door een nummer te bellen</p>
            </div>
          )}
        </div>

        {/* Rechterpaneel */}
        <div className="telefoon-controls">
          
          {/* Bellen Paneel */}
          <div className="telefoon-panel">
            <div className="panel-title">
              <i className="bi bi-telephone-outbound"></i>
              Uitgaande Oproep
            </div>
            <div className="bel-controls">
              <div className="nummer-input-group">
                <label>Telefoonnummer</label>
                <input
                  type="tel"
                  value={belNummer}
                  onChange={(e) => setBelNummer(e.target.value)}
                  placeholder="06-12345678 of 112"
                  className="nummer-input"
                />
              </div>
              <button
                onClick={() => startNieuwGesprek(belNummer)}
                disabled={!belNummer.trim()}
                className="bel-btn"
              >
                <i className="bi bi-telephone"></i>
                Bel Nummer
              </button>
            </div>
          </div>

          {/* Snelkeuze Contacten */}
          <div className="telefoon-panel">
            <div className="panel-title">
              <i className="bi bi-person-lines-fill"></i>
              Snelkeuze
            </div>
            <div className="contact-list">
              {contacts.slice(0, 5).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => startNieuwGesprek(contact.telefoonnummer)}
                  className="contact-btn telefoon-contact"
                >
                  <div className="contact-info">
                    <span className="contact-naam">{contact.naam}</span>
                    <span className="contact-nummer">{contact.telefoonnummer}</span>
                  </div>
                  <span className="contact-status-icon">{getStatusIcon(contact.status)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gespreksgeschiedenis */}
          <div className="telefoon-panel">
            <div className="panel-title">
              <i className="bi bi-clock-history"></i>
              Recente Gesprekken
            </div>
            <div className="geschiedenis-container">
              {gesprekGeschiedenis.length === 0 ? (
                <p className="no-geschiedenis">
                  Geen recente gesprekken
                </p>
              ) : (
                <div className="geschiedenis-list">
                  {gesprekGeschiedenis.slice(0, 10).map((gesprek) => (
                    <div key={gesprek.id} className="geschiedenis-item">
                      <div className="gesprek-header">
                        <span className="gesprek-nummer">{gesprek.telefoonnummer}</span>
                        <span className={`gesprek-status status-${gesprek.status}`}>
                          {gesprek.status}
                        </span>
                      </div>
                      <div className="gesprek-tijden">
                        <span>{formatDatum(gesprek.startTijd)}</span>
                        <span>{formatTijd(gesprek.startTijd)}</span>
                        {gesprek.eindTijd && (
                          <span>- {formatTijd(gesprek.eindTijd)}</span>
                        )}
                      </div>
                      {gesprek.berichten.length > 0 && (
                        <p className="laatste-bericht">
                          {gesprek.berichten[gesprek.berichten.length - 1].inhoud}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
