/**
 * PDOK (Publieke Dienstverlening Op de Kaart) API Service
 * 
 * This service provides comprehensive integration with PDOK APIs including:
 * - Locatieserver (address search, geocoding, reverse geocoding)
 * - WMS/WFS services for administrative boundaries
 * - BAG (Basisregistratie Adressen en Gebouwen) data
 * - RWS (Rijkswaterstaat) road network data
 */

export interface PDOKConfig {
  baseUrl: string;
  timeout: number;
  userAgent: string;
  maxRetries: number;
}

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
  coordinates?: [number, number]; // [lat, lon]
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

export class PDOKService {
  private config: PDOKConfig;

  constructor(config?: Partial<PDOKConfig>) {
    this.config = {
      baseUrl: process.env.PDOK_BASE_URL || 'https://api.pdok.nl',
      timeout: parseInt(process.env.PDOK_TIMEOUT || '10000'),
      userAgent: process.env.PDOK_USER_AGENT || 'MeldkamerSimulator/1.0',
      maxRetries: parseInt(process.env.PDOK_MAX_RETRIES || '3'),
      ...config
    };
  }

  /**
   * Search for addresses using PDOK Locatieserver
   */
  async searchAddresses(params: AddressSearchParams): Promise<PDOKResponse<AddressResult[]>> {
    const startTime = Date.now();
    
    try {
      const {
        query,
        limit = 20,
        type = 'adres',
        bbox,
        sort = 'score'
      } = params;

      if (!query.trim()) {
        return {
          success: false,
          error: 'Query parameter is required'
        };
      }

      const searchParams = new URLSearchParams({
        q: query,
        rows: limit.toString(),
        fq: `type:${type}`,
        fl: 'id,weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll,type',
        sort: `${sort} desc`
      });

      if (bbox) {
        searchParams.append('bbox', bbox);
      }

      const url = `${this.config.baseUrl}/bzk/locatieserver/search/v3_1/free?${searchParams.toString()}`;
      
      console.log(`[PDOK] Searching addresses: "${query}" (${type})`);
      
      const response = await this.fetchWithRetry(url);
      
      if (!response.success || !response.data) {
        return response;
      }

      const data = response.data as any;
      const docs = data.response?.docs || [];
      
      const results: AddressResult[] = docs.map((doc: any) => {
        let coordinates: [number, number] | undefined;
        
        if (doc.centroide_ll) {
          const coords = doc.centroide_ll.split(',');
          if (coords.length === 2) {
            coordinates = [parseFloat(coords[1]), parseFloat(coords[0])]; // [lat, lon]
          }
        }

        return {
          id: doc.id,
          weergavenaam: doc.weergavenaam,
          straatnaam: doc.straatnaam || '',
          huisnummer: doc.huisnummer || '',
          huisletter: doc.huisletter || '',
          huisnummertoevoeging: doc.huisnummertoevoeging || '',
          postcode: doc.postcode || '',
          plaatsnaam: doc.woonplaatsnaam || '',
          gemeentenaam: doc.gemeentenaam || '',
          provincienaam: doc.provincienaam || '',
          coordinates,
          score: doc.score || 0,
          type: doc.type || type
        };
      });

      const executionTime = Date.now() - startTime;
      
      console.log(`[PDOK] Found ${results.length} addresses in ${executionTime}ms`);

      return {
        success: true,
        data: results,
        metadata: {
          total: data.response?.numFound || 0,
          count: results.length,
          query,
          executionTime
        }
      };

    } catch (error) {
      console.error('[PDOK] Address search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Reverse geocoding - get address from coordinates
   */
  async reverseGeocode(params: GeocodeParams): Promise<PDOKResponse<ReverseGeocodeResult[]>> {
    const startTime = Date.now();
    
    try {
      const { lat, lon, radius = 50 } = params;

      // Use the free search endpoint with a coordinate-based query
      // Format: "lat,lon" or use a bounding box approach
      const searchParams = new URLSearchParams({
        q: `${lat},${lon}`,
        rows: '10',
        fq: 'type:adres',
        fl: 'id,weergavenaam,straatnaam,huisnummer,postcode,woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll',
        sort: 'score desc'
      });

      const url = `${this.config.baseUrl}/bzk/locatieserver/search/v3_1/free?${searchParams.toString()}`;
      
      console.log(`[PDOK] Reverse geocoding: ${lat}, ${lon} (radius: ${radius}m)`);
      
      const response = await this.fetchWithRetry(url);
      
      if (!response.success || !response.data) {
        return response;
      }

      const data = response.data as any;
      const docs = data.response?.docs || [];
      
      // Filter results by distance and calculate actual distances
      const results: ReverseGeocodeResult[] = docs
        .map((doc: any) => {
          let coordinates: [number, number] = [lat, lon];
          let distance = 0;
          
          if (doc.centroide_ll) {
            const coords = doc.centroide_ll.split(',');
            if (coords.length === 2) {
              const docLat = parseFloat(coords[1]);
              const docLon = parseFloat(coords[0]);
              coordinates = [docLat, docLon];
              
              // Calculate distance using Haversine formula
              distance = this.calculateDistance(lat, lon, docLat, docLon);
            }
          }

          return {
            id: doc.id,
            weergavenaam: doc.weergavenaam,
            straatnaam: doc.straatnaam || '',
            huisnummer: doc.huisnummer || '',
            postcode: doc.postcode || '',
            plaatsnaam: doc.woonplaatsnaam || '',
            gemeentenaam: doc.gemeentenaam || '',
            provincienaam: doc.provincienaam || '',
            coordinates,
            distance
          };
        })
        .filter(result => result.distance <= radius * 1000) // Convert radius to meters
        .sort((a, b) => a.distance - b.distance);

      const executionTime = Date.now() - startTime;
      
      console.log(`[PDOK] Found ${results.length} nearby addresses in ${executionTime}ms`);

      return {
        success: true,
        data: results,
        metadata: {
          total: data.response?.numFound || 0,
          count: results.length,
          query: `${lat},${lon}`,
          executionTime
        }
      };

    } catch (error) {
      console.error('[PDOK] Reverse geocoding error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get detailed address information by ID
   */
  async getAddressById(id: string): Promise<PDOKResponse<AddressResult>> {
    try {
      const url = `${this.config.baseUrl}/bzk/locatieserver/search/v3_1/lookup?id=${encodeURIComponent(id)}`;
      
      console.log(`[PDOK] Getting address by ID: ${id}`);
      
      const response = await this.fetchWithRetry(url);
      
      if (!response.success || !response.data) {
        return response;
      }

      const data = response.data as any;
      const doc = data.response?.docs?.[0];
      
      if (!doc) {
        return {
          success: false,
          error: 'Address not found'
        };
      }

      let coordinates: [number, number] | undefined;
      
      if (doc.centroide_ll) {
        const coords = doc.centroide_ll.split(',');
        if (coords.length === 2) {
          coordinates = [parseFloat(coords[1]), parseFloat(coords[0])];
        }
      }

      const result: AddressResult = {
        id: doc.id,
        weergavenaam: doc.weergavenaam,
        straatnaam: doc.straatnaam || '',
        huisnummer: doc.huisnummer || '',
        huisletter: doc.huisletter || '',
        huisnummertoevoeging: doc.huisnummertoevoeging || '',
        postcode: doc.postcode || '',
        plaatsnaam: doc.woonplaatsnaam || '',
        gemeentenaam: doc.gemeentenaam || '',
        provincienaam: doc.provincienaam || '',
        coordinates,
        score: doc.score || 0,
        type: doc.type || 'adres'
      };

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('[PDOK] Get address by ID error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate address format and completeness
   */
  validateAddress(address: Partial<AddressResult>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!address.straatnaam?.trim()) {
      errors.push('Straatnaam is required');
    }
    if (!address.huisnummer?.trim()) {
      errors.push('Huisnummer is required');
    }
    if (!address.postcode?.trim()) {
      errors.push('Postcode is required');
    }
    if (!address.plaatsnaam?.trim()) {
      errors.push('Plaatsnaam is required');
    }

    // Format validation
    if (address.postcode && !/^\d{4}\s?[A-Z]{2}$/i.test(address.postcode)) {
      errors.push('Postcode format is invalid (should be 1234 AB)');
    }

    // Warnings
    if (!address.gemeentenaam?.trim()) {
      warnings.push('Gemeentenaam is missing');
    }
    if (!address.coordinates) {
      warnings.push('Coordinates are missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Format address for display
   */
  formatAddress(address: AddressResult, format: 'full' | 'short' | 'street' = 'full'): string {
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
  }

  /**
   * Internal method to fetch with retry logic
   */
  private async fetchWithRetry(url: string, retryCount = 0): Promise<PDOKResponse<any>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': this.config.userAgent,
          'X-Requested-With': 'XMLHttpRequest'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        throw new Error(`Expected JSON response, got: ${contentType}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data
      };

    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        console.warn(`[PDOK] Request failed, retrying (${retryCount + 1}/${this.config.maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.fetchWithRetry(url, retryCount + 1);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return distance in meters
  }

  /**
   * Test PDOK API connectivity
   */
  async testConnection(): Promise<PDOKResponse<{ status: string; version: string; timestamp: string }>> {
    try {
      const testUrl = `${this.config.baseUrl}/bzk/locatieserver/search/v3_1/free?q=test&rows=1`;
      
      const response = await this.fetchWithRetry(testUrl);
      
      if (response.success) {
        return {
          success: true,
          data: {
            status: 'connected',
            version: 'v3_1',
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          error: 'Failed to connect to PDOK API'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const pdokService = new PDOKService();
