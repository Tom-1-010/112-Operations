import React, { useState, useEffect } from "react";

interface Unit {
  id?: number;
  roepnummer: string;
  aantal_mensen: number;
  rollen: string[];
  soort_auto: string;
  team: string;
  status: string;
  locatie?: string;
  incident?: string;
}

export default function ActiveUnitsDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

      <div className="active-units-table" style={{ overflowY: 'auto', maxHeight: '400px' }}>
        <table className="units-table">
          <thead>
            <tr>
              <th>Roepnummer</th>
              <th>Status</th>
              <th>Inzetrol</th>
              <th>Locatie</th>
            </tr>
          </thead>
          <tbody>
            {activeUnits.map((unit) => (
              <tr 
                key={unit.id} 
                className="unit-table-row"
                style={{ borderLeft: `3px solid ${getStatusColor(unit.status)}` }}
              >
                <td className="unit-roepnummer-cell">
                  <strong>{unit.roepnummer}</strong>
                </td>
                <td className="unit-status-cell">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(unit.status) }}
                  >
                    {getStatusAbbreviation(unit.status)}
                  </span>
                </td>
                <td className="unit-role-cell">
                  {unit.rollen.join(", ")}
                </td>
                <td className="unit-location-cell">
                  {unit.locatie || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeUnits.length === 0 && (
        <div className="no-active-units">
          Geen actieve eenheden
        </div>
      )}
    </div>
  );
}