import { LatLng } from '@meldkamerspel/shared';

/**
 * Routing service stub - will later integrate with OSRM/Valhalla
 */

export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: LatLng[];
}

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  profile?: 'driving' | 'walking' | 'cycling';
}

export class Router {
  /**
   * Calculate route between two points
   * Currently returns a stub - will integrate with external routing service
   */
  async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    // Stub implementation - returns straight line distance
    const distance = this.calculateDistance(request.origin, request.destination);
    const duration = Math.round(distance / 15); // Assume 15 m/s average speed
    
    return {
      distance,
      duration,
      geometry: [request.origin, request.destination],
    };
  }

  /**
   * Calculate straight-line distance between two points (Haversine formula)
   */
  private calculateDistance(point1: LatLng, point2: LatLng): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const router = new Router();
