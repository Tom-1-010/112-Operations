import React, { useState, useEffect, useMemo } from 'react';
import { BrwUnit, BrwUnitType } from './types';
import { loadUnits, saveUnits, addUnit, updateUnit, deleteUnit, exportUnits, importUnits, syncFromBRWFile } from './storage';
import KiesLocatieModal from './KiesLocatieModal';

/**
 * BRW materieeltypes met labels
 */
const UNIT_TYPES: { value: BrwUnitType; label: string }[] = [
  { value: 'TS', label: 'TS - Tankautospuit' },
  { value: 'RV', label: 'RV - Redvoertuig' },
  { value: 'HV', label: 'HV - Hulpverlening' },
  { value: 'WO', label: 'WO - Waterongeval' },
  { value: 'OR', label: 'OR - Overig' },
  { value: 'SI', label: 'SI - Snel Interventie' },
  { value: 'OvD', label: 'OvD - Officier van Dienst' },
  { value: 'AL', label: 'AL - Autoladder' },
  { value: 'DA', label: 'DA - Dienstauto' },
  { value: 'MP', label: 'MP - Motorpomp' },
  { value: 'HW', label: 'HW - Hoogwerker' },
  { value: 'DAT', label: 'DAT - Dienstauto Tank' },
  { value: 'BV', label: 'BV - Brandweervoertuig' },
  { value: 'WOV', label: 'WOV - Waterongevallenvoertuig' },
  { value: 'VP', label: 'VP - Vaste Post' },
  { value: 'CDT', label: 'CDT - Clustercommandant' },
  { value: 'COP-DCU', label: 'COP-DCU - Decentrale uitgifte' },
  { value: 'Drone', label: 'Drone' },
  { value: '', label: 'Onbekend' },
];

/**
 * Standaard inzetrollen
 */
const INZETROLLEN = [
  'Tankautospuit',
  'Redvoertuig',
  'Hulpverlening',
  'Waterongeval',
  'Officier van Dienst',
  'Autoladder',
  'Dienstauto',
  'Motorpomp',
  'Hoogwerker',
  'Brandweervoertuig',
  'Waterongevallenvoertuig',
  'Vaste Post',
  'Clustercommandant',
  'Snel Interventie',
  'Overig',
];

type SortField = 'roepnummer' | 'type' | 'rol' | 'kazerne';
type SortDirection = 'asc' | 'desc';

