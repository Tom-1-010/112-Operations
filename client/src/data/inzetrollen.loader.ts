export type Inzetrol = {
  soort: string | null;
  afkorting: string | null;
  gms_omschrijving: string | null;
  typenr_lrnp: number | string | null;
  materieel_functievoertuig: string | null;
  benaming_voluit: string | null;
  criteria_eisen: string | null;
  primair_of_alternatief: string | null;
  alternatieven: string[] | null;
  opmerkingen: string | null;
  datum_aanvraag: string | null;
  datum_akkoord: string | null;
  status: string | null;
  sortering: number | string | null;
  vorige_sortering: number | string | null;
};

type RawRecord = Record<string, unknown>;

function normalizeKey(key: string): string {
  return key.replace(/\s+/g, "").toLowerCase();
}

function getFirstMatch(raw: RawRecord, patterns: string[]): unknown {
  const normalizedPatterns = patterns.map((p) => normalizeKey(p));
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeKey(k);
    for (const p of normalizedPatterns) {
      if (nk.includes(p)) return v;
    }
  }
  return undefined;
}

function toStringOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

function toNumberOrStringOrNull(value: unknown): number | string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (s.length === 0 || s.toLowerCase() === "nat") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
}

function pickAlternatieven(raw: RawRecord): string[] | null {
  const vals: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("Vaak passend") && key.includes("Alternatief er bij")) {
      const v = toStringOrNull(value);
      if (v) vals.push(v);
    }
  }
  return vals.length ? vals : null;
}

function normalizeRecord(raw: RawRecord): Inzetrol {
  const section = toStringOrNull((raw as any).___section);

  const afkorting = toStringOrNull(
    getFirstMatch(raw, [
      "Soort\nAfkor-\nting",
      "Soort Afkor- ting",
      "SoortAfkorting",
      "Afkorting",
      "Soort",
    ])
  );

  const gmsOmschrijving = toStringOrNull(
    getFirstMatch(raw, [
      "GMS omschrijving materieel type / inzetrol",
      "GMSomschrijving",
      "GMS omschrijving",
      "omschrijving",
    ])
  );

  const typenr = toNumberOrStringOrNull(
    getFirstMatch(raw, [
      "Typenr LRNP",
      "TypenrLRNP",
      "Typenr",
    ])
  );

  const materieelFunctie = toStringOrNull(
    getFirstMatch(raw, [
      "Materieel-/",
      "Materieel-",
      "Functievoert",
      "Materieel",
      "Functievoertuig",
    ])
  );

  const benaming = toStringOrNull(
    getFirstMatch(raw, [
      "Benaming: uitgeschreven",
      "Benaming",
    ])
  );

  const criteria = toStringOrNull(
    getFirstMatch(raw, [
      "Criteria / eisen",
      "Criteria",
      "eisen",
    ])
  );

  const primairOfAlt = toStringOrNull(
    getFirstMatch(raw, [
      "primaire of alternatieve soort/rol",
      "primaire",
      "alternatieve",
      "primair",
      "alternatief",
    ])
  );

  const opmerkingen = toStringOrNull(
    getFirstMatch(raw, [
      "Opmerkingen",
      "toelichting",
      "vragen",
      "motivering",
    ])
  );

  const datumAanvraag = toStringOrNull(
    getFirstMatch(raw, [
      "Datum aanvraag",
      "aanvraag",
    ])
  );

  const datumAkkoord = toStringOrNull(
    getFirstMatch(raw, [
      "Datum akkoord",
      "akkoord",
    ])
  );

  const status = toStringOrNull(
    getFirstMatch(raw, [
      "Status voorstel",
      "Status",
    ])
  );

  const sortering = toNumberOrStringOrNull(
    getFirstMatch(raw, [
      "0 sortering",
      "sortering op type",
      "sortering",
    ])
  );

  const vorigeSortering = toNumberOrStringOrNull(
    getFirstMatch(raw, [
      "Vorige 0 sortering",
      "Vorige sortering",
      "vorige",
    ])
  );

  return {
    soort: section,
    afkorting,
    gms_omschrijving: gmsOmschrijving,
    typenr_lrnp: typenr,
    materieel_functievoertuig: materieelFunctie,
    benaming_voluit: benaming,
    criteria_eisen: criteria,
    primair_of_alternatief: primairOfAlt,
    alternatieven: pickAlternatieven(raw),
    opmerkingen,
    datum_aanvraag: datumAanvraag,
    datum_akkoord: datumAkkoord,
    status,
    sortering,
    vorige_sortering: vorigeSortering,
  };
}

