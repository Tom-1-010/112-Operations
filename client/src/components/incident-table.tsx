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

  const getPriorityLabel = (priority: string | number) => {
    const priorityNum = typeof priority === 'string' ? parseInt(priority) : priority;
    return `Prio ${priorityNum}`;
  };

  const getPriorityClass = (priority: string | number) => {
    const priorityNum = typeof priority === 'string' ? parseInt(priority) : priority;
    switch (priorityNum) {
      case 1:
        return 'priority-1';
      case 2:
        return 'priority-2';
      case 3:
        return 'priority-3';
      case 4:
      case 5:
        return 'priority-4-5';
      default:
        return 'priority-3';
    }
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
          <div>Type</div>
          <div>Locatie</div>
          <div>Tijd</div>
          <div>Eenheden</div>
          <div>Prioriteit</div>
          <div>Acties</div>
        </div>
        <div id="incidentsList">
          {activeIncidents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Geen actieve incidenten
            </div>
          ) : (
            activeIncidents.map((incident) => (
              <div 
                key={incident.id} 
                className="incident-row" 
                style={{ cursor: 'pointer' }}
                onClick={() => onIncidentClick(incident)}
              >
                <div className="incident-type">{incident.type}</div>
                <div className="incident-location">{incident.location}</div>
                <div className="incident-time">{incident.timeAgo}</div>
                <div className="units-assigned">{incident.unitsAssigned}</div>
                <div>
                  <span className={`priority-tag ${getPriorityClass(incident.priority)}`}>
                    {getPriorityLabel(incident.priority)}
                  </span>
                </div>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
