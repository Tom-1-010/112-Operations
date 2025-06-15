import { Incident } from '../types';

interface IncidentTableProps {
  incidents: Incident[];
  onAccept: (id: number) => void;
  onClose: (id: number) => void;
  onRemove: (id: number) => void;
  onSimulateNew: () => void;
}

export default function IncidentTable({
  incidents,
  onAccept,
  onClose,
  onRemove,
  onSimulateNew,
}: IncidentTableProps) {
  const activeIncidents = incidents.filter(
    (inc) => inc.status === 'active' || inc.status === 'accepted'
  );

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Laag';
      case 'medium':
        return 'Gemiddeld';
      case 'high':
        return 'Hoog';
      default:
        return priority;
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
              <div key={incident.id} className="incident-row">
                <div className="incident-type">{incident.type}</div>
                <div className="incident-location">{incident.location}</div>
                <div className="incident-time">{incident.timeAgo}</div>
                <div className="units-assigned">{incident.unitsAssigned}</div>
                <div>
                  <span className={`priority-tag priority-${incident.priority}`}>
                    {getPriorityLabel(incident.priority)}
                  </span>
                </div>
                <div className="incident-actions">
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
