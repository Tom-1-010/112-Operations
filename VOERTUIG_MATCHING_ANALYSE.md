# Analyse: Matching tussen BRW Eenheden en Inzetvoorstellen RT Basis

## Overzicht

Deze analyse bekijkt hoe voertuigtypes uit `BRW eenheden.json` kunnen matchen met voertuigsoorten uit `Inzetvoorstellen RT basis.json`.

## Belangrijkste Bevindingen

### 1. Directe Exacte Matches ✅

| BRW Eenheden | Inzetvoorstellen | Frequentie IV | Opmerking |
|--------------|------------------|---------------|-----------|
| `DV-OVD` | `DV-OVD` | 78x | Exact match |
| `DV-FLO` | `DV-FLO` | 3x | Exact match |
| `DV-HOD` | `DV-HOD` | 27x | Exact match |
| `Tankautospuit` | `Tankautospuit` | 106x | Exact match (basis) |
| `Schuimblusvoertuig` | `Schuimblusvoertuig` | 6x | Exact match |
| `VW` | `VW-LO` | 3x | VW matcht met VW-LO |

### 2. Duidelijke Patroon Matches ✅

| BRW Patroon | Inzetvoorstellen Patroon | Frequentie IV | Opmerking |
|-------------|--------------------------|---------------|-----------|
| `TS*` (TS, TS-AED, TS-NB, TS-IB, etc.) | `Tankautospuit` + varianten | 106x | TS = Tankautospuit |
| `TS*` | `Tankautospuit-IB` | 1x | Industrieel |
| `TS*` | `Tankautospuit-NB` | 8x | Natuur Brand |
| `TS*` | `Tankautospuit-SBB` | 12x | Scheepsbrandbestrijding |
| `TS*` | `Tankautospuit-OPS` | 3x | Opslag |
| `RV*` (RV, RV-AL, RV-HW) | `Redvoertuig` | 21x | RV = Redvoertuig |
| `RV*` | `Redvoertuig inzetbaar t.b.v. afhijsen` | 2x | Speciale variant |
| `WO` / `WOV` | `Waterongevallen voertuig` | 3x | WO = Waterongevallen |
| `WO` / `WOV` | `Watertankwagen grote inhoud minimaal 10.000 l` | 8x | Watertankwagen |
| `HA*` (HA, HA-Z, HA-KR) | `Haakarmbak met scheepsbrand bestrijding materieel` | 15x | Haakarmbak varianten |
| `HA*` | `Haakarmbak Spoorsloot overbruggingsmiddelen` | 5x | Spoorsloot |
| `HA*` | `Adembescherming haakarmbak` | 11x | Adembescherming |
| `SI` | `SI-2` | 10x | SI = Slangenwagen |
| `SV` | `Schuimblusvoertuig` | 6x | SV = Schuimblusvoertuig |
| `SV` | `Hulpverleningsvoertuig` | 7x | Mogelijk ook HV |

### 3. DV (Dienstvoertuig) Varianten ✅

BRW heeft veel `DV-*` varianten die matchen met inzetvoorstellen:

| BRW DV Type | Inzetvoorstellen DV Type | Frequentie IV | Match Type |
|-------------|--------------------------|---------------|------------|
| `DV-OVD` | `DV-OVD` | 78x | ✅ Exact |
| `DV-FLO` | `DV-FLO` | 3x | ✅ Exact |
| `DV-HOD` | `DV-HOD` | 27x | ✅ Exact |
| `DV-AGS` | `DV-AGS` | 36x | ✅ Waarschijnlijk (AGS = Adviseur Gevaarlijke Stoffen) |
| `DV-PR` | `DV-PR` | 7x | ✅ Waarschijnlijk (PR = Piket Redding) |
| `DV-TBO` | `DV-TBO` | 15x | ✅ Waarschijnlijk |
| `DV-TOA` | `DV-TOA` | 23x | ✅ Waarschijnlijk |
| `DV-SBB` | `DV-SBB` | 3x | ✅ Waarschijnlijk (SBB = Scheepsbrandbestrijding) |
| `DV-FRB` | `DV-FRB` | 3x | ✅ Waarschijnlijk |
| `DV-GZD` | `DV-GZD` | 2x | ✅ Waarschijnlijk |
| `DV-OL` | `DV-OL` | 1x | ✅ Waarschijnlijk |
| `DV-OSC` | `DV-OSC` | 1x | ✅ Waarschijnlijk |
| `DV-VL` | `DV-VL` | 2x | ✅ Waarschijnlijk |
| `DVT-VK` | `DVT-VK` | 4x | ✅ Waarschijnlijk |
| `DVT-VKN` | `DVT-VKN` | 4x | ✅ Waarschijnlijk |

### 4. Speciale Matches ✅

