/**
 * TypeScript types for PDOK (Publieke Dienstverlening Op de Kaart) API responses
 */

// Base PDOK response structure
export interface PDOKBaseResponse {
  responseHeader: {
    status: number;
    QTime: number;
    params: Record<string, any>;
  };
  response: {
    numFound: number;
    start: number;
    docs: any[];
  };
}

// Address search result
export interface PDOKAddressDoc {
  id: string;
  weergavenaam: string;
  straatnaam?: string;
  huisnummer?: string;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  gemeentenaam?: string;
  provincienaam?: string;
  centroide_ll?: string; // "lat,lon" format
  centroide_rd?: string; // Rijksdriehoekscoördinaten
  type: string;
  score?: number;
  distance?: number;
}

// Municipality search result
export interface PDOKMunicipalityDoc {
  id: string;
  weergavenaam: string;
  gemeentenaam: string;
  gemeentecode: string;
  provincienaam?: string;
  provinciecode?: string;
  centroide_ll?: string;
  type: string;
  score?: number;
}

// Province search result
export interface PDOKProvinceDoc {
  id: string;
  weergavenaam: string;
  provincienaam: string;
  provinciecode: string;
  centroide_ll?: string;
  type: string;
  score?: number;
}

// WMS/WFS response types
export interface PDOKWMSResponse {
  type: string;
  features: PDOKFeature[];
  totalFeatures?: number;
  numberMatched?: number;
  numberReturned?: number;
  timeStamp?: string;
  crs?: {
    type: string;
    properties: {
      name: string;
    };
  };
}

export interface PDOKFeature {
  type: string;
  id?: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

// Administrative boundaries
export interface PDOKMunicipalityBoundary {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: {
      gemeentenaam: string;
      gemeentecode: string;
      provincienaam?: string;
      provinciecode?: string;
      oppervlakte?: number;
      inwoners?: number;
    };
  }>;
}

// RWS (Rijkswaterstaat) road data
export interface PDOKRoadSegment {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: {
      WVK_ID?: string;
      WGK_NAAM?: string;
      WGK_CODE?: string;
      BST_CODE?: string;
      RJR_CODE?: string;
      BEGAFST?: number;
      ENDAFST?: number;
      LENGTE?: number;
      WEGBEHEER?: string;
    };
  }>;
}

// Hectometer markers
export interface PDOKHectometerMarker {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: {
      HMP_ID?: string;
      WGK_NAAM?: string;
      AFSTAND?: number;
      KM_AFSTAND?: number;
      RJR_CODE?: string;
    };
  }>;
}

// Junction points
export interface PDOKJunction {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: {
      KNP_ID?: string;
      KNP_NAAM?: string;
      KNP_NUMMER?: string;
      WEG_NUMMERS?: string[];
    };
  }>;
}

// Search parameters
export interface PDOKSearchParams {
  q: string;
  rows?: number;
  start?: number;
  fq?: string;
  fl?: string;
  sort?: string;
  bbox?: string;
  lat?: number;
  lon?: number;
  radius?: number;
}

// Geocoding parameters
export interface PDOKGeocodeParams {
  lat: number;
  lon: number;
  radius?: number;
  rows?: number;
  fq?: string;
  fl?: string;
  sort?: string;
}

// Address validation result
export interface PDOKAddressValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
  normalizedAddress?: {
    straatnaam: string;
    huisnummer: string;
    huisletter?: string;
    huisnummertoevoeging?: string;
    postcode: string;
    plaatsnaam: string;
    gemeentenaam: string;
    provincienaam?: string;
  };
}

// Service response wrapper
export interface PDOKServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total: number;
    count: number;
    query: string;
    executionTime: number;
    apiVersion?: string;
  };
}

// Error types
export interface PDOKError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Configuration types
export interface PDOKConfig {
  baseUrl: string;
  timeout: number;
  userAgent: string;
  maxRetries: number;
  defaultLimit: number;
  defaultRadius: number;
}

// Address formatting options
export interface PDOKAddressFormatOptions {
  format: 'full' | 'short' | 'street' | 'postal';
  includeProvince?: boolean;
  includeCountry?: boolean;
  separator?: string;
}

// Coordinate types
export interface PDOKCoordinates {
  lat: number;
  lon: number;
  rd?: {
    x: number;
    y: number;
  };
  wgs84?: {
    lat: number;
    lon: number;
  };
}

// Bounding box
export interface PDOKBoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

// Search filters
export interface PDOKSearchFilters {
  type?: 'adres' | 'woonplaats' | 'gemeente' | 'provincie' | 'weg';
  gemeente?: string;
  provincie?: string;
  postcode?: string;
  bbox?: PDOKBoundingBox;
  radius?: number;
  center?: PDOKCoordinates;
}

// Sort options
export interface PDOKSortOptions {
  field: 'score' | 'distance' | 'weergavenaam' | 'postcode';
  order: 'asc' | 'desc';
}

// API endpoint types
export interface PDOKEndpoints {
  locatieserver: {
    search: string;
    lookup: string;
    suggest: string;
  };
  wms: {
    bestuurlijkegebieden: string;
    topografie: string;
    luchtfoto: string;
  };
  wfs: {
    bestuurlijkegebieden: string;
    bag: string;
    rws: string;
  };
}

// Usage statistics
export interface PDOKUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: string;
  rateLimitRemaining?: number;
  rateLimitReset?: string;
}

// Cache configuration
export interface PDOKCacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of cached items
  strategy: 'lru' | 'fifo' | 'ttl';
}

// Logging configuration
export interface PDOKLogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enabled: boolean;
  includeRequestData: boolean;
  includeResponseData: boolean;
  maxLogSize: number;
}





































