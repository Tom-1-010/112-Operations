The code changes involve adding new teams to the teamOrder array in the ActiveUnitsDisplay component.
```

```javascript
import React, { useState, useEffect } from 'react';

interface PoliceUnit {
  id?: number | string;
  roepnummer: string;
  aantal_mensen: number;
  rollen: string[];
  soort_auto: string;
  team: string;
  status: string;
  locatie?: string;
  incident?: string;
  createdAt?: string;
  updatedAt?: string;
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
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    unit: any;
  }>({ visible: false, x: 0, y: 0, unit: null });
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Hide context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, unit: null });
      setShowStatusSubmenu(false);
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  const handleRightClick = (e: React.MouseEvent, unit: PoliceUnit) => {
    e.preventDefault();

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Context menu approximate dimensions
    const menuWidth = 180;
    const menuHeight = 150;

    // Calculate position, ensuring menu stays within viewport
    let x = e.clientX;
    let y = e.clientY;

    // Adjust if menu would go beyond right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    // Adjust if menu would go beyond bottom edge
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    // Ensure minimum distance from edges
    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({
      visible: true,
      x: x,
      y: y,
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

    // Create assignment object with current timestamp for "ov" (koppelen)
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format
    const assignment = {
      roepnummer: contextMenu.unit.roepnummer,
      soort_voertuig: contextMenu.unit.soort_auto,
      ov_tijd: currentTime, // Tijdstip koppelen
      ar_tijd: '', // Will be filled when status changes to "2 - Aanrijdend"
      tp_tijd: '', // Will be filled when status changes to "3 - Ter plaatse"
      vr_tijd: '', // Will be filled when status changes to "1 - Beschikbaar/vrij"
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

    // Update unit status to "2 - Aanrijdend" automatically with timestamp
    try {
      const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format

      const updatedUnit = {
        ...contextMenu.unit,
        status: "2 - Aanrijdend",
        incident: selectedIncident.nr?.toString() || ""
      };

      // Use same update logic as status change handler
      if (typeof contextMenu.unit.id === 'number') {
        // Database unit
        const response = await fetch(`/api/police-units/${contextMenu.unit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUnit),
        });

        if (response.ok) {
          console.log(`✅ Database eenheid ${contextMenu.unit.roepnummer} status automatisch gewijzigd naar "2 - Aanrijdend"`);
          setDbPoliceUnits(prev => 
            prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
          );
        }
      } else {
        // Basisteams unit
        setBasisteamsUnits(prev => 
          prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
        );

        // Sync to database
        const dbUnit = {
          roepnummer: contextMenu.unit.roepnummer,
          aantal_mensen: contextMenu.unit.aantal_mensen,
          rollen: contextMenu.unit.rollen,
          soort_auto: contextMenu.unit.soort_auto,
          team: contextMenu.unit.team,
          status: "2 - Aanrijdend",
          locatie: contextMenu.unit.locatie || '',
          incident: selectedIncident.nr?.toString() || ""
        };

        await fetch('/api/police-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbUnit),
        });
      }

      // Update status time in GMS2 incident if function is available
      const gms2Window = window.parent || window;
      if ((gms2Window as any).updateUnitStatusTime) {
        (gms2Window as any).updateUnitStatusTime(contextMenu.unit.roepnummer, "2 - Aanrijdend");
      }
    } catch (error) {
      console.error('Error updating unit status:', error);
    }

    console.log(`✅ Eenheid ${contextMenu.unit.roepnummer} gekoppeld aan incident ${selectedIncident.nr}`);
    setContextMenu({ visible: false, x: 0, y: 0, unit: null });
  };

  const handleOntkoppelen = async () => {
    console.log('Ontkoppelen van incident voor eenheid:', contextMenu.unit.roepnummer);

    // Check if there's a selected incident in GMS2
    const gms2Window = window.parent || window;
    const selectedIncident = (gms2Window as any).gms2SelectedIncident;

    if (!selectedIncident) {
      console.log('Geen incident geselecteerd in GMS2');
      setContextMenu({ visible: false, x: 0, y: 0, unit: null });
      return;
    }

    // Remove unit from incident's assigned units
    const updatedIncident = {
      ...selectedIncident,
      assignedUnits: (selectedIncident.assignedUnits || []).filter(
        (unit: any) => unit.roepnummer !== contextMenu.unit.roepnummer
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

      // Use same update logic as status change handler
      if (typeof contextMenu.unit.id === 'number') {
        // Database unit
        const response = await fetch(`/api/police-units/${contextMenu.unit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedUnit),
        });

        if (response.ok) {
          console.log(`✅ Database eenheid ${contextMenu.unit.roepnummer} ontkoppeld en status gewijzigd naar "1 - Beschikbaar/vrij"`);
          setDbPoliceUnits(prev => 
            prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
          );
        }
      } else {
        // Basisteams unit
        setBasisteamsUnits(prev => 
          prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
        );

        // Sync to database
        const dbUnit = {
          roepnummer: contextMenu.unit.roepnummer,
          aantal_mensen: contextMenu.unit.aantal_mensen,
          rollen: contextMenu.unit.rollen,
          soort_auto: contextMenu.unit.soort_auto,
          team: contextMenu.unit.team,
          status: "1 - Beschikbaar/vrij",
          locatie: contextMenu.unit.locatie || '',
          incident: ""
        };

        await fetch('/api/police-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbUnit),
        });
      }

      // Update unit status time if function is available
      if ((gms2Window as any).updateUnitStatusTime) {
        (gms2Window as any).updateUnitStatusTime(contextMenu.unit.roepnummer, "1 - Beschikbaar/vrij");
      }
    } catch (error) {
      console.error('Error updating unit status:', error);
    }

    setContextMenu({ visible: false, x: 0, y: 0, unit: null });
  };

  const handleStatusChange = async (newStatus: string) => {
    console.log(`Status wijzigen voor eenheid ${contextMenu.unit.roepnummer} naar: ${newStatus}`);

    try {
      // Update both database units and basisteams units (same logic as GMS-eenheden)
      if (typeof contextMenu.unit.id === 'number') {
        // Database unit - update directly
        const updatedUnit = {
          ...contextMenu.unit,
          status: newStatus
        };

        const response = await fetch(`/api/police-units/${contextMenu.unit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedUnit),
        });

        if (response.ok) {
          console.log(`✅ Status van database eenheid ${contextMenu.unit.roepnummer} gewijzigd naar: ${newStatus}`);
          // Update local database units state
          setDbPoliceUnits(prev => 
            prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
          );
        } else {
          console.error('Failed to update database unit status');
        }
      } else {
        // Basisteams unit - update local state and sync to database
        const updatedUnit = { ...contextMenu.unit, status: newStatus };
        setBasisteamsUnits(prev => 
          prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
        );

        // Also try to sync to database by creating/updating a database entry
        const dbUnit = {
          roepnummer: contextMenu.unit.roepnummer,
          aantal_mensen: contextMenu.unit.aantal_mensen,
          rollen: contextMenu.unit.rollen,
          soort_auto: contextMenu.unit.soort_auto,
          team: contextMenu.unit.team,
          status: newStatus,
          locatie: contextMenu.unit.locatie || '',
          incident: contextMenu.unit.incident || ''
        };

        // Try to create/update in database
        const response = await fetch('/api/police-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbUnit),
        });

        if (response.ok) {
          console.log(`✅ Status van basisteams eenheid ${contextMenu.unit.roepnummer} gewijzigd naar: ${newStatus} en gesynchroniseerd naar database`);
        } else {
          console.log(`⚠️ Status van basisteams eenheid ${contextMenu.unit.roepnummer} gewijzigd naar: ${newStatus} maar sync naar database gefaald`);
        }
      }

      // Update unit status time if function is available
      const gms2Window = window.parent || window;
      if ((gms2Window as any).updateUnitStatusTime) {
        (gms2Window as any).updateUnitStatusTime(contextMenu.unit.roepnummer, newStatus);
      }
    } catch (error) {
      console.error('Error updating unit status:', error);
    }

    setContextMenu({ visible: false, x: 0, y: 0, unit: null });
    setShowStatusSubmenu(false);
  };

  // Load basisteams units from attached assets (same as GMS-eenheden)
  const [basisteamsUnits, setBasisteamsUnits] = useState<PoliceUnit[]>([]);
  const [dbPoliceUnits, setDbPoliceUnits] = useState<PoliceUnit[]>([]);

  useEffect(() => {
    const loadBasisteamsUnits = async () => {
      try {
        console.log('🔄 [ActiveUnits] Loading rooster data directly...');
        const response = await fetch('/attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json');

        if (response.ok) {
          const roosterData = await response.json();
          console.log('📊 [ActiveUnits] Loaded rooster data with teams:', Object.keys(roosterData));

          const units: PoliceUnit[] = [];
          const teamOrder = [
            'Basisteam Waterweg (A1)', 
            'Basisteam Schiedam (A2)', 
            'Basisteam Midden-Schieland (A3)', 
            'Basisteam Delfshaven (B1)', 
            'Basisteam Centrum (B2)', 
            'Basisteam IJsselland (C2)', 
            'District Stad', 
            'District Rijnmond-Noord',
            'Basisteam Voorne-Putten (C1)', 
            'Basisteam Goeree-Overflakkee (D1)', 
            'District Rijnmond-Oost',
            'Basisteam Feijenoord (D2)', 
            'Basisteam Haringvliet (E1)', 
            'Basisteam IJssellmonde (D3)',
            'Basisteam Nissewaard (E2)',
            'Basisteam Oude-Maas (E3)',
            'DROS',
            'District Rijnmond-Zuid'
          ];

          Object.entries(roosterData).forEach(([teamName, teamUnits]: [string, any]) => {
            if (Array.isArray(teamUnits)) {
              teamUnits.forEach((unit: any) => {
                // Determine status based on primair value only (same logic as GMS-eenheden)
                let status = '5 - Afmelden'; // Default to afgemeld

                // Check primair value: true = status 1, false = status 5
                if (unit.primair === true || unit.primair === 'true' || unit.primair === 1) {
                  status = '1 - Beschikbaar/vrij';
                } else {
                  status = '5 - Afmelden';
                }

                units.push({
                  id: `bt-${unit.roepnummer}`,
                  roepnummer: unit.roepnummer,
                  aantal_mensen: unit.aantal_mensen,
                  rollen: Array.isArray(unit.rollen) ? unit.rollen : [unit.rollen],
                  soort_auto: unit.soort_auto,
                  team: teamName,
                  status: status,
                  locatie: '',
                  incident: ''
                });
              });
            }
          });

          // Sort units by team order, then by roepnummer (same as GMS-eenheden)
          units.sort((a, b) => {
            const aTeamIndex = teamOrder.indexOf(a.team);
            const bTeamIndex = teamOrder.indexOf(b.team);

            if (aTeamIndex !== bTeamIndex) {
              if (aTeamIndex === -1) return 1;
              if (bTeamIndex === -1) return -1;
              return aTeamIndex - bTeamIndex;
            }

            return a.roepnummer.localeCompare(b.roepnummer);
          });

          setBasisteamsUnits(units);
          console.log('✅ [ActiveUnits] Successfully loaded', units.length, 'units from rooster file');
        } else {
          console.error('❌ [ActiveUnits] Failed to fetch rooster file:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ [ActiveUnits] Failed to load rooster units:', error);
      }
    };

    loadBasisteamsUnits();
  }, []);

  // Load database units (same as GMS-eenheden)
  useEffect(() => {
    const loadDbUnits = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/police-units');
        if (response.ok) {
          const data = await response.json();
          setDbPoliceUnits(data || []);
        } else {
          console.warn('[ActiveUnits] Failed to load database units, using empty array');
          setDbPoliceUnits([]);
        }
      } catch (error) {
        console.error('[ActiveUnits] Failed to load database units:', error);
        setDbPoliceUnits([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDbUnits();

    // Refresh every 10 seconds (reduced frequency)
    const refreshTimer = setInterval(loadDbUnits, 10000);

    return () => clearInterval(refreshTimer);
  }, []);

  // Combine units, prioritizing basisteams data over database data (same logic as GMS-eenheden)
  const allUnits = [...basisteamsUnits, ...dbPoliceUnits];
  const combinedUnits = allUnits.filter((unit, index, self) => 
    index === self.findIndex(u => u.roepnummer === unit.roepnummer)
  );

  // Set the combined units
  useEffect(() => {
    setUnits(combinedUnits);
  }, [basisteamsUnits, dbPoliceUnits]);

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
        height: '350px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
        scrollBehavior: 'smooth',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <table className="units-table" style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '12px',
          minWidth: '700px',
          flex: '1 1 auto'
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
            zIndex: 9999,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            padding: '4px 0',
            minWidth: '180px',
            maxWidth: '220px'
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
              fontSize: '12px',
              borderBottom: '1px solid #eee'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
          >
            🔓 Ontkoppelen
          </div>
          <div 
            className="context-menu-item gms2-submenu-parent"
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
              setShowStatusSubmenu(true);
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              // Don't hide submenu immediately to allow navigation
            }}
          >
            Status ►
            {showStatusSubmenu && (
              <div 
                className="gms2-status-submenu"
                style={{
                  position: 'fixed',
                  left: contextMenu.x + 180 + 5 > window.innerWidth ? `${contextMenu.x - 185}px` : `${contextMenu.x + 180}px`,
                  top: `${contextMenu.y + 60}px`,
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  padding: '4px 0',
                  minWidth: '180px',
                  maxWidth: '220px',
                  zIndex: 10000,
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
                onMouseEnter={() => setShowStatusSubmenu(true)}
                onMouseLeave={() => setShowStatusSubmenu(false)}
              >
                <div 
                  className="context-menu-item"
                  onClick={() => handleStatusChange('1 - Beschikbaar/vrij')}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  1 - Beschikbaar/vrij
                </div>
                <div 
                  className="context-menu-item"
                  onClick={() => handleStatusChange('2 - Aanrijdend')}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  2 - Aanrijdend
                </div>
                <div 
                  className="context-menu-item"
                  onClick={() => handleStatusChange('3 - Ter plaatse')}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  3 - Ter plaatse
                </div>
                <div 
                  className="context-menu-item"
                  onClick={() => handleStatusChange('4 - Niet inzetbaar')}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  4 - Niet inzetbaar
                </div>
                <div 
                  className="context-menu-item"
                  onClick={() => handleStatusChange('5 - Afmelden')}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  5 - Afmelden
                </div>
                <div 
                  className="context-menu-item"
                  onClick={() => handleStatusChange('6 - Spraakaanvraag')}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  6 - Spraakaanvraag