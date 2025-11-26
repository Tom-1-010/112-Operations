import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pdokClient, type AddressResult } from '../lib/pdok-client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MapPin, Search, Check, X, Loader2 } from 'lucide-react';

// Fix voor Leaflet iconen
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Kazerne {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  latitude: string | null;
  longitude: string | null;
}

interface GeocodeResult {
  success: boolean;
  coordinates?: [number, number];
  address?: AddressResult;
  error?: string;
}

/**
 * Component die klikken op de kaart detecteert
 */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    },
  });
  return null;
}

/**
 * Tool voor het geocoderen en aanpassen van kazerne locaties
 */
export default function KazerneGeocodingTool({ 
  kazernes, 
  onUpdateCoordinates 
}: { 
  kazernes: Kazerne[];
  onUpdateCoordinates: (kazerneId: string, lat: number, lng: number) => Promise<void>;
}) {
  const [selectedKazerne, setSelectedKazerne] = useState<Kazerne | null>(null);
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [manualCoordinates, setManualCoordinates] = useState<[number, number] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutoGeocoding, setIsAutoGeocoding] = useState(false);
  const [autoGeocodeProgress, setAutoGeocodeProgress] = useState({ current: 0, total: 0 });
  const [autoGeocodeResults, setAutoGeocodeResults] = useState<Array<{ kazerne: Kazerne; success: boolean; error?: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasAutoGeocoded, setHasAutoGeocoded] = useState(false);

  /**
   * Geocode een kazerne adres
   */
  const geocodeKazerne = async (kazerne: Kazerne) => {
    setIsGeocoding(true);
    setGeocodeResult(null);
    setManualCoordinates(null);

    try {
      const addressString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
      const result = await pdokClient.searchAddresses({
        query: addressString,
        limit: 1,
        type: 'adres'
      });

      if (result.success && result.data && result.data.length > 0) {
        const address = result.data[0];
        if (address.coordinates) {
          setGeocodeResult({
            success: true,
            coordinates: address.coordinates,
            address: address
          });
          setManualCoordinates(address.coordinates);
        } else {
          setGeocodeResult({
            success: false,
            error: 'Geen coördinaten gevonden in PDOK resultaat'
          });
        }
      } else {
        setGeocodeResult({
          success: false,
          error: result.error || 'Geen resultaten gevonden in PDOK'
        });
      }
    } catch (error) {
      setGeocodeResult({
        success: false,
        error: error instanceof Error ? error.message : 'Onbekende fout bij geocoding'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  /**
   * Zoek naar adressen
   */
  const searchAddresses = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await pdokClient.searchAddresses({
        query: query,
        limit: 10,
        type: 'adres'
      });

      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Fout bij zoeken:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Selecteer een adres uit de zoekresultaten
   */
  const selectAddress = (address: AddressResult) => {
    if (address.coordinates) {
      setGeocodeResult({
        success: true,
        coordinates: address.coordinates,
        address: address
      });
      setManualCoordinates(address.coordinates);
      setSearchQuery(address.weergavenaam);
      setSearchResults([]);
    }
  };

  /**
   * Handle klik op kaart
   */
  const handleMapClick = (lat: number, lng: number) => {
    setManualCoordinates([lat, lng]);
    setGeocodeResult({
      success: true,
      coordinates: [lat, lng]
    });
  };

  /**
   * Sla coördinaten op
   */
  const saveCoordinates = async () => {
    if (!selectedKazerne || !manualCoordinates) return;

    setIsSaving(true);
    try {
      await onUpdateCoordinates(selectedKazerne.id, manualCoordinates[0], manualCoordinates[1]);
      // Reset na opslaan
      setSelectedKazerne(null);
      setGeocodeResult(null);
      setManualCoordinates(null);
      setSearchQuery('');
    } catch (error) {
      console.error('Fout bij opslaan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Automatisch geocode alle kazernes zonder coördinaten
   */
  const autoGeocodeAll = useCallback(async () => {
    const kazernesZonderCoordinaten = kazernes.filter(
      (k) => !k.latitude || !k.longitude || 
             isNaN(parseFloat(k.latitude)) || 
             isNaN(parseFloat(k.longitude))
    );

    if (kazernesZonderCoordinaten.length === 0) {
      alert('Alle kazernes hebben al coördinaten!');
      return;
    }

    setIsAutoGeocoding(true);
    setAutoGeocodeProgress({ current: 0, total: kazernesZonderCoordinaten.length });
    setAutoGeocodeResults([]);

    const results: Array<{ kazerne: Kazerne; success: boolean; error?: string }> = [];

    for (let i = 0; i < kazernesZonderCoordinaten.length; i++) {
      const kazerne = kazernesZonderCoordinaten[i];
      setAutoGeocodeProgress({ current: i + 1, total: kazernesZonderCoordinaten.length });

      try {
        const addressString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
        const result = await pdokClient.searchAddresses({
          query: addressString,
          limit: 1,
          type: 'adres'
        });

        if (result.success && result.data && result.data.length > 0) {
          const address = result.data[0];
          if (address.coordinates) {
            // Sla automatisch op
            await onUpdateCoordinates(
              kazerne.id,
              address.coordinates[0],
              address.coordinates[1]
            );
            results.push({ kazerne, success: true });
          } else {
            results.push({ 
              kazerne, 
              success: false, 
              error: 'Geen coördinaten gevonden in PDOK resultaat' 
            });
          }
        } else {
          results.push({ 
            kazerne, 
            success: false, 
            error: result.error || 'Geen resultaten gevonden in PDOK' 
          });
        }
      } catch (error) {
        results.push({ 
          kazerne, 
          success: false, 
          error: error instanceof Error ? error.message : 'Onbekende fout' 
        });
      }

      // Kleine pauze tussen requests om PDOK API niet te overbelasten
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setAutoGeocodeResults(results);
    setIsAutoGeocoding(false);
  }, [kazernes, onUpdateCoordinates]);

  // Automatisch geocode wanneer dialog wordt geopend
  useEffect(() => {
    if (dialogOpen && !hasAutoGeocoded) {
      const kazernesZonderCoordinaten = kazernes.filter(
        (k) => !k.latitude || !k.longitude || 
               isNaN(parseFloat(k.latitude)) || 
               isNaN(parseFloat(k.longitude))
      );

      if (kazernesZonderCoordinaten.length > 0) {
        // Start automatisch geocoding na korte delay
        const timer = setTimeout(() => {
          autoGeocodeAll();
          setHasAutoGeocoded(true);
        }, 500);

        return () => clearTimeout(timer);
      } else {
        setHasAutoGeocoded(true);
      }
    }
    
    // Reset wanneer dialog wordt gesloten
    if (!dialogOpen) {
      setHasAutoGeocoded(false);
      setAutoGeocodeResults([]);
    }
  }, [dialogOpen, kazernes, autoGeocodeAll, hasAutoGeocoded]);

  /**
   * Selecteer kazerne en geocode automatisch
   */
  const selectKazerne = (kazerne: Kazerne) => {
    setSelectedKazerne(kazerne);
    setSearchQuery(`${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`);
    
    // Als er al coördinaten zijn, toon die
    if (kazerne.latitude && kazerne.longitude) {
      const lat = parseFloat(kazerne.latitude);
      const lng = parseFloat(kazerne.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setManualCoordinates([lat, lng]);
      }
    }
    
    // Auto-geocode
    geocodeKazerne(kazerne);
  };

  const currentCenter = manualCoordinates || (geocodeResult?.coordinates ? geocodeResult.coordinates : [52.1, 5.3]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MapPin className="w-4 h-4" />
          Kazerne Locaties Aanpassen
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Kazerne Locaties Geocoderen</DialogTitle>
          <DialogDescription>
            Automatisch geocode alle kazernes zonder coördinaten of selecteer handmatig
          </DialogDescription>
        </DialogHeader>

        {/* Auto-geocode knop */}
        <div className="mb-4">
          <Button
            onClick={autoGeocodeAll}
            disabled={isAutoGeocoding}
            className="w-full"
            variant="default"
          >
            {isAutoGeocoding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Automatisch geocoderen... ({autoGeocodeProgress.current}/{autoGeocodeProgress.total})
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Automatisch Geocode Alle Kazernes Zonder Coördinaten
              </>
            )}
          </Button>
          
          {autoGeocodeResults.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="font-semibold mb-2">Resultaten:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {autoGeocodeResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-sm ${
                      result.success
                        ? 'bg-green-50 text-green-900 border border-green-200'
                        : 'bg-red-50 text-red-900 border border-red-200'
                    }`}
                  >
                    <div className="font-medium">{result.kazerne.naam}</div>
                    {result.success ? (
                      <div className="text-xs text-green-700">✅ Coördinaten opgeslagen</div>
                    ) : (
                      <div className="text-xs text-red-700">❌ {result.error}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {autoGeocodeResults.filter(r => r.success).length} van {autoGeocodeResults.length} succesvol
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Linker kolom: Kazerne lijst en zoeken */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kazernes</CardTitle>
                <CardDescription>
                  {kazernes.length} kazernes beschikbaar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {kazernes.map((kazerne) => {
                    const hasCoordinates = kazerne.latitude && kazerne.longitude;
                    return (
                      <div
                        key={kazerne.id}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          selectedKazerne?.id === kazerne.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => selectKazerne(kazerne)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold">{kazerne.naam}</div>
                            <div className="text-sm text-muted-foreground">
                              {kazerne.adres}, {kazerne.postcode} {kazerne.plaats}
                            </div>
                          </div>
                          {hasCoordinates ? (
                            <Badge variant="default" className="ml-2">
                              <Check className="w-3 h-3 mr-1" />
                              Locatie
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2">
                              <X className="w-3 h-3 mr-1" />
                              Geen
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedKazerne && (
              <Card>
                <CardHeader>
                  <CardTitle>Geselecteerde Kazerne</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-semibold">{selectedKazerne.naam}</Label>
                    <div className="text-sm text-muted-foreground">
                      {selectedKazerne.adres}, {selectedKazerne.postcode} {selectedKazerne.plaats}
                    </div>
                  </div>

                  {/* Adres zoeken */}
                  <div className="space-y-2">
                    <Label>Zoek adres (PDOK)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchAddresses(e.target.value);
                        }}
                        placeholder="Zoek adres..."
                      />
                      <Button
                        onClick={() => searchAddresses(searchQuery)}
                        disabled={isSearching}
                        variant="outline"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Zoekresultaten */}
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg max-h-48 overflow-y-auto">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            className="p-2 border-b last:border-b-0 cursor-pointer hover:bg-muted"
                            onClick={() => selectAddress(result)}
                          >
                            <div className="font-medium text-sm">{result.weergavenaam}</div>
                            <div className="text-xs text-muted-foreground">
                              Score: {result.score}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Geocode resultaat */}
                  {isGeocoding && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Geocoding...
                    </div>
                  )}

                  {geocodeResult && (
                    <div className="space-y-2">
                      {geocodeResult.success ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-900 font-semibold">
                            <Check className="w-4 h-4" />
                            Locatie gevonden
                          </div>
                          {geocodeResult.address && (
                            <div className="text-sm text-green-700 mt-1">
                              {geocodeResult.address.weergavenaam}
                            </div>
                          )}
                          {manualCoordinates && (
                            <div className="text-xs text-green-600 mt-1">
                              Coördinaten: {manualCoordinates[0].toFixed(6)}, {manualCoordinates[1].toFixed(6)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-red-900 font-semibold">Fout</div>
                          <div className="text-sm text-red-700 mt-1">
                            {geocodeResult.error}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Handmatige coördinaten */}
                  {manualCoordinates && (
                    <div className="space-y-2">
                      <Label>Coördinaten</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Latitude</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            value={manualCoordinates[0].toFixed(6)}
                            onChange={(e) => {
                              const lat = parseFloat(e.target.value);
                              if (!isNaN(lat)) {
                                setManualCoordinates([lat, manualCoordinates[1]]);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Longitude</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            value={manualCoordinates[1].toFixed(6)}
                            onChange={(e) => {
                              const lng = parseFloat(e.target.value);
                              if (!isNaN(lng)) {
                                setManualCoordinates([manualCoordinates[0], lng]);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Opslaan knop */}
                  {manualCoordinates && (
                    <Button
                      onClick={saveCoordinates}
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Opslaan...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Coördinaten Opslaan
                        </>
                      )}
                    </Button>
                  )}

                  <div className="text-xs text-muted-foreground">
                    💡 Tip: Klik op de kaart om de locatie handmatig aan te passen
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Rechter kolom: Kaart */}
          <div className="h-[500px] border rounded-lg overflow-hidden">
            <MapContainer
              center={currentCenter as [number, number]}
              zoom={selectedKazerne ? 15 : 8}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler onMapClick={handleMapClick} />

              {/* Huidige marker (als er coördinaten zijn) */}
              {manualCoordinates && (
                <Marker position={manualCoordinates}>
                  <Popup>
                    <div className="p-2">
                      <div className="font-semibold">
                        {selectedKazerne?.naam || 'Nieuwe locatie'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {manualCoordinates[0].toFixed(6)}, {manualCoordinates[1].toFixed(6)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* PDOK resultaat marker (als anders dan handmatige) */}
              {geocodeResult?.coordinates && 
               geocodeResult.coordinates[0] !== manualCoordinates?.[0] && 
               geocodeResult.coordinates[1] !== manualCoordinates?.[1] && (
                <Marker 
                  position={geocodeResult.coordinates}
                  icon={L.icon({
                    ...DefaultIcon.options,
                    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                      <svg width="25" height="41" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.5 12.5 28.5 12.5 28.5s12.5-20 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="#10b981" stroke="#fff" stroke-width="2"/>
                        <circle cx="12.5" cy="12.5" r="6" fill="#fff"/>
                      </svg>
                    `)
                  })}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="font-semibold text-green-600">PDOK Resultaat</div>
                      {geocodeResult.address && (
                        <div className="text-sm">{geocodeResult.address.weergavenaam}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

