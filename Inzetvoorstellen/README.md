# 📘 Standaard Inzetvoorstellen Brandweer (MAR)

Dit bestand beschrijft de basisprincipes voor de **initiële inzetvoorstellen** van de brandweer in Nederland, zoals vastgelegd in de *Standaard Brandweer Landelijke Initiële Meldings- en Alarmeringsregeling (MAR, 22-11-2019)*.  
Het document vormt de **grondslag** voor de inzetlogica in meldkamersystemen zoals **GMS** of simulaties die brandweerinzetten nabootsen.

---

## 🔥 Doel van de MAR

De MAR zorgt voor een **landelijke eenduidigheid** in hoe brandweereenheden worden ingezet bij verschillende soorten incidenten.  
Het bepaalt:
- Wat de **minimale inzet** is om een incident veilig te kunnen afhandelen.
- Hoe meldkamersystemen (zoals GMS) deze inzetbehoefte automatisch omzetten naar een **inzetvoorstel**.
- Hoe **locatiegebonden risico’s** en **objecttypen** de inzet kunnen beïnvloeden.

Het doel is uniformiteit, eenvoudiger beheer van meldkamers en een gestandaardiseerde basis voor toekomstige systemen zoals het **Nieuwe Meldkamer Systeem (NMS)**.

---

## 🧩 Opbouw van de MAR

Een initiële meldings- en alarmeringsregeling (MAR) bestaat uit vijf onderdelen:

1. **Doel van de MAR**  
   Eenduidige inzetbepaling en landelijk uniforme meldkamerwerking.

2. **Initiële inzetmatrix**  
   Basismatrix met inzetbehoeften per incidenttype (brand, ongeval, gevaarlijke stoffen, etc.).

3. **Locatieverzamelingen**  
   Gebieden of zones met specifieke risico’s (bijv. binnenstad, natuurgebied, bluswaterarm).

4. **Risicofactoren**  
   Elementen die extra inzet vragen, zoals gevaarlijke stoffen, werken op hoogte, of complexe gebouwen.

5. **Objecttypen**  
   Specifieke gebouwen of instellingen met verhoogd risico (bijv. woonzorgcomplexen, portiekwoningen).

---

## 🚒 Initiële Inzetmatrix

De initiële inzetmatrix bepaalt de **minimale slagkracht** per incidenttype.

| Type incident | Standaard initiële inzetbehoefte |
|----------------|---------------------------------|
| Brand | 1 TS-4 |
| Brand gebouw | 1 TS-6 |
| Schoorsteenbrand | 1 TS-6 + 1 RV |
| Ongeval | 1 TS-4 |
| Liftopsluiting | 1 TS-4 |
| Water-/weerproblemen | 1 TS-4 |
| Incident gevaarlijke stoffen | 1 TS-4 |
| Waterongeval | 1 TS-4 (+ WO) (+ OR) + OvD |
| Overige incidenten | Naar inzicht centralist of overlegfunctionaris |

**Toelichting:**
- *TS* = Tankautospuit  
- *RV* = Redvoertuig  
- *WO* = Waterongevallenvoertuig  
- *OR* = Oppervlakteredding  
- *OvD* = Officier van Dienst  

De centralist mag direct **opschalen** tot pelotonniveau indien de situatie daarom vraagt.

---

## 📈 Opschalingsniveaus

| Type incident | Middel | Groot | Zeer groot |
|----------------|---------|--------|-------------|
| Brand | 2 TS + OvD | 3 TS + OvD + HOvD | 4 TS + OvD + HOvD/TC |
| Hulpverlening | 2 TS + 1 HV + OvD | 3 TS + 1 HV + OvD + HOvD | 4 TS + 1 HV + OvD + HOvD/TC |
| IBGS (gevaarlijke stoffen) | 2 TS + 1 HV + OvD | 3 TS + 1 HV + OvD + AGS + HOvD | 4 TS + 1 HV + BOE + OvD + HOvD/TC + AGS |
| Waterongeval | 2 TS + 2 WO + 1 OR + OvD | – | – |

---

## 🗺️ Locatieverzamelingen (Gebiedsrisico’s)

Locatieverzamelingen geven aan **waar** een afwijkende of aanvullende inzet nodig is.  
Enkele voorbeelden:

| Locatieverzameling | Extra inzet | Risico / Toelichting |
|---------------------|-------------|----------------------|
| Binnenstad | 2 TS + 1 RV + OvD | Nauwe straten, oude panden, slechte bereikbaarheid |
| Bluswaterarm | 1 TS + 1 GW 1500 | Gebrek aan bluswatervoorziening |
| Natuurgebied | 2 TS | Slechte bereikbaarheid, snelle uitbreiding mogelijk |
| Strand/Duingebied | 2 TS + externe instanties | Slechte bereikbaarheid, externen (KNRM, KWC) vereist |
| Havengebied | 1 TS + 1 HV + OvD | Gevaarlijke stoffen, logistieke risico’s |
| Evenement | 2 TS + 1 RV | Veel publiek, vluchtproblemen |
| Spoorlijn 25kV / 1500V | 1 25kV-team | Elektrocutiegevaar |
| Over water bereikbaar | 1 BRV | Alleen via water bereikbaar |

---

## ⚙️ Risicofactoren

Voorbeelden van risicofactoren die extra inzet kunnen vereisen:
- Werken op hoogte → voeg een **RV** toe  
- Zwaar ongeval → voeg een **HV** toe  
- Vloeistofbrand → voeg een **SB** (schuimblusvoertuig) toe  

De centralist beoordeelt dit op basis van ervaring en meldingsdetails.

---

## 🏢 Objecttypen met standaard extra inzet

Bepaalde objecten genereren automatisch een extra inzet in GMS:

| Objecttypecode | Omschrijving | Extra inzet |
|-----------------|---------------|-------------|
| Wo-02 | Woning in woongebouw | 1 TS + 1 RV |
| Wo-03 | Woning in portiek | 1 TS + 1 RV |
| Wo-04 | Kamerverhuur | 1 TS + 1 RV |
| Wz-02 | Woonzorglocatie in woongebouw | 1 TS + 1 RV |
| Wz-03 | Woonzorglocatie in portiek | 1 TS + 1 RV |

Regio’s kunnen specifieke objecten of bedrijven (zoals BRZO-bedrijven) extra inzetten toewijzen.

---

## 🧠 Toepassing in Simulatie of AI-projecten

Deze MAR-standaard kan gebruikt worden in:
- **AI-gedreven meldkamersimulaties**  
- **Inzetvoorstel-generatoren**  
- **Trainingssoftware voor centralisten**  
- **Automatische alarmerings- of analysemodules**

Voor correcte inzetberekeningen kan het systeem:
- De **LMC-classificatie** (Landelijke Meldingsclassificatie) gebruiken;
- **Locatieverzamelingen** koppelen aan BAG-adressen of coördinaten;
- **Opschalingsniveaus** bepalen op basis van risicofactoren en objecttypen.

---

## 📄 Bronnen

**Document:**  
*Standaard Brandweer Landelijke Initiële Meldings- en Alarmeringsregeling (MAR)*  
Vastgesteld door Brandweer Nederland — RDVR/RBC vergadering op 22 november 2019.

**Gebruik:**  
Deze README is bedoeld als uitleg en implementatierichtlijn voor inzetlogica binnen Cursor AI of andere meldkamersimulaties.

---

© 2019–2025 Brandweer Nederland / Samenvatting & digitalisatie: Cursor AI
