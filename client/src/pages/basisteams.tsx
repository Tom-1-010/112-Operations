import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, Users, MapPin, Trash2, Edit, Map } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Rotterdam wijken, steden en gebieden met hun geschatte coördinaten
const ROTTERDAM_AREAS: Record<string, [number, number][]> = {
  // Rotterdam wijken
  'Hoek van Holland': [
    [51.9770, 4.1200],
    [51.9820, 4.1400],
    [51.9800, 4.1500],
    [51.9750, 4.1300],
    [51.9770, 4.1200]
  ],
  'Centrum': [
    [51.9180, 4.4700],
    [51.9280, 4.4900],
    [51.9260, 4.5000],
    [51.9160, 4.4800],
    [51.9180, 4.4700]
  ],
  'Delfshaven': [
    [51.9100, 4.4400],
    [51.9200, 4.4600],
    [51.9180, 4.4700],
    [51.9080, 4.4500],
    [51.9100, 4.4400]
  ],
  'Charlois': [
    [51.8900, 4.4800],
    [51.9000, 4.5000],
    [51.8980, 4.5100],
    [51.8880, 4.4900],
    [51.8900, 4.4800]
  ],
  'Feijenoord': [
    [51.9050, 4.4850],
    [51.9150, 4.5050],
    [51.9130, 4.5150],
    [51.9030, 4.4950],
    [51.9050, 4.4850]
  ],
  'Noord': [
    [51.9400, 4.4700],
    [51.9500, 4.4900],
    [51.9480, 4.5000],
    [51.9380, 4.4800],
    [51.9400, 4.4700]
  ],
  'Alexandrium': [
    [51.9500, 4.5100],
    [51.9600, 4.5300],
    [51.9580, 4.5400],
    [51.9480, 4.5200],
    [51.9500, 4.5100]
  ],
  'Kralingen-Crooswijk': [
    [51.9300, 4.5200],
    [51.9400, 4.5400],
    [51.9380, 4.5500],
    [51.9280, 4.5300],
    [51.9300, 4.5200]
  ],
  'Overschie': [
    [51.9450, 4.4200],
    [51.9550, 4.4400],
    [51.9530, 4.4500],
    [51.9430, 4.4300],
    [51.9450, 4.4200]
  ],
  'Pernis': [
    [51.8950, 4.3800],
    [51.9050, 4.4000],
    [51.9030, 4.4100],
    [51.8930, 4.3900],
    [51.8950, 4.3800]
  ],
  
  // Omliggende steden
  'Maassluis': [
    [51.9100, 4.2400],
    [51.9350, 4.2400],
    [51.9350, 4.2750],
    [51.9100, 4.2750],
    [51.9100, 4.2400]
  ],
  'Schiedam': [
    [51.9050, 4.3850],
    [51.9200, 4.4050],
    [51.9150, 4.4200],
    [51.9000, 4.4000],
    [51.9050, 4.3850]
  ],
  'Vlaardingen': [
    [51.9000, 4.3300],
    [51.9250, 4.3300],
    [51.9250, 4.3650],
    [51.9000, 4.3650],
    [51.9000, 4.3300]
  ],
  'Vlaardingen Centrum': [
    [51.9100, 4.3400],
    [51.9180, 4.3580],
    [51.9130, 4.3650],
    [51.9050, 4.3470],
    [51.9100, 4.3400]
  ],
  'Vlaardingen Noord': [
    [51.9180, 4.3250],
    [51.9280, 4.3450],
    [51.9230, 4.3550],
    [51.9130, 4.3350],
    [51.9180, 4.3250]
  ],
  'Capelle aan den IJssel': [
    [51.9300, 4.5800],
    [51.9400, 4.6000],
    [51.9380, 4.6100],
    [51.9280, 4.5900],
    [51.9300, 4.5800]
  ],
  'Ridderkerk': [
    [51.8700, 4.6000],
    [51.8800, 4.6200],
    [51.8780, 4.6300],
    [51.8680, 4.6100],
    [51.8700, 4.6000]
  ],
  'Barendrecht': [
    [51.8500, 4.5300],
    [51.8600, 4.5500],
    [51.8580, 4.5600],
    [51.8480, 4.5400],
    [51.8500, 4.5300]
  ],
  'Albrandswaard': [
    [51.8600, 4.4800],
    [51.8700, 4.5000],
    [51.8680, 4.5100],
    [51.8580, 4.4900],
    [51.8600, 4.4800]
  ],
  'Spijkenisse': [
    [51.8400, 4.3200],
    [51.8500, 4.3400],
    [51.8480, 4.3500],
    [51.8380, 4.3300],
    [51.8400, 4.3200]
  ],
  'Rozenburg': [
    [51.9050, 4.2500],
    [51.9150, 4.2700],
    [51.9130, 4.2800],
    [51.9030, 4.2600],
    [51.9050, 4.2500]
  ],
  'Hellevoetsluis': [
    [51.8300, 4.1300],
    [51.8400, 4.1500],
    [51.8380, 4.1600],
    [51.8280, 4.1400],
    [51.8300, 4.1300]
  ]
};

