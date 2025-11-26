import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, MapPin, Phone, Mail, Users } from 'lucide-react';

interface Voertuig {
  roepnummer: string;
  roepnummer_interregionaal?: string;
  type: string | null;
  functie: string | null;
  bemanning: number | null;
  typenummer_lrnp: number | null;
  gms_omschrijving: string | null;
  criteria: string | null;
  opmerking: string | null;
  post?: string; // Postnaam voor filtering
}

interface KazerneWithVoertuigen {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: string | null;
  telefoonnummer: string | null;
  email: string | null;
  capaciteit: number;
  actief: boolean;
  latitude: string | null;
  longitude: string | null;
  regio: string | null;
  voertuigen: Voertuig[] | null;
}

/**
 * Parse BRW eenheden bestand (tab-gescheiden)
 */
function parseBRWEenheden(text: string): Voertuig[] {
  const lines = text.split(/\r?\n/);
  const result: Voertuig[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const cols = trimmed.split('\t');
    if (cols.length < 2) continue;
    
    const roepnummer_interregionaal = cols[0]?.trim();
    const roepnummer = cols[1]?.trim();
    const post = cols[cols.length - 1]?.trim(); // Laatste kolom is postnaam
    
    if (!roepnummer && !roepnummer_interregionaal) continue;
    if (!post) continue;
    
    const type = cols[2]?.trim() || null;
    const functie = cols[3]?.trim() || null;
    
    result.push({
      roepnummer: roepnummer || roepnummer_interregionaal,
      roepnummer_interregionaal: roepnummer_interregionaal || roepnummer,
      type: type || null,
      functie: functie || null,
      bemanning: null,
      typenummer_lrnp: null,
      gms_omschrijving: functie || null,
      criteria: null,
      opmerking: null,
      post: post,
    });
  }
  
  return result;
}

/**
 * Normaliseer plaatsnamen voor matching
 * Normaliseert varianten zoals "a/d" -> "aanden", "aan den" -> "aanden", etc.
 */
function normalizePlaatsnaam(naam: string): string {
  if (!naam) return '';
  
  let normalized = naam
    .toLowerCase()
    .trim();
  
  // Vervang veelvoorkomende afkortingen en varianten
  // "a/d" -> "aanden" (zodat het matcht met "aan den")
  normalized = normalized.replace(/\ba\/d\b/g, 'aanden');
  // "aan den" -> "aanden"
  normalized = normalized.replace(/\baan\s+den\b/g, 'aanden');
  // "aan de" -> "aande"
  normalized = normalized.replace(/\baan\s+de\b/g, 'aande');
  // "a/d" -> "aanden" (zonder woordgrenzen voor flexibiliteit)
  normalized = normalized.replace(/a\/d/gi, 'aanden');
  
  // Verwijder veelvoorkomende prefixen
  normalized = normalized.replace(/^kazerne\s*/i, '');
  normalized = normalized.replace(/^gezamenlijke\s*brandweer\s*-\s*/i, '');
  normalized = normalized.replace(/^gb\s*-\s*/i, '');
  
  // Verwijder alle speciale tekens en spaties
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  normalized = normalized.replace(/\s+/g, '');
  
  return normalized;
}

/**
 * Check of een voertuig matcht met een kazerne op basis van postnaam
 * Gebruikt verbeterde normalisatie om varianten zoals "a/d" en "aan den" te matchen
 */