export default function BrwDashboard() {
  const [units, setUnits] = useState<BrwUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<BrwUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('roepnummer');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ added: number; updated: number; total: number } | null>(null);

  // Laad eenheden bij mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const loaded = await loadUnits();
        
        // Als er geen eenheden zijn OF als er maar 3 of minder zijn (waarschijnlijk mockdata),
        // probeer automatisch te synchroniseren
        if (loaded.length === 0 || loaded.length <= 3) {
          console.log(`[BRW Dashboard] ${loaded.length} eenheden gevonden, probeer automatisch te synchroniseren...`);
          try {
            const syncResult = await syncFromBRWFile();
            const synced = await loadUnits();
            setUnits(synced);
            if (synced.length > 0) {
              setSelectedUnit(synced[0]);
              setSyncStatus(syncResult);
            }
          } catch (syncError) {
            console.error('Fout bij automatische synchronisatie:', syncError);
            // Toon geladen eenheden ook als synchronisatie faalt
            setUnits(loaded);
            if (loaded.length > 0 && !selectedUnit) {
              setSelectedUnit(loaded[0]);
            }
          }
        } else {
          setUnits(loaded);
          if (loaded.length > 0 && !selectedUnit) {
            setSelectedUnit(loaded[0]);
          }
        }
      } catch (error) {
        console.error('Fout bij laden eenheden:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Sla eenheden op wanneer ze wijzigen
  useEffect(() => {
    if (!loading && units.length >= 0) {
      saveUnits(units).catch(console.error);
    }
  }, [units, loading]);

  // Update kaart wanneer eenheden wijzigen
  useEffect(() => {
    // Stuur eenheden met opKaart: true naar het kaart systeem
    const unitsForMap = units
      .filter(u => u.opKaart && u.locatie.lat !== null && u.locatie.lng !== null)
      .map(u => ({
        roepnummer: u.roepnummer,
        type: u.type,
        lat: u.locatie.lat!,
        lon: u.locatie.lng!,
        kazerne: u.kazerne,
      }));

    // Dispatch custom event voor kaart integratie
    // De kaart pagina kan luisteren naar dit event en eenheden toevoegen
    window.dispatchEvent(new CustomEvent('brw-units-updated', { detail: unitsForMap }));
    
    // Sla ook op in localStorage voor cross-tab communicatie
    try {
      localStorage.setItem('brwDashboardUnits', JSON.stringify(unitsForMap));
      // Trigger storage event voor andere tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'brwDashboardUnits',
        newValue: JSON.stringify(unitsForMap),
      }));
    } catch (error) {
      console.error('Fout bij opslaan eenheden voor kaart:', error);
    }
  }, [units]);

  // Synchroniseer met GMS2 - stuur eenheden naar GMS2 format
  useEffect(() => {
    // Converteer eenheden naar GMS2 brwUnitsMap format
    const brwUnitsMap: Record<string, {
      roepnummer: string;
      gmsNaam: string;
      post: string;
      rollen: string[];
      alternatieven: string[];
      status: string;
    }> = {};

    units.forEach(unit => {
      brwUnitsMap[unit.roepnummer] = {
        roepnummer: unit.roepnummer,
        gmsNaam: unit.roepnummer, // Gebruik roepnummer als GMS-naam
        post: unit.kazerne,
        rollen: [unit.rol, ...(unit.type ? [unit.type] : [])],
        alternatieven: [],
        status: '5 - Afmelden', // Default status
      };
    });

    // Sla op in localStorage voor GMS2
    try {
      localStorage.setItem('brwUnitsMap', JSON.stringify(brwUnitsMap));
      // Trigger event voor GMS2
      window.dispatchEvent(new CustomEvent('brwUnitsMapUpdated', { detail: brwUnitsMap }));
    } catch (error) {
      console.error('Fout bij synchroniseren met GMS2:', error);
    }
  }, [units]);

  // Gesorteerde en gefilterde eenheden
  const sortedAndFilteredUnits = useMemo(() => {
    let filtered = units;

    // Filter op zoekquery
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        u =>
          u.roepnummer.toLowerCase().includes(query) ||
          u.type.toLowerCase().includes(query) ||
          u.rol.toLowerCase().includes(query) ||
          u.kazerne.toLowerCase().includes(query)
      );
    }

    // Sorteer
    const sorted = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'roepnummer':
          aVal = a.roepnummer;
          bVal = b.roepnummer;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'rol':
          aVal = a.rol;
          bVal = b.rol;
          break;
        case 'kazerne':
          aVal = a.kazerne;
          bVal = b.kazerne;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal < bVal ? -1 : 1) : aVal > bVal ? -1 : 1;
    });

    return sorted;
  }, [units, sortField, sortDirection, searchQuery]);

  // Handlers
  const handleSelectUnit = (unit: BrwUnit) => {
    setSelectedUnit(unit);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleNewUnit = async () => {
    const newUnit = await addUnit({
      roepnummer: '',
      type: '',
      rol: '',
      kazerne: '',
      opKaart: false,
      locatie: { lat: null, lng: null },
    });
    setUnits(await loadUnits());
    setSelectedUnit(newUnit);
  };

  const handleUpdateUnit = async (id: string, updates: Partial<BrwUnit>) => {
    await updateUnit(id, updates);
    const updated = await loadUnits();
    setUnits(updated);
    const updatedUnit = updated.find(u => u.id === id);
    if (updatedUnit) {
      setSelectedUnit(updatedUnit);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (confirm('Weet u zeker dat u deze eenheid wilt verwijderen?')) {
      await deleteUnit(id);
      const updated = await loadUnits();
      setUnits(updated);
      if (selectedUnit?.id === id) {
        setSelectedUnit(updated.length > 0 ? updated[0] : null);
      }
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportUnits();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brw-eenheden-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Fout bij exporteren: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = await importUnits(text);
        setUnits(imported);
        if (imported.length > 0) {
          setSelectedUnit(imported[0]);
        }
        alert(`Succesvol ${imported.length} eenheden geïmporteerd`);
      } catch (error) {
        alert('Fout bij importeren: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
      }
    };
    input.click();
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncStatus(null);
      
      // Wis localStorage eerst om te zorgen dat we verse data krijgen
      // (behoud alleen custom locaties via de merge in syncFromBRWFile)
      console.log('[BRW Dashboard] Start synchronisatie...');
      
      const result = await syncFromBRWFile();
      setSyncStatus(result);
      
      // Herlaad eenheden na synchronisatie
      const updated = await loadUnits();
      console.log(`[BRW Dashboard] ${updated.length} eenheden geladen na synchronisatie`);
      setUnits(updated);
      
      if (updated.length > 0 && !selectedUnit) {
        setSelectedUnit(updated[0]);
      }
      
      // Toon melding
      if (result.total > 0) {
        console.log(`✅ Synchronisatie succesvol: ${result.total} eenheden beschikbaar`);
      }
    } catch (error) {
      console.error('Fout bij synchroniseren:', error);
      alert('Fout bij synchroniseren: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setSyncing(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    if (selectedUnit) {
      handleUpdateUnit(selectedUnit.id, {
        locatie: { lat, lng },
      });
    }
  };

  if (loading) {
    return (
      <div className="gms-eenheden-container">
        <div className="gms-eenheden-header">
          <h2>BRW Eenheden Beheer</h2>
          <div>Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
        backgroundColor: '#f0f0f0',
      }}
    >
      {/* Linker paneel: Tabel */}
      <div
        style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '2px solid #c0c0c0',
          backgroundColor: 'white',
        }}
      >
        {/* Header met knoppen */}
        <div
          style={{
            padding: '12px',
            borderBottom: '2px solid #c0c0c0',
            backgroundColor: '#e0e0e0',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleNewUnit}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: '1px solid #0052a3',
              cursor: 'pointer',
              fontSize: '12px',
              borderRadius: '2px',
            }}
          >
            Nieuwe eenheid
          </button>
          <button
            onClick={handleImport}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: '1px solid #218838',
              cursor: 'pointer',
              fontSize: '12px',
              borderRadius: '2px',
            }}
          >
            Importeren
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: '1px solid #5a6268',
              cursor: 'pointer',
              fontSize: '12px',
              borderRadius: '2px',
            }}
          >
            Exporteren
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '6px 12px',
              backgroundColor: syncing ? '#ccc' : '#17a2b8',
              color: 'white',
              border: `1px solid ${syncing ? '#aaa' : '#138496'}`,
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              borderRadius: '2px',
            }}
          >
            {syncing ? 'Synchroniseren...' : 'Synchroniseer met BRW bestand'}
          </button>
          {syncStatus && (
            <span style={{ fontSize: '11px', color: '#666', padding: '6px 0' }}>
              {syncStatus.added} toegevoegd, {syncStatus.updated} bijgewerkt, {syncStatus.total} totaal
            </span>
          )}
          <input
            type="text"
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '2px',
              fontSize: '12px',
              flex: 1,
              minWidth: '200px',
            }}
          />
        </div>

        {/* Tabel */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#c0c0c0', position: 'sticky', top: 0, zIndex: 10 }}>
                <th
                  onClick={() => handleSort('roepnummer')}
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '2px solid #808080',
                    userSelect: 'none',
                  }}
                >
                  Roepnummer {sortField === 'roepnummer' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('type')}
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '2px solid #808080',
                    userSelect: 'none',
                  }}
                >
                  Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('rol')}
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '2px solid #808080',
                    userSelect: 'none',
                  }}
                >
                  Rol {sortField === 'rol' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('kazerne')}
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '2px solid #808080',
                    userSelect: 'none',
                  }}
                >
                  Kazerne {sortField === 'kazerne' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'center',
                    borderBottom: '2px solid #808080',
                  }}
                >
                  Op kaart
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredUnits.map((unit) => (
                <tr
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedUnit?.id === unit.id ? '#e6f3ff' : 'white',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUnit?.id !== unit.id) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUnit?.id !== unit.id) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{unit.roepnummer || '-'}</td>
                  <td style={{ padding: '8px' }}>{unit.type || '-'}</td>
                  <td style={{ padding: '8px' }}>{unit.rol || '-'}</td>
                  <td style={{ padding: '8px' }}>{unit.kazerne || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={unit.opKaart}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateUnit(unit.id, { opKaart: e.target.checked });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedAndFilteredUnits.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Geen eenheden gevonden
            </div>
          )}
        </div>
      </div>

      {/* Rechter paneel: Detailscherm */}
      <div
        style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
        }}
      >
        {selectedUnit ? (
          <>
            <div
              style={{
                padding: '12px',
                borderBottom: '2px solid #c0c0c0',
                backgroundColor: '#e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                Eenheid Details
              </h3>
              <button
                onClick={() => handleDeleteUnit(selectedUnit.id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: '1px solid #c82333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px',
                }}
              >
                Verwijderen
              </button>
            </div>

            <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Roepnummer */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    Roepnummer *
                  </label>
                  <input
                    type="text"
                    value={selectedUnit.roepnummer}
                    onChange={(e) =>
                      handleUpdateUnit(selectedUnit.id, { roepnummer: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {/* Type */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    Type *
                  </label>
                  <select
                    value={selectedUnit.type}
                    onChange={(e) =>
                      handleUpdateUnit(selectedUnit.id, { type: e.target.value as BrwUnitType })
                    }
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  >
                    {UNIT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rol */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    Rol *
                  </label>
                  <select
                    value={selectedUnit.rol}
                    onChange={(e) =>
                      handleUpdateUnit(selectedUnit.id, { rol: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  >
                    <option value="">Selecteer rol...</option>
                    {INZETROLLEN.map((rol) => (
                      <option key={rol} value={rol}>
                        {rol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kazerne */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    Kazerne *
                  </label>
                  <input
                    type="text"
                    value={selectedUnit.kazerne}
                    onChange={(e) =>
                      handleUpdateUnit(selectedUnit.id, { kazerne: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {/* Op kaart tonen */}
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUnit.opKaart}
                      onChange={(e) =>
                        handleUpdateUnit(selectedUnit.id, { opKaart: e.target.checked })
                      }
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
                      Op kaart tonen
                    </span>
                  </label>
                </div>

                {/* Locatie */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    Locatie op kaart
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={
                        selectedUnit.locatie.lat !== null && selectedUnit.locatie.lng !== null
                          ? `${selectedUnit.locatie.lat.toFixed(6)}, ${selectedUnit.locatie.lng.toFixed(6)}`
                          : 'Geen locatie geselecteerd'
                      }
                      readOnly
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: '1px solid #ccc',
                        borderRadius: '2px',
                        fontSize: '12px',
                        backgroundColor: '#f5f5f5',
                      }}
                    />
                    <button
                      onClick={() => setShowLocationModal(true)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        border: '1px solid #0052a3',
                        cursor: 'pointer',
                        fontSize: '12px',
                        borderRadius: '2px',
                      }}
                    >
                      Kies op kaart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
            }}
          >
            Selecteer een eenheid om details te bekijken
          </div>
        )}
      </div>

      {/* Locatie selectie modal */}
      <KiesLocatieModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelect={handleLocationSelect}
        initialLat={selectedUnit?.locatie.lat ?? null}
        initialLng={selectedUnit?.locatie.lng ?? null}
      />
    </div>
  );
}

