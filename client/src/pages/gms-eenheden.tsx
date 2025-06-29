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
  const { data: policeUnits = [], isLoading, error } = useQuery({
    queryKey: ['police-units'],
    queryFn: fetchPoliceUnits,
    retry: false, // Don't retry on first load
  });

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const updateUnitStatus = (unit: PoliceUnit, newStatus: string) => {
    updateUnitMutation.mutate({ ...unit, status: newStatus });
  };

  const updateUnitLocation = (unit: PoliceUnit, newLocation: string) => {
    updateUnitMutation.mutate({ ...unit, locatie: newLocation });
  };

  const updateUnitIncident = (unit: PoliceUnit, newIncident: string) => {
    updateUnitMutation.mutate({ ...unit, incident: newIncident });
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
              {policeUnits.map((unit) => (
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
                    {unit.rollen.join(", ")}
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
                    <input
                      type="text"
                      value={unit.incident || ""}
                      onChange={(e) => updateUnitIncident(unit, e.target.value)}
                      className="gms-incident-input"
                      placeholder="Incident..."
                      disabled={updateUnitMutation.isPending}
                    />
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
          <span>Totaal: {policeUnits.length} eenheden</span>
          <span>Beschikbaar: {policeUnits.filter(u => u.status === '1 - Beschikbaar/vrij').length}</span>
          <span>Ter plaatse: {policeUnits.filter(u => u.status === '3 - Ter plaatse').length}</span>
          <span>Aanrijdend: {policeUnits.filter(u => u.status === '2 - Aanrijdend').length}</span>
        </div>
      </div>
    </div>
  );
}