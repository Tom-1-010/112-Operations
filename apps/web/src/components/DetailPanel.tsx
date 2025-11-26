'use client';

import { useState, useEffect } from 'react';
import { IntakeForm, MC, LatLng } from '../lib/types';
import { mcCatalog } from '../lib/mock';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Slider } from './ui/Slider';
import { MapView } from './MapView';
import { MapPin, Send, X } from 'lucide-react';
import bureauData from '../../data/basisteams-politie.json';

interface DetailPanelProps {
  form: IntakeForm;
  onFormChange: (form: IntakeForm) => void;
  onSubmit: () => void;
  onClose?: () => void;
}

export function DetailPanel({ form, onFormChange, onSubmit, onClose }: DetailPanelProps) {
  const [selectedMCs, setSelectedMCs] = useState<MC[]>(form.mc);
  const [bureaus, setBureaus] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Laad bureaus en eenheden bij mount
  useEffect(() => {
    const loadBureaus = () => {
      try {
        console.log('🗺️ DetailPanel: Loading bureaus...');
        setBureaus(bureauData.bureaus || []);
        setUnits(bureauData.units || []);
        console.log('🗺️ DetailPanel: Bureaus geladen:', bureauData.bureaus?.length || 0, bureauData.bureaus);
        console.log('🗺️ DetailPanel: Units geladen:', bureauData.units?.length || 0, bureauData.units);
      } catch (error) {
        console.error('Error loading bureaus:', error);
      }
    };

    const loadRoosterUnits = async () => {
      try {
        const response = await fetch('/attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json');
        if (response.ok) {
          const roosterData = await response.json();
          const roosterUnits: any[] = [];
          
          Object.entries(roosterData).forEach(([teamName, teamUnits]: [string, any]) => {
            // Only load A1 Waterweg units
            if (teamName === 'Basisteam Waterweg (A1)' && Array.isArray(teamUnits)) {
              teamUnits.forEach((unit: any) => {
                let status = '5 - Afmelden';
                if (unit.primair === true || unit.primair === 'true' || unit.primair === 1) {
                  status = '1 - Beschikbaar/vrij';
                }

                roosterUnits.push({
                  id: `bt-${unit.roepnummer}`,
                  roepnummer: unit.roepnummer,
                  aantal_mensen: unit.aantal_mensen,
                  rollen: Array.isArray(unit.rollen) ? unit.rollen : [unit.rollen],
                  soort_auto: unit.soort_auto,
                  team: teamName,
                  status: status,
                  locatie: 'Basisteam Waterweg, Delftseveerweg 40, Vlaardingen',
                  incident: '',
                  coordinates: [4.34367832, 51.91387332], // Bureau coordinates [lng, lat]
                  type: unit.soort_auto || 'BPV-auto'
                });
              });
            }
          });

          setUnits(prev => [...prev, ...roosterUnits]);
          console.log('🗺️ DetailPanel: Rooster units loaded:', roosterUnits.length);
        }
      } catch (error) {
        console.error('Failed to load rooster units:', error);
      }
    };

    loadBureaus();
    loadRoosterUnits();
  }, []);

  const handleAddressChange = (address: string) => {
    onFormChange({ ...form, address });
  };

  const handleLocationSelect = (location: LatLng) => {
    onFormChange({ ...form, location });
  };

  const handleMCSelect = (mc: MC) => {
    const newMCs = selectedMCs.includes(mc)
      ? selectedMCs.filter(m => m !== mc)
      : [...selectedMCs, mc];
    
    setSelectedMCs(newMCs);
    onFormChange({ ...form, mc: newMCs });
  };

  const handleMCRemove = (mc: MC) => {
    const newMCs = selectedMCs.filter(m => m !== mc);
    setSelectedMCs(newMCs);
    onFormChange({ ...form, mc: newMCs });
  };

  const handlePriorityChange = (priority: number) => {
    onFormChange({ ...form, priority: priority as 1|2|3|4|5 });
  };

  const handleSubmit = () => {
    if (form.address.trim() && selectedMCs.length > 0) {
      onSubmit();
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-500';
      case 2: return 'text-orange-500';
      case 3: return 'text-yellow-500';
      case 4: return 'text-blue-500';
      case 5: return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Kritiek';
      case 2: return 'Hoog';
      case 3: return 'Gemiddeld';
      case 4: return 'Laag';
      case 5: return 'Info';
      default: return 'Onbekend';
    }
  };

  return (
    <div className="flex h-full flex-col bg-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-700 p-4">
        <h2 className="text-lg font-semibold text-gray-200">Detailpaneel</h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Address Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Adres
          </label>
          <div className="flex space-x-2">
            <Input
              placeholder="Voer adres in..."
              value={form.address}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // In a real app, this would geocode the address
                if (form.address.trim()) {
                  handleLocationSelect({ lat: 51.9244, lng: 4.4777 });
                }
              }}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Locatie
          </label>
          <MapView
            marker={form.location}
            onLocationSelect={handleLocationSelect}
            className="h-48 w-full rounded-lg border border-dark-600"
            bureaus={bureaus}
            units={units.filter(unit => {
              const status = unit.status;
              return status !== '5 - Afmelden' && 
                     status !== '5 - afmelden' && 
                     !status.toLowerCase().includes('afmelden');
            })}
            center={{ lat: 51.91387332, lng: 4.34367832 }}
            zoom={13}
          />
          {/* Debug info */}
          {bureaus.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Debug: {bureaus.length} bureaus, {units.length} units loaded
            </div>
          )}
        </div>

        {/* MC Classification */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            MeldingClassificatie
          </label>
          
          {/* Selected MCs */}
          {selectedMCs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Geselecteerd:</p>
              <div className="flex flex-wrap gap-2">
                {selectedMCs.map((mc) => {
                  const mcInfo = mcCatalog.find(m => m.code === mc);
                  return (
                    <Chip
                      key={mc}
                      variant="selected"
                      color={mcInfo?.color}
                      onRemove={() => handleMCRemove(mc)}
                    >
                      {mcInfo?.label}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          {/* MC Shortcuts */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Snelle selectie:</p>
            <div className="flex flex-wrap gap-2">
              {mcCatalog.filter(mc => mc.shortcut).map((mcInfo) => (
                <Chip
                  key={mcInfo.code}
                  variant={selectedMCs.includes(mcInfo.code) ? 'selected' : 'shortcut'}
                  color={selectedMCs.includes(mcInfo.code) ? mcInfo.color : undefined}
                  onClick={() => handleMCSelect(mcInfo.code)}
                  className="cursor-pointer"
                >
                  {mcInfo.shortcut}: {mcInfo.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* All MCs */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Alle classificaties:</p>
            <div className="flex flex-wrap gap-2">
              {mcCatalog.map((mcInfo) => (
                <Chip
                  key={mcInfo.code}
                  variant={selectedMCs.includes(mcInfo.code) ? 'selected' : 'default'}
                  color={selectedMCs.includes(mcInfo.code) ? mcInfo.color : undefined}
                  onClick={() => handleMCSelect(mcInfo.code)}
                  className="cursor-pointer"
                >
                  {mcInfo.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Prioriteit
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${getPriorityColor(form.priority)}`}>
                {form.priority}/5 - {getPriorityLabel(form.priority)}
              </span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={form.priority}
              onChange={handlePriorityChange}
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="border-t border-dark-700 p-4">
        <Button
          onClick={handleSubmit}
          disabled={!form.address.trim() || selectedMCs.length === 0}
          variant="primary"
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          Melding versturen
        </Button>
      </div>
    </div>
  );
}
