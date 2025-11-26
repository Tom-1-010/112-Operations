import { BrwUnit } from './types';

const STORAGE_KEY = 'brw_units';
const FALLBACK_FILE = '/data/brw_units.json';
const BRW_EENHEDEN_FILE = '/data/BRW eenheden.json';

/**
 * Check of Firebase beschikbaar is
 */
function isFirebaseAvailable(): boolean {
  try {
    // Check of Firebase configuratie bestaat
    const firebaseConfig = (window as any).firebaseConfig;
    return !!firebaseConfig;
  } catch {
    return false;
  }
}

/**
 * Laad eenheden uit localStorage (fallback)
 */
function loadFromLocalStorage(): BrwUnit[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Fout bij laden uit localStorage:', error);
  }
  return [];
}

/**
 * Sla eenheden op in localStorage (fallback)
 */
function saveToLocalStorage(units: BrwUnit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  } catch (error) {
    console.error('Fout bij opslaan in localStorage:', error);
  }
}

/**
 * Parse BRW eenheden.json bestand (TSV format)
 */
function parseBRWEenhedenFile(text: string): BrwUnit[] {
  const lines = text.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.length > 0);
  const units: BrwUnit[] = [];
  const seenRoepnummers = new Set<string>();

  // Check if unit already exists in localStorage (preserve custom data)
  const existingUnits = loadFromLocalStorage();
  const existingMap = new Map(
    existingUnits.map(u => [u.roepnummer.toLowerCase().trim(), u])
  );

  for (const line of lines) {
    const cols = line.split(/\t+/);
    
    // Skip lege regels
    if (cols.length === 0 || cols.every(c => !c.trim())) continue;
    
    // Minimaal 1 kolom nodig (GMS-naam of roepnummer)
    if (cols.length < 1) continue;

    const gmsNaam = (cols[0] || "").trim();
    let roepnummer = (cols[1] || "").trim();

    // If roepnummer is empty but GMS-naam exists, use GMS-naam as roepnummer
    if (!roepnummer && gmsNaam) {
      roepnummer = gmsNaam;
    }

    // Skip als beide leeg zijn
    if (!gmsNaam && !roepnummer) continue;

    // Find last non-empty column as post (kazerne)
    let post = "";
    for (let i = cols.length - 1; i >= 0; i--) {
      const v = (cols[i] || "").trim();
      if (v && v.length > 0) { 
        post = v; 
        break; 
      }
    }

    // Get type from column 2 (first role/type column)
    const typeRaw = (cols[2] || "").trim();
    const type = typeRaw.split(/\s*\/\s*/)[0] || "";

    // Collect roles from columns 2 onwards
    const roles: string[] = [];
    const roleStartIndex = 2;
    let roleEndIndex = cols.length;
    
    // Find where roles end (where post starts)
    for (let i = cols.length - 1; i >= roleStartIndex; i--) {
      const v = (cols[i] || "").trim();
      if (v === post) {
        roleEndIndex = i;
        break;
      }
    }

    for (let i = roleStartIndex; i < roleEndIndex; i++) {
      const cell = (cols[i] || "").trim();
      if (!cell) continue;
      
      // Handle cells that may contain multiple roles separated by " / "
      const parts = cell.split(/\s*\/\s*/);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed && trimmed.length > 0) {
          roles.push(trimmed);
        }
      }
    }

    // Use first role as primary role, or type if no roles
    const primaryRole = roles.length > 0 ? roles[0] : (type || "Overig");

    // Normalize roepnummer for duplicate checking (maar behoud origineel)
    const normalizedKey = roepnummer.toLowerCase().trim();

    // Skip duplicates (maar alleen als exact hetzelfde roepnummer)
    if (seenRoepnummers.has(normalizedKey)) {
      console.warn(`[BRW Dashboard] Duplicaat roepnummer overgeslagen: ${roepnummer}`);
      continue;
    }
    seenRoepnummers.add(normalizedKey);

    // Check if unit already exists in localStorage (preserve custom data)
    const existing = existingMap.get(normalizedKey);

    units.push({
      id: existing?.id || crypto.randomUUID(),
      roepnummer: roepnummer, // Behoud origineel roepnummer
      type: (type as any) || "",
      rol: primaryRole,
      kazerne: post || "",
      opKaart: existing?.opKaart ?? false,
      locatie: existing?.locatie || { lat: null, lng: null },
    });
  }

  console.log(`[BRW Dashboard] Geparsed ${units.length} eenheden uit ${lines.length} regels`);
  return units;
}

