
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
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
              <i className="bi bi-telephone-fill"></i>
              Telefonie - Meldkamer
            </h1>
            <p className="text-sm text-gray-600">
              {currentTime.toLocaleString('nl-NL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                🟢 Beschikbaar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 grid grid-cols-3 gap-4">
        
        {/* Live Gesprekspaneel */}
        <div className="col-span-2 bg-white rounded-lg shadow border">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i className="bi bi-chat-dots"></i>
              Actief Gesprek
            </h2>
            {activeGesprek && (
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span>📞 {activeGesprek.telefoonnummer}</span>
                  <span>🕐 Gestart: {formatTijd(activeGesprek.startTijd)}</span>
                  {activeGesprek.melderInfo?.locatie && (
                    <span>📍 {activeGesprek.melderInfo.locatie}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {activeGesprek ? (
            <>
              {/* Chat Venster */}
              <div className="h-96 overflow-y-auto p-4 space-y-3">
                {activeGesprek.berichten.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <i className="bi bi-telephone text-3xl mb-2"></i>
                    <p>Gesprek gestart. Wacht op eerste bericht...</p>
                  </div>
                ) : (
                  activeGesprek.berichten.map((bericht) => (
                    <div
                      key={bericht.id}
                      className={`flex ${bericht.afzender === 'centralist' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          bericht.afzender === 'centralist'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{bericht.inhoud}</p>
                        <p className={`text-xs mt-1 ${
                          bericht.afzender === 'centralist' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTijd(bericht.tijdstip)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bericht Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && verstuurBericht()}
                    placeholder="Typ uw bericht..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={verstuurBericht}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <i className="bi bi-send"></i>
                  </button>
                </div>
              </div>

              {/* Actie Knoppen */}
              <div className="border-t border-gray-200 p-4 flex gap-2">
                <button
                  onClick={beeindigGesprek}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <i className="bi bi-telephone-x"></i>
                  Beëindig Gesprek
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <i className="bi bi-arrow-right-circle"></i>
                  Doorverbind naar GMS
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <i className="bi bi-save"></i>
                  Opslaan Melding
                </button>
              </div>
            </>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <i className="bi bi-telephone text-5xl mb-4"></i>
                <h3 className="text-lg font-medium mb-2">Geen actief gesprek</h3>
                <p>Start een nieuw gesprek door een nummer te bellen</p>
              </div>
            </div>
          )}
        </div>

        {/* Rechterpaneel */}
        <div className="space-y-4">
          
          {/* Bellen Paneel */}
          <div className="bg-white rounded-lg shadow border">
            <div className="border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i className="bi bi-telephone-outbound"></i>
                Uitgaande Oproep
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefoonnummer
                </label>
                <input
                  type="tel"
                  value={belNummer}
                  onChange={(e) => setBelNummer(e.target.value)}
                  placeholder="06-12345678 of 112"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => startNieuwGesprek(belNummer)}
                disabled={!belNummer.trim()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <i className="bi bi-telephone"></i>
                Bel Nummer
              </button>
            </div>
          </div>

          {/* Snelkeuze Contacten */}
          <div className="bg-white rounded-lg shadow border">
            <div className="border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i className="bi bi-person-lines-fill"></i>
                Snelkeuze
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {contacts.slice(0, 5).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => startNieuwGesprek(contact.telefoonnummer)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{contact.naam}</p>
                      <p className="text-xs text-gray-600">{contact.telefoonnummer}</p>
                    </div>
                    <span className="text-lg">{getStatusIcon(contact.status)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Gespreksgeschiedenis */}
          <div className="bg-white rounded-lg shadow border">
            <div className="border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i className="bi bi-clock-history"></i>
                Recente Gesprekken
              </h3>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {gesprekGeschiedenis.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Geen recente gesprekken
                </p>
              ) : (
                <div className="space-y-2">
                  {gesprekGeschiedenis.slice(0, 10).map((gesprek) => (
                    <div key={gesprek.id} className="p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{gesprek.telefoonnummer}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          gesprek.status === 'afgerond' 
                            ? 'bg-green-100 text-green-800'
                            : gesprek.status === 'actief'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {gesprek.status}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600 gap-2">
                        <span>{formatDatum(gesprek.startTijd)}</span>
                        <span>{formatTijd(gesprek.startTijd)}</span>
                        {gesprek.eindTijd && (
                          <span>- {formatTijd(gesprek.eindTijd)}</span>
                        )}
                      </div>
                      {gesprek.berichten.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
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
