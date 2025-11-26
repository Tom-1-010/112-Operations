/**
 * PDOK API client for frontend usage
 * 
 * This client provides a simple interface to interact with the PDOK API
 * through the backend proxy endpoints.
 */

export interface AddressSearchParams {
  query: string;
  limit?: number;
  type?: 'adres' | 'woonplaats' | 'gemeente' | 'provincie';
  bbox?: string;
  sort?: 'score' | 'distance';
}

export interface AddressResult {
  id: string;
  weergavenaam: string;
  straatnaam: string;
  huisnummer: string;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode: string;
  plaatsnaam: string;
  gemeentenaam: string;
  provincienaam: string;
  coordinates?: [number, number];
  score: number;
  type: string;
}

export interface GeocodeParams {
  lat: number;
  lon: number;
  radius?: number;
}

export interface ReverseGeocodeResult {
  id: string;
  weergavenaam: string;
  straatnaam: string;
  huisnummer: string;
  postcode: string;
  plaatsnaam: string;
  gemeentenaam: string;
  provincienaam: string;
  coordinates: [number, number];
  distance: number;
}

export interface PDOKResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total: number;
    count: number;
    query: string;
    executionTime: number;
  };
}

export interface AddressValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AddressSuggestion {
  id: string;
  text: string;
  full: string;
  coordinates?: [number, number];
  score: number;
}

export class PDOKClient {
  private baseUrl: string;

  constructor(baseUrl = '/api/pdok') {
    this.baseUrl = baseUrl;
  }

  /**
   * Search for addresses
   */
  async searchAddresses(params: AddressSearchParams): Promise<PDOKResponse<AddressResult[]>> {
    const searchParams = new URLSearchParams({
      q: params.query,
      limit: (params.limit || 20).toString(),
      type: params.type || 'adres',
      sort: params.sort || 'score'
    });

    if (params.bbox) {
      searchParams.append('bbox', params.bbox);
    }

    try {
      const response = await fetch(`${this.baseUrl}/search?${searchParams.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Reverse geocoding - get address from coordinates
   */
  async reverseGeocode(params: GeocodeParams): Promise<PDOKResponse<ReverseGeocodeResult[]>> {
    const searchParams = new URLSearchParams({
      lat: params.lat.toString(),
      lon: params.lon.toString(),
      radius: (params.radius || 50).toString()
    });

    try {
      const response = await fetch(`${this.baseUrl}/reverse-geocode?${searchParams.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get address details by ID
   */
  async getAddressById(id: string): Promise<PDOKResponse<AddressResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/address/${encodeURIComponent(id)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Validate address
   */
  async validateAddress(address: Partial<AddressResult>): Promise<PDOKResponse<AddressValidation>> {
    try {
      const response = await fetch(`${this.baseUrl}/validate-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(address)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Format address for display
   */
  async formatAddress(address: AddressResult, format: 'full' | 'short' | 'street' = 'full'): Promise<PDOKResponse<{ formatted: string; original: AddressResult; format: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/format-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address, format })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get address suggestions for autocomplete
   */
  async getSuggestions(query: string, limit = 10): Promise<PDOKResponse<AddressSuggestion[]>> {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });

    try {
      const response = await fetch(`${this.baseUrl}/suggest?${searchParams.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Batch search multiple addresses
   */
  async batchSearch(queries: string[], options: { limit?: number; type?: string; sort?: string } = {}): Promise<PDOKResponse<Array<{ index: number; query: string; result: PDOKResponse<AddressResult[]> }>>> {
    try {
      const response = await fetch(`${this.baseUrl}/batch-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ queries, options })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<PDOKResponse<{ status: string; version: string; timestamp: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<PDOKResponse<{ status: string; timestamp: string; pdok: any; service: any }>> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * NWB Wegen WFS - GetCapabilities
   */
  async getNwbWfsCapabilities(): Promise<string | { error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/nwb-wegen/capabilities`);
      const text = await response.text();
      return text;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  /**
   * NWB Wegen WFS - GetFeature -> GeoJSON passthrough
   * Example type names include: 'nwb:Wegvakken', 'nwb:Hectometerpunten'
   */
  async getNwbWfsFeatures(params: {
    typeNames: string;
    bbox?: string;
    srsName?: string;
    count?: number;
    filter?: string;
  }): Promise<any> {
    const search = new URLSearchParams();
    search.set('typeNames', params.typeNames);
    if (params.bbox) search.set('bbox', params.bbox);
    if (params.srsName) search.set('srsName', params.srsName);
    if (typeof params.count === 'number') search.set('count', String(params.count));
    if (params.filter) search.set('filter', params.filter);

    const url = `${this.baseUrl}/nwb-wegen/features?${search.toString()}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`NWB WFS request failed: ${response.status} ${text.substring(0, 200)}`);
    }
    return response.json();
  }
}

// Export singleton instance
export const pdokClient = new PDOKClient();

// Utility functions for common operations
export const formatAddress = (address: AddressResult, format: 'full' | 'short' | 'street' = 'full'): string => {
  const parts: string[] = [];

  switch (format) {
    case 'street':
      parts.push(address.straatnaam);
      if (address.huisnummer) {
        parts.push(address.huisnummer);
        if (address.huisletter) parts.push(address.huisletter);
        if (address.huisnummertoevoeging) parts.push(address.huisnummertoevoeging);
      }
      break;

    case 'short':
      parts.push(address.straatnaam);
      if (address.huisnummer) {
        parts.push(address.huisnummer);
        if (address.huisletter) parts.push(address.huisletter);
        if (address.huisnummertoevoeging) parts.push(address.huisnummertoevoeging);
      }
      if (address.postcode && address.plaatsnaam) {
        parts.push(`${address.postcode} ${address.plaatsnaam}`);
      }
      break;

    case 'full':
    default:
      parts.push(address.straatnaam);
      if (address.huisnummer) {
        parts.push(address.huisnummer);
        if (address.huisletter) parts.push(address.huisletter);
        if (address.huisnummertoevoeging) parts.push(address.huisnummertoevoeging);
      }
      if (address.postcode && address.plaatsnaam) {
        parts.push(`${address.postcode} ${address.plaatsnaam}`);
      }
      if (address.gemeentenaam && address.gemeentenaam !== address.plaatsnaam) {
        parts.push(address.gemeentenaam);
      }
      if (address.provincienaam) {
        parts.push(address.provincienaam);
      }
      break;
  }

  return parts.filter(Boolean).join(' ');
};

export const validateCoordinates = (lat: number, lon: number): boolean => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return distance in meters
};



















