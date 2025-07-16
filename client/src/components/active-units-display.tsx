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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ 
    visible: false, 
    x: 0, 
    y: 0, 
    unit: null 
  });
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [basisteamsUnits, setBasisteamsUnits] = useState<PoliceUnit[]>([]);
  const [dbPoliceUnits, setDbPoliceUnits] = useState<PoliceUnit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Utility functions
  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '1 - Beschikbaar/vrij': return '#28a745';
      case '2 - Aanrijdend': return '#ffc107';
      case '3 - Ter plaatse': return '#dc3545';
      case '4 - Niet inzetbaar': return '#6c757d';
      case '5 - Afmelden': return '#17a2b8';
      case '6 - Spraakaanvraag': return '#fd7e14';
      case '7 - Spraakaanvraag urgent': return '#e83e8c';
      case '8 - eigen melding': return '#20c997';
      case '9 - info': return '#6f42c1';
      case 'n - noodoproep': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusAbbreviation = (status: string) => {
    switch (status) {
      case '1 - Beschikbaar/vrij': return '1-VRIJ';
      case '2 - Aanrijdend': return '2-AANR';
      case '3 - Ter plaatse': return '3-TP';
      case '4 - Niet inzetbaar': return '4-NI';
      case '5 - Afmelden': return '5-AFM';
      case '6 - Spraakaanvraag': return '6-SPRAAK';
      case '7 - Spraakaanvraag urgent': return '7-URGENT';
      case '8 - eigen melding': return '8-EM';
      case '9 - info': return '9-INFO';
      case 'n - noodoproep': return 'N-NOOD';
      default: return status.substring(0, 8);
    }
  };

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

  // Load basisteams units from attached assets
  useEffect(() => {
    const loadBasisteamsUnits = async () => {
      try {
        const response = await fetch('/attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json');
        if (response.ok) {
          const roosterData = await response.json();
          const units: PoliceUnit[] = [];
          
          Object.entries(roosterData).forEach(([teamName, teamUnits]: [string, any]) => {
            if (Array.isArray(teamUnits)) {
              teamUnits.forEach((unit: any) => {
                let status = '5 - Afmelden';
                if (unit.primair === true || unit.primair === 'true' || unit.primair === 1) {
                  status = '1 - Beschikbaar/vrij';
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

          setBasisteamsUnits(units);
        }
      } catch (error) {
        console.error('Failed to load rooster units:', error);
      }
    };

    loadBasisteamsUnits();
  }, []);

  // Load database units
  useEffect(() => {
    const loadDbUnits = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/police-units');
        if (response.ok) {
          const data = await response.json();
          setDbPoliceUnits(data || []);
        } else {
          setDbPoliceUnits([]);
        }
      } catch (error) {
        setDbPoliceUnits([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDbUnits();
  }, []);

  const handleRightClick = (e: React.MouseEvent, unit: PoliceUnit) => {
    e.preventDefault();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 180;
    const menuHeight = 150;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({ visible: true, x, y, unit });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!contextMenu.unit) return;

    try {
      if (typeof contextMenu.unit.id === 'number') {
        // Database unit
        const updatedUnit = { ...contextMenu.unit, status: newStatus };
        const response = await fetch(`/api/police-units/${contextMenu.unit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUnit),
        });

        if (response.ok) {
          setDbPoliceUnits(prev => 
            prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
          );
        }
      } else {
        // Basisteams unit
        const updatedUnit = { ...contextMenu.unit, status: newStatus };
        setBasisteamsUnits(prev => 
          prev.map(u => u.id === contextMenu.unit?.id ? updatedUnit : u)
        );
      }
    } catch (error) {
      console.error('Error updating unit status:', error);
    }

    setContextMenu({ visible: false, x: 0, y: 0, unit: null });
    setShowStatusSubmenu(false);
  };

  const handleKoppelen = (unit: PoliceUnit | null) => {
    if (unit) {
      console.log(`Koppelen ${unit.roepnummer} aan incident`);
      // Here you would implement the logic to link the unit to an incident
      // This could open a dialog to select an incident or use the currently selected incident
    }
    closeContextMenu();
  };

  const handleOntkoppelen = (unit: PoliceUnit | null) => {
    if (unit) {
      console.log(`Ontkoppelen ${unit.roepnummer} van incident`);
      // Here you would implement the logic to unlink the unit from an incident
    }
    closeContextMenu();
  };

  // Combined units from both sources
  const allUnits = [...dbPoliceUnits, ...basisteamsUnits];
  
  // Filter to only show active units (status 1-3)
  const activeUnits = allUnits.filter(unit => {
    const status = unit.status;
    return status === '1 - Beschikbaar/vrij' || 
           status === '2 - Aanrijdend' || 
           status === '3 - Ter plaatse';
  });

  // Filter by search query
  const filteredUnits = activeUnits.filter(unit => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      unit.roepnummer.toLowerCase().includes(query) ||
      unit.team.toLowerCase().includes(query) ||
      unit.status.toLowerCase().includes(query) ||
      (unit.locatie && unit.locatie.toLowerCase().includes(query)) ||
      (Array.isArray(unit.rollen) ? unit.rollen.join(' ').toLowerCase().includes(query) : unit.rollen.toLowerCase().includes(query))
    );
  });

  // Sort by team, then by roepnummer with numerical sorting
  const sortedUnits = filteredUnits.sort((a, b) => {
    if (a.team !== b.team) {
      return a.team.localeCompare(b.team);
    }
    
    // Extract numbers from roepnummer for numerical sorting
    const extractNumber = (roepnummer: string) => {
      const match = roepnummer.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };
    
    const numA = extractNumber(a.roepnummer);
    const numB = extractNumber(b.roepnummer);
    
    if (numA !== numB) {
      return numA - numB;
    }
    
    // If numbers are the same, fall back to string comparison
    return a.roepnummer.localeCompare(b.roepnummer);
  });

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
          Actief: {filteredUnits.length} | Beschikbaar: {filteredUnits.filter(u => u.status === '1 - Beschikbaar/vrij').length}
        </div>
        <div className="active-units-time">{formatTime(currentTime)}</div>
      </div>
      
      <div className="active-units-search" style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f8f9fa' 
      }}>
        <input 
          type="text"
          placeholder="Zoek eenheden..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            outline: 'none'
          }}
        />
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
            {sortedUnits.map((unit) => (
              <tr 
                key={unit.id}
                onContextMenu={(e) => handleRightClick(e, unit)}
                style={{ 
                  borderBottom: '1px solid #dee2e6',
                  cursor: 'context-menu'
                }}
              >
                <td style={{ 
                  padding: '4px 8px',
                  borderRight: '1px solid #dee2e6',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  {unit.roepnummer}
                </td>
                <td style={{ 
                  padding: '4px 8px',
                  borderRight: '1px solid #dee2e6',
                  backgroundColor: getStatusColor(unit.status),
                  color: 'white',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  {getStatusAbbreviation(unit.status)}
                </td>
                <td style={{ 
                  padding: '4px 8px',
                  borderRight: '1px solid #dee2e6',
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {Array.isArray(unit.rollen) ? unit.rollen.join(", ") : unit.rollen}
                </td>
                <td style={{ 
                  padding: '4px 8px',
                  borderRight: '1px solid #dee2e6',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {unit.team}
                </td>
                <td style={{ 
                  padding: '4px 8px',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {unit.locatie || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '0',
            zIndex: 1000,
            minWidth: '180px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <div 
            className="context-menu-item"
            onClick={() => handleKoppelen(contextMenu.unit)}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
          >
            Koppelen aan incident
          </div>
          
          <div 
            className="context-menu-item"
            onClick={() => handleOntkoppelen(contextMenu.unit)}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
          >
            Ontkoppelen van incident
          </div>
          
          <div 
            className="context-menu-item"
            onClick={() => setShowStatusSubmenu(!showStatusSubmenu)}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
          >
            Status wijzigen ▶
          </div>
          
          {showStatusSubmenu && (
            <div
              className="status-submenu"
              style={{
                position: 'absolute',
                top: '0',
                left: '100%',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minWidth: '160px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1001
              }}
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}