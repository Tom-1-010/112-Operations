import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, Users, MapPin, Trash2, Edit } from 'lucide-react';

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
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleBasisteamClick(basisteam)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{basisteam.naam}</CardTitle>
                    <CardDescription>{basisteam.id}</CardDescription>
                  </div>
                  {getStatusBadge(basisteam.actief)}
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
    </div>
  );
}