import { Incident } from '../types';

interface IncidentTableProps {
  incidents: Incident[];
  onAccept: (id: number) => void;
  onClose: (id: number) => void;
  onRemove: (id: number) => void;
  onSimulateNew: () => void;
  onIncidentClick: (incident: Incident) => void;
}

export default function IncidentTable({
  incidents,
  onAccept,
  onClose,
  onRemove,
  onSimulateNew,
  onIncidentClick,
}: IncidentTableProps) {
  const activeIncidents = incidents.filter(
    (inc) => inc.status === 'active' || inc.status === 'accepted'
  );

  const getPriorityCircleStyle = (priority: string | number) => {
    const priorityNum = typeof priority === 'string' ? parseInt(priority) : priority;
    const baseStyle = {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold'
    };
    
    switch (priorityNum) {
      case 1:
        return { ...baseStyle, backgroundColor: '#dc3545' }; // red
      case 2:
        return { ...baseStyle, backgroundColor: '#fd7e14' }; // orange
      case 3:
        return { ...baseStyle, backgroundColor: '#28a745' }; // green
      case 4:
      case 5:
        return { ...baseStyle, backgroundColor: '#6c757d' }; // grey
      default:
        return { ...baseStyle, backgroundColor: '#28a745' }; // green
    }
  };

  const getRowStyle = (index: number) => {
    return {
      backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#e9ecef',
      cursor: 'pointer'
    };
  };

  return (
    <div className="section">
      <div className="section-header">
        <h3 className="section-title">Actieve Incidenten</h3>
        <button className="btn btn-primary" onClick={onSimulateNew}>
          <i className="bi bi-plus-lg"></i>
          Simuleer Nieuwe Melding
        </button>
      </div>
      <div className="incidents-table">
        <div className="incident-row" style={{ background: '#f8f9fa', fontWeight: 600 }}>
          <div>Prio</div>
          <div>MC1 / MC2 / MC3</div>
          <div>Straatnaam + Huisnummer</div>
          <div>Plaatsnaam</div>
          <div>Incident Nummer</div>
          <div>Toegewezen Eenheden</div>
          <div>Status</div>
          <div>Acties</div>
        </div>
        <div id="incidentsList">
          {activeIncidents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Geen actieve incidenten
            </div>
          ) : (
            activeIncidents.map((incident, index) => {
              // Parse location data
              const locationParts = incident.location.split(',');
              const streetAndNumber = locationParts[0]?.trim() || '';
              const city = locationParts[1]?.trim() || 'Rotterdam';
              
              // Create MC1/MC2/MC3 display (placeholder for now as we need to add this data to incidents)
              const mcDisplay = incident.type || 'Onbekend';
              
              // Get status display
              const statusDisplay = incident.status === 'active' ? 'Nieuw' : 
                                  incident.status === 'accepted' ? 'In behandeling' : 
                                  incident.status === 'closed' ? 'Afgehandeld' : 'Onbekend';
              
              // Units display (placeholder as unitsAssigned is currently a number)
              const unitsDisplay = incident.unitsAssigned > 0 ? `${incident.unitsAssigned} eenheden` : 'Geen';
              
              return (
                <div 
                  key={incident.id} 
                  className="incident-row" 
                  style={getRowStyle(index)}
                  onClick={() => onIncidentClick(incident)}
                >
                  <div>
                    <div style={getPriorityCircleStyle(incident.priority)}>
                      {typeof incident.priority === 'string' ? parseInt(incident.priority) : incident.priority}
                    </div>
                  </div>
                  <div>{mcDisplay}</div>
                  <div>{streetAndNumber}</div>
                  <div>{city}</div>
                  <div>{incident.id}</div>
                  <div>{unitsDisplay}</div>
                  <div>{statusDisplay}</div>
                  <div className="incident-actions" onClick={(e) => e.stopPropagation()}>
                    {incident.status === 'active' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => onAccept(incident.id)}
                      >
                        <i className="bi bi-check"></i>
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onClose(incident.id)}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onRemove(incident.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
