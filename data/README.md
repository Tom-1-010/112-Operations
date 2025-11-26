# MeldkamerSimulator Databases

Deze directory bevat test databases voor de MeldkamerSimulator.

## Beschikbare Databases

### Basisteams politie
- **Bestand**: `basisteams-politie.json`
- **Beschrijving**: Test database met politie incidenten voor Basisteams
- **Aantal incidenten**: 5
- **Locaties**: Rotterdam (Coolsingel, Blaak, Kruiskade, Witte de Withstraat, Lijnbaan)
- **Prioriteiten**: 0, 1, 2, 3
- **Eenheden**: P-001, P-002, P-003, P-004, P-005

## Database Structuur

Elke database bevat:
- `database_name`: Naam van de database
- `created_at`: Aanmaakdatum
- `description`: Beschrijving van de database
- `incidents`: Array van incident objecten
- `statistics`: Statistieken over de database

## Incident Object

```json
{
  "id": 1,
  "nr": 20250001,
  "prio": 1,
  "tijd": "14:30:00",
  "mc": "Politie",
  "locatie": "Coolsingel 40",
  "plaats": "Rotterdam",
  "coordinates": [4.4777, 51.9244],
  "status": "Gealarmeerd",
  "functie": "Basisteams politie",
  "assignedUnits": [...]
}
```

## Gebruik

Deze databases kunnen worden geïmporteerd in de MeldkamerSimulator voor test doeleinden.


