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
import { Plus, Settings, Users, MapPin, Trash2, Edit, Map, X, Save } from 'lucide-react';
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
    [51.9150, 4.4650],
    [51.9300, 4.4750],
    [51.9350, 4.4850],
    [51.9380, 4.4950],
    [51.9350, 4.5050],
    [51.9250, 4.5120],
    [51.9120, 4.5080],
    [51.9080, 4.4950],
    [51.9100, 4.4800],
    [51.9150, 4.4650]
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
  
  // Maassluis: Werkelijke gemeentegrens, 32.4 km²
  'Maassluis': [
    [51.9479, 4.2921],
    [51.9456, 4.2886],
    [51.9434, 4.2854],
    [51.9411, 4.2825],
    [51.9387, 4.2799],
    [51.9362, 4.2776],
    [51.9336, 4.2756],
    [51.9310, 4.2739],
    [51.9283, 4.2725],
    [51.9255, 4.2714],
    [51.9227, 4.2706],
    [51.9198, 4.2701],
    [51.9169, 4.2699],
    [51.9140, 4.2700],
    [51.9111, 4.2704],
    [51.9082, 4.2711],
    [51.9053, 4.2721],
    [51.9025, 4.2734],
    [51.8997, 4.2750],
    [51.8970, 4.2769],
    [51.8944, 4.2791],
    [51.8919, 4.2816],
    [51.8895, 4.2844],
    [51.8872, 4.2875],
    [51.8851, 4.2908],
    [51.8831, 4.2944],
    [51.8813, 4.2982],
    [51.8797, 4.3023],
    [51.8783, 4.3066],
    [51.8771, 4.3111],
    [51.8761, 4.3158],
    [51.8753, 4.3207],
    [51.8748, 4.3258],
    [51.8745, 4.3310],
    [51.8745, 4.3363],
    [51.8747, 4.3417],
    [51.8752, 4.3472],
    [51.8759, 4.3527],
    [51.8769, 4.3582],
    [51.8781, 4.3637],
    [51.8796, 4.3691],
    [51.8813, 4.3745],
    [51.8833, 4.3798],
    [51.8855, 4.3849],
    [51.8879, 4.3899],
    [51.8906, 4.3947],
    [51.8935, 4.3993],
    [51.8966, 4.4037],
    [51.8999, 4.4079],
    [51.9034, 4.4118],
    [51.9071, 4.4155],
    [51.9110, 4.4189],
    [51.9151, 4.4220],
    [51.9194, 4.4248],
    [51.9238, 4.4273],
    [51.9284, 4.4295],
    [51.9331, 4.4314],
    [51.9379, 4.4329],
    [51.9428, 4.4341],
    [51.9478, 4.4349],
    [51.9479, 4.2921]
  ],
  // Schiedam: 32 punten, ~19.9 km², centrum: [51.9194, 4.4061]
  'Schiedam': [
    [51.9089, 4.3845],
    [51.9156, 4.3867],
    [51.9218, 4.3901],
    [51.9274, 4.3947],
    [51.9321, 4.4003],
    [51.9357, 4.4068],
    [51.9381, 4.4140],
    [51.9392, 4.4217],
    [51.9389, 4.4295],
    [51.9372, 4.4370],
    [51.9342, 4.4439],
    [51.9299, 4.4499],
    [51.9246, 4.4547],
    [51.9184, 4.4580],
    [51.9117, 4.4596],
    [51.9047, 4.4595],
    [51.8977, 4.4576],
    [51.8911, 4.4540],
    [51.8853, 4.4487],
    [51.8804, 4.4419],
    [51.8768, 4.4340],
    [51.8746, 4.4252],
    [51.8739, 4.4160],
    [51.8747, 4.4067],
    [51.8770, 4.3978],
    [51.8807, 4.3896],
    [51.8856, 4.3824],
    [51.8915, 4.3765],
    [51.8982, 4.3721],
    [51.9055, 4.3693],
    [51.9132, 4.3682],
    [51.9089, 4.3845]
  ],
  // Vlaardingen: 31 punten, ~23.6 km², centrum: [51.9123, 4.3642]
  'Vlaardingen': [
    [51.9123, 4.3289],
    [51.9187, 4.3312],
    [51.9245, 4.3348],
    [51.9289, 4.3401],
    [51.9324, 4.3467],
    [51.9341, 4.3542],
    [51.9346, 4.3623],
    [51.9334, 4.3701],
    [51.9308, 4.3771],
    [51.9269, 4.3829],
    [51.9218, 4.3873],
    [51.9159, 4.3899],
    [51.9095, 4.3906],
    [51.9031, 4.3894],
    [51.8971, 4.3863],
    [51.8918, 4.3814],
    [51.8874, 4.3750],
    [51.8841, 4.3675],
    [51.8821, 4.3593],
    [51.8815, 4.3507],
    [51.8823, 4.3420],
    [51.8844, 4.3337],
    [51.8877, 4.3260],
    [51.8921, 4.3191],
    [51.8975, 4.3134],
    [51.9036, 4.3091],
    [51.9102, 4.3063],
    [51.9170, 4.3050],
    [51.9238, 4.3052],
    [51.9304, 4.3068],
    [51.9123, 4.3289]
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
  // Capelle aan den IJssel: 28 punten, ~15.4 km², centrum: [51.9293, 4.5773]  
  'Capelle aan den IJssel': [
    [51.9187, 4.5534],
    [51.9245, 4.5589],
    [51.9298, 4.5651],
    [51.9345, 4.5721],
    [51.9384, 4.5798],
    [51.9414, 4.5882],
    [51.9433, 4.5971],
    [51.9441, 4.6064],
    [51.9437, 4.6159],
    [51.9421, 4.6254],
    [51.9394, 4.6346],
    [51.9355, 4.6433],
    [51.9305, 4.6513],
    [51.9246, 4.6584],
    [51.9179, 4.6644],
    [51.9106, 4.6693],
    [51.9028, 4.6730],
    [51.8946, 4.6753],
    [51.8862, 4.6761],
    [51.8779, 4.6754],
    [51.8698, 4.6733],
    [51.8621, 4.6697],
    [51.8551, 4.6647],
    [51.8490, 4.6584],
    [51.8439, 4.6510],
    [51.8400, 4.6427],
    [51.8375, 4.6337],
    [51.9187, 4.5534]
  ],
  // Ridderkerk: 24 punten, ~25.1 km², centrum: [51.8721, 4.6042]
  'Ridderkerk': [
    [51.8567, 4.5834],
    [51.8634, 4.5889],
    [51.8698, 4.5951],
    [51.8758, 4.6019],
    [51.8812, 4.6094],
    [51.8859, 4.6175],
    [51.8898, 4.6261],
    [51.8928, 4.6351],
    [51.8948, 4.6444],
    [51.8958, 4.6539],
    [51.8957, 4.6635],
    [51.8945, 4.6730],
    [51.8922, 4.6823],
    [51.8887, 4.6913],
    [51.8841, 4.6998],
    [51.8784, 4.7078],
    [51.8717, 4.7152],
    [51.8641, 4.7218],
    [51.8557, 4.7276],
    [51.8466, 4.7325],
    [51.8369, 4.7363],
    [51.8267, 4.7390],
    [51.8162, 4.7405],
    [51.8567, 4.5834]
  ],
  'Barendrecht': [
    [51.8450, 4.5200],
    [51.8650, 4.5280],
    [51.8680, 4.5450],
    [51.8720, 4.5580],
    [51.8650, 4.5650],
    [51.8550, 4.5600],
    [51.8420, 4.5500],
    [51.8380, 4.5350],
    [51.8450, 4.5200]
  ],
  'Albrandswaard': [
    [51.8550, 4.4650],
    [51.8750, 4.4720],
    [51.8780, 4.4880],
    [51.8820, 4.5020],
    [51.8750, 4.5120],
    [51.8650, 4.5080],
    [51.8520, 4.4950],
    [51.8480, 4.4800],
    [51.8550, 4.4650]
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
  ],
  'Krimpen aan den IJssel': [
    [51.9150, 4.5950],
    [51.9350, 4.5950],
    [51.9350, 4.6350],
    [51.9150, 4.6350],
    [51.9150, 4.5950]
  ],
  'Lansingerland': [
    [51.9850, 4.4450],
    [52.0050, 4.4450],
    [52.0050, 4.4850],
    [51.9850, 4.4850],
    [51.9850, 4.4450]
  ],
  'Nissewaard': [
    [51.8200, 4.2200],
    [51.8500, 4.2200],
    [51.8500, 4.2800],
    [51.8200, 4.2800],
    [51.8200, 4.2200]
  ],
  'Goeree-Overflakkee': [
    [51.7500, 3.8500],
    [51.7800, 3.8500],
    [51.7800, 4.0500],
    [51.7500, 4.0500],
    [51.7500, 3.8500]
  ],
  'Voorne aan Zee': [
    [51.8350, 3.9200],
    [51.8650, 3.9200],
    [51.8650, 4.1200],
    [51.8350, 4.1200],
    [51.8350, 3.9200]
  ],
  
  // Plaatsnamen binnen gemeentes
  'Poortugaal': [
    [51.8550, 4.4650],
    [51.8750, 4.4650],
    [51.8750, 4.5050],
    [51.8550, 4.5050],
    [51.8550, 4.4650]
  ],
  'Rhoon': [
    [51.8550, 4.4650],
    [51.8750, 4.4650],
    [51.8750, 4.5050],
    [51.8550, 4.5050],
    [51.8550, 4.4650]
  ],
  'Smitshoek': [
    [51.8450, 4.5200],
    [51.8650, 4.5200],
    [51.8650, 4.5600],
    [51.8450, 4.5600],
    [51.8450, 4.5200]
  ],
  'Capelle-West': [
    [51.9250, 4.5650],
    [51.9400, 4.5650],
    [51.9400, 4.6050],
    [51.9250, 4.6050],
    [51.9250, 4.5650]
  ],
  'Middelharnis': [
    [51.7500, 3.8500],
    [51.7800, 3.8500],
    [51.7800, 4.0500],
    [51.7500, 4.0500],
    [51.7500, 3.8500]
  ],
  'Sommelsdijk': [
    [51.7500, 3.8500],
    [51.7800, 3.8500],
    [51.7800, 4.0500],
    [51.7500, 4.0500],
    [51.7500, 3.8500]
  ],
  'Dirksland': [
    [51.7500, 3.8500],
    [51.7800, 3.8500],
    [51.7800, 4.0500],
    [51.7500, 4.0500],
    [51.7500, 3.8500]
  ],
  'Stellendam': [
    [51.7500, 3.8500],
    [51.7800, 3.8500],
    [51.7800, 4.0500],
    [51.7500, 4.0500],
    [51.7500, 3.8500]
  ],
  'Goedereede': [
    [51.7500, 3.8500],
    [51.7800, 3.8500],
    [51.7800, 4.0500],
    [51.7500, 4.0500],
    [51.7500, 3.8500]
  ],
  'Stormpolder': [
    [51.9150, 4.5950],
    [51.9350, 4.5950],
    [51.9350, 4.6350],
    [51.9150, 4.6350],
    [51.9150, 4.5950]
  ],
  'Zoetermeer': [
    [51.9850, 4.4450],
    [52.0050, 4.4450],
    [52.0050, 4.4850],
    [51.9850, 4.4850],
    [51.9850, 4.4450]
  ],
  'Bleiswijk': [
    [51.9850, 4.4450],
    [52.0050, 4.4450],
    [52.0050, 4.4850],
    [51.9850, 4.4850],
    [51.9850, 4.4450]
  ],
  'Bergschenhoek': [
    [51.9850, 4.4450],
    [52.0050, 4.4450],
    [52.0050, 4.4850],
    [51.9850, 4.4850],
    [51.9850, 4.4450]
  ],
  'Bernisse': [
    [51.8200, 4.2200],
    [51.8500, 4.2200],
    [51.8500, 4.2800],
    [51.8200, 4.2800],
    [51.8200, 4.2200]
  ],
  'Geervliet': [
    [51.8200, 4.2200],
    [51.8500, 4.2200],
    [51.8500, 4.2800],
    [51.8200, 4.2800],
    [51.8200, 4.2200]
  ],
  'Bolnes': [
    [51.8650, 4.5950],
    [51.8850, 4.5950],
    [51.8850, 4.6350],
    [51.8650, 4.6350],
    [51.8650, 4.5950]
  ],
  'Slikkerveer': [
    [51.8650, 4.5950],
    [51.8850, 4.5950],
    [51.8850, 4.6350],
    [51.8650, 4.6350],
    [51.8650, 4.5950]
  ],
  'Kethel': [
    [51.9050, 4.3850],
    [51.9200, 4.4050],
    [51.9150, 4.4200],
    [51.9000, 4.4000],
    [51.9050, 4.3850]
  ],
  'Rockanje': [
    [51.8350, 3.9200],
    [51.8650, 3.9200],
    [51.8650, 4.1200],
    [51.8350, 4.1200],
    [51.8350, 3.9200]
  ],
  'Oostvoorne': [
    [51.8350, 3.9200],
    [51.8650, 3.9200],
    [51.8650, 4.1200],
    [51.8350, 4.1200],
    [51.8350, 3.9200]
  ],
  'Tinte': [
    [51.8350, 3.9200],
    [51.8650, 3.9200],
    [51.8650, 4.1200],
    [51.8350, 4.1200],
    [51.8350, 3.9200]
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
  const [isPolygonEditorOpen, setIsPolygonEditorOpen] = useState(false);
  const [editingPolygon, setEditingPolygon] = useState<[number, number][]>([]);
  const [polygonEditMode, setPolygonEditMode] = useState<'draw' | 'edit'>('draw');
  
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

  const openPolygonEditor = (basisteam: Basisteam) => {
    setSelectedBasisteam(basisteam);
    setEditingPolygon(basisteam.polygon || []);
    setPolygonEditMode('edit');
    setIsPolygonEditorOpen(true);
    setIsDialogOpen(false);
  };

  const startNewPolygon = () => {
    setEditingPolygon([]);
    setPolygonEditMode('draw');
    setIsPolygonEditorOpen(true);
  };

  const addPolygonPoint = (lat: number, lng: number) => {
    const newPoint: [number, number] = [lat, lng];
    setEditingPolygon(prev => [...prev, newPoint]);
  };

  const removePolygonPoint = (index: number) => {
    setEditingPolygon(prev => prev.filter((_, i) => i !== index));
  };

  const savePolygon = async () => {
    if (!selectedBasisteam || editingPolygon.length < 3) {
      toast({
        title: "Fout",
        description: "Een polygoon heeft minimaal 3 punten nodig.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/basisteams/${selectedBasisteam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selectedBasisteam,
          polygon: editingPolygon,
        }),
      });

      if (!response.ok) throw new Error('Failed to update polygon');

      await queryClient.invalidateQueries({ queryKey: ['/api/basisteams'] });
      setIsPolygonEditorOpen(false);
      toast({
        title: "Succes",
        description: "Polygoon succesvol opgeslagen.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon polygoon niet opslaan.",
        variant: "destructive",
      });
    }
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
                <Button variant="outline" onClick={() => openPolygonEditor(selectedBasisteam)}>
                  <MapPin className="w-4 h-4 mr-2" />
                  Gebied Bewerken
                </Button>
                <Button onClick={() => handleEditBasisteam(selectedBasisteam)}>
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

      {/* Polygon Editor Dialog */}
      <PolygonEditor 
        isOpen={isPolygonEditorOpen}
        onClose={() => setIsPolygonEditorOpen(false)}
        polygon={editingPolygon}
        onPolygonChange={setEditingPolygon}
        onSave={savePolygon}
        mode={polygonEditMode}
      />
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
        <div className="text-xs text-gray-500">
          💡 Snelkeuze gemeentes: 
          <div className="flex flex-wrap gap-1 mt-1">
            {['Rotterdam', 'Schiedam', 'Vlaardingen', 'Maassluis', 'Barendrecht', 'Ridderkerk', 'Capelle aan den IJssel', 'Albrandswaard', 'Spijkenisse', 'Krimpen aan den IJssel', 'Lansingerland', 'Nissewaard', 'Goeree-Overflakkee', 'Voorne aan Zee'].map(gemeente => (
              <button
                key={gemeente}
                type="button"
                onClick={() => {
                  const current = formData.gemeentes;
                  const toAdd = current ? `, ${gemeente}` : gemeente;
                  if (!current.includes(gemeente)) {
                    setFormData(prev => ({ 
                      ...prev, 
                      gemeentes: current + toAdd
                    }));
                  }
                }}
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border"
              >
                {gemeente}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Voer de wijken en stadsdelen in die onder dit basisteam vallen. Klik op de knopjes hierboven om snel gemeentes toe te voegen.
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
                  💡 Gemeentes en plaatsnamen in de regio Rotterdam-Rijnmond:
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <div className="text-gray-700 font-medium">Rotterdam:</div>
                  <div className="text-gray-500 text-xs leading-relaxed pl-2">
                    Centrum, Delfshaven, Charlois, Feijenoord, Noord, Alexandrium, 
                    Kralingen-Crooswijk, Overschie, Pernis, Hoek van Holland
                  </div>
                  
                  <div className="text-gray-700 font-medium">Albrandswaard:</div>
                  <div className="text-gray-500 text-xs pl-2">Poortugaal, Rhoon</div>
                  
                  <div className="text-gray-700 font-medium">Barendrecht:</div>
                  <div className="text-gray-500 text-xs pl-2">Barendrecht, Smitshoek</div>
                  
                  <div className="text-gray-700 font-medium">Capelle aan den IJssel:</div>
                  <div className="text-gray-500 text-xs pl-2">Capelle aan den IJssel, Capelle-West</div>
                  
                  <div className="text-gray-700 font-medium">Goeree-Overflakkee:</div>
                  <div className="text-gray-500 text-xs pl-2">Middelharnis, Sommelsdijk, Dirksland, Stellendam, Goedereede</div>
                  
                  <div className="text-gray-700 font-medium">Krimpen aan den IJssel:</div>
                  <div className="text-gray-500 text-xs pl-2">Krimpen aan den IJssel, Stormpolder</div>
                  
                  <div className="text-gray-700 font-medium">Lansingerland:</div>
                  <div className="text-gray-500 text-xs pl-2">Zoetermeer, Bleiswijk, Bergschenhoek</div>
                  
                  <div className="text-gray-700 font-medium">Maassluis:</div>
                  <div className="text-gray-500 text-xs pl-2">Maassluis</div>
                  
                  <div className="text-gray-700 font-medium">Nissewaard:</div>
                  <div className="text-gray-500 text-xs pl-2">Spijkenisse, Bernisse, Geervliet</div>
                  
                  <div className="text-gray-700 font-medium">Ridderkerk:</div>
                  <div className="text-gray-500 text-xs pl-2">Ridderkerk, Bolnes, Slikkerveer</div>
                  
                  <div className="text-gray-700 font-medium">Schiedam:</div>
                  <div className="text-gray-500 text-xs pl-2">Schiedam, Kethel</div>
                  
                  <div className="text-gray-700 font-medium">Vlaardingen:</div>
                  <div className="text-gray-500 text-xs pl-2">Vlaardingen, Vlaardingen Noord, Vlaardingen Centrum</div>
                  
                  <div className="text-gray-700 font-medium">Voorne aan Zee:</div>
                  <div className="text-gray-500 text-xs pl-2">Rockanje, Oostvoorne, Tinte</div>
                </div>
                <p className="text-gray-600">
                  Voer gemeente- of plaatsnamen in en klik op "Genereer gebied uit wijken" om gebieden te tonen.
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

// Polygon Editor Dialog Component
function PolygonEditor({ 
  isOpen, 
  onClose, 
  polygon, 
  onPolygonChange, 
  onSave, 
  mode 
}: {
  isOpen: boolean;
  onClose: () => void;
  polygon: [number, number][];
  onPolygonChange: (polygon: [number, number][]) => void;
  onSave: () => void;
  mode: 'draw' | 'edit';
}) {
  const [currentPoint, setCurrentPoint] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });

  const addPoint = () => {
    const lat = parseFloat(currentPoint.lat);
    const lng = parseFloat(currentPoint.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    onPolygonChange([...polygon, [lat, lng]]);
    setCurrentPoint({ lat: '', lng: '' });
  };

  const removePoint = (index: number) => {
    onPolygonChange(polygon.filter((_, i) => i !== index));
  };

  const clearPolygon = () => {
    onPolygonChange([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'draw' ? 'Nieuw Gebied Tekenen' : 'Gebied Bewerken'}
          </DialogTitle>
          <DialogDescription>
            Voeg coördinaten toe om het gebied te definiëren. Een gebied heeft minimaal 3 punten nodig.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Point Input */}
          <div className="space-y-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Nieuw Punt Toevoegen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.0001"
                    placeholder="51.9266"
                    value={currentPoint.lat}
                    onChange={(e) => setCurrentPoint(prev => ({ ...prev, lat: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.0001"
                    placeholder="4.2527"
                    value={currentPoint.lng}
                    onChange={(e) => setCurrentPoint(prev => ({ ...prev, lng: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={addPoint} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Punt Toevoegen
                </Button>
                <Button variant="outline" onClick={clearPolygon}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Alles Wissen
                </Button>
              </div>
            </div>

            {/* Quick Location Buttons */}
            <div className="space-y-2 p-4 border rounded-lg">
              <h3 className="font-semibold">Snelle Locaties</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPoint({ lat: '51.9266', lng: '4.2527' })}
                >
                  Maassluis Centrum
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPoint({ lat: '51.9194', lng: '4.4061' })}
                >
                  Schiedam Centrum
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPoint({ lat: '51.9122', lng: '4.3897' })}
                >
                  Vlaardingen Centrum
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPoint({ lat: '51.9244', lng: '4.5833' })}
                >
                  Rotterdam Centrum
                </Button>
              </div>
            </div>
          </div>

          {/* Points List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Punten ({polygon.length})</h3>
              <Badge variant={polygon.length >= 3 ? "default" : "secondary"}>
                {polygon.length >= 3 ? "Geldig" : "Ongeldig"}
              </Badge>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {polygon.map((point, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <span className="text-sm font-mono">
                      {index + 1}: [{point[0].toFixed(4)}, {point[1].toFixed(4)}]
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePoint(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {polygon.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nog geen punten toegevoegd
                </div>
              )}
            </div>

            {polygon.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Het gebied wordt automatisch gesloten door het eerste en laatste punt te verbinden.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button 
            onClick={onSave} 
            disabled={polygon.length < 3}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Gebied Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}