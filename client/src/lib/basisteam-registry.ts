
import { Basisteam } from '../../../shared/basisteam-schema';

class BasisteamRegistry {
  private basisteams: Map<string, Basisteam> = new Map();

  constructor() {
    this.initializeDefaultTeams();
  }

  private initializeDefaultTeams() {
    const defaultTeams: Basisteam[] = [
      {
        id: 'BT-RotterdamZuid',
        naam: 'Basisteam Rotterdam Zuid',
        adres: 'Groene Hilledijk 275, 3074 AE Rotterdam',
        polygon: [
          [51.8901, 4.4852],
          [51.8855, 4.5103],
          [51.8800, 4.4872],
          [51.8850, 4.4650],
          [51.8901, 4.4852]
        ],
        gemeentes: ['Rotterdam', 'Barendrecht'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: false,
          max_aantal_eenheden: 25,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'BT-RotterdamNoord',
        naam: 'Basisteam Rotterdam Noord',
        adres: 'Noordplein 20, 3016 BM Rotterdam',
        polygon: [
          [51.9350, 4.4700],
          [51.9400, 4.5000],
          [51.9200, 4.5100],
          [51.9150, 4.4800],
          [51.9350, 4.4700]
        ],
        gemeentes: ['Rotterdam'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 30,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'BT-RotterdamCentrum',
        naam: 'Basisteam Rotterdam Centrum',
        adres: 'Coolsingel 40, 3011 AD Rotterdam',
        polygon: [
          [51.9150, 4.4700],
          [51.9250, 4.4900],
          [51.9100, 4.5050],
          [51.9050, 4.4750],
          [51.9150, 4.4700]
        ],
        gemeentes: ['Rotterdam'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: false,
          max_aantal_eenheden: 35,
          zichtbaar_op_kaart: true
        }
      }
    ];

    defaultTeams.forEach(team => {
      this.basisteams.set(team.id, team);
    });
  }

  getAllTeams(): Basisteam[] {
    return Array.from(this.basisteams.values());
  }

  getActiveTeams(): Basisteam[] {
    return Array.from(this.basisteams.values()).filter(team => team.actief);
  }

  getTeamById(id: string): Basisteam | undefined {
    return this.basisteams.get(id);
  }

  addTeam(team: Basisteam): void {
    this.basisteams.set(team.id, team);
  }

  updateTeam(id: string, updates: Partial<Basisteam>): boolean {
    const existing = this.basisteams.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      this.basisteams.set(id, updated);
      return true;
    }
    return false;
  }

  deleteTeam(id: string): boolean {
    return this.basisteams.delete(id);
  }

  // Controleer of een locatie binnen een basisteam polygoon valt
  isLocationInTeamArea(location: [number, number], teamId: string): boolean {
    const team = this.getTeamById(teamId);
    if (!team) return false;

    return this.pointInPolygon(location, team.polygon);
  }

  // Helper functie om te controleren of een punt binnen een polygoon valt
  private pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    const [lat, lng] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  // Vind het basisteam voor een gegeven locatie
  findTeamForLocation(location: [number, number]): Basisteam | undefined {
    return this.getActiveTeams().find(team => 
      this.isLocationInTeamArea(location, team.id)
    );
  }
}

export const basisteamRegistry = new BasisteamRegistry();