function flattenRaw(jsonData: unknown): RawRecord[] {
  if (!jsonData || typeof jsonData !== "object") return [];
  const collected: RawRecord[] = [];

  function walk(node: unknown, topLevelSection: string | null): void {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const entry of node) {
        if (entry && typeof entry === "object") {
          const withSection = topLevelSection
            ? { ...(entry as RawRecord), ___section: topLevelSection }
            : (entry as RawRecord);
          collected.push(withSection);
        } else if (typeof entry === "object") {
          walk(entry, topLevelSection);
        }
      }
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        // Determine section as the first-level property name from root
        const sectionName = topLevelSection ?? key;
        walk(value, sectionName);
      }
    }
  }

  walk(jsonData, null);
  return collected;
}

function parseLenientJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt to fix common non-JSON tokens (NaN, Infinity) when they appear as values
    // Replace patterns like ": NaN,", ": NaN}\n", ": Infinity", ": -Infinity"
    let fixed = text;
    fixed = fixed.replace(/:\s*NaN(\s*[,}])/g, ": null$1");
    fixed = fixed.replace(/:\s*Infinity(\s*[,}])/g, ": null$1");
    fixed = fixed.replace(/:\s*-\s*Infinity(\s*[,}])/g, ": null$1");
    // Do not strip commas globally; that can corrupt arrays/objects. Keep structure intact.
    return JSON.parse(fixed);
  }
}

export async function loadInzetrollen(): Promise<Inzetrol[]> {
  const candidates: string[] = [];
  // Absolute path (works in most dev servers)
  candidates.push(`/data/inzetrollen_raw.json`);
  // Respect base URL if app is served from a sub-path (Vite/other bundlers)
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  candidates.push(`${String(base).replace(/\/$/, "")}/data/inzetrollen_raw.json`);
  // Relative fallbacks for file:// or when opening built index.html directly
  candidates.push(`data/inzetrollen_raw.json`);
  candidates.push(`./data/inzetrollen_raw.json`);

  let lastError: unknown = null;
  let jsonData: unknown;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      jsonData = parseLenientJson(text);
      // eslint-disable-next-line no-console
      console.debug(`[inzetrollen] loaded from`, url);
      break;
    } catch (e) {
      lastError = e;
      // eslint-disable-next-line no-console
      console.warn(`[inzetrollen] failed to load from ${url}`, e);
    }
  }
  if (jsonData === undefined) {
    // eslint-disable-next-line no-console
    console.error(`[inzetrollen] could not load inzetrollen_raw.json from any candidate`, candidates, lastError);
    throw lastError ?? new Error(`Failed to load inzetrollen_raw.json`);
  }

  const rawRecords = flattenRaw(jsonData);
  const items = rawRecords.map(normalizeRecord);

  // Optional: keep stable ordering if available
  items.sort((a, b) => {
    const sa = typeof a.sortering === "number" ? a.sortering : Number(a.sortering ?? 0);
    const sb = typeof b.sortering === "number" ? b.sortering : Number(b.sortering ?? 0);
    if (Number.isFinite(sa) && Number.isFinite(sb)) return (sa as number) - (sb as number);
    return String(a.afkorting ?? "").localeCompare(String(b.afkorting ?? ""));
  });

  return items;
}
