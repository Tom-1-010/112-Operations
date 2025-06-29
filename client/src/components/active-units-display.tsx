import React, { useState, useEffect } from 'react';

interface PoliceUnit {
  id: string;
  roepnummer: string;
  aantal_mensen: number;
  rollen: string[];
  soort_auto: string;
  team: string;
  status: string;
  locatie?: string;
  incident?: string;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  unit: PoliceUnit | null;
}

export default function ActiveUnitsDisplay() {
  const [policeUnits, setPoliceUnits] = useState<PoliceUnit[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    unit: null
  });
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, unit: null });
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRightClick = (e: React.MouseEvent, unit: PoliceUnit) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      unit: unit
    });
  };

  const handleKoppelen = async () => {
    if (!contextMenu.unit) return;

    // Get current incident from GMS2 window if available
    const gms2Window = window.parent || window;
    const selectedIncident = (gms2Window as any).gms2SelectedIncident;

    if (!selectedIncident) {
      console.log('Geen incident geselecteerd in GMS2');
      setContextMenu({ visible: false, x: 0, y: 0, unit: null });
      return;
    }

    // Create assignment object
    const assignment = {
      roepnummer: contextMenu.unit.roepnummer,
      soort_voertuig: contextMenu.unit.soort_auto,
      ov_tijd: new Date().toTimeString().slice(0, 5), // Current time as "HH:MM"
    };

    // Update incident with assigned unit
    const updatedIncident = {
      ...selectedIncident,
      assignedUnits: [...(selectedIncident.assignedUnits || []), assignment]
    };

    // Call the update function if available
    if ((gms2Window as any).updateSelectedIncident) {
      (gms2Window as any).updateSelectedIncident(updatedIncident);
    }

    // Update unit status to "2 - Aanrijdend" automatically
    try {
      const updatedUnit = {
        ...contextMenu.unit,
        status: "2 - Aanrijdend",
        incident: selectedIncident.nr?.toString() || ""
      };

      const response = await fetch(`/api/police-units/${contextMenu.unit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUnit),
      });

      if (response.ok) {
        console.log(`✅ Eenheid ${contextMenu.unit.roepnummer} status automatisch gewijzigd naar "2 - Aanrijdend"`);

        // Update local units state if available
        setUnits(prev => prev.map(unit => 
          unit.id === contextMenu.unit?.id ? updatedUnit : unit
        ));
      } else {
        console.error('Failed to update unit status');
      }
    } catch (error) {
      console.error('Error updating unit status:', error);
    }

    console.log(`✅ Eenheid ${contextMenu.unit.roepnummer} gekoppeld aan incident ${selectedIncident.nr}`);
    setContextMenu({ visible: false, x: 0, y: 0, unit: null });
  };

  const handleOntkoppelen = async () => {
    if (!contextMenu.unit) return;

    // Get current incident from GMS2 window if available
    const gms2Window = window.parent || window;
    const selectedIncident = (gms2Window as any).gms2SelectedIncident;

    if (!selectedIncident || !selectedIncident.assignedUnits) {
      console.log('Geen incident geselecteerd of geen toegewezen eenheden');
      setContextMenu({ visible: false, x: 0, y: 0, unit: null });
      return;
    }

    // Remove unit from assigned units
    const updatedIncident = {
      ...selectedIncident,
      assignedUnits: selectedIncident.assignedUnits.filter(
        (unit: any) => unit.roepnummer !== contextMenu.unit?.roepnummer
      )
    };

    // Call the update function if available
    if ((gms2Window as any).updateSelectedIncident) {
      (gms2Window as any).updateSelectedIncident(updatedIncident);
    }

    // Update unit status to "1 - Beschikbaar/vrij" automatically
    try {
      const updatedUnit = {
        ...contextMenu.unit,
        status: "1 - Beschikbaar/vrij",
        incident: ""
      };

      const response = await fetch(`/api/police-units/${contextMenu.unit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUnit),
      });

      if (response.ok) {
        console.log(`✅ Eenheid ${contextMenu.unit.roepnummer} status automatisch gewijzigd naar "1 - Beschikbaar/vrij"`);

        // Update local units state if available
        setUnits(prev => prev.map(unit => 
          unit.id === contextMenu.unit?.id ? updatedUnit : unit
        ));
      } else {
        console.error('Failed to update unit status');
      }
    } catch (error) {
      console.error('Error updating unit status:', error);
    }

    console.log(`✅ Eenheid ${contextMenu.unit.roepnummer} ontkoppeld van incident ${selectedIncident.nr}`);
    setContextMenu({ visible: false, x: 0, y: 0, unit: null });
  };

  // Load units data
  useEffect(() => {
    const loadUnits = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/police-units');
        if (response.ok) {
          const data = await response.json();
          setUnits(data || []);
        } else {
          console.warn('Failed to load units, using empty array');
          setUnits([]);
        }
      } catch (error) {
        console.error('Failed to load units:', error);
        setUnits([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUnits();

    // Refresh every 10 seconds (reduced frequency)
    const refreshTimer = setInterval(loadUnits, 10000);

    return () => clearInterval(refreshTimer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  // Filter only active units (not "5 - Afmelden")
  const activeUnits = units.filter(unit => 
    unit.status !== "5 - Afmelden" && unit.status !== "5 - afmelden"
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case '1 - beschikbaar/vrij':
        return '#90EE90'; // Light green
      case '2 - aanrijdend':
        return '#FFD700'; // Gold
      case '3 - ter plaatse':
        return '#1E90FF'; // Dodger blue
      case '4 - niet inzetbaar':
        return '#FF6347'; // Tomato red
      case '6 - spraakaanvraag':
        return '#DA70D6'; // Orchid
      case '7 - spraakaanvraag urgent':
        return '#FF1493'; // Deep pink
      case '8 - eigen melding':
        return '#FFA500'; // Orange
      case '9 - info':
        return '#87CEEB'; // Sky blue
      case 'n - noodoproep':
        return '#DC143C'; // Crimson red
      default:
        return '#FFFFFF'; // White
    }
  };

  const getStatusAbbreviation = (status: string) => {
    switch (status.toLowerCase()) {
      case '1 - beschikbaar/vrij': return '1-VRIJ';
      case '2 - aanrijdend': return '2-AAR';
      case '3 - ter plaatse': return '3-TP';
      case '4 - niet inzetbaar': return '4-NI';
      case '6 - spraakaanvraag': return '6-SA';
      case '7 - spraakaanvraag urgent': return '7-SAU';
      case '8 - eigen melding': return '8-EM';
      case '9 - info': return '9-INFO';
      case 'n - noodoproep': return 'N-NOOD';
      default: return status.substring(0, 8);
    }
  };

  if (isLoading) {
    return (
      <div className="active-units-container">
        <div className="active-units-header">
          <h3>Actieve Eenheden</h3>
          <div className="active-units-time">Laden...</div>
        </div>
        <div className="loading-text">Eenheden worden geladen...</div>
      </div>
    );
  }

  return (
    <div className="active-units-container">
      <div className="active-units-header">
        <h3>Actieve Eenheden</h3>
        <div className="active-units-summary">
          Actief: {activeUnits.length} | Beschikbaar: {activeUnits.filter(u => u.status === '1 - Beschikbaar/vrij').length}
        </div>
        <div className="active-units-time">{formatTime(currentTime)}</div>
      </div>

      <div className="active-units-table-wrapper" style={{ 
        overflowY: 'auto', 
        overflowX: 'auto',
        maxHeight: '600px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff'
      }}>
        <table className="units-table" style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '12px'
        }}>
          <thead style={{ 
            position: 'sticky', 
            top: 0, 
            backgroundColor: '#f8f9fa',
            zIndex: 10,
            borderBottom: '2px solid #dee2e6'
          }}>
            <tr>
              <th style={{ 
                padding: '8px 12px', 
                textAlign: 'left',
                borderRight: '1px solid #dee2e6',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}>Roepnummer</th>
              <th style={{ 
                padding: '8px 12px', 
                textAlign: 'left',
                borderRight: '1px solid #dee2e6',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}>Status</th>
              <th style={{ 
                padding: '8px 12px', 
                textAlign: 'left',
                borderRight: '1px solid #dee2e6',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}>Inzetrol</th>
              <th style={{ 
                padding: '8px 12px', 
                textAlign: 'left',
                borderRight: '1px solid #dee2e6',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}>Team</th>
              <th style={{ 
                padding: '8px 12px', 
                textAlign: 'left',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}>Locatie</th>
            </tr>
          </thead>
          <tbody>
            {activeUnits.map((unit, index) => (
                <tr 
                  key={`${unit.roepnummer}-${index}`} 
                  className="unit-table-row"
                  onContextMenu={(e) => handleRightClick(e, unit)}
                  style={{ cursor: 'context-menu' }}
                >
                    <td style={{ 
                      padding: '6px 12px',
                      borderRight: '1px solid #dee2e6',
                      whiteSpace: 'nowrap'
                    }}>
                      <strong>{unit.roepnummer}</strong>
                    </td>
                    <td style={{ 
                      padding: '6px 12px',
                      borderRight: '1px solid #dee2e6',
                      whiteSpace: 'nowrap'
                    }}>
                      <span 
                        className="status-badge"
                        style={{ 
                          backgroundColor: getStatusColor(unit.status),
                          color: '#000',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                      >
                        {getStatusAbbreviation(unit.status)}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '6px 12px',
                      borderRight: '1px solid #dee2e6',
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <span title={unit.rollen.join(", ")}>
                        {unit.rollen.join(", ")}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '6px 12px',
                      borderRight: '1px solid #dee2e6',
                      whiteSpace: 'nowrap',
                      maxWidth: '80px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <span title={unit.team}>
                        {unit.team}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '6px 12px',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <span title={unit.locatie || "-"}>
                        {unit.locatie || "-"}
                      </span>
                    </td>
                  </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeUnits.length === 0 && (
        <div className="no-active-units">
          Geen actieve eenheden beschikbaar
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '4px 0',
            minWidth: '120px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="context-menu-item"
            onClick={handleKoppelen}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              borderBottom: '1px solid #eee'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
          >
            🔗 Koppelen
          </div>
          <div 
            className="context-menu-item"
            onClick={handleOntkoppelen}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
          >
            🔓 Ontkoppelen
          </div>
        </div>
      )}
    </div>
  );
}