'use strict';

const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseLenientJson(text) {
  try {
    return JSON.parse(text);
  } catch (_e) {
    let fixed = text;
    fixed = fixed.replace(/:\s*NaN(\s*[,}])/g, ': null$1');
    fixed = fixed.replace(/:\s*Infinity(\s*[,}])/g, ': null$1');
    fixed = fixed.replace(/:\s*-\s*Infinity(\s*[,}])/g, ': null$1');
    return JSON.parse(fixed);
  }
}

function normalizeKey(key) {
  return String(key || '').replace(/\s+/g, '').toLowerCase();
}

function getFirstMatch(raw, patterns) {
  const normalizedPatterns = patterns.map((p) => normalizeKey(p));
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeKey(k);
    for (const p of normalizedPatterns) {
      if (nk.includes(p)) return v;
    }
  }
  return undefined;
}

function toStringOrNull(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

function flattenRaw(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') return [];
  const collected = [];

  function walk(node, topLevelSection) {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const entry of node) {
        if (entry && typeof entry === 'object') {
          const withSection = topLevelSection
            ? { ...entry, ___section: topLevelSection }
            : entry;
          collected.push(withSection);
        }
      }
      return;
    }
    if (typeof node === 'object') {
      const obj = node;
      for (const [key, value] of Object.entries(obj)) {
        const sectionName = topLevelSection ?? key;
        walk(value, sectionName);
      }
    }
  }

  walk(jsonData, null);
  return collected;
}

function loadOfficialRoles(inzetrollenFile) {
  const text = readText(inzetrollenFile);
  const jsonData = parseLenientJson(text);
  const rawRecords = flattenRaw(jsonData);

  const roles = rawRecords.map((raw) => {
    const afkorting = toStringOrNull(
      getFirstMatch(raw, [
        'Soort\nAfkor-\nting',
        'Soort Afkor- ting',
        'SoortAfkorting',
        'Afkorting',
        'Soort',
      ])
    );
    const gmsOmschrijving = toStringOrNull(
      getFirstMatch(raw, [
        'GMS omschrijving materieel type / inzetrol',
        'GMSomschrijving',
        'GMS omschrijving',
        'omschrijving',
      ])
    );
    const benamingVoluit = toStringOrNull(
      getFirstMatch(raw, ['Benaming: uitgeschreven', 'Benaming'])
    );
    const alternatieven = [];
    for (const [key, value] of Object.entries(raw)) {
      if (String(key).startsWith('Vaak passend') && String(key).includes('Alternatief er bij')) {
        const v = toStringOrNull(value);
        if (v) alternatieven.push(v);
      }
    }
    return { afkorting, gmsOmschrijving, benamingVoluit, alternatieven };
  });

  const allAfkortingen = new Set(
    roles
      .map((r) => r.afkorting)
      .filter((v) => !!v)
  );

  // Derive root families (e.g. TS-4 -> TS)
  const rootFamilies = new Set();
  for (const a of allAfkortingen) {
    const root = String(a).split(/[-/]/)[0];
    if (root && allAfkortingen.has(root)) {
      rootFamilies.add(root);
    }
  }

  // Build a basic synonym map from textual descriptions
  // Handful of common mappings to ensure coverage
  const synonyms = new Map();
  const addSyn = (phrase, tag) => {
    const key = phrase.trim().toLowerCase();
    if (!key || !tag) return;
    if (!allAfkortingen.has(tag) && !rootFamilies.has(tag)) return;
    synonyms.set(key, tag);
  };

  // Curated synonyms
  addSyn('tankautospuit', 'TS');
  addSyn('snel interventie', 'TS');
  addSyn('snelinterventie', 'TS');
  addSyn('hulpverlening', 'HV');
  addSyn('hoogwerker', 'AL');
  addSyn('adembescherming', 'ABH');
  addSyn('waterongevallen', 'WOV');
  addSyn('duikteam', 'WO');
  addSyn('verkenning', 'VW');
  addSyn('officier van dienst', 'OVD');
  addSyn('meetploeg', 'WVD');

  // Also auto-learn a few from role descriptions where the afkorting appears in the text
  for (const r of roles) {
    const tag = r.afkorting;
    if (!tag) continue;
    for (const txt of [r.gmsOmschrijving, r.benamingVoluit, ...(r.alternatieven || [])]) {
      if (!txt) continue;
      const t = String(txt).toLowerCase();
      // If full word looks like a family name, add mapping
      if (t.includes('tankautospuit')) addSyn('tankautospuit', 'TS');
      if (t.includes('hulpverlening')) addSyn('hulpverlening', 'HV');
      if (t.includes('hoogwerker')) addSyn('hoogwerker', 'AL');
      if (t.includes('waterongevallen')) addSyn('waterongevallen', 'WOV');
    }
  }

  return { roles, allAfkortingen, rootFamilies, synonyms };
}

