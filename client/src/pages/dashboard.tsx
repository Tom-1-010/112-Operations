
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, Settings, Edit, Trash2, Save, X, MapPin, Phone, Clock, AlertTriangle, Users, Car, Shield, FileText, Map, Navigation, Zap, Radio, MessageSquare, Search, Filter, MoreHorizontal } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

// Types
interface Unit {
  id: string;
  callSign: string;
  type: string;
  status: 'available' | 'busy' | 'unavailable';
  location?: string;
  crew: number;
  roles: string[];
  basisteam?: string;
}

interface Incident {
  id: string;
  number: string;
  type: string;
  priority: 'A1' | 'A2' | 'B' | 'C';
  location: string;
  description: string;
  time: string;
  status: 'new' | 'assigned' | 'enroute' | 'onscene' | 'completed';
  assignedUnits: string[];
}

interface Basisteam {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const Dashboard = () => {
  // State declarations
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('general');
  const [units, setUnits] = useState<Unit[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [basisteams, setBasisteams] = useState<Basisteam[]>([]);
  const [isNewBasisteamDialogOpen, setIsNewBasisteamDialogOpen] = useState(false);
  const [editingBasisteam, setEditingBasisteam] = useState<Basisteam | null>(null);
  const [newBasisteam, setNewBasisteam] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Load basisteams on component mount
  useEffect(() => {
    loadBasisteams();
  }, []);

  const loadBasisteams = async () => {
    try {
      const response = await fetch('/api/basisteams');
      if (response.ok) {
        const data = await response.json();
        setBasisteams(data);
      }
    } catch (error) {
      console.error('Error loading basisteams:', error);
    }
  };

  const handleCreateBasisteam = async () => {
    if (!newBasisteam.name.trim() || !newBasisteam.code.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/basisteams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newBasisteam,
          isActive: true
        }),
      });

      if (response.ok) {
        await loadBasisteams();
        setNewBasisteam({ name: '', code: '', description: '' });
        setIsNewBasisteamDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating basisteam:', error);
    }
  };

  const handleUpdateBasisteam = async (id: string, updates: Partial<Basisteam>) => {
    try {
      const response = await fetch(`/api/basisteams/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadBasisteams();
        setEditingBasisteam(null);
      }
    } catch (error) {
      console.error('Error updating basisteam:', error);
    }
  };

  const handleDeleteBasisteam = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit basisteam wilt verwijderen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/basisteams/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadBasisteams();
      }
    } catch (error) {
      console.error('Error deleting basisteam:', error);
    }
  };

  const BasisteamsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Basisteams Beheer</h3>
          <p className="text-sm text-muted-foreground">
            Beheer de basisteams in het systeem
          </p>
        </div>
        <Dialog open={isNewBasisteamDialogOpen} onOpenChange={setIsNewBasisteamDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Basisteam
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuw Basisteam Toevoegen</DialogTitle>
              <DialogDescription>
                Voeg een nieuw basisteam toe aan het systeem
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  value={newBasisteam.name}
                  onChange={(e) => setNewBasisteam({ ...newBasisteam, name: e.target.value })}
                  placeholder="Bijv. Basisteam Rotterdam-Centrum"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={newBasisteam.code}
                  onChange={(e) => setNewBasisteam({ ...newBasisteam, code: e.target.value })}
                  placeholder="Bijv. A1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Beschrijving (optioneel)</Label>
                <Textarea
                  id="description"
                  value={newBasisteam.description}
                  onChange={(e) => setNewBasisteam({ ...newBasisteam, description: e.target.value })}
                  placeholder="Beschrijving van het basisteam..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewBasisteamDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleCreateBasisteam}>
                Toevoegen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basisteams Overzicht</CardTitle>
          <CardDescription>
            {basisteams.length} basisteam{basisteams.length !== 1 ? 's' : ''} gevonden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Beschrijving</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aangemaakt</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {basisteams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{team.code}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {team.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={team.isActive ? "default" : "secondary"}>
                      {team.isActive ? 'Actief' : 'Inactief'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(team.createdAt).toLocaleDateString('nl-NL')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingBasisteam(team)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBasisteam(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {basisteams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Geen basisteams gevonden. Voeg het eerste basisteam toe.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingBasisteam} onOpenChange={() => setEditingBasisteam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Basisteam Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de gegevens van het basisteam
            </DialogDescription>
          </DialogHeader>
          {editingBasisteam && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Naam</Label>
                <Input
                  id="edit-name"
                  value={editingBasisteam.name}
                  onChange={(e) => setEditingBasisteam({ 
                    ...editingBasisteam, 
                    name: e.target.value 
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={editingBasisteam.code}
                  onChange={(e) => setEditingBasisteam({ 
                    ...editingBasisteam, 
                    code: e.target.value 
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Beschrijving</Label>
                <Textarea
                  id="edit-description"
                  value={editingBasisteam.description || ''}
                  onChange={(e) => setEditingBasisteam({ 
                    ...editingBasisteam, 
                    description: e.target.value 
                  })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editingBasisteam.isActive}
                  onCheckedChange={(checked) => setEditingBasisteam({ 
                    ...editingBasisteam, 
                    isActive: checked 
                  })}
                />
                <Label htmlFor="edit-active">Actief</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBasisteam(null)}>
              Annuleren
            </Button>
            <Button onClick={() => editingBasisteam && handleUpdateBasisteam(editingBasisteam.id, editingBasisteam)}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold">Politie Meldkamer Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="incidents">Incidenten</TabsTrigger>
            <TabsTrigger value="units">Eenheden</TabsTrigger>
            <TabsTrigger value="dispatch">Uitruk</TabsTrigger>
            <TabsTrigger value="map">Kaart</TabsTrigger>
            <TabsTrigger value="settings">Instellingen</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Actieve Incidenten</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">+2 sinds vorig uur</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Beschikbare Eenheden</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">van 32 totaal</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gemiddelde Responstijd</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8:42</div>
                  <p className="text-xs text-muted-foreground">-1:23 vs vorige week</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prioriteit A1</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">hoogste prioriteit</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              <div className="space-y-1">
                <Button
                  variant={settingsTab === 'general' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSettingsTab('general')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Algemeen
                </Button>
                <Button
                  variant={settingsTab === 'basisteams' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSettingsTab('basisteams')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Basisteams
                </Button>
              </div>
              
              <div className="space-y-6">
                {settingsTab === 'general' && (
                  <div>
                    <h3 className="text-lg font-medium">Algemene Instellingen</h3>
                    <p className="text-sm text-muted-foreground">
                      Configureer de algemene instellingen van het dashboard
                    </p>
                  </div>
                )}
                
                {settingsTab === 'basisteams' && <BasisteamsTab />}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <CardTitle>Actieve Incidenten</CardTitle>
                <CardDescription>Overzicht van alle lopende incidenten</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Incidenten overzicht wordt hier weergegeven...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units">
            <Card>
              <CardHeader>
                <CardTitle>Eenheden Status</CardTitle>
                <CardDescription>Status van alle politie-eenheden</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Eenheden overzicht wordt hier weergegeven...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispatch">
            <Card>
              <CardHeader>
                <CardTitle>Uitruk Beheer</CardTitle>
                <CardDescription>Beheer uitrukken en toewijzingen</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Uitruk interface wordt hier weergegeven...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle>Kaart Weergave</CardTitle>
                <CardDescription>Live kaart met eenheden en incidenten</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Kaart wordt hier weergegeven...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
