/**
 * Type definitie voor een BRW eenheid
 */
export interface BrwUnit {
  id: string;
  roepnummer: string;
  type: BrwUnitType;
  rol: string;
  kazerne: string;
  opKaart: boolean;
  locatie: {
    lat: number | null;
    lng: number | null;
  };
}

/**
 * Beschikbare BRW materieeltypes
 */
export type BrwUnitType = 
  | "TS"   // Tankautospuit
  | "RV"   // Redvoertuig
  | "HV"   // Hulpverlening
  | "WO"   // Waterongeval
  | "OR"   // Overig
  | "SI"   // Snel Interventie
  | "OvD"  // Officier van Dienst
  | "AL"   // Autoladder
  | "DA"   // Dienstauto
  | "MP"   // Motorpomp
  | "HW"   // Hoogwerker
  | "DAT"  // Dienstauto Tank
  | "BV"   // Brandweervoertuig
  | "WOV"  // Waterongevallenvoertuig
  | "VP"   // Vaste Post
  | "CDT"  // Clustercommandant
  | "COP-DCU" // Decentrale uitgifte
  | "Drone" // Drone
  | "";    // Leeg/Onbekend

/**
 * Type voor eenheid data die naar de kaart wordt gestuurd
 */
export interface UnitForMap {
  roepnummer: string;
  type: string;
  lat: number;
  lon: number;
  status?: string;
  kazerne?: string;
}

