import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { basisteamRegistry } from '../lib/basisteam-registry';
import { Basisteam } from '../../../shared/basisteam-schema';

// Fix voor Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const InstellingenPage: React.FC = () => {
  const [basisteams, setBasisteams] = useState<Basisteam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Basisteam | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Basisteam>>({});

  useEffect(() => {
    setBasisteams(basisteamRegistry.getAllTeams());
  }, []);

  const handleSelectTeam = (team: Basisteam) => {
    setSelectedTeam(team);
    setEditForm(team);
    setIsEditing(false);
  };

  const handleSaveTeam = () => {
    if (selectedTeam && editForm) {
      const updated = { ...selectedTeam, ...editForm };
      basisteamRegistry.updateTeam(selectedTeam.id, updated);
      setBasisteams(basisteamRegistry.getAllTeams());
      setSelectedTeam(updated as Basisteam);
      setIsEditing(false);
    }
  };

  const handleAddTeam = () => {
    const newTeam: Basisteam = {
      id: `BT-${Date.now()}`,
      naam: 'Nieuw Basisteam',
      adres: '',
      polygon: [
        [51.9225, 4.4792],
        [51.9235, 4.4802],
        [51.9215, 4.4812],
        [51.9205, 4.4782],
        [51.9225, 4.4792]
      ],
      gemeentes: [],
      actief: true,
      instellingen: {
        kan_inzetten_buiten_gebied: false,
        max_aantal_eenheden: 20,
        zichtbaar_op_kaart: true
      },
      created_at: new Date().toISOString()
    };

    basisteamRegistry.addTeam(newTeam);
    setBasisteams(basisteamRegistry.getAllTeams());
    setSelectedTeam(newTeam);
    setEditForm(newTeam);
    setIsEditing(true);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (confirm('Weet je zeker dat je dit basisteam wilt verwijderen?')) {
      basisteamRegistry.deleteTeam(teamId);
      setBasisteams(basisteamRegistry.getAllTeams());
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
        setEditForm({});
      }
    }
  };

  const [pdokTestResult, setPdokTestResult] = useState<string>('');
  const [isTestingPdok, setIsTestingPdok] = useState(false);

  const testPdokConnection = async () => {
    setIsTestingPdok(true);
    try {
      console.log('🧪 Testing PDOK WMS API connection...');

      // Test capabilities
      const capabilitiesResponse = await fetch('/api/pdok/capabilities');
      if (!capabilitiesResponse.ok) {
        throw new Error(`Capabilities failed: ${capabilitiesResponse.status}`);
      }

      const capabilitiesData = await capabilitiesResponse.text();

      // Test GetMap request
      const mapResponse = await fetch('/api/pdok/bestuurlijke-gebieden?layers=bestuurlijkegebieden:gemeenten&bbox=50000,400000,150000,500000&width=256&height=256&crs=EPSG:28992');
      if (!mapResponse.ok) {
        throw new Error(`GetMap failed: ${mapResponse.status}`);
      }

      setPdokTestResult('✅ PDOK WMS API connectie succesvol! Capabilities geladen en kaartdata beschikbaar.');
      console.log('✅ PDOK WMS test successful');

    } catch (error) {
      console.error('❌ PDOK WMS test failed:', error);
      setPdokTestResult(`❌ PDOK WMS API test gefaald: ${error}`);
    } finally {
      setIsTestingPdok(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar met basisteam lijst */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">⚙️ Instellingen</h1>
          <h2 className="text-lg font-semibold text-gray-700 mt-4">Basisteams</h2>
          <button
            onClick={handleAddTeam}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + Nieuw Basisteam
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {basisteams.map((team) => (
            <div
              key={team.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedTeam?.id === team.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => handleSelectTeam(team)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{team.naam}</h3>
                  <p className="text-sm text-gray-600">{team.adres}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-2 py-1 rounded text-xs ${
                      team.actief ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {team.actief ? 'Actief' : 'Inactief'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {team.gemeentes.length} gemeentes
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTeam(team.id);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {selectedTeam ? (
          <>
            {/* Team details header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTeam.naam}</h2>
                  <p className="text-gray-600">{selectedTeam.id}</p>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveTeam}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Annuleren
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Bewerken
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 flex">
              {/* Form section */}
              <div className="w-96 bg-white border-r border-gray-200 p-4 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Naam</label>
                    <input
                      type="text"
                      value={editForm.naam || ''}
                      onChange={(e) => setEditForm({ ...editForm, naam: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Adres</label>
                    <input
                      type="text"
                      value={editForm.adres || ''}
                      onChange={(e) => setEditForm({ ...editForm, adres: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gemeentes</label>
                    <input
                      type="text"
                      value={editForm.gemeentes?.join(', ') || ''}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        gemeentes: e.target.value.split(',').map(s => s.trim()) 
                      })}
                      disabled={!isEditing}
                      placeholder="Rotterdam, Barendrecht"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.actief ?? true}
                        onChange={(e) => setEditForm({ ...editForm, actief: e.target.checked })}
                        disabled={!isEditing}
                        className="rounded border-gray-300 text-blue-600 mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Team actief</span>
                    </label>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Instellingen</h3>

                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.instellingen?.kan_inzetten_buiten_gebied ?? false}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            instellingen: { 
                              ...editForm.instellingen!, 
                              kan_inzetten_buiten_gebied: e.target.checked 
                            }
                          })}
                          disabled={!isEditing}
                          className="rounded border-gray-300 text-blue-600 mr-2"
                        />
                        <span className="text-sm text-gray-700">Kan inzetten buiten gebied</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.instellingen?.zichtbaar_op_kaart ?? true}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            instellingen: { 
                              ...editForm.instellingen!, 
                              zichtbaar_op_kaart: e.target.checked 
                            }
                          })}
                          disabled={!isEditing}
                          className="rounded border-gray-300 text-blue-600 mr-2"
                        />
                        <span className="text-sm text-gray-700">Zichtbaar op kaart</span>
                      </label>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Max aantal eenheden</label>
                        <input
                          type="number"
                          value={editForm.instellingen?.max_aantal_eenheden || 20}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            instellingen: { 
                              ...editForm.instellingen!, 
                              max_aantal_eenheden: parseInt(e.target.value) 
                            }
                          })}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map section */}
              <div className="flex-1">
                <MapContainer
                  center={[51.9225, 4.4792]}
                  zoom={11}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Toon alle basisteam polygonen */}
                  {basisteams
                    .filter(team => team.instellingen.zichtbaar_op_kaart)
                    .map((team) => {
                      // If team has multiple polygons per gemeente, show them separately
                      if (team.polygons && Object.keys(team.polygons).length > 0) {
                        return Object.entries(team.polygons).map(([gemeente, polygonCoords]) => (
                          polygonCoords && polygonCoords.length > 0 && (
                            <Polygon
                              key={`${team.id}-${gemeente}`}
                              positions={polygonCoords}
                              color={team.id === selectedTeam.id ? '#3b82f6' : '#6b7280'}
                              fillColor={team.id === selectedTeam.id ? '#dbeafe' : '#f3f4f6'}
                              fillOpacity={0.3}
                              weight={team.id === selectedTeam.id ? 3 : 2}
                            >
                              <Popup>
                                <div className="p-2">
                                  <h3 className="font-bold text-sm">{team.naam}</h3>
                                  <p className="text-xs text-gray-600">{gemeente}</p>
                                  <p className="text-xs">{team.adres}</p>
                                  <p className="text-xs">Max eenheden: {team.instellingen.max_aantal_eenheden}</p>
                                </div>
                              </Popup>
                            </Polygon>
                          )
                        ));
                      } else {
                        // Fallback to single polygon
                        return (
                          <Polygon
                            key={team.id}
                            positions={team.polygon}
                            color={team.id === selectedTeam.id ? '#3b82f6' : '#6b7280'}
                            fillColor={team.id === selectedTeam.id ? '#dbeafe' : '#f3f4f6'}
                            fillOpacity={0.3}
                            weight={team.id === selectedTeam.id ? 3 : 2}
                          >
                            <Popup>
                              <div className="p-2">
                                <h3 className="font-bold text-sm">{team.naam}</h3>
                                <p className="text-xs text-gray-600">{team.adres}</p>
                                <p className="text-xs">Gemeentes: {team.gemeentes.join(', ')}</p>
                                <p className="text-xs">Max eenheden: {team.instellingen.max_aantal_eenheden}</p>
                              </div>
                            </Popup>
                          </Polygon>
                        );
                      }
                    }).flat()}

                  {/* Toon adres marker voor geselecteerd team */}
                  {selectedTeam && (
                    <Marker position={selectedTeam.polygon[0]}>
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-sm">{selectedTeam.naam}</h3>
                          <p className="text-xs">{selectedTeam.adres}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-xl text-gray-600">Selecteer een basisteam om te bewerken</h2>
              <p className="text-gray-500 mt-2">Kies een team uit de lijst om de details te bekijken</p>
            </div>
          </div>
        )}
      </div>
      <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h2 className="text-lg font-semibold mb-4">PDOK WMS API Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              Test de connectie met de PDOK Bestuurlijke Gebieden WMS API voor Nederlandse gemeente- en provinciegrenzen.
            </p>

            <button
              onClick={testPdokConnection}
              disabled={isTestingPdok}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingPdok ? 'Bezig met testen...' : 'Test PDOK Connectie'}
            </button>

            {pdokTestResult && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                {pdokTestResult}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <h2 className="text-lg font-semibold mb-4">API Informatie</h2>
            <div className="space-y-2 text-sm">
              <p><strong>PDOK WMS Endpoint:</strong> https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0</p>
              <p><strong>Beschikbare Layers:</strong></p>
              <ul className="list-disc list-inside ml-4 text-xs">
                <li>bestuurlijkegebieden:gemeenten - Nederlandse gemeentegrenzen</li>
                <li>bestuurlijkegebieden:provincies - Nederlandse provinciegrenzen</li>
                <li>bestuurlijkegebieden:land - Nederlandse landsgrenzen</li>
              </ul>
              <p><strong>Ondersteunde Formats:</strong> PNG, JPEG, GeoJSON, XML</p>
              <p><strong>Coördinatensystemen:</strong> EPSG:4326 (WGS84), EPSG:28992 (RD New), EPSG:3857 (Web Mercator)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstellingenPage;