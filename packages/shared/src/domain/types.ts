/**
 * Domain types for MeldkamerSpel - Police dispatch simulation
 */

export enum UnitRole {
  POLICE_PATROL = 'POLICE_PATROL',
  POLICE_SIV = 'POLICE_SIV',
  POLICE_SUPERVISOR = 'POLICE_SUPERVISOR',
}

export enum UnitStatus {
  IDLE = 'IDLE',
  ENROUTE = 'ENROUTE',
  ONSCENE = 'ONSCENE',
  RETURNING = 'RETURNING',
  OFFLINE = 'OFFLINE',
}

export enum IncidentType {
  PURSUIT = 'PURSUIT',
  BURGLARY = 'BURGLARY',
  DISTURBANCE = 'DISTURBANCE',
  THEFT = 'THEFT',
}

export enum IncidentState {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  ONSCENE = 'ONSCENE',
  DONE = 'DONE',
}

export type LatLng = {
  lat: number;
  lng: number;
};

export type Incident = {
  id: string;
  type: IncidentType;
  state: IncidentState;
  location: LatLng;
  priority: 1 | 2 | 3;
  dwellSeconds: number;
  reward: number;
  createdAt: string;
};

export type Unit = {
  id: string;
  name: string;
  role: UnitRole;
  status: UnitStatus;
  location: LatLng;
  createdAt: string;
};

export type Dispatch = {
  id: string;
  incidentId: string;
  unitIds: string[];
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
};
