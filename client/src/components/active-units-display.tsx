
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

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
}

const fetchPoliceUnits = async (): Promise<PoliceUnit[]> => {
  const response = await fetch('/api/police-units');
  if (!response.ok) throw new Error('Failed to fetch police units');
  return response.json();
};

export default function ActiveUnitsDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: policeUnits = [], isLoading } = useQuery({
    queryKey: ['police-units'],
    queryFn: fetchPoliceUnits,
    refetchInterval: 5000, // Refresh every 5 seconds
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

  // Filter only active units (not "5 - Afmelden")
  const activeUnits = policeUnits.filter(unit => 
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
        <div className="active-units-time">{formatTime(currentTime)}</div>
      </div>
      
      <div className="active-units-summary">
        <span>Actief: {activeUnits.length}</span>
        <span>Beschikbaar: {activeUnits.filter(u => u.status === '1 - Beschikbaar/vrij').length}</span>
      </div>

      <div className="active-units-grid">
        {activeUnits.map((unit) => (
          <div 
            key={unit.id} 
            className="active-unit-card"
            style={{ borderLeft: `4px solid ${getStatusColor(unit.status)}` }}
          >
            <div className="unit-header">
              <div className="unit-roepnummer">{unit.roepnummer}</div>
              <div 
                className="unit-status-badge"
                style={{ backgroundColor: getStatusColor(unit.status) }}
              >
                {getStatusAbbreviation(unit.status)}
              </div>
            </div>
            
            <div className="unit-details">
              <div className="unit-info">
                <i className="bi bi-people-fill"></i>
                {unit.aantal_mensen}
              </div>
              <div className="unit-info">
                <i className="bi bi-truck"></i>
                {unit.soort_auto.split(' - ')[1] || unit.soort_auto}
              </div>
            </div>

            {unit.locatie && (
              <div className="unit-location">
                <i className="bi bi-geo-alt-fill"></i>
                {unit.locatie}
              </div>
            )}

            {unit.incident && (
              <div className="unit-incident">
                <i className="bi bi-exclamation-triangle-fill"></i>
                {unit.incident}
              </div>
            )}

            <div className="unit-team">
              {unit.team.replace('Basisteam ', '').replace(' (', ' ').replace(')', '')}
            </div>
          </div>
        ))}
      </div>

      {activeUnits.length === 0 && (
        <div className="no-active-units">
          Geen actieve eenheden
        </div>
      )}
    </div>
  );
}
