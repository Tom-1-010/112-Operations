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
  const [formData, setFormData] = useState<Partial<Basisteam>>({});
  const [newGemeente, setNewGemeente] = useState('');
  
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

  // Mutations for basisteam operations
  const createBasisteamMutation = useMutation({
    mutationFn: async (data: Omit<Basisteam, 'createdAt' | 'updatedAt'>) => {
      const response = await fetch('/api/basisteams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create basisteam');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/basisteams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/police-units-with-basisteam'] });
      toast({ title: 'Basisteam aangemaakt', description: 'Het nieuwe basisteam is succesvol aangemaakt.' });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Er is een fout opgetreden bij het aanmaken van het basisteam.', variant: 'destructive' });
    },
  });

  const updateBasisteamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Basisteam> }) => {
      const response = await fetch(`/api/basisteams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update basisteam');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/basisteams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/police-units-with-basisteam'] });
      toast({ title: 'Basisteam bijgewerkt', description: 'Het basisteam is succesvol bijgewerkt.' });
      setIsDialogOpen(false);
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Er is een fout opgetreden bij het bijwerken van het basisteam.', variant: 'destructive' });
    },
  });

  const deleteBasisteamMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/basisteams/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete basisteam');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/basisteams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/police-units-with-basisteam'] });
      toast({ title: 'Basisteam verwijderd', description: 'Het basisteam is succesvol verwijderd.' });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Er is een fout opgetreden bij het verwijderen van het basisteam.', variant: 'destructive' });
    },
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
    setFormData(basisteam);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleNewBasisteam = () => {
    setSelectedBasisteam(null);
    setFormData({
      id: '',
      naam: '',
      adres: '',
      polygon: [],
      gemeentes: [],
      actief: true,
      instellingen: {
        kan_inzetten_buiten_gebied: false,
        max_aantal_eenheden: 20,
        zichtbaar_op_kaart: true,
      },
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.naam || !formData.id) {
      toast({ title: 'Fout', description: 'Naam en ID zijn verplicht.', variant: 'destructive' });
      return;
    }

    if (selectedBasisteam) {
      updateBasisteamMutation.mutate({ id: selectedBasisteam.id, data: formData });
    } else {
      createBasisteamMutation.mutate(formData as Omit<Basisteam, 'createdAt' | 'updatedAt'>);
    }
  };

  const handleDelete = () => {
    if (selectedBasisteam && window.confirm('Weet je zeker dat je dit basisteam wilt verwijderen?')) {
      deleteBasisteamMutation.mutate(selectedBasisteam.id);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (selectedBasisteam) {
      setFormData(selectedBasisteam);
    }
  };

  const addGemeente = () => {
    if (newGemeente.trim() && !formData.gemeentes?.includes(newGemeente.trim())) {
      setFormData(prev => ({
        ...prev,
        gemeentes: [...(prev.gemeentes || []), newGemeente.trim()]
      }));
      setNewGemeente('');
    }
  };

  const removeGemeente = (gemeente: string) => {
    setFormData(prev => ({
      ...prev,
      gemeentes: prev.gemeentes?.filter(g => g !== gemeente) || []
    }));
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
          
          <div className="space-y-6">
            {isEditing ? (
              // Edit Form
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id">Basisteam ID</Label>
                    <Input
                      id="id"
                      value={formData.id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="Bijv. A1, B2, etc."
                      disabled={!!selectedBasisteam}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="actief"
                      checked={formData.actief || false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actief: checked }))}
                    />
                    <Label htmlFor="actief">Actief</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="naam">Naam</Label>
                  <Input
                    id="naam"
                    value={formData.naam || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, naam: e.target.value }))}
                    placeholder="Bijv. Basisteam Waterweg (A1)"
                  />
                </div>

                <div>
                  <Label htmlFor="adres">Adres</Label>
                  <Input
                    id="adres"
                    value={formData.adres || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
                    placeholder="Hoofdadres van het basisteam"
                  />
                </div>

                <div>
                  <Label>Gemeentes</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newGemeente}
                        onChange={(e) => setNewGemeente(e.target.value)}
                        placeholder="Gemeente toevoegen"
                        onKeyPress={(e) => e.key === 'Enter' && addGemeente()}
                      />
                      <Button type="button" onClick={addGemeente} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.gemeentes?.map((gemeente) => (
                        <Badge key={gemeente} variant="outline" className="gap-1">
                          {gemeente}
                          <button onClick={() => removeGemeente(gemeente)} className="ml-1">
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Instellingen</Label>
                  <div className="space-y-3 pl-4 border-l-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="kan_inzetten_buiten_gebied"
                        checked={formData.instellingen?.kan_inzetten_buiten_gebied || false}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({
                            ...prev,
                            instellingen: { ...prev.instellingen!, kan_inzetten_buiten_gebied: checked }
                          }))
                        }
                      />
                      <Label htmlFor="kan_inzetten_buiten_gebied">Kan inzetten buiten gebied</Label>
                    </div>

                    <div>
                      <Label htmlFor="max_aantal_eenheden">Maximaal aantal eenheden</Label>
                      <Input
                        id="max_aantal_eenheden"
                        type="number"
                        value={formData.instellingen?.max_aantal_eenheden || 20}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            instellingen: { ...prev.instellingen!, max_aantal_eenheden: parseInt(e.target.value) }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="zichtbaar_op_kaart"
                        checked={formData.instellingen?.zichtbaar_op_kaart || false}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({
                            ...prev,
                            instellingen: { ...prev.instellingen!, zichtbaar_op_kaart: checked }
                          }))
                        }
                      />
                      <Label htmlFor="zichtbaar_op_kaart">Zichtbaar op kaart</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Annuleren
                  </Button>
                  {selectedBasisteam && (
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Verwijderen
                    </Button>
                  )}
                  <Button onClick={handleSave}>
                    Opslaan
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              selectedBasisteam && (
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
                    <Button onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Bewerken
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}