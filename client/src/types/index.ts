export interface Incident {
  id: number;
  type: string;
  location: string;
  timestamp: string;
  timeAgo: string;
  unitsAssigned: number;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'accepted' | 'closed';
}

export interface Unit {
  id: string;
  type: 'patrol' | 'motorcycle' | 'dog' | 'riot';
  status: 'active' | 'inactive' | 'busy';
  name: string;
}

export interface Stats {
  newIncidents: number;
  activeUnits: number;
  highPriority: number;
  emergencyCalls: number;
}
