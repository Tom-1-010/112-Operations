export type LatLng = { lat: number; lng: number };

export enum ChatRole { 
  CALLER = 'CALLER', 
  DISPATCH = 'DISPATCH', 
  SYSTEM = 'SYSTEM' 
}

export type ChatItem = {
  id: string; 
  role: ChatRole; 
  text: string; 
  at: string;  // ISO time
};

export enum MC { // MeldingClassificatie (small demo set)
  INBRAAK = 'INBRAAK',
  ACHTERVOLGING = 'ACHTERVOLGING',
  CONFLICT = 'CONFLICT',
  DIEFSTAL = 'DIEFSTAL',
  VERKEER = 'VERKEER',
  BRAND = 'BRAND',
  MEDISCH = 'MEDISCH',
  OVERLAST = 'OVERLAST',
}

export type IntakeForm = {
  address: string;
  location?: LatLng;
  mc: MC[];               // multiple classification tags
  priority: 1|2|3|4|5;
};

export type MCInfo = {
  code: MC;
  label: string;
  description: string;
  color: string;
  shortcut?: string; // For MC 1, MC 2, MC 3 shortcuts
};