function matchVoertuigMetKazerne(
  voertuig: Voertuig,
  kazerne: KazerneWithVoertuigen
): boolean {
  if (!voertuig.post) return false;
  
  const postGenormaliseerd = normalizePlaatsnaam(kazerne.plaats);
  const naamGenormaliseerd = normalizePlaatsnaam(kazerne.naam);
  const voertuigPostGenormaliseerd = normalizePlaatsnaam(voertuig.post);
  
  // Exacte match (meest betrouwbaar)
  if (voertuigPostGenormaliseerd === postGenormaliseerd || 
      voertuigPostGenormaliseerd === naamGenormaliseerd) {
    return true;
  }
  
  // Match op plaatsnaam of kazerne naam (substring matching)
  // Controleer of de genormaliseerde voertuig postnaam de kazerne plaats/naam bevat of andersom
  if (voertuigPostGenormaliseerd.length > 0 && postGenormaliseerd.length > 0) {
    if (voertuigPostGenormaliseerd.includes(postGenormaliseerd) ||
        postGenormaliseerd.includes(voertuigPostGenormaliseerd)) {
      return true;
    }
  }
  
  if (voertuigPostGenormaliseerd.length > 0 && naamGenormaliseerd.length > 0) {
    if (voertuigPostGenormaliseerd.includes(naamGenormaliseerd) ||
        naamGenormaliseerd.includes(voertuigPostGenormaliseerd)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Koppel alle voertuigen aan kazernes, waarbij elk voertuig maar 1 keer wordt toegewezen
 * Voertuigen die niet gematcht kunnen worden, komen in "Regionaal"
 */
function koppelAlleVoertuigenAanKazernes(
  voertuigen: Voertuig[],
  kazernes: KazerneWithVoertuigen[]
): KazerneWithVoertuigen[] {
  // Track welke voertuigen al zijn toegewezen
  const toegewezenVoertuigIds = new Set<string>();
  
  // Maak een map van kazerne ID naar voertuigen
  const kazerneVoertuigenMap = new Map<string, Voertuig[]>();
  
  // Initialiseer alle kazernes met lege arrays
  kazernes.forEach((kazerne) => {
    kazerneVoertuigenMap.set(kazerne.id, []);
  });
  
  // Loop door alle voertuigen en wijs ze toe aan de beste match
  voertuigen.forEach((voertuig) => {
    // Skip als dit voertuig al is toegewezen
    if (toegewezenVoertuigIds.has(voertuig.roepnummer)) {
      return;
    }
    
    // Zoek de beste match
    let besteMatch: KazerneWithVoertuigen | null = null;
    
    for (const kazerne of kazernes) {
      if (matchVoertuigMetKazerne(voertuig, kazerne)) {
        besteMatch = kazerne;
        break; // Neem de eerste match
      }
    }
    
    if (besteMatch) {
      // Voeg toe aan de beste match
      const voertuigen = kazerneVoertuigenMap.get(besteMatch.id) || [];
      voertuigen.push(voertuig);
      kazerneVoertuigenMap.set(besteMatch.id, voertuigen);
      toegewezenVoertuigIds.add(voertuig.roepnummer);
    }
  });
  
  // Voeg voertuigen toe aan kazernes
  const kazernesMetVoertuigen = kazernes.map((kazerne) => ({
    ...kazerne,
    voertuigen: kazerneVoertuigenMap.get(kazerne.id) || []
  }));
  
  // Verzamel onbekende voertuigen voor "Regionaal"
  const onbekendeVoertuigen = voertuigen.filter(
    (v) => !toegewezenVoertuigIds.has(v.roepnummer)
  );
  
  // Voeg "Regionaal" kazerne toe als er onbekende voertuigen zijn
  if (onbekendeVoertuigen.length > 0) {
    const regionaleKazerne: KazerneWithVoertuigen = {
      id: 'regionaal',
      naam: 'Regionaal',
      adres: '-',
      postcode: '-',
      plaats: 'Regionaal',
      type: null,
      telefoonnummer: null,
      email: null,
      capaciteit: 0,
      actief: true,
      latitude: null,
      longitude: null,
      regio: null,
      voertuigen: onbekendeVoertuigen
    };
    
    kazernesMetVoertuigen.push(regionaleKazerne);
  }
  
  return kazernesMetVoertuigen;
}

export default function KazernesPage() {
  const [selectedType, setSelectedType] = useState<string>('alle');
  const [brwEenheden, setBrwEenheden] = useState<Voertuig[]>([]);
  const [brwLaden, setBrwLaden] = useState<boolean>(true);
  
  // Fetch kazernes met hun voertuigen
  const { data: kazernes = [], isLoading } = useQuery<KazerneWithVoertuigen[]>({
    queryKey: ['/api/kazernes-with-voertuigen'],
  });

  // Laad BRW eenheden direct uit JSON bestand
  useEffect(() => {
    const loadBRWEenheden = async () => {
      try {
        setBrwLaden(true);
        const base = (import.meta as any)?.env?.BASE_URL || "/";
        const url = `${base}data/BRW%20eenheden.json`;
        console.log('[Kazernes] Laden BRW eenheden van:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        const parsed = parseBRWEenheden(text);
        console.log(`[Kazernes] ${parsed.length} BRW eenheden geladen`);
        setBrwEenheden(parsed);
      } catch (error) {
        console.error('[Kazernes] Fout bij laden BRW eenheden:', error);
        setBrwEenheden([]);
      } finally {
        setBrwLaden(false);
      }
    };
    
    loadBRWEenheden();
  }, []);

  // Combineer kazernes met voertuigen uit BRW eenheden
  const kazernesMetVoertuigen = useMemo(() => {
    if (brwLaden || brwEenheden.length === 0) {
      // Als BRW eenheden nog niet geladen zijn, gebruik API data
      return kazernes;
    }
    
    // Koppel alle BRW eenheden aan kazernes, waarbij elk voertuig maar 1 keer wordt toegewezen
    return koppelAlleVoertuigenAanKazernes(brwEenheden, kazernes);
  }, [kazernes, brwEenheden, brwLaden]);

  if (isLoading || brwLaden) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Kazernes laden...</div>
      </div>
    );
  }

  // Filter kazernes met echte adressen (exclusief "Regionaal")
  const fysiekeKazernes = kazernesMetVoertuigen.filter(k => k.adres && k.adres !== '-' && k.id !== 'regionaal');
  const specialeEenheden = kazernesMetVoertuigen.filter(k => (!k.adres || k.adres === '-') && k.id !== 'regionaal');
  const regionaleKazerne = kazernesMetVoertuigen.find(k => k.id === 'regionaal');

  // Filter op type
  const filteredKazernes = selectedType === 'alle' 
    ? fysiekeKazernes 
    : fysiekeKazernes.filter(k => k.type === selectedType);

  const getTypeBadge = (type: string | null) => {
    if (!type) return <Badge variant="secondary">Onbekend</Badge>;
    
    const colors: Record<string, string> = {
      'Brandweer': 'bg-red-500 text-white',
      'Politie': 'bg-blue-500 text-white',
      'Ambulance': 'bg-green-500 text-white',
      'Vrijwilligers': 'bg-orange-500 text-white',
      'Beroeps': 'bg-purple-500 text-white',
      'Vrijwillig': 'bg-orange-400 text-white',
      'Vrijwillig/Beroeps': 'bg-indigo-500 text-white',
    };
    
    return (
      <Badge className={colors[type] || 'bg-gray-500 text-white'}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kazernes & Voertuigen</h1>
          <p className="text-muted-foreground">
            Overzicht van alle kazernes met hun voertuigen uit BRW eenheden
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedType('alle')}
          className={`px-4 py-2 rounded-lg transition ${
            selectedType === 'alle'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          Alle ({fysiekeKazernes.length})
        </button>
        <button
          onClick={() => setSelectedType('Beroeps')}
          className={`px-4 py-2 rounded-lg transition ${
            selectedType === 'Beroeps'
              ? 'bg-purple-500 text-white'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          Beroeps ({fysiekeKazernes.filter(k => k.type === 'Beroeps').length})
        </button>
        <button
          onClick={() => setSelectedType('Vrijwilligers')}
          className={`px-4 py-2 rounded-lg transition ${
            selectedType === 'Vrijwilligers'
              ? 'bg-orange-500 text-white'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          Vrijwilligers ({fysiekeKazernes.filter(k => k.type === 'Vrijwilligers').length})
        </button>
      </div>

      {/* Kazernes Tabs */}
      <Tabs defaultValue={filteredKazernes[0]?.id || regionaleKazerne?.id} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-2 p-2">
          {filteredKazernes.map((kazerne) => (
            <TabsTrigger 
              key={kazerne.id} 
              value={kazerne.id}
              className="flex-shrink-0"
            >
              <Building className="w-4 h-4 mr-2" />
              {kazerne.naam}
              {kazerne.voertuigen && kazerne.voertuigen.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {kazerne.voertuigen.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
          {regionaleKazerne && (
            <TabsTrigger 
              key={regionaleKazerne.id} 
              value={regionaleKazerne.id}
              className="flex-shrink-0"
            >
              <Building className="w-4 h-4 mr-2" />
              {regionaleKazerne.naam}
              {regionaleKazerne.voertuigen && regionaleKazerne.voertuigen.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {regionaleKazerne.voertuigen.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {filteredKazernes.map((kazerne) => (
          <TabsContent key={kazerne.id} value={kazerne.id} className="space-y-4">
            {/* Kazerne Info Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{kazerne.naam}</CardTitle>
                    <CardDescription>{kazerne.plaats}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getTypeBadge(kazerne.type)}
                    <Badge variant={kazerne.actief ? "default" : "secondary"}>
                      {kazerne.actief ? "Actief" : "Inactief"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Adres</div>
                        <div className="text-sm text-muted-foreground">
                          {kazerne.adres}<br />
                          {kazerne.postcode} {kazerne.plaats}
                        </div>
                      </div>
                    </div>

                    {kazerne.telefoonnummer && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Telefoon</div>
                          <div className="text-sm text-muted-foreground">{kazerne.telefoonnummer}</div>
                        </div>
                      </div>
                    )}

                    {kazerne.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Email</div>
                          <div className="text-sm text-muted-foreground">{kazerne.email}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Capaciteit</div>
                        <div className="text-sm text-muted-foreground">{kazerne.capaciteit} personen</div>
                      </div>
                    </div>

                    {kazerne.latitude && kazerne.longitude && (
                      <div>
                        <div className="font-medium">GPS Coordinaten</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {parseFloat(kazerne.latitude).toFixed(6)}, {parseFloat(kazerne.longitude).toFixed(6)}
                        </div>
                      </div>
                    )}

                    {kazerne.regio && (
                      <div>
                        <div className="font-medium">Regio</div>
                        <div className="text-sm text-muted-foreground">{kazerne.regio}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voertuigen Card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Voertuigen ({kazerne.voertuigen?.length || 0})
                </CardTitle>
                <CardDescription>
                  Alle voertuigen gestationeerd bij deze kazerne
                </CardDescription>
              </CardHeader>
              <CardContent>
                {kazerne.voertuigen && kazerne.voertuigen.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Roepnummer</th>
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">Functie</th>
                          <th className="text-center py-3 px-4 font-medium">Bemanning</th>
                          <th className="text-left py-3 px-4 font-medium">GMS Omschrijving</th>
                          <th className="text-left py-3 px-4 font-medium">Opmerking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kazerne.voertuigen.map((voertuig) => (
                          <tr key={voertuig.roepnummer} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-mono font-medium">{voertuig.roepnummer}</div>
                              {voertuig.roepnummer_interregionaal && (
                                <div className="text-xs text-muted-foreground">
                                  {voertuig.roepnummer_interregionaal}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {voertuig.type ? (
                                <Badge variant="outline">{voertuig.type}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">{voertuig.functie || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              {voertuig.bemanning ? (
                                <Badge variant="secondary">{voertuig.bemanning}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {voertuig.gms_omschrijving || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {voertuig.opmerking || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Geen voertuigen gekoppeld aan deze kazerne.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
        {regionaleKazerne && (
          <TabsContent key={regionaleKazerne.id} value={regionaleKazerne.id} className="space-y-4">
            {/* Regionaal Info Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{regionaleKazerne.naam}</CardTitle>
                    <CardDescription>Voertuigen zonder bekende post</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getTypeBadge(regionaleKazerne.type)}
                    <Badge variant={regionaleKazerne.actief ? "default" : "secondary"}>
                      {regionaleKazerne.actief ? "Actief" : "Inactief"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Deze voertuigen konden niet automatisch worden gekoppeld aan een specifieke kazerne.
                </div>
              </CardContent>
            </Card>

            {/* Voertuigen Card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Voertuigen ({regionaleKazerne.voertuigen?.length || 0})
                </CardTitle>
                <CardDescription>
                  Alle voertuigen zonder bekende post
                </CardDescription>
              </CardHeader>
              <CardContent>
                {regionaleKazerne.voertuigen && regionaleKazerne.voertuigen.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Roepnummer</th>
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">Functie</th>
                          <th className="text-center py-3 px-4 font-medium">Bemanning</th>
                          <th className="text-left py-3 px-4 font-medium">GMS Omschrijving</th>
                          <th className="text-left py-3 px-4 font-medium">Opmerking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regionaleKazerne.voertuigen.map((voertuig) => (
                          <tr key={voertuig.roepnummer} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-mono font-medium">{voertuig.roepnummer}</div>
                              {voertuig.roepnummer_interregionaal && (
                                <div className="text-xs text-muted-foreground">
                                  {voertuig.roepnummer_interregionaal}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {voertuig.type ? (
                                <Badge variant="outline">{voertuig.type}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">{voertuig.functie || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              {voertuig.bemanning ? (
                                <Badge variant="secondary">{voertuig.bemanning}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {voertuig.gms_omschrijving || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {voertuig.opmerking || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Geen voertuigen gekoppeld aan deze kazerne.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Speciale Eenheden Section */}
      {specialeEenheden.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Speciale Eenheden</CardTitle>
            <CardDescription>
              Regionaal, Leiding, Logistiek en andere speciale eenheden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specialeEenheden.map((eenheid) => (
                <Card key={eenheid.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{eenheid.naam}</CardTitle>
                    <CardDescription>
                      {eenheid.voertuigen?.length || 0} voertuigen
                    </CardDescription>
                  </CardHeader>
                  {eenheid.voertuigen && eenheid.voertuigen.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {eenheid.voertuigen.slice(0, 5).map((v) => (
                          <div key={v.roepnummer} className="flex justify-between text-sm">
                            <span className="font-mono">{v.roepnummer}</span>
                            {v.type && (
                              <Badge variant="outline" className="text-xs">{v.type}</Badge>
                            )}
                          </div>
                        ))}
                        {eenheid.voertuigen.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-2">
                            +{eenheid.voertuigen.length - 5} meer...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistieken */}
      <Card>
        <CardHeader>
          <CardTitle>Statistieken</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{kazernesMetVoertuigen.length}</div>
              <div className="text-sm text-muted-foreground">Totaal Kazernes</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {kazernesMetVoertuigen.reduce((sum, k) => sum + (k.voertuigen?.length || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Totaal Voertuigen</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {fysiekeKazernes.filter(k => k.actief).length}
              </div>
              <div className="text-sm text-muted-foreground">Actieve Kazernes</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {kazernesMetVoertuigen.filter(k => k.voertuigen && k.voertuigen.length > 0).length}
              </div>
              <div className="text-sm text-muted-foreground">Met Voertuigen</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
