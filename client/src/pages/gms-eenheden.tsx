import { useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";

interface PoliceUnit {
  roepnummer: string;
  aantal_mensen: number;
  rollen: string[];
  soort_auto: string;
  team: string;
  status: string;
  locatie?: string;
  incident?: string;
  lastUpdate?: string;
}

// Default units data from JSON
const defaultPoliceUnitsData: PoliceUnit[] = [
  {
    roepnummer: "RT 11.01",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.02",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.03",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.04",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.05",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.09",
    aantal_mensen: 1,
    rollen: ["Senior", "ACO"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.10",
    aantal_mensen: 1,
    rollen: ["Opr. Expert", "OPCO"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.16",
    aantal_mensen: 2,
    rollen: ["Noodhulp", "Onopvallend"],
    soort_auto: "BPV-onopvallend",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.21",
    aantal_mensen: 1,
    rollen: ["Noodhulp", "Motor"],
    soort_auto: "BPV-motor",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.26",
    aantal_mensen: 2,
    rollen: ["Voet/fiets"],
    soort_auto: "Fiets",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.34",
    aantal_mensen: 3,
    rollen: ["Noodhulp", "Studenten"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.50",
    aantal_mensen: 1,
    rollen: ["Opsporing"],
    soort_auto: "BPV-onopvallend",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.60",
    aantal_mensen: 1,
    rollen: ["Wijkagent"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.95",
    aantal_mensen: 1,
    rollen: ["Reisnummer"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.99",
    aantal_mensen: 1,
    rollen: ["teamchef"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  }
];

export default function GMSEenheden() {
  const [policeUnits, setPoliceUnits] = useLocalStorage<PoliceUnit[]>(
    "policeUnitsDatabase",
    defaultPoliceUnitsData
  );

  const [currentTime, setCurrentTime] = useState(new Date());

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

  const updateUnitStatus = (roepnummer: string, newStatus: string) => {
    setPoliceUnits(prev => 
      prev.map(unit => 
        unit.roepnummer === roepnummer 
          ? { ...unit, status: newStatus, lastUpdate: new Date().toISOString() }
          : unit
      )
    );
  };

  const updateUnitLocation = (roepnummer: string, newLocation: string) => {
    setPoliceUnits(prev => 
      prev.map(unit => 
        unit.roepnummer === roepnummer 
          ? { ...unit, locatie: newLocation, lastUpdate: new Date().toISOString() }
          : unit
      )
    );
  };

  const updateUnitIncident = (roepnummer: string, newIncident: string) => {
    setPoliceUnits(prev => 
      prev.map(unit => 
        unit.roepnummer === roepnummer 
          ? { ...unit, incident: newIncident, lastUpdate: new Date().toISOString() }
          : unit
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case '1 - beschikbaar/vrij':
        return '#90EE90'; // Light green
      case '2 - onderweg':
        return '#FFD700'; // Gold
      case '3 - bezig':
      case '4 - bezet':
        return '#FFA500'; // Orange
      case '6 - onderhoud':
        return '#FFB6C1'; // Light pink
      case '5 - afmelden':
        return '#D3D3D3'; // Light Gray
      default:
        return '#FFFFFF'; // White
    }
  };

  return (
    <div className="gms-eenheden-container">
      {/* Header */}
      <div className="gms-eenheden-header">
        <div className="gms-eenheden-title">
          <h2>GMS Eenheden Overzicht</h2>
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
              {policeUnits.map((unit, index) => (
                <tr key={unit.roepnummer} className="gms-eenheden-data-row">
                  <td className="gms-eenheden-roepnummer">
                    <strong>{unit.roepnummer}</strong>
                  </td>
                  <td 
                    className="gms-eenheden-status"
                    style={{ backgroundColor: getStatusColor(unit.status) }}
                  >
                    <select 
                      value={unit.status}
                      onChange={(e) => updateUnitStatus(unit.roepnummer, e.target.value)}
                      className="gms-status-select"
                    >
                      <option value="1 - Beschikbaar/vrij">1 - Beschikbaar/vrij</option>
                      <option value="2 - Onderweg">2 - Onderweg</option>
                      <option value="3 - Bezig">3 - Bezig</option>
                      <option value="4 - Bezet">4 - Bezet</option>
                      <option value="5 - Afmelden">5 - Afmelden</option>
                      <option value="6 - Onderhoud">6 - Onderhoud</option>
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
                      onChange={(e) => updateUnitLocation(unit.roepnummer, e.target.value)}
                      className="gms-location-input"
                      placeholder="Locatie..."
                    />
                  </td>
                  <td className="gms-eenheden-incident">
                    <input
                      type="text"
                      value={unit.incident || ""}
                      onChange={(e) => updateUnitIncident(unit.roepnummer, e.target.value)}
                      className="gms-incident-input"
                      placeholder="Incident..."
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
          <span>Bezig: {policeUnits.filter(u => u.status === '3 - Bezig').length}</span>
          <span>Onderweg: {policeUnits.filter(u => u.status === '2 - Onderweg').length}</span>
        </div>
      </div>
    </div>
  );
}