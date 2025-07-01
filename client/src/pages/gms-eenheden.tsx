import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PoliceUnit {
  id?: number;
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

// API functions
const fetchPoliceUnits = async (): Promise<PoliceUnit[]> => {
  const response = await fetch('/api/police-units');
  if (!response.ok) throw new Error('Failed to fetch police units');
  return response.json();
};

const updatePoliceUnit = async (unit: PoliceUnit): Promise<PoliceUnit> => {
  const response = await fetch(`/api/police-units/${unit.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unit),
  });
  if (!response.ok) throw new Error('Failed to update police unit');
  return response.json();
};

const createPoliceUnit = async (unit: Omit<PoliceUnit, 'id'>): Promise<PoliceUnit> => {
  const response = await fetch('/api/police-units', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unit),
  });
  if (!response.ok) throw new Error('Failed to create police unit');
  return response.json();
};

export default function GMSEenheden() {
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create table and import data function
  const initializeDatabase = async () => {
    try {
      setIsInitializing(true);
      console.log('🚀 Initializing police units database...');

      // First create the table
      const createResponse = await fetch('/api/police-units/create-table', {
        method: 'POST',
      });

      if (createResponse.ok) {
        console.log('✅ Table created successfully');

        // Then import the data
        const importResponse = await fetch('/api/police-units/import', {
          method: 'POST',
        });

        if (importResponse.ok) {
          const result = await importResponse.json();
          console.log('✅ Data imported successfully:', result);

          // Refresh the data
          queryClient.invalidateQueries({ queryKey: ['police-units'] });
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Fetch police units from database
  const { data: dbPoliceUnits = [], isLoading, error } = useQuery({
    queryKey: ['police-units'],
    queryFn: fetchPoliceUnits,
    retry: false, // Don't retry on first load
  });

  // Load basisteams units from attached assets
  const [basisteamsUnits, setBasisteamsUnits] = useState<PoliceUnit[]>([]);

  useEffect(() => {
    const loadBasisteamsUnits = async () => {
      try {
        console.log('🔄 Loading rooster data directly...');
        const response = await fetch('/attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json');
        
        if (response.ok) {
          const roosterData = await response.json();
          console.log('📊 Loaded rooster data with teams:', Object.keys(roosterData));
          
          const units: PoliceUnit[] = [];
          const teamOrder = ['A1', 'A2', 'A3', 'B1', 'B2'];
          const teamMap: { [key: string]: string } = {
            'Basisteam Waterweg (A1)': 'A1',
            'Basisteam Schiedam (A2)': 'A2', 
            'Basisteam Midden-Schieland (A3)': 'A3',
            'Basisteam Delfshaven (B1)': 'B1',
            'Basisteam Centrum (B2)': 'B2'
          };

          Object.entries(roosterData).forEach(([teamName, teamUnits]: [string, any]) => {
            const shortTeamName = teamMap[teamName] || teamName;
            console.log(`🔍 Processing ${teamName} -> ${shortTeamName} with ${Array.isArray(teamUnits) ? teamUnits.length : 0} units`);
            
            if (Array.isArray(teamUnits)) {
              teamUnits.forEach((unit: any) => {
                units.push({
                  id: `bt-${unit.roepnummer}` as any,
                  roepnummer: unit.roepnummer,
                  aantal_mensen: unit.aantal_mensen,
                  rollen: Array.isArray(unit.rollen) ? unit.rollen : [unit.rollen],
                  soort_auto: unit.soort_auto,
                  team: shortTeamName,
                  status: unit.primair ? '1 - Beschikbaar/vrij' : '1 - Beschikbaar/vrij',
                  locatie: '',
                  incident: ''
                });
              });
            }
          });

          // Sort units by team order, then by roepnummer
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
          console.log('✅ Successfully loaded', units.length, 'units from rooster file');
          console.log('📋 Teams loaded:', units.reduce((acc, unit) => {
            acc[unit.team] = (acc[unit.team] || 0) + 1;
            return acc;
          }, {} as Record<string, number>));
        } else {
          console.error('❌ Failed to fetch rooster file:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Failed to load rooster units:', error);
      }
    };

    loadBasisteamsUnits();
  }, []);

  // Combine database units with basisteams units
  const policeUnits = [...dbPoliceUnits, ...basisteamsUnits];

  // Initialize database if no units found and not loading
  useEffect(() => {
    if (error && !isLoading && !isInitializing) {
      console.log('🔧 Database needs initialization, starting setup...');
      initializeDatabase();
    }
  }, [error, isLoading, isInitializing]);

  // Mutations
  const updateUnitMutation = useMutation({
    mutationFn: updatePoliceUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['police-units'] });
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: createPoliceUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['police-units'] });
    },
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter units based on status
  const filteredPoliceUnits = policeUnits.filter(unit => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'in-dienst') {
      return unit.status !== '5 - Afmelden';
    }
    return unit.status === statusFilter;
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const updateUnitStatus = (unit: PoliceUnit, newStatus: string) => {
    // Only update database units, not basisteams units
    if (typeof unit.id === 'number') {
      updateUnitMutation.mutate({ ...unit, status: newStatus });
    } else {
      // For basisteams units, update local state and sync to database
      const updatedUnit = { ...unit, status: newStatus };
      setBasisteamsUnits(prev => 
        prev.map(u => u.id === unit.id ? updatedUnit : u)
      );
      
      // Also try to sync to database by creating/updating a database entry
      const dbUnit = {
        roepnummer: unit.roepnummer,
        aantal_mensen: unit.aantal_mensen,
        rollen: unit.rollen,
        soort_auto: unit.soort_auto,
        team: unit.team,
        status: newStatus,
        locatie: unit.locatie || '',
        incident: unit.incident || ''
      };
      
      createUnitMutation.mutate(dbUnit);
    }
  };

  const updateUnitLocation = (unit: PoliceUnit, newLocation: string) => {
    // Only update database units, not basisteams units
    if (typeof unit.id === 'number') {
      updateUnitMutation.mutate({ ...unit, locatie: newLocation });
    } else {
      // For basisteams units, update local state and sync to database
      const updatedUnit = { ...unit, locatie: newLocation };
      setBasisteamsUnits(prev => 
        prev.map(u => u.id === unit.id ? updatedUnit : u)
      );
      
      // Also try to sync to database by creating/updating a database entry
      const dbUnit = {
        roepnummer: unit.roepnummer,
        aantal_mensen: unit.aantal_mensen,
        rollen: unit.rollen,
        soort_auto: unit.soort_auto,
        team: unit.team,
        status: unit.status,
        locatie: newLocation,
        incident: unit.incident || ''
      };
      
      createUnitMutation.mutate(dbUnit);
    }
  };

  const updateUnitIncident = (unit: PoliceUnit, newIncident: string) => {
    // Only update database units, not basisteams units
    if (typeof unit.id === 'number') {
      updateUnitMutation.mutate({ ...unit, incident: newIncident });
    } else {
      // For basisteams units, update local state and sync to database
      const updatedUnit = { ...unit, incident: newIncident };
      setBasisteamsUnits(prev => 
        prev.map(u => u.id === unit.id ? updatedUnit : u)
      );
      
      // Also try to sync to database by creating/updating a database entry
      const dbUnit = {
        roepnummer: unit.roepnummer,
        aantal_mensen: unit.aantal_mensen,
        rollen: unit.rollen,
        soort_auto: unit.soort_auto,
        team: unit.team,
        status: unit.status,
        locatie: unit.locatie || '',
        incident: newIncident
      };
      
      createUnitMutation.mutate(dbUnit);
    }
  };

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
      case '5 - afmelden':
        return '#D3D3D3'; // Light Gray
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

  // Fetch police units every 60 seconds to reduce server load
  useEffect(() => {
    fetchPoliceUnits();
    const interval = setInterval(fetchPoliceUnits, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || isInitializing) {
    return (
      <div className="gms-eenheden-container">
        <div className="gms-eenheden-header">
          <div className="gms-eenheden-title">
            <h2>GMS Eenheden Overzicht</h2>
            <div className="gms-eenheden-time">Laden...</div>
          </div>
        </div>
        <div className="loading-message">
          {isInitializing ? 'Database wordt geïnitialiseerd...' : 'Database wordt geladen...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gms-eenheden-container">
        <div className="gms-eenheden-header">
          <div className="gms-eenheden-title">
            <h2>GMS Eenheden Overzicht</h2>
            <div className="gms-eenheden-time">Fout</div>
          </div>
        </div>
        <div className="error-message">
          Fout bij laden van database: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="gms-eenheden-container">
      {/* Header */}
      <div className="gms-eenheden-header">
        <div className="gms-eenheden-title">
          <h2>GMS Eenheden Overzicht (Database)</h2>
          <div className="gms-eenheden-time">
            {formatTime(currentTime)}
          </div>
        </div>

        {/* Status Filter */}
        <div className="gms-filter-controls">
          <label htmlFor="status-filter">Filter op status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="gms-status-filter"
          >
            <option value="all">Alle statussen</option>
            <option value="1 - Beschikbaar/vrij">1 - Beschikbaar/vrij</option>
            <option value="2 - Aanrijdend">2 - Aanrijdend</option>
            <option value="3 - Ter plaatse">3 - Ter plaatse</option>
            <option value="4 - Niet inzetbaar">4 - Niet inzetbaar</option>
            <option value="5 - Afmelden">5 - Afmelden</option>
            <option value="6 - Spraakaanvraag">6 - Spraakaanvraag</option>
            <option value="7 - Spraakaanvraag urgent">7 - Spraakaanvraag urgent</option>
            <option value="8 - Eigen melding">8 - Eigen melding</option>
            <option value="9 - Info">9 - Info</option>
            <option value="N - Noodoproep">N - Noodoproep</option>
          </select>

          <button
            onClick={() => setStatusFilter('in-dienst')}
            className={`gms-dienst-button ${statusFilter === 'in-dienst' ? 'active' : ''}`}
          >
            Toon in dienst
          </button>
        </div>
      </div>

      {/* Scrollable Units Table */}
      <div className="gms-eenheden-scroll-container">
        <div className="gms-eenheden-table-container">
          <table className="gms-eenheden-table">
            <thead>
              <tr className="gms-eenheden-header-row">
                <th>Roepnummer</th>
                <th>Status</th>
                <th>Mensen</th>
                <th>Voertuig</th>
                <th>Rollen</th>
                <th>Locatie</th>
                <th>Incident</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {filteredPoliceUnits.map((unit) => (
                <tr key={unit.id} className="gms-eenheden-data-row">
                  <td className="gms-eenheden-roepnummer">
                    <strong>{unit.roepnummer}</strong>
                  </td>
                  <td 
                    className="gms-eenheden-status"
                    style={{ backgroundColor: getStatusColor(unit.status) }}
                  >
                    <select 
                      value={unit.status}
                      onChange={(e) => updateUnitStatus(unit, e.target.value)}
                      className="gms-status-select"
                      disabled={updateUnitMutation.isPending}
                    >
                      <option value="1 - Beschikbaar/vrij">1 - Beschikbaar/vrij</option>
                      <option value="2 - Aanrijdend">2 - Aanrijdend</option>
                      <option value="3 - Ter plaatse">3 - Ter plaatse</option>
                      <option value="4 - Niet inzetbaar">4 - Niet inzetbaar</option>
                      <option value="5 - Afmelden">5 - Afmelden</option>
                      <option value="6 - Spraakaanvraag">6 - Spraakaanvraag</option>
                      <option value="7 - Spraakaanvraag urgent">7 - Spraakaanvraag urgent</option>
                      <option value="8 - Eigen melding">8 - Eigen melding</option>
                      <option value="9 - Info">9 - Info</option>
                      <option value="N - Noodoproep">N - Noodoproep</option>
                    </select>
                  </td>
                  <td className="gms-eenheden-mensen">
                    {unit.aantal_mensen}
                  </td>
                  <td className="gms-eenheden-voertuig">
                    {unit.soort_auto}
                  </td>
                  <td className="gms-eenheden-rollen">
                    {Array.isArray(unit.rollen) ? unit.rollen.join(", ") : unit.rollen}
                  </td>
                  <td className="gms-eenheden-locatie">
                    <input
                      type="text"
                      value={unit.locatie || ""}
                      onChange={(e) => updateUnitLocation(unit, e.target.value)}
                      className="gms-location-input"
                      placeholder="Locatie..."
                      disabled={updateUnitMutation.isPending}
                    />
                  </td>
                  <td className="gms-eenheden-incident">
                    <div className="gms-incident-display">
                      {unit.incident ? (
                        <span className="incident-info" title={`Incident: ${unit.incident}`}>
                          📋 {unit.incident.length > 20 ? `${unit.incident.substring(0, 20)}...` : unit.incident}
                        </span>
                      ) : (
                        <span className="no-incident">Geen melding</span>
                      )}
                    </div>
                  </td>
                  <td className="gms-eenheden-team">
                    {unit.team}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="gms-eenheden-footer">
        <div className="gms-eenheden-summary">
          <span>Getoond: {filteredPoliceUnits.length} van {policeUnits.length} eenheden</span>
          <span>Beschikbaar: {policeUnits.filter(u => u.status === '1 - Beschikbaar/vrij').length}</span>
          <span>Ter plaatse: {policeUnits.filter(u => u.status === '3 - Ter plaatse').length}</span>
          <span>Aanrijdend: {policeUnits.filter(u => u.status === '2 - Aanrijdend').length}</span>
          <span>Met melding: {policeUnits.filter(u => u.incident && u.incident.trim()).length}</span>
        </div>
      </div>
    </div>
  );
}