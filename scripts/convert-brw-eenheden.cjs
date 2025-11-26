// Convert tab-separated BRW units file into structured JSON
// Input: client/public/data/"BRW eenheden.json" (TSV-like)
// Output: client/public/data/brw_eenheden_structured.json

const fs = require('fs');
const path = require('path');

function toArrayFromDelimited(value) {
  if (!value) return [];
  const cleaned = String(value).trim();
  if (!cleaned) return [];
  // Split on '/', ' / ', ';' and normalize
  return cleaned
    .split(/\s*\/\s*|\s*;\s*|\s*\,\s*/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isRoepnummer(value) {
  return /^\d{2}-\d{4}$/.test(value);
}

function deriveNummeringOpEenheid(roepnummer, gmsNaam) {
  // Prefer from GMS-naam last 2 digits if available, else from roepnummer last 2
  if (gmsNaam && /^\d{6}$/.test(gmsNaam)) {
    return gmsNaam.slice(-2);
  }
  if (roepnummer && isRoepnummer(roepnummer)) {
    return roepnummer.slice(-2);
  }
  return '';
}

function main() {
  const inputPath = path.join(process.cwd(), 'client', 'public', 'data', 'BRW eenheden.json');
  const outputPath = path.join(process.cwd(), 'client', 'public', 'data', 'brw_eenheden_structured.json');

  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const result = {};
  let processed = 0;
  let skipped = 0;

  for (const line of lines) {
    const trimmed = line.replace(/\uFEFF/g, '').trim();
    if (!trimmed) continue; // skip empty lines

    const cols = trimmed.split('\t');
    if (cols.length < 2) {
      skipped++;
      continue;
    }

    const roepnummer = (cols[0] || '').trim();
    const gmsNaam = (cols[1] || '').trim();

    // Enforce minimally a roepnummer or a gmsNaam
    if (!roepnummer && !gmsNaam) {
      skipped++;
      continue;
    }

    // Determine post (penultimate col) and alternatief (last col)
    const post = (cols[cols.length - 2] || '').trim();
    const alternatiefRaw = (cols[cols.length - 1] || '').trim();
    const alternatief = toArrayFromDelimited(alternatiefRaw);

    // Roles are all middle columns from index 2 up to length-2
    const roleSliceEnd = Math.max(2, cols.length - 2);
    const roles = cols
      .slice(2, roleSliceEnd)
      .map((c) => (c || '').trim())
      .filter(Boolean);

    const nummering = deriveNummeringOpEenheid(roepnummer, gmsNaam);

    const key = roepnummer || gmsNaam || `row_${processed + skipped}`;
    result[key] = {
      'GMS-naam': gmsNaam,
      'nummering op eenheid': nummering,
      'inzetrollen GMS': roles,
      post: post,
      'alternatief benaming': alternatief,
    };

    processed++;
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`Converted ${processed} rows. Skipped ${skipped}.`);
  console.log('Output written to', outputPath);
}

main();


