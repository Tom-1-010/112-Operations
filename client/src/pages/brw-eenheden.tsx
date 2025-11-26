import React, { useEffect, useMemo, useState } from "react";
import { loadInzetrollen, type InzetrolItem } from "../data/inzetrollen";
import { getAllStatusesSync, getStatusDef, getDefaultStatus, type StatusDef } from "../lib/brw-status";
import { normalizeRoepnummer, updateEenheidStatus } from "../lib/renderEenhedenOpKaart";

type RawBrwEntry = {
  "GMS-naam": string;
  "nummering op eenheid": string;
  "inzetrollen GMS": string[];
  post: string;
  "alternatief benaming": string[];
};

type BrwDataset = { [roepnummer: string]: RawBrwEntry };

type BrwUnit = {
  roepnummer: string;
  gmsNaam: string;
  nummeringOpEenheid: string;
  post: string;
  rollen: string[];
  alternatieven: string[];
  status: string;
  locatie?: string;
  incident?: string;
};

export default function BrwEenhedenPage() {
  console.log("[BRW] Component rendering...");
  const [dataset, setDataset] = useState<BrwDataset>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [postFilter, setPostFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [now, setNow] = useState<Date>(new Date());
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const [rolesOverride, setRolesOverride] = useState<Record<string, string[]>>({});
  const [locationOverride, setLocationOverride] = useState<Record<string, string>>({});
  const [incidentOverride, setIncidentOverride] = useState<Record<string, string>>({});
  const [inzetrollen, setInzetrollen] = useState<InzetrolItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const base = (import.meta as any)?.env?.BASE_URL || "/";
        // Load the updated BRW eenheden file (TSV-like content, not real JSON)
        const url = `${base}data/BRW%20eenheden.json`;
        console.log("[BRW] Loading from URL:", url);
        console.log("[BRW] Base URL:", base);
        const res = await fetch(url);
        console.log("[BRW] Fetch response status:", res.status, res.statusText);
        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
        }
        const rawText = await res.text();
        console.log("[BRW] Loaded", rawText.length, "characters");

        // Parse the TSV-like content into the expected dataset shape
        const lines = rawText
          .split(/\r?\n/)
          .map((l) => l.trimEnd())
          .filter((l) => l.length > 0);

        console.log("[BRW] Parsed", lines.length, "lines");

        const data: BrwDataset = {};
        let processedCount = 0;
        let skippedCount = 0;

        for (const line of lines) {
          // Columns appear to be separated by tabs
          const cols = line.split(/\t+/);
          if (cols.length === 0 || cols.every(c => !c.trim())) {
            skippedCount++;
            continue;
          }

          // Correct structure:
          // [0] = GMS-naam (e.g. 171111) of leeg
          // [1] = roepnummer (e.g. 17-1111) of leeg
          // [2..n-2] = rollen (e.g. TS, TS-OR, DA, DB, DA-OD) of identifier (e.g. SK03)
          // [n-1] = post (e.g. Rotterdam)

          const gmsNaam = (cols[0] || "").trim();
          let roepnummer = (cols[1] || "").trim();

          // If roepnummer is empty but GMS-naam exists, use GMS-naam as roepnummer
          if (!roepnummer && gmsNaam) {
            roepnummer = gmsNaam;
          }

          // Als beide leeg zijn, probeer te kijken of er een identifier in kolom 2 staat
          // (bijvoorbeeld voor SK-nummers of andere speciale eenheden)
          if (!gmsNaam && !roepnummer) {
            // Check of er een identifier in kolom 2 staat (zoals SK03, CO-C/PLI, etc.)
            const potentialId = (cols[2] || "").trim();
            if (potentialId && potentialId.length > 0 && potentialId.length < 20) {
              // Gebruik deze als roepnummer (maar alleen als het eruit ziet als een identifier)
              roepnummer = potentialId;
            } else {
              // Geen identifier gevonden, skip deze regel
              skippedCount++;
              continue;
            }
          }

          // Find last non-empty column as post
          let post = "";
          for (let i = cols.length - 1; i >= 0; i--) {
            const v = (cols[i] || "").trim();
            if (v && v.length > 0) { 
              post = v; 
              break; 
            }
          }

          // Collect roles from columns 2 onwards (until last non-empty which is post)
          const roles: string[] = [];
          // Start from column 2, stop before the last non-empty column (which is post)
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
            
            // Handle cells that may contain multiple roles separated by " / " or just a single role
            const parts = cell.split(/\s*\/\s*/);
            for (const part of parts) {
              const trimmed = part.trim();
              if (trimmed) roles.push(trimmed);
            }
          }

          // Als we nog steeds geen roepnummer hebben, skip deze regel
          if (!roepnummer) {
            skippedCount++;
            continue;
          }

          // Use roepnummer as key (e.g. "17-1111")
          // Als de key al bestaat, voeg een suffix toe om duplicaten te voorkomen
          let key = roepnummer;
          let counter = 1;
          while (data[key]) {
            key = `${roepnummer}-${counter}`;
            counter++;
          }

          const entry: RawBrwEntry = {
            "GMS-naam": gmsNaam,
            "nummering op eenheid": roepnummer,
            "inzetrollen GMS": roles,
            post,
            "alternatief benaming": [],
          };

          data[key] = entry;
          processedCount++;
        }

        console.log("[BRW] Processed", processedCount, "entries, skipped", skippedCount);
        console.log("[BRW] Dataset keys:", Object.keys(data).length);
        if (Object.keys(data).length > 0) {
          console.log("[BRW] Sample entries:", Object.entries(data).slice(0, 3));
        } else {
          console.warn("[BRW] ⚠️ Geen data geparsed! Controleer de parsing logica.");
        }
        setDataset(data);
      } catch (e: any) {
        console.error("[BRW] Error loading data:", e);
        setError(e?.message || "Fout bij laden");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // restore status, location, and incident from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("brwStatusOverrides");
      if (raw) setStatusOverride(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("brwStatusOverrides", JSON.stringify(statusOverride));
    } catch {}
  }, [statusOverride]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("brwLocationOverrides");
      if (raw) setLocationOverride(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("brwLocationOverrides", JSON.stringify(locationOverride));
    } catch {}
  }, [locationOverride]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("brwIncidentOverrides");
      if (raw) setIncidentOverride(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("brwIncidentOverrides", JSON.stringify(incidentOverride));
    } catch {}
  }, [incidentOverride]);

  // restore and persist role overrides
  useEffect(() => {
    try {
      const raw = localStorage.getItem("brwRoleOverrides");
      if (raw) setRolesOverride(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("brwRoleOverrides", JSON.stringify(rolesOverride));
    } catch {}
  }, [rolesOverride]);

  // load inzetrollen options
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await loadInzetrollen();
        if (!cancelled) setInzetrollen(items);
      } catch (e) {
        // silently ignore in UI; roles select will be empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Synchroniseer status met globalUnitMovement service en kaartmarker
  useEffect(() => {
    // Luister naar statuswijzigingen van globalUnitMovement service
    const handleUnitStatusChanged = (event: CustomEvent) => {
      const { roepnummer, newStatusCode } = event.detail;
      
      // Normaliseer roepnummer voor matching
      const normalizedEventRoepnummer = normalizeRoepnummer(roepnummer);
      
      // Update status in statusOverride als deze eenheid bestaat in dataset
      setStatusOverride((prev) => {
        // Check of deze eenheid bestaat in de dataset
        const existsInDataset = Object.keys(dataset).some(key => 
          normalizeRoepnummer(key) === normalizedEventRoepnummer
        );
        
        if (!existsInDataset) {
          return prev; // Eenheid niet in BRW dataset
        }
        
        // Update status als deze is veranderd
        const currentStatus = prev[normalizedEventRoepnummer];
        if (currentStatus !== newStatusCode) {
          console.log(`[BRW] Status gesynchroniseerd voor ${roepnummer}: ${currentStatus || 'geen'} -> ${newStatusCode}`);
          return { ...prev, [normalizedEventRoepnummer]: newStatusCode };
        }
        
        return prev;
      });
      
      // Update kaartmarker status
      const statusMap: Record<string, string> = {
        'ov': 'uitrukkend',
        'ut': 'onderweg',
        'tp': 'ter plaatse',
        'ir': 'beschikbaar',
        'bs': 'beschikbaar',
        'kz': 'beschikbaar'
      };
      
      const mapStatus = statusMap[newStatusCode] || 'beschikbaar';
      updateEenheidStatus(roepnummer, mapStatus);
    };

    // Luister naar unitPositionsUpdated events voor statusupdates
    const handleUnitPositionsUpdated = (event: CustomEvent) => {
      const positions = event.detail;
      
      // Import getUnitPosition om statuscodes op te halen
      import('../services/globalUnitMovement').then(({ getUnitPosition }) => {
        Object.keys(positions).forEach((roepnummer) => {
          const position = getUnitPosition(roepnummer);
          if (position && position.statusCode) {
            const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
            
            // Update status in statusOverride
            setStatusOverride((prev) => {
              const currentStatus = prev[normalizedRoepnummer];
              if (currentStatus !== position.statusCode && position.statusCode) {
                return { ...prev, [normalizedRoepnummer]: position.statusCode };
              }
              return prev;
            });
            
            // Update kaartmarker
            const statusMap: Record<string, string> = {
              'ov': 'uitrukkend',
              'ut': 'onderweg',
              'tp': 'ter plaatse',
              'ir': 'beschikbaar',
              'bs': 'beschikbaar',
              'kz': 'beschikbaar'
            };
            
            const mapStatus = statusMap[position.statusCode] || 'beschikbaar';
            updateEenheidStatus(roepnummer, mapStatus);
          }
        });
      });
    };

    // Luister naar unitMovementTick events om statusupdates te synchroniseren
    const handleUnitMovementTick = () => {
      // Haal alle posities op en update statussen
      import('../services/globalUnitMovement').then(({ getUnitPositions }) => {
        const positions = getUnitPositions();
        
        positions.forEach((position, roepnummer) => {
          if (position && position.statusCode) {
            const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
            
            // Check of status is veranderd
            setStatusOverride((prev) => {
              const currentStatus = prev[normalizedRoepnummer];
              if (currentStatus !== position.statusCode && position.statusCode) {
                console.log(`[BRW] Status gesynchroniseerd via tick voor ${roepnummer}: ${currentStatus || 'geen'} -> ${position.statusCode}`);
                return { ...prev, [normalizedRoepnummer]: position.statusCode };
              }
              return prev;
            });
            
            // Update kaartmarker
            const statusMap: Record<string, string> = {
              'ov': 'uitrukkend',
              'ut': 'onderweg',
              'tp': 'ter plaatse',
              'ir': 'beschikbaar',
              'bs': 'beschikbaar',
              'kz': 'beschikbaar'
            };
            
            const mapStatus = statusMap[position.statusCode] || 'beschikbaar';
            updateEenheidStatus(roepnummer, mapStatus);
          }
        });
      });
    };

    window.addEventListener('unitStatusChanged', handleUnitStatusChanged as EventListener);
    window.addEventListener('unitPositionsUpdated', handleUnitPositionsUpdated as EventListener);
    window.addEventListener('unitMovementTick', handleUnitMovementTick as EventListener);

    return () => {
      window.removeEventListener('unitStatusChanged', handleUnitStatusChanged as EventListener);
      window.removeEventListener('unitPositionsUpdated', handleUnitPositionsUpdated as EventListener);
      window.removeEventListener('unitMovementTick', handleUnitMovementTick as EventListener);
    };
  }, [dataset]);

  const allUnits: BrwUnit[] = useMemo(() => {
    console.log("[BRW] Computing allUnits from dataset with", Object.keys(dataset).length, "entries");
    const defaultStatus = getDefaultStatus();
    
    // Haal actuele statussen op uit globalUnitMovement service
    let globalStatuses: Record<string, string> = {};
    try {
      const { getUnitPosition } = require('../services/globalUnitMovement');
      Object.keys(dataset).forEach((roepnummer) => {
        const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
        const position = getUnitPosition(normalizedRoepnummer);
        if (position && position.statusCode) {
          globalStatuses[normalizedRoepnummer] = position.statusCode;
        }
      });
    } catch (e) {
      // Service nog niet beschikbaar, gebruik alleen overrides
    }
    
    const units = Object.entries(dataset).map(([roepnummer, v]) => {
      // Gebruik "kz" (op kazerne) als standaard status
      const baseStatus = defaultStatus.afkorting; // "kz"
      const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
      
      // Prioriteit: globalUnitMovement status > statusOverride > baseStatus
      const globalStatus = globalStatuses[normalizedRoepnummer];
      const overridden = globalStatus || statusOverride[normalizedRoepnummer] || statusOverride[roepnummer] || baseStatus;
      const baseRoles = Array.isArray(v["inzetrollen GMS"]) ? v["inzetrollen GMS"] : [];
      const addedRoles = rolesOverride[roepnummer] ?? [];
      const mergedRoles = Array.from(new Set([...(baseRoles as string[]), ...addedRoles]));
      return {
        roepnummer,
        gmsNaam: v["GMS-naam"] || "",
        nummeringOpEenheid: v["nummering op eenheid"] || "",
        post: v.post || "",
        rollen: mergedRoles,
        alternatieven: Array.isArray(v["alternatief benaming"]) ? v["alternatief benaming"] : [],
        status: overridden,
        locatie: locationOverride[roepnummer] || "",
        incident: incidentOverride[roepnummer] || "",
      } as BrwUnit;
    });
    console.log("[BRW] allUnits computed:", units.length, "units");
    return units;
  }, [dataset, statusOverride, rolesOverride, locationOverride, incidentOverride]);

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of inzetrollen) {
      const code = (r.afkorting || r.benaming_voluit || r.gms_omschrijving || "").trim();
      if (!code) continue;
      const label = r.benaming_voluit && r.benaming_voluit.trim()
        ? `${code} — ${r.benaming_voluit.trim()}`
        : code;
      if (!map.has(code)) map.set(code, label);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, label]) => ({ value, label }));
  }, [inzetrollen]);

  const addRoleToUnit = (roepnummer: string, role: string) => {
    setRolesOverride((prev) => {
      const existing = prev[roepnummer] ?? [];
      if (existing.includes(role)) return prev;
      return { ...prev, [roepnummer]: [...existing, role] };
    });
  };

  const allPosts = useMemo(() => {
    const set = new Set<string>();
    allUnits.forEach((u) => {
      if (u.post && u.post.trim()) set.add(u.post.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allUnits]);

  const filteredUnits = useMemo(() => {
    let list = allUnits;
    if (postFilter !== "alle") list = list.filter((u) => u.post === postFilter);
    if (statusFilter !== "all") {
      if (statusFilter === "in-dienst") {
        // Filter op beschikbare statussen (bs, kz)
        list = list.filter((u) => {
          const statusDef = getStatusDef(u.status);
          return statusDef?.beschikbaar_voor_nieuw_incident === true;
        });
      } else {
        list = list.filter((u) => u.status === statusFilter);
      }
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((u) =>
        u.roepnummer.toLowerCase().includes(q) ||
        u.gmsNaam.toLowerCase().includes(q) ||
        u.post.toLowerCase().includes(q) ||
        u.rollen.some((r) => r.toLowerCase().includes(q)) ||
        u.alternatieven.some((a) => a.toLowerCase().includes(q))
      );
    }
    const sorted = list.sort((a, b) => a.roepnummer.localeCompare(b.roepnummer));
    console.log("[BRW] filteredUnits:", sorted.length, "of", allUnits.length, "units");
    return sorted;
  }, [allUnits, postFilter, statusFilter, query]);

  const getStatusColor = (status: string) => {
    const statusDef = getStatusDef(status);
    if (!statusDef) {
      // Fallback voor oude status strings (backwards compatibility)
      switch (status.toLowerCase()) {
        case "1 - beschikbaar/vrij":
        case "bs":
          return "#90EE90"; // Groen
        case "2 - aanrijdend":
        case "ut":
        case "ar":
          return "#FFD700"; // Goud
        case "3 - ter plaatse":
        case "tp":
          return "#1E90FF"; // Blauw
        case "4 - niet inzetbaar":
        case "ir":
          return "#FF6347"; // Rood
        case "5 - afmelden":
        case "kz":
          return "#D3D3D3"; // Grijs
        default:
          return "#FFFFFF";
      }
    }
    
    // Gebruik status definitie voor kleur
    switch (statusDef.afkorting.toLowerCase()) {
      case "ov":
        return "#FFA500"; // Oranje
      case "ut":
        return "#FFD700"; // Goud
      case "tp":
        return "#1E90FF"; // Blauw
      case "ir":
        return "#FF6347"; // Rood
      case "bs":
        return "#90EE90"; // Groen
      case "kz":
        return "#D3D3D3"; // Grijs
      case "bd":
        return "#808080"; // Donkergrijs
      default:
        return "#FFFFFF";
    }
  };
  
  // Helper om status naam te krijgen
  const getStatusName = (status: string): string => {
    const statusDef = getStatusDef(status);
    if (statusDef) {
      return statusDef.naam;
    }
    // Fallback voor oude formaten
    return status;
  };

  const setUnitStatus = (roepnummer: string, newStatus: string) => {
    const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
    
    // Update lokale state
    setStatusOverride((prev) => ({ ...prev, [normalizedRoepnummer]: newStatus }));
    
    // Synchroniseer met globalUnitMovement service
    import('../services/globalUnitMovement').then(({ assignVehicleToIncident, getUnitPosition }) => {
      const position = getUnitPosition(normalizedRoepnummer);
      if (position) {
        // Als eenheid al bestaat, update status via updateVehicleStatus
        // Dit wordt intern gedaan via de movement service
        console.log(`[BRW] Status handmatig gewijzigd voor ${roepnummer}: ${newStatus}`);
      }
    });
    
    // Update kaartmarker status
    const statusMap: Record<string, string> = {
      'ov': 'uitrukkend',
      'ut': 'onderweg',
      'tp': 'ter plaatse',
      'ir': 'beschikbaar',
      'bs': 'beschikbaar',
      'kz': 'beschikbaar'
    };
    
    const mapStatus = statusMap[newStatus] || 'beschikbaar';
    updateEenheidStatus(roepnummer, mapStatus);
  };

  const setUnitLocation = (roepnummer: string, newLocation: string) => {
    setLocationOverride((prev) => ({ ...prev, [roepnummer]: newLocation }));
  };

  const setUnitIncident = (roepnummer: string, newIncident: string) => {
    setIncidentOverride((prev) => ({ ...prev, [roepnummer]: newIncident }));
  };

  const extractTagsFromStrings = (values: string[]): string[] => {
    const tags = new Set<string>();
    const add = (code: string | null | undefined) => {
      if (!code) return;
      const c = code.trim();
      if (!c) return;
      tags.add(c);
    };
    const addBase = (s: string) => {
      // Prefer family/base code before dash, e.g. TS-4 -> TS, TS-AED -> TS
      const base = s.split("-")[0];
      if (base && /^[A-Z]{2,}$/.test(base)) add(base);
    };
    const synonyms: Array<[RegExp, string]> = [
      [/\btankautospuit\b/i, "TS"],
      [/\bsnel\s*interventie\w*/i, "TS"],
      [/\bhulpverlening\b/i, "HV"],
      [/\bhoogwerker\b/i, "AL"],
      [/\bwaterongevallen\b/i, "WOV"],
      [/\bduik(team)?\b/i, "WO"],
      [/\bofficier van dienst\b/i, "OVD"],
    ];
    for (const v of values) {
      if (!v) continue;
      const s = String(v).trim();
      if (!s) continue;
      // Exact-like codes
      if (/^[A-Z]{2,}(?:[-/][A-Z0-9+]+)?$/.test(s)) {
        addBase(s);
        continue;
      }
      // Find token-style codes inside text
      const tokens = s.split(/[^A-Za-z0-9+\-]+/).filter(Boolean);
      for (const t of tokens) {
        if (/^[A-Z]{2,}(?:-[A-Z0-9+]+)?$/.test(t)) addBase(t);
      }
      // Synonyms
      for (const [re, code] of synonyms) {
        if (re.test(s)) add(code);
      }
    }
    return Array.from(tags).sort();
  };

  const Tag = ({ label }: { label: string }) => (
    <span
      style={{
        display: "inline-block",
        backgroundColor: "#DC143C",
        color: "#fff",
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 12,
        lineHeight: 1.2,
        marginLeft: 6,
        marginTop: 2,
      }}
    >
      {label}
    </span>
  );

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (loading) {
    return (
      <div className="gms-eenheden-container">
        <div className="gms-eenheden-header">
          <div className="gms-eenheden-title">
            <h2>BRW Eenheden Overzicht</h2>
            <div className="gms-eenheden-time">Laden...</div>
          </div>
        </div>
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          Data wordt geladen...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gms-eenheden-container">
        <div className="gms-eenheden-header">
          <div className="gms-eenheden-title">
            <h2>BRW Eenheden Overzicht</h2>
            <div className="gms-eenheden-time">Fout</div>
          </div>
        </div>
        <div style={{ padding: "2rem", textAlign: "center", color: "#d32f2f", backgroundColor: "#ffebee", margin: "1rem", borderRadius: "4px" }}>
          <strong>Fout bij laden:</strong> {error}
          <br />
          <small>Controleer de browser console voor meer details.</small>
        </div>
      </div>
    );
  }

  const totalUnits = allUnits.length;
  const beschikbaar = allUnits.filter((u) => {
    const statusDef = getStatusDef(u.status);
    return statusDef?.afkorting === "bs" || statusDef?.afkorting === "kz" || u.status === "1 - Beschikbaar/vrij";
  }).length;
  const terPlaatse = allUnits.filter((u) => {
    const statusDef = getStatusDef(u.status);
    return statusDef?.afkorting === "tp" || u.status === "3 - Ter plaatse";
  }).length;
  const aanrijdend = allUnits.filter((u) => {
    const statusDef = getStatusDef(u.status);
    return statusDef?.afkorting === "ut" || u.status === "2 - Aanrijdend";
  }).length;
  const metMelding = allUnits.filter((u) => u.rollen.some((r) => r.toLowerCase().includes("melding"))).length;

  console.log("[BRW] Rendering main content. allUnits:", allUnits.length, "filteredUnits:", filteredUnits.length);
  
  return (
    <div className="gms-eenheden-container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="gms-eenheden-header">
        <div className="gms-eenheden-title">
          <h2>BRW Eenheden Overzicht</h2>
          <div className="gms-eenheden-time">{formatTime(now)}</div>
        </div>

        {/* Filters */}
        <div className="gms-filter-controls">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op roepnummer, GMS-naam, post of rol..."
            className="gms-location-input"
            style={{ minWidth: 260, marginRight: 8 }}
          />

          <select
            value={postFilter}
            onChange={(e) => setPostFilter(e.target.value)}
            className="gms-status-filter"
            aria-label="Filter op post"
            style={{ marginRight: 8 }}
          >
            <option value="alle">Alle posten</option>
            {allPosts.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <label htmlFor="status-filter">Filter op status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="gms-status-filter"
            style={{ marginRight: 8 }}
          >
            <option value="all">Alle statussen</option>
            {getAllStatusesSync()
              .filter((status) => status && status.afkorting && typeof status.afkorting === 'string') // Filter null/undefined afkortingen
              .map((status) => (
                <option key={status.afkorting} value={status.afkorting}>
                  {status.afkorting.toUpperCase()} - {status.naam}
                </option>
              ))}
          </select>

          <button
            onClick={() => setStatusFilter('in-dienst')}
            className={`gms-dienst-button ${statusFilter === 'in-dienst' ? 'active' : ''}`}
          >
            Toon in dienst
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="gms-eenheden-scroll-container">
        <div className="gms-eenheden-table-container">
          <table className="gms-eenheden-table">
            <thead>
              <tr className="gms-eenheden-header-row">
                <th>Roepnummer</th>
                <th>Status</th>
                <th>GMS-naam</th>
                <th>Nr. eenheid</th>
                <th>Rollen</th>
                <th>Locatie</th>
                <th>Incident</th>
                <th>Post</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                    {allUnits.length === 0 
                      ? "Geen eenheden geladen. Controleer de console voor fouten."
                      : `Geen eenheden gevonden met de huidige filters. (${allUnits.length} totaal beschikbaar)`}
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                <tr key={unit.roepnummer} className="gms-eenheden-data-row">
                  <td className="gms-eenheden-roepnummer">
                    <strong>{unit.roepnummer}</strong>
                  </td>
                  <td
                    className="gms-eenheden-status"
                    style={{ backgroundColor: getStatusColor(unit.status) }}
                    title={getStatusName(unit.status)}
                  >
                    <select
                      value={unit.status}
                      onChange={(e) => setUnitStatus(unit.roepnummer, e.target.value)}
                      className="gms-status-select"
                    >
                      {getAllStatusesSync()
                        .filter((status) => status && status.afkorting && typeof status.afkorting === 'string') // Filter null/undefined afkortingen
                        .map((status) => (
                          <option key={status.afkorting} value={status.afkorting}>
                            {status.afkorting.toUpperCase()} - {status.naam}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="gms-eenheden-voertuig">{unit.gmsNaam}</td>
                  <td className="gms-eenheden-mensen">{unit.nummeringOpEenheid}</td>
                  <td className="gms-eenheden-rollen">
                    {unit.rollen.join(", ")}
                  </td>
                  <td className="gms-eenheden-locatie">
                    <input
                      type="text"
                      value={unit.locatie || ""}
                      onChange={(e) => setUnitLocation(unit.roepnummer, e.target.value)}
                      className="gms-location-input"
                      placeholder="Locatie..."
                    />
                  </td>
                  <td className="gms-eenheden-incident">
                    <div className="gms-incident-display">
                      {unit.incident ? (
                        <span className="incident-info" title={`Incident: ${unit.incident}`}>
                          📋 {unit.incident.length > 20 ? `${unit.incident.substring(0, 20)}...` : unit.incident}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={unit.incident || ""}
                          onChange={(e) => setUnitIncident(unit.roepnummer, e.target.value)}
                          className="gms-incident-input"
                          placeholder="Incident..."
                        />
                      )}
                    </div>
                  </td>
                  <td className="gms-eenheden-team">{unit.post}</td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="gms-eenheden-footer">
        <div className="gms-eenheden-summary">
          <span>Getoond: {filteredUnits.length} van {totalUnits} eenheden</span>
          <span>Beschikbaar: {beschikbaar}</span>
          <span>Ter plaatse: {terPlaatse}</span>
          <span>Aanrijdend: {aanrijdend}</span>
          <span>Met melding: {allUnits.filter(u => u.incident && u.incident.trim()).length}</span>
        </div>
      </div>
    </div>
  );
}

