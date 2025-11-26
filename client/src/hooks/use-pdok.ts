/**
 * React hooks for PDOK API integration
 */

import { useState, useCallback, useRef } from 'react';
import { pdokClient, type AddressResult, type AddressSuggestion, type ReverseGeocodeResult } from '../lib/pdok-client';

export interface UseAddressSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
  type?: 'adres' | 'woonplaats' | 'gemeente' | 'provincie';
}

export interface UseAddressSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: AddressResult[];
  suggestions: AddressSuggestion[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

/**
 * Hook for address search with debouncing and autocomplete
 */
export function useAddressSearch(options: UseAddressSearchOptions = {}): UseAddressSearchResult {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    limit = 10,
    type = 'adres'
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get suggestions for autocomplete
      const suggestionsResult = await pdokClient.getSuggestions(searchQuery, limit);
      if (suggestionsResult.success && suggestionsResult.data) {
        setSuggestions(suggestionsResult.data);
      }

      // Get full search results
      const searchResult = await pdokClient.searchAddresses({
        query: searchQuery,
        limit,
        type
      });

      if (searchResult.success && searchResult.data) {
        setResults(searchResult.data);
      } else {
        setError(searchResult.error || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [minQueryLength, limit, type]);

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(searchQuery);
    }, debounceMs);
  }, [search, debounceMs]);

  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    results,
    suggestions,
    loading,
    error,
    search,
    clear
  };
}

export interface UseReverseGeocodeOptions {
  radius?: number;
}

export interface UseReverseGeocodeResult {
  loading: boolean;
  error: string | null;
  results: ReverseGeocodeResult[];
  geocode: (lat: number, lon: number) => Promise<void>;
  clear: () => void;
}

/**
 * Hook for reverse geocoding
 */
export function useReverseGeocode(options: UseReverseGeocodeOptions = {}): UseReverseGeocodeResult {
  const { radius = 50 } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ReverseGeocodeResult[]>([]);

  const geocode = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await pdokClient.reverseGeocode({ lat, lon, radius });

      if (result.success && result.data) {
        setResults(result.data);
      } else {
        setError(result.error || 'Reverse geocoding failed');
        setResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reverse geocoding failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [radius]);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    loading,
    error,
    results,
    geocode,
    clear
  };
}

export interface UseAddressValidationResult {
  loading: boolean;
  error: string | null;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null;
  validate: (address: Partial<AddressResult>) => Promise<void>;
  clear: () => void;
}

/**
 * Hook for address validation
 */
export function useAddressValidation(): UseAddressValidationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const validate = useCallback(async (address: Partial<AddressResult>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await pdokClient.validateAddress(address);

      if (result.success && result.data) {
        setValidation(result.data);
      } else {
        setError(result.error || 'Validation failed');
        setValidation(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setValidation(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    validation,
    validate,
    clear
  };
}

export interface UsePDOKHealthResult {
  loading: boolean;
  error: string | null;
  health: {
    status: string;
    timestamp: string;
    pdok: any;
    service: any;
  } | null;
  checkHealth: () => Promise<void>;
}

/**
 * Hook for PDOK service health monitoring
 */
export function usePDOKHealth(): UsePDOKHealthResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{
    status: string;
    timestamp: string;
    pdok: any;
    service: any;
  } | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await pdokClient.getHealth();

      if (result.success && result.data) {
        setHealth(result.data);
      } else {
        setError(result.error || 'Health check failed');
        setHealth(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    health,
    checkHealth
  };
}

/**
 * Hook for batch address search
 */
export function useBatchAddressSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{
    index: number;
    query: string;
    result: any;
  }>>([]);

  const batchSearch = useCallback(async (queries: string[], options: { limit?: number; type?: string; sort?: string } = {}) => {
    if (queries.length === 0) {
      setResults([]);
      return;
    }

    if (queries.length > 10) {
      setError('Maximum 10 queries allowed per batch request');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await pdokClient.batchSearch(queries, options);

      if (result.success && result.data) {
        setResults(result.data);
      } else {
        setError(result.error || 'Batch search failed');
        setResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    loading,
    error,
    results,
    batchSearch,
    clear
  };
}





































