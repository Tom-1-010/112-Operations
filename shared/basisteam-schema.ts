
export interface Basisteam {
  id: string;
  naam: string;
  adres: string;
  polygon: [number, number][]; // Array van coördinaten voor polygoon
  gemeentes: string[];
  actief: boolean;
  instellingen: {
    kan_inzetten_buiten_gebied: boolean;
    max_aantal_eenheden: number;
    zichtbaar_op_kaart: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

// Uitbreiding van bestaande Eenheid interface om basisteam_id toe te voegen
export interface EenheidMetBasisteam {
  id: string;
  type: 'Politie' | 'Brandweer' | 'Ambulance';
  status: 'Beschikbaar' | 'Onderweg' | 'Bezig' | 'Uitruk';
  locatie: [number, number];
  bestemming?: string;
  naam?: string;
  basisteam_id: string;
}
