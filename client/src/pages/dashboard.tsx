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
    { id: 'PC01', type: 'patrol', status: 'active', name: 'Patrouille 01' },
    { id: 'PC02', type: 'patrol', status: 'busy', name: 'Patrouille 02' },
    { id: 'PC03', type: 'patrol', status: 'inactive', name: 'Patrouille 03' },
    { id: 'MC01', type: 'motorcycle', status: 'active', name: 'Motor 01' },
    { id: 'MC02', type: 'motorcycle', status: 'active', name: 'Motor 02' },
    { id: 'DU01', type: 'dog', status: 'active', name: 'Hondeneenheid 01' },
    { id: 'RU01', type: 'riot', status: 'inactive', name: 'ME Eenheid 01' },
    { id: 'RU02', type: 'riot', status: 'inactive', name: 'ME Eenheid 02' },
  ]);

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
        {activeSection === 'units' && renderPlaceholderSection('Eenheden Beheer', 'truck')}
        {activeSection === 'gms' && (
          <div className="content-section active">
            <iframe 
              src="/gms" 
              style={{ 
                width: '100%', 
                height: '90vh', 
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              title="GMS Dispatch Simulator"
            />
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
