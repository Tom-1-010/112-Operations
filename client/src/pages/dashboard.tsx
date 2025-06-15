import { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar';
import StatsGrid from '../components/stats-grid';
import IncidentTable from '../components/incident-table';
import UnitsPanel from '../components/units-panel';
import { useLocalStorage } from '../hooks/use-local-storage';
import { Incident, Unit, Stats } from '../types';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  const [incidents, setIncidents] = useLocalStorage<Incident[]>('policeIncidents', []);
  const [units, setUnits] = useLocalStorage<Unit[]>('policeUnits', [
    { id: 'PC01', type: 'patrol', status: 'active', name: '5901' },
    { id: 'PC02', type: 'patrol', status: 'busy', name: '5902' },
    { id: 'PC03', type: 'patrol', status: 'inactive', name: '5903' },
    { id: 'MC01', type: 'motorcycle', status: 'active', name: '4501' },
    { id: 'MC02', type: 'motorcycle', status: 'active', name: '4502' },
    { id: 'DU01', type: 'dog', status: 'active', name: '7801' },
    { id: 'RU01', type: 'riot', status: 'inactive', name: '9101' },
    { id: 'RU02', type: 'riot', status: 'inactive', name: '9102' },
  ]);

  const getUnitIcon = (type: string) => {
    switch (type) {
      case 'patrol': return 'truck';
      case 'motorcycle': return 'bicycle';
      case 'dog': return 'heart';
      case 'riot': return 'shield';
      default: return 'truck';
    }
  };

  const getUnitTypeName = (type: string) => {
    switch (type) {
      case 'patrol': return 'Patrouillewagen';
      case 'motorcycle': return 'Motoragent';
      case 'dog': return 'Hondeneenheid';
      case 'riot': return 'ME-eenheid';
      default: return type;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'active': return 'Actief';
      case 'inactive': return 'Inactief';
      case 'busy': return 'Bezet';
      default: return status;
    }
  };

  const incidentTypes = [
    'Diefstal', 'Verkeersongeval', 'Vermiste persoon', 'Huiselijk geweld',
    'Inbraak', 'Openbare orde verstoring', 'Bedreiging', 'Geweld',
    'Drugsdelict', 'Vandalisme', 'Fraude', 'Overlast'
  ];

  const locations = [
    'Marktplein 15, Amsterdam', 'Hoofdstraat 42, Rotterdam', 'Kerkstraat 8, Utrecht',
    'Stationsweg 156, Den Haag', 'Dorpsstraat 23, Eindhoven', 'Schoolstraat 67, Groningen',
    'Nieuwstraat 89, Tilburg', 'Oude Gracht 34, Utrecht', 'Kalverstraat 123, Amsterdam',
    'Binnenhof 2, Den Haag', 'Witte de Withstraat 45, Rotterdam', 'Grote Markt 12, Haarlem'
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update incident times every second
  useEffect(() => {
    const timer = setInterval(() => {
      setIncidents(prev => prev.map(incident => {
        const now = new Date();
        const timeDiff = Math.floor((now.getTime() - new Date(incident.timestamp).getTime()) / 1000 / 60);
        return { ...incident, timeAgo: timeDiff + ' min geleden' };
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [setIncidents]);

  // GMS functionality
  useEffect(() => {
    const initializeGMS = () => {
      // Initialize current time in the GMS form
      const updateGMSTime = () => {
        const timeInput = document.getElementById('gmsTijdstip') as HTMLInputElement;
        if (timeInput) {
          const now = new Date();
          const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          timeInput.value = localDateTime;
        }
      };

      // Handle GMS form submission
      const handleGMSSubmit = () => {
        const kladblok = document.getElementById('gmsKladblok');
        const locatie = document.getElementById('gmsLocatie') as HTMLInputElement;
        const tijdstip = document.getElementById('gmsTijdstip') as HTMLInputElement;
        const soortMelding = document.getElementById('gmsSoortMelding') as HTMLSelectElement;
        const prioriteit = document.getElementById('gmsPrioriteit') as HTMLInputElement;
        const output = document.getElementById('gmsOutput');
        
        if (!kladblok || !locatie || !tijdstip || !soortMelding || !prioriteit || !output) return;

        // Validate required fields
        if (!locatie.value.trim() || !soortMelding.value) {
          alert('Vul alle verplichte velden in.');
          return;
        }

        const gmsData = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          kladblok: kladblok.textContent || '',
          locatie: locatie.value.trim(),
          tijdstip: tijdstip.value,
          soortMelding: soortMelding.value,
          prioriteit: parseInt(prioriteit.value),
          status: 'Nieuw',
          aangemaaktOp: new Date().toLocaleString('nl-NL')
        };

        // Display JSON output
        output.textContent = JSON.stringify(gmsData, null, 2);

        // Reset form
        kladblok.textContent = '';
        locatie.value = '';
        soortMelding.value = '';
        prioriteit.value = '3';
        updateGMSTime();

        showNotificationMessage('GMS melding opgeslagen');
      };

      // Add event listeners
      const saveButton = document.getElementById('gmsSaveButton');
      if (saveButton) {
        saveButton.addEventListener('click', handleGMSSubmit);
      }

      // Initialize time immediately and then every minute
      updateGMSTime();
      const timeTimer = setInterval(updateGMSTime, 60000);

      return () => {
        clearInterval(timeTimer);
        if (saveButton) {
          saveButton.removeEventListener('click', handleGMSSubmit);
        }
      };
    };

    // Only initialize if GMS section is active
    if (activeSection === 'gms') {
      const cleanup = initializeGMS();
      return cleanup;
    }
  }, [activeSection]);

  // Units filter functionality
  useEffect(() => {
    const initializeUnitsFilter = () => {
      const filterInput = document.getElementById('unitsFilter') as HTMLInputElement;
      if (!filterInput) return;

      const handleFilterChange = () => {
        const filterValue = filterInput.value.toLowerCase();
        const unitCards = document.querySelectorAll('.unit-card');
        
        unitCards.forEach((card) => {
          const unitData = card.getAttribute('data-unit');
          if (unitData) {
            try {
              const unit = JSON.parse(unitData);
              const unitType = getUnitTypeName(unit.type).toLowerCase();
              const callsign = unit.name.toLowerCase();
              const status = getStatusName(unit.status).toLowerCase();
              const unitId = unit.id.toLowerCase();
              
              const matchesFilter = 
                unitType.includes(filterValue) ||
                callsign.includes(filterValue) ||
                status.includes(filterValue) ||
                unitId.includes(filterValue);
              
              if (matchesFilter) {
                (card as HTMLElement).style.display = 'block';
              } else {
                (card as HTMLElement).style.display = 'none';
              }
            } catch (error) {
              console.error('Error parsing unit data:', error);
            }
          }
        });
      };

      filterInput.addEventListener('input', handleFilterChange);
      
      return () => {
        filterInput.removeEventListener('input', handleFilterChange);
      };
    };

    // Only initialize if units section is active
    if (activeSection === 'units') {
      const cleanup = initializeUnitsFilter();
      return cleanup;
    }
  }, [activeSection]);

  const showNotificationMessage = (message: string) => {
    setNotification(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const simulateNewIncident = () => {
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
    const randomType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    const randomUnits = Math.floor(Math.random() * 3) + 1;

    const newIncident: Incident = {
      id: Date.now(),
      type: randomType,
      location: randomLocation,
      timestamp: new Date().toISOString(),
      timeAgo: '0 min geleden',
      unitsAssigned: randomUnits,
      priority: randomPriority,
      status: 'active'
    };

    setIncidents(prev => [newIncident, ...prev]);
    showNotificationMessage('Nieuwe melding ontvangen: ' + randomType);
  };

  const acceptIncident = (id: number) => {
    setIncidents(prev => prev.map(inc => 
      inc.id === id ? { ...inc, status: 'accepted' as const } : inc
    ));
    showNotificationMessage('Incident geaccepteerd');
  };

  const closeIncident = (id: number) => {
    setIncidents(prev => prev.map(inc => 
      inc.id === id ? { ...inc, status: 'closed' as const } : inc
    ));
    showNotificationMessage('Incident gesloten');
  };

  const removeIncident = (id: number) => {
    setIncidents(prev => prev.filter(inc => inc.id !== id));
    showNotificationMessage('Incident verwijderd');
  };

  const calculateStats = (): Stats => {
    const activeIncidents = incidents.filter(inc => inc.status === 'active' || inc.status === 'accepted');
    const newIncidents = incidents.filter(inc => {
      const incidentTime = new Date(inc.timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - incidentTime.getTime()) / (1000 * 60);
      return diffMinutes <= 30 && inc.status === 'active';
    });
    const highPriorityIncidents = activeIncidents.filter(inc => inc.priority === 'high');
    const activeUnits = units.filter(unit => unit.status === 'active');
    const emergencyCallsToday = Math.floor(Math.random() * 50) + 20; // Simulated

    return {
      newIncidents: newIncidents.length,
      activeUnits: activeUnits.length,
      highPriority: highPriorityIncidents.length,
      emergencyCalls: emergencyCallsToday,
    };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderPlaceholderSection = (title: string, icon: string) => (
    <div className="section">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
      </div>
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <i className={`bi bi-${icon}`} style={{ fontSize: '48px', marginBottom: '16px' }}></i>
        <p>{title} wordt geladen...</p>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="main-content">
        <div className="header">
          <h1>Meldkamer Dashboard</h1>
          <div className="header-time">{formatTime(currentTime)}</div>
        </div>

        {activeSection === 'dashboard' && (
          <div className="content-section active">
            <StatsGrid stats={calculateStats()} />
            <div className="content-grid">
              <IncidentTable
                incidents={incidents}
                onAccept={acceptIncident}
                onClose={closeIncident}
                onRemove={removeIncident}
                onSimulateNew={simulateNewIncident}
              />
              <UnitsPanel units={units} />
            </div>
          </div>
        )}

        {activeSection === 'incidents' && renderPlaceholderSection('Alle Incidenten', 'exclamation-triangle')}
        {activeSection === 'units' && (
          <div className="content-section active">
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Eenheden Beheer</h3>
              </div>
              <div className="units-management-content">
                <div className="units-filter-section">
                  <label htmlFor="unitsFilter" className="filter-label">🔍 Filter eenheden</label>
                  <input
                    type="text"
                    id="unitsFilter"
                    className="filter-input"
                    placeholder="Zoek op eenheidstype, roepnummer of status..."
                  />
                </div>
                
                <div className="units-grid" id="unitsGrid">
                  {units.map((unit) => (
                    <div key={unit.id} className="unit-card" data-unit={JSON.stringify(unit)}>
                      <div className="unit-card-header">
                        <div className="unit-type">
                          <i className={`bi bi-${getUnitIcon(unit.type)}`}></i>
                          <span>{getUnitTypeName(unit.type)}</span>
                        </div>
                        <div className={`unit-status-badge unit-status-${unit.status}`}>
                          <span className={`status-dot status-${unit.status}`}></span>
                          {getStatusName(unit.status)}
                        </div>
                      </div>
                      <div className="unit-card-body">
                        <div className="unit-info">
                          <div className="unit-callsign">
                            <strong>Roepnummer:</strong> {unit.name}
                          </div>
                          <div className="unit-id">
                            <strong>Eenheid ID:</strong> {unit.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'gms' && (
          <div className="content-section active">
            <div id="gms" className="section">
              <div className="section-header">
                <h3 className="section-title">GMS - Meldkamer Simulator</h3>
              </div>
              <div className="gms-content">
                <div className="gms-form-grid">
                  <div className="gms-notepad-section">
                    <label className="gms-label">📝 Kladblok</label>
                    <div
                      id="gmsKladblok"
                      contentEditable="true"
                      className="gms-kladblok"
                    ></div>
                  </div>
                  
                  <div className="gms-form-section">
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsLocatie">📍 Locatie</label>
                      <input
                        type="text"
                        id="gmsLocatie"
                        className="gms-input"
                        placeholder="Voer locatie in..."
                      />
                    </div>
                    
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsTijdstip">⏰ Tijdstip</label>
                      <input
                        type="datetime-local"
                        id="gmsTijdstip"
                        className="gms-input"
                        readOnly
                      />
                    </div>
                    
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsSoortMelding">🚨 Soort melding</label>
                      <select id="gmsSoortMelding" className="gms-input">
                        <option value="">Selecteer soort melding...</option>
                        <option value="Inbraak woning">Inbraak woning</option>
                        <option value="Brandmelding">Brandmelding</option>
                        <option value="Verkeersongeval">Verkeersongeval</option>
                      </select>
                    </div>
                    
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsPrioriteit">⚡ Prioriteit (1-5)</label>
                      <input
                        type="number"
                        id="gmsPrioriteit"
                        className="gms-input gms-priority-input"
                        min="1"
                        max="5"
                        defaultValue="3"
                      />
                    </div>
                    
                    <button id="gmsSaveButton" className="btn btn-primary gms-save-btn">
                      💾 Melding opslaan
                    </button>
                  </div>
                </div>
                
                <div className="gms-output-section">
                  <h4 className="gms-output-title">📊 Opgeslagen Melding (JSON)</h4>
                  <pre id="gmsOutput" className="gms-output"></pre>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'map' && renderPlaceholderSection('Kaart Overzicht', 'geo-alt')}
        {activeSection === 'archive' && renderPlaceholderSection('Archief', 'archive')}
        {activeSection === 'reports' && renderPlaceholderSection('Rapporten', 'file-text')}
        {activeSection === 'settings' && renderPlaceholderSection('Instellingen', 'gear')}
      </main>

      <div className={`notification ${showNotification ? 'show' : ''}`}>
        {notification}
      </div>
    </div>
  );
}
