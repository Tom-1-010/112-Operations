// Routing service for realistic unit movement
export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface RouteResult {
  route: any;
  distance: number;
  duration: number;
  coordinates: [number, number][];
  instructions: any[];
}

export interface UnitMovement {
  unitId: string;
  startPosition: [number, number];
  endPosition: [number, number];
  route: RoutePoint[];
  currentPosition: [number, number];
  progress: number; // 0-1
  status: 'planning' | 'moving' | 'arrived' | 'error';
  estimatedArrival: number;
  startTime: number;
}

class RoutingService {
  private activeMovements: Map<string, UnitMovement> = new Map();
  private movementCallbacks: Map<string, (movement: UnitMovement) => void> = new Map();

  // Get route from start to end coordinates
  async getRoute(start: [number, number], end: [number, number], profile: string = 'driving-car'): Promise<RouteResult> {
    try {
      const startStr = `${start[0]},${start[1]}`;
      const endStr = `${end[0]},${end[1]}`;
      
      const response = await fetch(`/api/routing/route?start=${startStr}&end=${endStr}&profile=${profile}`);
      
      if (!response.ok) {
        throw new Error(`Routing failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Routing error:', error);
      throw error;
    }
  }

  // Start unit movement along route
  startUnitMovement(
    unitId: string, 
    startPosition: [number, number], 
    endPosition: [number, number],
    onUpdate?: (movement: UnitMovement) => void
  ): Promise<UnitMovement> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get route
        const routeResult = await this.getRoute(startPosition, endPosition);
        
        // Create movement object
        const movement: UnitMovement = {
          unitId,
          startPosition,
          endPosition,
          route: this.interpolateRoute(routeResult.coordinates),
          currentPosition: startPosition,
          progress: 0,
          status: 'planning',
          estimatedArrival: Date.now() + (routeResult.duration * 1000),
          startTime: Date.now()
        };

        // Store movement
        this.activeMovements.set(unitId, movement);
        
        if (onUpdate) {
          this.movementCallbacks.set(unitId, onUpdate);
        }

        // Start animation
        this.animateMovement(unitId, resolve, reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Interpolate route coordinates for smooth animation
  private interpolateRoute(coordinates: [number, number][]): RoutePoint[] {
    const points: RoutePoint[] = [];
    const startTime = Date.now();
    
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat] = coordinates[i];
      points.push({
        lat,
        lng,
        timestamp: startTime + (i * 1000) // 1 second per point
      });
    }
    
    return points;
  }

  // Animate unit movement along route
  private animateMovement(unitId: string, resolve: (movement: UnitMovement) => void, reject: (error: any) => void) {
    const movement = this.activeMovements.get(unitId);
    if (!movement) {
      reject(new Error('Movement not found'));
      return;
    }

    movement.status = 'moving';
    let currentIndex = 0;
    const totalPoints = movement.route.length;
    
    const animate = () => {
      if (currentIndex >= totalPoints) {
        // Movement complete
        movement.status = 'arrived';
        movement.currentPosition = movement.endPosition;
        movement.progress = 1;
        
        this.activeMovements.delete(unitId);
        this.movementCallbacks.delete(unitId);
        
        resolve(movement);
        return;
      }

      const currentPoint = movement.route[currentIndex];
      movement.currentPosition = [currentPoint.lat, currentPoint.lng];
      movement.progress = currentIndex / totalPoints;
      
      // Update callback
      const callback = this.movementCallbacks.get(unitId);
      if (callback) {
        callback({ ...movement });
      }

      currentIndex++;
      
      // Continue animation (adjust speed as needed)
      setTimeout(animate, 200); // 200ms per step = 5 steps per second
    };

    animate();
  }

  // Get current movement status
  getMovementStatus(unitId: string): UnitMovement | null {
    return this.activeMovements.get(unitId) || null;
  }

  // Stop unit movement
  stopMovement(unitId: string): boolean {
    const movement = this.activeMovements.get(unitId);
    if (movement) {
      movement.status = 'error';
      this.activeMovements.delete(unitId);
      this.movementCallbacks.delete(unitId);
      return true;
    }
    return false;
  }

  // Get all active movements
  getAllMovements(): UnitMovement[] {
    return Array.from(this.activeMovements.values());
  }
}

export const routingService = new RoutingService();

/**
 * Calculate ETA (Estimated Time of Arrival) using Haversine formula
 * Uses fixed speed of 65 km/h (18.05 m/s) for realistic GMS calculations
 * 
 * @param unitCoords - Unit coordinates { lat, lng }
 * @param incidentCoords - Incident coordinates { lat, lng }
 * @returns ETA in seconds (rounded), or null if coordinates are invalid
 */
export async function calculateETA(
  unitCoords: { lat: number; lng: number } | null,
  incidentCoords: { lat: number; lng: number } | null
): Promise<number | null> {
  if (!unitCoords || !incidentCoords) return null;
  if (typeof unitCoords.lat !== 'number' || typeof unitCoords.lng !== 'number') return null;
  if (typeof incidentCoords.lat !== 'number' || typeof incidentCoords.lng !== 'number') return null;

  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;

  const lat1 = toRad(unitCoords.lat);
  const lat2 = toRad(incidentCoords.lat);
  const dLat = toRad(incidentCoords.lat - unitCoords.lat);
  const dLon = toRad(incidentCoords.lng - unitCoords.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const afstandMeter = R * c;

  // Snelheid = 65 km/h = 18.05 m/s (realisme GMS)
  const snelheidMS = 18.05;

  const tijdSeconden = afstandMeter / snelheidMS;

  return Math.round(tijdSeconden);
}

/**
 * Format ETA seconds to mm:ss format
 * 
 * @param seconds - ETA in seconds
 * @returns Formatted string "mm:ss" or "--:--" if invalid
 */
export function formatETA(seconds: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '--:--';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