interface Basisteam {
  id: string;
  naam: string;
  adres: string;
  polygon: [number, number][];
  gemeentes: string[];
  actief: boolean;
  instellingen: {
    kan_inzetten_buiten_gebied: boolean;
    max_aantal_eenheden: number;
    zichtbaar_op_kaart: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface UnitsWithBasisteam {
  unit: {
    id: number;
    roepnummer: string;
    aantal_mensen: number;
    rollen: string[];
    soort_auto: string;
    team: string;
    basisteam_id: string;
    status: string;
    locatie?: string;
    incident?: string;
  };
  basisteam: Basisteam | null;
}

export default function BasisteamsPage() {
  const [selectedBasisteam, setSelectedBasisteam] = useState<Basisteam | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBasisteam, setEditingBasisteam] = useState<Basisteam | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch basisteams
  const { data: basisteams = [], isLoading: basisteamsLoading } = useQuery<Basisteam[]>({
    queryKey: ['/api/basisteams'],
  });

  // Fetch units with basisteam info
  const { data: unitsWithBasisteam = [], isLoading: unitsLoading } = useQuery<UnitsWithBasisteam[]>({
    queryKey: ['/api/police-units-with-basisteam'],
  });

  // Group units by basisteam
  const unitsByBasisteam = unitsWithBasisteam.reduce((acc, item) => {
    const basisteamId = item.basisteam?.id || 'unassigned';
    if (!acc[basisteamId]) acc[basisteamId] = [];
    acc[basisteamId].push(item.unit);
    return acc;
  }, {} as Record<string, any[]>);

  const handleBasisteamClick = (basisteam: Basisteam) => {
    setSelectedBasisteam(basisteam);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleNewBasisteam = () => {
    setSelectedBasisteam(null);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleEditBasisteam = (basisteam: Basisteam) => {
    setEditingBasisteam(basisteam);
    setIsEditDialogOpen(true);
  };

  // Update basisteam mutation
  const updateBasisteamMutation = useMutation({
    mutationFn: async (data: { id: string; basisteam: Partial<Basisteam> }) => {
      const response = await fetch(`/api/basisteams/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.basisteam),
      });
      if (!response.ok) throw new Error('Failed to update basisteam');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/basisteams'] });
      toast({ title: 'Basisteam succesvol bijgewerkt' });
      setIsEditDialogOpen(false);
      setEditingBasisteam(null);
    },
    onError: () => {
      toast({ title: 'Fout bij bijwerken basisteam', variant: 'destructive' });
    },
  });

  const getStatusBadge = (actief: boolean) => {
    return (
      <Badge variant={actief ? "default" : "secondary"}>
        {actief ? "Actief" : "Inactief"}
      </Badge>
    );
  };

  if (basisteamsLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Basisteams laden...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Basisteams Beheer</h1>
          <p className="text-muted-foreground">
            Beheer politie basisteams en hun instellingen
          </p>
        </div>
        <Button onClick={handleNewBasisteam}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Basisteam
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {basisteams.map((basisteam) => {
          const unitCount = unitsByBasisteam[basisteam.id]?.length || 0;
          const activeUnits = unitsByBasisteam[basisteam.id]?.filter(
            unit => unit.status !== "5 - Afmelden"
          ).length || 0;

          return (
            <Card 
              key={basisteam.id} 
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div 
                    className="cursor-pointer flex-1"
                    onClick={() => handleBasisteamClick(basisteam)}
                  >
                    <CardTitle className="text-lg">{basisteam.naam}</CardTitle>
                    <CardDescription>{basisteam.id}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(basisteam.actief)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditBasisteam(basisteam);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    {basisteam.adres}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    {unitCount} eenheden ({activeUnits} actief)
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium">Gemeentes:</div>
                    <div className="flex flex-wrap gap-1">
                      {basisteam.gemeentes.map((gemeente) => (
                        <Badge key={gemeente} variant="outline" className="text-xs">
                          {gemeente}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span>Max eenheden:</span>
                    <span className="font-medium">
                      {basisteam.instellingen.max_aantal_eenheden}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unassigned units section */}
      {unitsByBasisteam.unassigned && unitsByBasisteam.unassigned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-orange-600">
              Niet-toegewezen Eenheden
            </CardTitle>
            <CardDescription>
              Deze eenheden zijn nog niet gekoppeld aan een basisteam
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {unitsByBasisteam.unassigned.map((unit) => (
                <Badge key={unit.id} variant="outline" className="justify-center">
                  {unit.roepnummer}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basisteam Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBasisteam ? selectedBasisteam.naam : 'Nieuw Basisteam'}
            </DialogTitle>
            <DialogDescription>
              {selectedBasisteam ? 'Basisteam details en instellingen' : 'Maak een nieuw basisteam aan'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBasisteam && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Basisteam ID</Label>
                  <div className="text-lg font-mono">{selectedBasisteam.id}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div>{getStatusBadge(selectedBasisteam.actief)}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Adres</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedBasisteam.adres}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Gemeentes</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedBasisteam.gemeentes.map((gemeente) => (
                    <Badge key={gemeente} variant="outline">
                      {gemeente}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Instellingen</Label>
                <div className="grid grid-cols-1 gap-4 pl-4 border-l-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Kan inzetten buiten gebied</span>
                    <Badge variant={selectedBasisteam.instellingen.kan_inzetten_buiten_gebied ? "default" : "secondary"}>
                      {selectedBasisteam.instellingen.kan_inzetten_buiten_gebied ? "Ja" : "Nee"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Maximaal aantal eenheden</span>
                    <span className="font-medium">
                      {selectedBasisteam.instellingen.max_aantal_eenheden}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Zichtbaar op kaart</span>
                    <Badge variant={selectedBasisteam.instellingen.zichtbaar_op_kaart ? "default" : "secondary"}>
                      {selectedBasisteam.instellingen.zichtbaar_op_kaart ? "Ja" : "Nee"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Toegewezen Eenheden</Label>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {unitsByBasisteam[selectedBasisteam.id] ? (
                    <div className="grid grid-cols-3 gap-2">
                      {unitsByBasisteam[selectedBasisteam.id].map((unit) => (
                        <Badge 
                          key={unit.id} 
                          variant={unit.status !== "5 - Afmelden" ? "default" : "secondary"}
                          className="justify-center text-xs"
                        >
                          {unit.roepnummer}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Geen eenheden toegewezen
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Sluiten
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Bewerken
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Basisteam Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Basisteam Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de gegevens van {editingBasisteam?.naam}
            </DialogDescription>
          </DialogHeader>
          
          {editingBasisteam && (
            <EditBasisteamForm 
              basisteam={editingBasisteam}
              onSave={(updatedData) => {
                updateBasisteamMutation.mutate({
                  id: editingBasisteam.id,
                  basisteam: updatedData
                });
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateBasisteamMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Basisteam Form Component
function EditBasisteamForm({ 
  basisteam, 
  onSave, 
  onCancel, 
  isLoading 
}: {
  basisteam: Basisteam;
  onSave: (data: Partial<Basisteam>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    naam: basisteam.naam,
    adres: basisteam.adres,
    gemeentes: basisteam.gemeentes.join(', '),
    polygon: basisteam.polygon || [],
    actief: basisteam.actief,
    instellingen: {
      kan_inzetten_buiten_gebied: basisteam.instellingen.kan_inzetten_buiten_gebied,
      max_aantal_eenheden: basisteam.instellingen.max_aantal_eenheden,
      zichtbaar_op_kaart: basisteam.instellingen.zichtbaar_op_kaart,
    }
  });

  // Functie om automatisch polygon te genereren op basis van wijknamen
  const generatePolygonFromWijken = () => {
    const wijken = formData.gemeentes.split(',').map(w => w.trim());
    const matchedAreas: number[][] = [];
    
    wijken.forEach(wijk => {
      if (ROTTERDAM_AREAS[wijk]) {
        matchedAreas.push(...ROTTERDAM_AREAS[wijk]);
      }
    });

    if (matchedAreas.length > 0) {
      setFormData(prev => ({ ...prev, polygon: matchedAreas as any }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      naam: formData.naam,
      adres: formData.adres,
      gemeentes: formData.gemeentes.split(',').map(g => g.trim()).filter(g => g),
      polygon: formData.polygon,
      actief: formData.actief,
      instellingen: formData.instellingen,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="naam">Naam</Label>
          <Input
            id="naam"
            value={formData.naam}
            onChange={(e) => setFormData(prev => ({ ...prev, naam: e.target.value }))}
            placeholder="Basisteam naam"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adres">Adres</Label>
          <Input
            id="adres"
            value={formData.adres}
            onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
            placeholder="Hoofdadres"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gemeentes">Wijken/Stadsdelen (gescheiden door komma's)</Label>
        <Textarea
          id="gemeentes"
          value={formData.gemeentes}
          onChange={(e) => setFormData(prev => ({ ...prev, gemeentes: e.target.value }))}
          placeholder="Hoek van Holland, Alexandrium, Centrum, Delfshaven, Charlois, Feijenoord"
          className="min-h-[100px]"
        />
        <p className="text-sm text-muted-foreground">
          Voer de wijken en stadsdelen in die onder dit basisteam vallen. Bijvoorbeeld voor Rotterdam: Centrum, Delfshaven, Charlois, Feijenoord, Kralingen-Crooswijk, Noord, Overschie, Pernis, Prins Alexander, Hillegersberg-Schiebroek.
        </p>
      </div>

      {/* Kaart Gebied Sectie */}
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Map className="w-4 h-4" />
          Gebied op Kaart
        </Label>
        <div className="border rounded-lg overflow-hidden">
          <div className="h-80 w-full">
            <MapContainer
              center={[51.9225, 4.35]} // Rotterdam regio centrum
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {formData.polygon && formData.polygon.length > 0 && (
                <Polygon
                  positions={formData.polygon}
                  color="blue"
                  weight={2}
                  fillColor="blue"
                  fillOpacity={0.2}
                />
              )}
            </MapContainer>
          </div>
          <div className="p-3 bg-gray-50 border-t">
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded border border-blue-600"></div>
                <span>Huidige gebied grenzen</span>
                {formData.polygon && formData.polygon.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.polygon.length} punten
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generatePolygonFromWijken}
                >
                  Genereer gebied uit wijken
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, polygon: [] }));
                  }}
                >
                  Wis gebied
                </Button>
              </div>
              <div className="text-xs space-y-2">
                <p>
                  💡 Klik op "Genereer gebied uit wijken" om automatisch gebieden te tonen voor:
                </p>
                <div className="space-y-1">
                  <div className="text-gray-700 font-medium">Rotterdam wijken:</div>
                  <div className="text-gray-500 text-xs leading-relaxed">
                    Centrum, Delfshaven, Charlois, Feijenoord, Noord, Alexandrium, 
                    Kralingen-Crooswijk, Overschie, Pernis, Hoek van Holland
                  </div>
                  <div className="text-gray-700 font-medium">Omliggende steden:</div>
                  <div className="text-gray-500 text-xs leading-relaxed">
                    Maassluis, Schiedam, Vlaardingen, Capelle aan den IJssel, 
                    Ridderkerk, Barendrecht, Albrandswaard, Spijkenisse, Rozenburg, Hellevoetsluis
                  </div>
                </div>
                <p className="text-gray-600">
                  Het systeem herkent deze namen automatisch en toont de bijbehorende gebieden op de kaart.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">Instellingen</Label>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="actief"
            checked={formData.actief}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actief: checked }))}
          />
          <Label htmlFor="actief">Basisteam actief</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="inzetten-buiten"
            checked={formData.instellingen.kan_inzetten_buiten_gebied}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ 
                ...prev, 
                instellingen: { ...prev.instellingen, kan_inzetten_buiten_gebied: checked }
              }))
            }
          />
          <Label htmlFor="inzetten-buiten">Kan inzetten buiten gebied</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="zichtbaar-kaart"
            checked={formData.instellingen.zichtbaar_op_kaart}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ 
                ...prev, 
                instellingen: { ...prev.instellingen, zichtbaar_op_kaart: checked }
              }))
            }
          />
          <Label htmlFor="zichtbaar-kaart">Zichtbaar op kaart</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-eenheden">Maximum aantal eenheden</Label>
          <Input
            id="max-eenheden"
            type="number"
            min="1"
            max="200"
            value={formData.instellingen.max_aantal_eenheden}
            onChange={(e) => 
              setFormData(prev => ({ 
                ...prev, 
                instellingen: { ...prev.instellingen, max_aantal_eenheden: parseInt(e.target.value) || 50 }
              }))
            }
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuleren
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </form>
  );
}