function inferTagsFromStrings(values, roleIndex) {
  const { allAfkortingen, rootFamilies, synonyms } = roleIndex;
  const tags = new Set();

  function maybeAdd(code) {
    if (!code) return;
    if (allAfkortingen.has(code)) {
      tags.add(code);
      return true;
    }
    const root = String(code).split(/[-/]/)[0];
    if (root && (allAfkortingen.has(root) || rootFamilies.has(root))) {
      tags.add(root);
      return true;
    }
    return false;
  }

  for (const v of values) {
    if (!v) continue;
    const s = String(v).trim();
    if (!s) continue;

    // 1) Exact match or family match
    if (maybeAdd(s)) continue;

    // 2) Split by non-word separators and try tokens and token families
    const tokens = s.split(/[^A-Za-z0-9+]+/).filter(Boolean);
    for (const t of tokens) {
      if (maybeAdd(t)) continue;
      // Try family of token (e.g. TS-4 like fragments without hyphen retained)
      const m = t.match(/^([A-Z]{2,})/);
      if (m && maybeAdd(m[1])) continue;
    }

    // 3) Synonym phrases
    const low = s.toLowerCase();
    for (const [phrase, tag] of synonyms.entries()) {
      if (low.includes(phrase)) {
        maybeAdd(tag);
      }
    }
  }

  return Array.from(tags);
}

function main() {
  const repoRoot = process.cwd();
  const inzetrollenPath = path.join(repoRoot, 'client', 'public', 'data', 'inzetrollen_raw.json');
  const eenhedenPath = path.join(repoRoot, 'client', 'public', 'data', 'brw_eenheden_structured.json');
  const outPath = path.join(repoRoot, 'client', 'public', 'data', 'brw_eenheden_structured_tagged.json');

  if (!fs.existsSync(inzetrollenPath)) {
    throw new Error(`Not found: ${inzetrollenPath}`);
  }
  if (!fs.existsSync(eenhedenPath)) {
    throw new Error(`Not found: ${eenhedenPath}`);
  }

  const roleIndex = loadOfficialRoles(inzetrollenPath);

  const eenhedenText = readText(eenhedenPath);
  const eenheden = JSON.parse(eenhedenText);

  const entries = Object.entries(eenheden);
  const result = {};

  for (const [key, value] of entries) {
    const obj = value || {};
    const roleStrings = [];
    if (Array.isArray(obj['inzetrollen GMS'])) roleStrings.push(...obj['inzetrollen GMS']);
    if (Array.isArray(obj['alternatief benaming'])) roleStrings.push(...obj['alternatief benaming']);
    if (obj['post']) roleStrings.push(String(obj['post']));
    if (obj['GMS-naam']) roleStrings.push(String(obj['GMS-naam']));

    const tags = inferTagsFromStrings(roleStrings, roleIndex).sort();
    result[key] = { ...obj, tags };
  }

  const outJson = JSON.stringify(result, null, 2);
  fs.writeFileSync(outPath, outJson, 'utf8');

  // Simple summary
  const total = Object.keys(result).length;
  const withTags = Object.values(result).filter((r) => Array.isArray(r.tags) && r.tags.length > 0).length;
  // eslint-disable-next-line no-console
  console.log(`Tagged ${withTags}/${total} eenheden -> ${path.relative(repoRoot, outPath)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
}





