| BRW Type | Inzetvoorstellen Type | Frequentie IV | Opmerking |
|----------|----------------------|---------------|-----------|
| `SB` | `OVD-SBB` | 15x | Scheepsbrandbestrijding |
| `SB` | `Tankautospuit-SBB` | 12x | Scheepsbrandbestrijding |
| `SB` | `DV-SBB` | 3x | Scheepsbrandbestrijding |
| `SB` | `Haakarmbak met scheepsbrand bestrijding materieel` | 15x | Scheepsbrandbestrijding |
| `RB` | `DV-FRB` | 3x | Redding/Brand |
| `DPH` | `DPH-W10` | 4x | Dompelpomp |
| `SLH` | `SLH-W25` | 2x | Slangenwagen |
| `TS-SK` | `SK` | 2x | SK = Speciaal |
| `TS-MO` | `TS-MO` | 1x | Metro |
| `HB-OVD` | `HB-OVD` | 28x | Hoofdbrandwacht OvD |
| `ON-*` | `ON-Quick Response team voertuig` | 3x | ON = Ontruiming |
| `ON-*` | `ON-W10` | 4x | ON = Ontruiming |
| `OVD-LON` | `OVD-LON` | 1x | OvD LON |

### 5. Complexe Matches (vereisen context) ⚠️

| BRW Type | Inzetvoorstellen Type | Frequentie IV | Opmerking |
|----------|----------------------|---------------|-----------|
| `MP` | Geen directe match | - | Meetploeg - mogelijk via karakteristieken |
| `DA` | `DV-OVD`? | - | Dienstauto - mogelijk generiek DV |
| `AL` | `Waterongevallen voertuig`? | 3x | Mogelijk via context |
| `HV` | `Hulpverleningsvoertuig`? | 7x | HV = Hulpverleningsvoertuig |
| `HW` | Geen directe match | - | Hoogwerker - mogelijk via karakteristieken |

## Aanbevelingen voor Matching

### Strategie 1: Exacte String Match
- Match eerst op exacte string overeenkomst (bijv. `DV-OVD` = `DV-OVD`)
- Werkt goed voor: DV-OVD, DV-FLO, DV-HOD, Tankautospuit (basis)

### Strategie 2: Prefix Match
- Match op prefix (bijv. `TS*` → `Tankautospuit*`)
- Werkt goed voor: TS varianten, DV varianten, HA varianten, RV varianten

### Strategie 3: Alias Mapping
- Gebruik een mapping tabel voor aliassen:
  - `TS` → `Tankautospuit`
  - `RV` → `Redvoertuig`
  - `WO` / `WOV` → `Waterongevallen voertuig`
  - `SV` → `Schuimblusvoertuig`
  - `SI` → `SI-2` (of generiek SI)
  - `HA` → `Haakarmbak*` (met wildcard)

### Strategie 4: Suffix/Variant Match
- Match op suffix/variant (bijv. `TS-IB` → `Tankautospuit-IB`)
- Werkt goed voor: TS-IB, TS-NB, TS-SBB, etc.

### Strategie 5: Contextuele Match
- Gebruik MC1/MC2/Karakteristieken voor complexe matches
- Bijv. `MP` (Meetploeg) matcht mogelijk alleen bij bepaalde incidenttypes

## Meest Voorkomende Voertuigtypes in Inzetvoorstellen

1. **Tankautospuit** (106x) - Matcht met `TS*` in BRW
2. **DV-OVD** (78x) - Matcht exact met `DV-OVD` in BRW
3. **DV-AGS** (36x) - Matcht met `DV-AGS` in BRW
4. **HB-OVD** (28x) - Matcht met `HB-OVD` in BRW
5. **DV-HOD** (27x) - Matcht exact met `DV-HOD` in BRW
6. **DV-TOA** (23x) - Matcht met `DV-TOA` in BRW
7. **Redvoertuig** (21x) - Matcht met `RV*` in BRW

## Conclusie

**Er is een goede basis voor matching!** 

- **~70-80%** van de voertuigtypes in inzetvoorstellen heeft een duidelijke match met BRW eenheden
- De meeste matches zijn **direct** (exacte string) of **via prefix/suffix** (TS → Tankautospuit)
- **DV-* varianten** matchen goed omdat ze dezelfde notatie gebruiken
- **Speciale voertuigen** (TS-IB, TS-NB, etc.) matchen via suffix matching

**Aanbevolen aanpak:**
1. Start met exacte string matching
2. Voeg prefix matching toe (TS* → Tankautospuit*)
3. Voeg alias mapping toe (RV → Redvoertuig)
4. Gebruik suffix matching voor varianten (TS-IB → Tankautospuit-IB)
5. Voor complexe cases: gebruik context (MC1/MC2/Karakteristieken)