/**
 * Laad eenheden uit JSON bestand (initiële fallback)
 */
async function loadFromFile(): Promise<BrwUnit[]> {
  try {
    // Probeer eerst het bestand te laden
    const response = await fetch(FALLBACK_FILE);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Kon eenheden niet laden uit bestand:', error);
  }
  
  // Als bestand niet bestaat, retourneer lege array
  // Gebruiker kan handmatig eenheden toevoegen via de UI
  
  return [];
}

/**
 * Laad alle eenheden
 */
export async function loadUnits(): Promise<BrwUnit[]> {
  // Probeer eerst localStorage
  const localUnits = loadFromLocalStorage();
  if (localUnits.length > 0) {
    return localUnits;
  }

  // Als localStorage leeg is, probeer automatisch te synchroniseren met BRW bestand
  try {
    const base = (import.meta as any)?.env?.BASE_URL || "/";
    const url = `${base}data/BRW%20eenheden.json`;
    console.log('[BRW Dashboard] localStorage leeg, probeer automatisch te laden van:', url);
    const response = await fetch(url);
    if (response.ok) {
      const rawText = await response.text();
      console.log(`[BRW Dashboard] Bestand geladen: ${rawText.length} karakters, ${rawText.split(/\r?\n/).length} regels`);
      const parsedUnits = parseBRWEenhedenFile(rawText);
      if (parsedUnits.length > 0) {
        // Sla op in localStorage voor volgende keer
        saveToLocalStorage(parsedUnits);
        console.log(`[BRW Dashboard] ✅ Automatisch ${parsedUnits.length} eenheden geladen uit BRW bestand`);
        return parsedUnits;
      } else {
        console.warn('[BRW Dashboard] ⚠️ Geen eenheden geparsed uit bestand');
      }
    } else {
      console.warn(`[BRW Dashboard] ⚠️ Kon bestand niet laden: HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('[BRW Dashboard] Kon niet automatisch synchroniseren:', error);
  }

  // Probeer fallback bestand als laatste redmiddel
  const fileUnits = await loadFromFile();
  if (fileUnits.length > 0) {
    // Sla op in localStorage voor volgende keer
    saveToLocalStorage(fileUnits);
    return fileUnits;
  }

  return [];
}

/**
 * Sla alle eenheden op
 */
export async function saveUnits(units: BrwUnit[]): Promise<void> {
  // Sla altijd op in localStorage
  saveToLocalStorage(units);

  // Als Firebase beschikbaar is, sla ook daar op
  if (isFirebaseAvailable()) {
    try {
      // TODO: Implementeer Firebase opslag indien nodig
      // const db = getFirestore();
      // await setDoc(doc(db, 'brw_units', 'all'), { units });
    } catch (error) {
      console.error('Fout bij opslaan in Firebase:', error);
    }
  }
}

/**
 * Voeg een nieuwe eenheid toe
 */
export async function addUnit(unit: Omit<BrwUnit, 'id'>): Promise<BrwUnit> {
  const units = await loadUnits();
  const newUnit: BrwUnit = {
    ...unit,
    id: crypto.randomUUID(),
  };
  units.push(newUnit);
  await saveUnits(units);
  return newUnit;
}

/**
 * Update een bestaande eenheid
 */
export async function updateUnit(id: string, updates: Partial<BrwUnit>): Promise<BrwUnit | null> {
  const units = await loadUnits();
  const index = units.findIndex(u => u.id === id);
  if (index === -1) {
    return null;
  }
  units[index] = { ...units[index], ...updates };
  await saveUnits(units);
  return units[index];
}

/**
 * Verwijder een eenheid
 */
export async function deleteUnit(id: string): Promise<boolean> {
  const units = await loadUnits();
  const index = units.findIndex(u => u.id === id);
  if (index === -1) {
    return false;
  }
  units.splice(index, 1);
  await saveUnits(units);
  return true;
}

/**
 * Exporteer eenheden als JSON
 */
export async function exportUnits(): Promise<string> {
  const units = await loadUnits();
  return JSON.stringify(units, null, 2);
}

/**
 * Importeer eenheden uit JSON
 */
export async function importUnits(json: string): Promise<BrwUnit[]> {
  try {
    const imported = JSON.parse(json) as BrwUnit[];
    // Valideer dat het een array is
    if (!Array.isArray(imported)) {
      throw new Error('Geen geldige eenheden array');
    }
    // Valideer dat alle items de juiste structuur hebben
    const validated = imported.map(unit => ({
      id: unit.id || crypto.randomUUID(),
      roepnummer: unit.roepnummer || '',
      type: unit.type || '',
      rol: unit.rol || '',
      kazerne: unit.kazerne || '',
      opKaart: unit.opKaart ?? false,
      locatie: {
        lat: unit.locatie?.lat ?? null,
        lng: unit.locatie?.lng ?? null,
      },
    }));
    await saveUnits(validated);
    return validated;
  } catch (error) {
    console.error('Fout bij importeren:', error);
    throw new Error('Kon eenheden niet importeren: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
  }
}

/**
 * Synchroniseer eenheden uit BRW eenheden.json bestand
 * Dit laadt het officiële bestand en merge het met bestaande eenheden
 */
export async function syncFromBRWFile(): Promise<{ added: number; updated: number; total: number }> {
  try {
    const base = (import.meta as any)?.env?.BASE_URL || "/";
    const url = `${base}data/BRW%20eenheden.json`;
    console.log('[BRW Dashboard] Synchroniseren van:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rawText = await response.text();
    console.log(`[BRW Dashboard] Bestand geladen: ${rawText.length} karakters`);
    const parsedUnits = parseBRWEenhedenFile(rawText);
    console.log(`[BRW Dashboard] ${parsedUnits.length} eenheden geparsed`);
    
    // Laad bestaande eenheden
    const existingUnits = await loadUnits();
    const existingMap = new Map(existingUnits.map(u => [u.roepnummer.toLowerCase().trim(), u]));

    let added = 0;
    let updated = 0;

    // Merge: behoud custom data (locatie, opKaart) van bestaande eenheden
    const mergedUnits = parsedUnits.map(parsedUnit => {
      const key = parsedUnit.roepnummer.toLowerCase().trim();
      const existing = existingMap.get(key);
      
      if (existing) {
        // Update bestaande eenheid met nieuwe data, behoud custom velden
        updated++;
        return {
          ...existing,
          type: parsedUnit.type || existing.type,
          rol: parsedUnit.rol || existing.rol,
          kazerne: parsedUnit.kazerne || existing.kazerne,
        };
      } else {
        // Nieuwe eenheid
        added++;
        return parsedUnit;
      }
    });

    // Voeg eventuele handmatig toegevoegde eenheden toe die niet in het bestand staan
    existingUnits.forEach(existing => {
      const key = existing.roepnummer.toLowerCase().trim();
      if (!parsedUnits.some(p => p.roepnummer.toLowerCase().trim() === key)) {
        mergedUnits.push(existing);
      }
    });

    await saveUnits(mergedUnits);
    
    console.log(`[BRW Dashboard] Synchronisatie voltooid: ${added} toegevoegd, ${updated} bijgewerkt, ${mergedUnits.length} totaal`);
    
    return { added, updated, total: mergedUnits.length };
  } catch (error) {
    console.error('[BRW Dashboard] Fout bij synchroniseren:', error);
    throw new Error('Kon niet synchroniseren: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
  }
}

