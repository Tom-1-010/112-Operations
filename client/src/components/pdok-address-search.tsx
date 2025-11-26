/**
 * Example React component demonstrating PDOK address search functionality
 */

import React, { useState } from 'react';
import { useAddressSearch, useReverseGeocode, useAddressValidation } from '../hooks/use-pdok';
import { formatAddress } from '../lib/pdok-client';

export function PDOKAddressSearch() {
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Address search hook
  const {
    query,
    setQuery,
    results,
    suggestions,
    loading,
    error,
    clear
  } = useAddressSearch({
    debounceMs: 300,
    minQueryLength: 2,
    limit: 10
  });

  // Reverse geocoding hook
  const {
    loading: reverseLoading,
    error: reverseError,
    results: reverseResults,
    geocode: reverseGeocode,
    clear: clearReverse
  } = useReverseGeocode({ radius: 100 });

  // Address validation hook
  const {
    loading: validationLoading,
    error: validationError,
    validation,
    validate: validateAddress,
    clear: clearValidation
  } = useAddressValidation();

  const handleAddressSelect = (address: any) => {
    setSelectedAddress(address);
    setQuery(formatAddress(address, 'full'));
    clear();
  };

  const handleValidateAddress = () => {
    if (selectedAddress) {
      validateAddress(selectedAddress);
      setShowValidation(true);
    }
  };

  const handleReverseGeocode = () => {
    if (selectedAddress?.coordinates) {
      const [lat, lon] = selectedAddress.coordinates;
      reverseGeocode(lat, lon);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">PDOK Address Search</h2>

      {/* Search Input */}
      <div className="mb-6">
        <label htmlFor="address-search" className="block text-sm font-medium text-gray-700 mb-2">
          Search Address
        </label>
        <div className="relative">
          <input
            id="address-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an address (e.g., Rotterdam Kleiweg 500)"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleAddressSelect(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium">{suggestion.text}</div>
                <div className="text-sm text-gray-500">{suggestion.full}</div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-2 text-red-600 text-sm">{error}</div>
        )}
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Search Results</h3>
          <div className="space-y-2">
            {results.map((address) => (
              <div
                key={address.id}
                className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                onClick={() => handleAddressSelect(address)}
              >
                <div className="font-medium">{formatAddress(address, 'full')}</div>
                <div className="text-sm text-gray-500">
                  Score: {address.score.toFixed(2)} | Type: {address.type}
                </div>
                {address.coordinates && (
                  <div className="text-xs text-gray-400">
                    Coordinates: {address.coordinates[0].toFixed(6)}, {address.coordinates[1].toFixed(6)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Address */}
      {selectedAddress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Selected Address</h3>
          <div className="space-y-2">
            <div><strong>Full Address:</strong> {formatAddress(selectedAddress, 'full')}</div>
            <div><strong>Street:</strong> {formatAddress(selectedAddress, 'street')}</div>
            <div><strong>Postal:</strong> {formatAddress(selectedAddress, 'short')}</div>
            <div><strong>ID:</strong> {selectedAddress.id}</div>
            {selectedAddress.coordinates && (
              <div><strong>Coordinates:</strong> {selectedAddress.coordinates[0]}, {selectedAddress.coordinates[1]}</div>
            )}
          </div>

          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleValidateAddress}
              disabled={validationLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {validationLoading ? 'Validating...' : 'Validate Address'}
            </button>
            <button
              onClick={handleReverseGeocode}
              disabled={reverseLoading || !selectedAddress.coordinates}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {reverseLoading ? 'Geocoding...' : 'Reverse Geocode'}
            </button>
            <button
              onClick={() => {
                setSelectedAddress(null);
                clearValidation();
                clearReverse();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Address Validation Results */}
      {showValidation && validation && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Address Validation</h3>
          <div className="space-y-2">
            <div className={`font-medium ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
              Status: {validation.isValid ? 'Valid' : 'Invalid'}
            </div>
            {validation.errors.length > 0 && (
              <div>
                <strong className="text-red-600">Errors:</strong>
                <ul className="list-disc list-inside text-red-600">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div>
                <strong className="text-yellow-600">Warnings:</strong>
                <ul className="list-disc list-inside text-yellow-600">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {validationError && (
            <div className="mt-2 text-red-600 text-sm">{validationError}</div>
          )}
        </div>
      )}

      {/* Reverse Geocoding Results */}
      {reverseResults.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h3 className="text-lg font-semibold mb-3 text-purple-800">Nearby Addresses</h3>
          <div className="space-y-2">
            {reverseResults.map((address, index) => (
              <div key={index} className="p-2 bg-white rounded border">
                <div className="font-medium">{formatAddress(address, 'full')}</div>
                <div className="text-sm text-gray-500">Distance: {address.distance}m</div>
              </div>
            ))}
          </div>
          {reverseError && (
            <div className="mt-2 text-red-600 text-sm">{reverseError}</div>
          )}
        </div>
      )}

      {/* Clear All Button */}
      {(results.length > 0 || selectedAddress || validation || reverseResults.length > 0) && (
        <div className="text-center">
          <button
            onClick={() => {
              clear();
              setSelectedAddress(null);
              setShowValidation(false);
              clearValidation();
              clearReverse();
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

export default PDOKAddressSearch;






































