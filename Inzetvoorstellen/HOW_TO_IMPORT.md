# 📘 Hoe Inzetvoorstellen Aanleveren

Dit document legt uit hoe je een lange lijst met inzetvoorstellen kunt aanleveren aan het systeem.

## 📍 Locatie van Bestanden

Het systeem laadt inzetvoorstellen uit één van deze locaties (in volgorde van prioriteit):
1. `client/public/mar_mappings.json` (aanbevolen voor productie)
2. `Inzetvoorstellen/mar_mappings.json` (alternatief)

## 📋 Bestandsformaat

Het bestand moet een JSON array zijn met objecten die één van deze twee structuren hebben:

### 1. Classificatie Mapping (MC1/MC2/MC3)

```json
{
  "Code": "brgb",
  "MC1": "Brand",
  "MC2": "Gebouw",
  "MC3": "",
  "baseInzet": ["1 TS-6"],
  "extraInzet": ["1 RV"],
  "toelichting": "Brand gebouw: 1 TS-6 + 1 RV"
}
```

### 2. Karakteristiek Mapping (ktCode/ktNaam)

```json
{
  "ktNaam": "Inzet Brw functie",
  "ktWaarde": "Off. van Dienst",
  "ktCode": "ibfunc",
  "ktParser": "-inzet brw off van dienst",
  "baseInzet": ["1 DA-OD"],
  "extraInzet": [],
  "toelichting": "Inzet BRW off van dienst: 1 DA-OD",
  "prioriteit": 10
}
```

## 🚀 Methoden om Inzetvoorstellen Aan te Leveren

### Methode 1: Direct JSON Bestand Bewerken

1. Open `client/public/mar_mappings.json` (of maak het aan als het niet bestaat)
2. Voeg je entries toe aan de array
3. Zorg dat de JSON syntax correct is (gebruik een JSON validator)

**Voorbeeld:**
```json
[
  {
    "Code": "brgb",
    "MC1": "Brand",
    "MC2": "Gebouw",
    "MC3": "",
    "baseInzet": ["1 TS-6"],
    "extraInzet": ["1 RV"],
    "toelichting": "Brand gebouw: 1 TS-6 + 1 RV"
  },
  {
    "MC1": "Brand",
    "MC2": "Buiten",
    "MC3": "Container",
    "baseInzet": ["1 TS-6"],
    "extraInzet": [],
    "toelichting": "Brand buiten container"
  }
]
```

### Methode 2: Import Script (Aanbevolen voor Grote Lijsten)

Gebruik het import script om CSV of JSON bestanden te importeren:

#### CSV Format

Maak een CSV bestand met deze kolommen:

```csv
Code,MC1,MC2,MC3,baseInzet,extraInzet,toelichting
brgb,Brand,Gebouw,,1 TS-6,1 RV,Brand gebouw: 1 TS-6 + 1 RV
,Brand,Buiten,Container,1 TS-6,,Brand buiten container
```

Of voor karakteristieken:

```csv
ktCode,ktNaam,ktWaarde,baseInzet,extraInzet,toelichting,prioriteit
ibfunc,Inzet Brw functie,Off. van Dienst,1 DA-OD,,Inzet BRW off van dienst,10
```

**Meerdere eenheden in baseInzet/extraInzet:**
Gebruik `;` of `|` als scheidingsteken:
```csv
Code,MC1,MC2,MC3,baseInzet,extraInzet,toelichting
ogwtpw,Ongeval,Water,Persoon te water,"1 TS-6;1 RV;1 WO;1 DA-OD",,Persoon te water
```

#### Import Uitvoeren

```bash
# Importeer CSV bestand
npx tsx scripts/import-inzetvoorstellen.ts jouw-bestand.csv --format csv

# Importeer JSON bestand
npx tsx scripts/import-inzetvoorstellen.ts jouw-bestand.json --format json

# Valideer zonder weg te schrijven
npx tsx scripts/import-inzetvoorstellen.ts jouw-bestand.csv --validate

# Specificeer output locatie
npx tsx scripts/import-inzetvoorstellen.ts jouw-bestand.csv --output client/public/mar_mappings.json
```

### Methode 3: Excel/Spreadsheet Converteren

1. Exporteer je Excel/Google Sheets bestand naar CSV
2. Zorg dat de kolommen overeenkomen met het CSV format hierboven
3. Gebruik het import script om te importeren

## 📝 Velden Uitleg

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `Code` | string | Nee | LMC classificatie code (bijv. "brgb") |
| `MC1` | string | Ja* | Hoofdcategorie (bijv. "Brand", "Ongeval") |
| `MC2` | string | Nee | Subcategorie (bijv. "Gebouw", "Buiten") |
| `MC3` | string | Nee | Detailcategorie (bijv. "Container") |
| `ktCode` | string | Ja* | Karakteristiek code (alternatief voor MC1) |
| `ktNaam` | string | Nee | Karakteristiek naam |
| `ktWaarde` | string | Nee | Karakteristiek waarde |
| `ktParser` | string | Nee | Parser string voor karakteristiek |
| `baseInzet` | string[] | **Ja** | Array van basis inzet (bijv. `["1 TS-6", "1 RV"]`) |
| `extraInzet` | string[] | Nee | Array van extra inzet |
| `toelichting` | string | Nee | Beschrijving van de mapping |
| `prioriteit` | number | Nee | Prioriteit voor karakteristiek mappings (default: 0) |

\* Je moet OF `MC1` hebben (classificatie mapping) OF `ktCode`/`ktNaam` (karakteristiek mapping)

## ✅ Validatie

Het systeem valideert automatisch:
- ✅ Elke entry heeft minimaal `baseInzet`
- ✅ Elke entry heeft OF `MC1` OF een karakteristiek (`ktCode`/`ktNaam`)
- ✅ Geen duplicaten (op basis van Code of MC1+MC2+MC3 combinatie)

## 🔍 Voorbeelden van Inzet Eenheden

Veelgebruikte eenheden in `baseInzet` en `extraInzet`:
- `1 TS-4` - Tankautospuit 4
- `1 TS-6` - Tankautospuit 6
- `1 RV` - Redvoertuig
- `1 WO` - Waterongevallenvoertuig
- `1 HV` - Hulpverleningsvoertuig
- `1 DA-OD` - Dienstauto Officier van Dienst
- `1 AGS` - Adviseur Gevaarlijke Stoffen
- `1 SB` - Schuimblusvoertuig
- `1 GW` - Grondwaterwagen
- `1 BRV` - Boot Reddingsvoertuig

## 🆘 Hulp Nodig?

Als je problemen hebt met het aanleveren:
1. Controleer de JSON syntax met een validator
2. Gebruik `--validate` flag om te testen zonder weg te schrijven
3. Bekijk het bestaande `mar_mappings.json` bestand als voorbeeld
4. Check de console logs voor waarschuwingen over ontbrekende velden

## 📚 Gerelateerde Documenten

- `Inzetvoorstellen/README.md` - Uitleg over de MAR standaard
- `Inzetvoorstellen/inzetvoorstel-mapping.ts` - Technische implementatie



