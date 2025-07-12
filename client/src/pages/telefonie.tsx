
import { useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";

interface TelefoonContact {
  id: number;
  naam: string;
  functie: string;
  telefoonnummer: string;
  afdeling: string;
  bereikbaar24u: boolean;
  opmerkingen?: string;
  lastCalled?: string;
}

interface BelGeschiedenis {
  id: number;
  contactId: number;
  contactNaam: string;
  telefoonnummer: string;
  tijdstip: string;
  duur: string;
  type: 'uitgaand' | 'inkomend' | 'gemist';
  notities?: string;
}

const defaultContacts: TelefoonContact[] = [
  {
    id: 1,
    naam: "Dienstchef",
    functie: "Dienstchef",
    telefoonnummer: "010-1234567",
    afdeling: "Operationeel Centrum",
    bereikbaar24u: true,
    opmerkingen: "Voor spoedeisende zaken"
  },
  {
    id: 2,
    naam: "OVD OC",
    functie: "Officier van Dienst",
    telefoonnummer: "010-1234568",
    afdeling: "Operationeel Centrum",
    bereikbaar24u: true,
    opmerkingen: "Operationele leiding"
  },
  {
    id: 3,
    naam: "Teamleider A1",
    functie: "Teamleider",
    telefoonnummer: "010-1234569",
    afdeling: "Basisteam Waterweg",
    bereikbaar24u: false,
    opmerkingen: "Dagdienst 07:00-19:00"
  },
  {
    id: 4,
    naam: "Coördinator",
    functie: "Coördinator",
    telefoonnummer: "010-1234570",
    afdeling: "Regionale Eenheid",
    bereikbaar24u: true,
    opmerkingen: "Communicatie en logistiek"
  },
  {
    id: 5,
    naam: "Centralist",
    functie: "Centralist",
    telefoonnummer: "010-1234571",
    afdeling: "Meldkamer",
    bereikbaar24u: true,
    opmerkingen: "112 meldingen"
  }
];

export default function Telefonie() {
  const [contacts, setContacts] = useLocalStorage<TelefoonContact[]>("telefonie-contacten", defaultContacts);
  const [belGeschiedenis, setBelGeschiedenis] = useLocalStorage<BelGeschiedenis[]>("bel-geschiedenis", []);
  const [activeTab, setActiveTab] = useState<'contacten' | 'geschiedenis' | 'nieuw'>('contacten');
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState<Partial<TelefoonContact>>({
    naam: "",
    functie: "",
    telefoonnummer: "",
    afdeling: "",
    bereikbaar24u: false,
    opmerkingen: ""
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update tijd elke seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter contacten op basis van zoekopdracht
  const filteredContacts = contacts.filter(contact =>
    contact.naam.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.functie.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.telefoonnummer.includes(searchQuery) ||
    contact.afdeling.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCall = (contact: TelefoonContact) => {
    const now = new Date();
    const callRecord: BelGeschiedenis = {
      id: Date.now(),
      contactId: contact.id,
      contactNaam: contact.naam,
      telefoonnummer: contact.telefoonnummer,
      tijdstip: now.toISOString(),
      duur: "00:00",
      type: 'uitgaand',
      notities: `Gesprek met ${contact.functie}`
    };

    setBelGeschiedenis(prev => [callRecord, ...prev]);
    
    // Update laatste bel tijd van contact
    setContacts(prev => prev.map(c => 
      c.id === contact.id 
        ? { ...c, lastCalled: now.toISOString() }
        : c
    ));

    // Simuleer gesprek (in echte implementatie zou dit telefonie systeem aansturen)
    alert(`Bellen naar ${contact.naam} (${contact.telefoonnummer})`);
  };

  const handleAddContact = () => {
    if (newContact.naam && newContact.telefoonnummer) {
      const contact: TelefoonContact = {
        id: Date.now(),
        naam: newContact.naam || "",
        functie: newContact.functie || "",
        telefoonnummer: newContact.telefoonnummer || "",
        afdeling: newContact.afdeling || "",
        bereikbaar24u: newContact.bereikbaar24u || false,
        opmerkingen: newContact.opmerkingen
      };

      setContacts(prev => [...prev, contact]);
      setNewContact({
        naam: "",
        functie: "",
        telefoonnummer: "",
        afdeling: "",
        bereikbaar24u: false,
        opmerkingen: ""
      });
      setShowAddForm(false);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBereikbaarStatus = (contact: TelefoonContact) => {
    const currentHour = currentTime.getHours();
    
    if (contact.bereikbaar24u) {
      return { status: 'beschikbaar', text: '24/7 bereikbaar', color: 'text-green-600' };
    } else if (currentHour >= 7 && currentHour < 19) {
      return { status: 'beschikbaar', text: 'Bereikbaar', color: 'text-green-600' };
    } else {
      return { status: 'niet-beschikbaar', text: 'Buiten dienst', color: 'text-red-600' };
    }
  };

  return (
    <div className="telefonie-container h-screen bg-gray-50">
      {/* Header */}
      <div className="telefonie-header bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📞 Telefonie</h1>
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Nieuw Contact
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mt-4 space-x-1">
          <button
            onClick={() => setActiveTab('contacten')}
            className={`px-4 py-2 rounded ${
              activeTab === 'contacten'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Contacten ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('geschiedenis')}
            className={`px-4 py-2 rounded ${
              activeTab === 'geschiedenis'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Belgeschiedenis ({belGeschiedenis.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="telefonie-content p-4">
        {activeTab === 'contacten' && (
          <div className="contacten-tab">
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Zoek contacten op naam, functie, telefoon of afdeling..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Contacten lijst */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map(contact => {
                const bereikbaar = getBereikbaarStatus(contact);
                return (
                  <div key={contact.id} className="contact-card bg-white rounded-lg shadow p-4 border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{contact.naam}</h3>
                        <p className="text-sm text-gray-600">{contact.functie}</p>
                        <p className="text-sm text-gray-500">{contact.afdeling}</p>
                      </div>
                      <div className={`text-xs font-medium ${bereikbaar.color}`}>
                        {bereikbaar.text}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-mono text-gray-800">{contact.telefoonnummer}</p>
                      {contact.opmerkingen && (
                        <p className="text-xs text-gray-500 mt-1">{contact.opmerkingen}</p>
                      )}
                      {contact.lastCalled && (
                        <p className="text-xs text-gray-400 mt-1">
                          Laatst gebeld: {formatTime(contact.lastCalled)}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCall(contact)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-1"
                      >
                        📞 Bellen
                      </button>
                      <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                        ✏️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'geschiedenis' && (
          <div className="geschiedenis-tab">
            <h2 className="text-lg font-semibold mb-4">Belgeschiedenis</h2>
            
            {belGeschiedenis.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nog geen belgeschiedenis beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {belGeschiedenis.map(call => (
                  <div key={call.id} className="bg-white rounded-lg shadow p-4 border">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm px-2 py-1 rounded ${
                            call.type === 'uitgaand' ? 'bg-blue-100 text-blue-800' :
                            call.type === 'inkomend' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {call.type === 'uitgaand' ? '📞 Uitgaand' :
                             call.type === 'inkomend' ? '📞 Inkomend' : '📞 Gemist'}
                          </span>
                        </div>
                        <h3 className="font-semibold mt-1">{call.contactNaam}</h3>
                        <p className="text-sm text-gray-600">{call.telefoonnummer}</p>
                        {call.notities && (
                          <p className="text-sm text-gray-500 mt-1">{call.notities}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{formatTime(call.tijdstip)}</p>
                        <p>Duur: {call.duur}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nieuw Contact Toevoegen</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input
                  type="text"
                  value={newContact.naam || ""}
                  onChange={(e) => setNewContact(prev => ({ ...prev, naam: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Volledige naam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Functie</label>
                <input
                  type="text"
                  value={newContact.functie || ""}
                  onChange={(e) => setNewContact(prev => ({ ...prev, functie: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Functie/rol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer *</label>
                <input
                  type="tel"
                  value={newContact.telefoonnummer || ""}
                  onChange={(e) => setNewContact(prev => ({ ...prev, telefoonnummer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="010-1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Afdeling</label>
                <input
                  type="text"
                  value={newContact.afdeling || ""}
                  onChange={(e) => setNewContact(prev => ({ ...prev, afdeling: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Afdeling/team"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newContact.bereikbaar24u || false}
                    onChange={(e) => setNewContact(prev => ({ ...prev, bereikbaar24u: e.target.checked }))}
                    className="mr-2"
                  />
                  24/7 bereikbaar
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opmerkingen</label>
                <textarea
                  value={newContact.opmerkingen || ""}
                  onChange={(e) => setNewContact(prev => ({ ...prev, opmerkingen: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Extra informatie..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddContact}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Toevoegen
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
