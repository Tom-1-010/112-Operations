import { useState, useEffect } from "react";
import Sidebar from "../components/sidebar";
import StatsGrid from "../components/stats-grid";
import IncidentTable from "../components/incident-table";
import UnitsPanel from "../components/units-panel";
import { useLocalStorage } from "../hooks/use-local-storage";
import { Incident, Unit, Stats } from "../types";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const [incidents, setIncidents] = useLocalStorage<Incident[]>(
    "policeIncidents",
    [],
  );
  interface PoliceUnit {
    id: string;
    roepnaam: string;
    mensen: number;
    rollen: string[];
    voertuigtype: string;
    status: string;
  }

  const [policeUnits, setPoliceUnits] = useLocalStorage<PoliceUnit[]>(
    "policeUnitsDB",
    [
      {
        id: "RT11-01",
        roepnaam: "RT11-01",
        mensen: 2,
        rollen: ["Patrouille", "Noodhulp"],
        voertuigtype: "Audi A6 Avant (Snelle Interventie)",
        status: "Beschikbaar",
      },
      {
        id: "RT11-02",
        roepnaam: "RT11-02",
        mensen: 2,
        rollen: ["Patrouille"],
        voertuigtype: "Mercedes-Benz B‑klasse (Politieauto)",
        status: "Onderweg",
      },
      {
        id: "MT21-01",
        roepnaam: "MT21-01",
        mensen: 1,
        rollen: ["Verkeer", "Surveillance"],
        voertuigtype: "BMW R1250 RT (Motoragent)",
        status: "Beschikbaar",
      },
      {
        id: "BT31-01",
        roepnaam: "BT31-01",
        mensen: 4,
        rollen: ["Surveillance", "Onderzoek"],
        voertuigtype: "Volkswagen Transporter T6 (Bus)",
        status: "Bezig",
      },
      {
        id: "HE41-01",
        roepnaam: "HE41-01",
        mensen: 3,
        rollen: ["Surveillance", "Noodhulp"],
        voertuigtype: "Airbus EC135 (Helikopter)",
        status: "Onderhoud",
      },
    ],
  );

  // Keep old units for compatibility with existing incident system
  const [units, setUnits] = useLocalStorage<Unit[]>("policeUnits", [
    { id: "PC01", type: "patrol", status: "active", name: "5901" },
    { id: "PC02", type: "patrol", status: "busy", name: "5902" },
    { id: "PC03", type: "patrol", status: "inactive", name: "5903" },
    { id: "MC01", type: "motorcycle", status: "active", name: "4501" },
    { id: "MC02", type: "motorcycle", status: "active", name: "4502" },
    { id: "DU01", type: "dog", status: "active", name: "7801" },
    { id: "RU01", type: "riot", status: "inactive", name: "9101" },
    { id: "RU02", type: "riot", status: "inactive", name: "9102" },
  ]);

  const getUnitIcon = (type: string) => {
    switch (type) {
      case "patrol":
        return "truck";
      case "motorcycle":
        return "bicycle";
      case "dog":
        return "heart";
      case "riot":
        return "shield";
      default:
        return "truck";
    }
  };

  const getUnitTypeName = (type: string) => {
    switch (type) {
      case "patrol":
        return "Patrouillewagen";
      case "motorcycle":
        return "Motoragent";
      case "dog":
        return "Hondeneenheid";
      case "riot":
        return "ME-eenheid";
      default:
        return type;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case "active":
        return "Actief";
      case "inactive":
        return "Inactief";
      case "busy":
        return "Bezet";
      default:
        return status;
    }
  };

  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [newUnit, setNewUnit] = useState<Omit<PoliceUnit, "id">>({
    roepnaam: "",
    mensen: 2,
    rollen: [],
    voertuigtype: "",
    status: "Beschikbaar",
  });

  const vehicleTypes = [
    "Audi A6 Avant (Snelle Interventie)",
    "BMW R1250 RT (Motoragent)",
    "Mercedes-Benz B‑klasse (Politieauto)",
    "Volkswagen Transporter T6 (Bus)",
    "Airbus EC135 (Helikopter)",
  ];

  const inzetRollen = [
    "Patrouille",
    "Verkeer",
    "Surveillance",
    "Noodhulp",
    "Onderzoek",
  ];

  const npStatuses = ["Beschikbaar", "Onderweg", "Bezig", "Onderhoud"];

  const addNewUnit = () => {
    if (
      !newUnit.roepnaam ||
      !newUnit.voertuigtype ||
      newUnit.rollen.length === 0
    ) {
      alert("Vul alle verplichte velden in.");
      return;
    }

    const unitToAdd: PoliceUnit = {
      ...newUnit,
      id: newUnit.roepnaam,
    };

    setPoliceUnits((prev) => [...prev, unitToAdd]);
    setNewUnit({
      roepnaam: "",
      mensen: 2,
      rollen: [],
      voertuigtype: "",
      status: "Beschikbaar",
    });
    setShowAddUnitForm(false);
    showNotificationMessage("Nieuwe eenheid toegevoegd");
  };

  const handleDeleteAllIncidents = () => {
    // Clear incidents from localStorage
    localStorage.removeItem("incidenten");

    // Clear all incident logs
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("incident_logs_")) {
        localStorage.removeItem(key);
      }
    });

    // Close the modal
    setShowDeleteConfirmModal(false);

    // Show success message
    showNotificationMessage("Alle incidenten zijn verwijderd.");

    // Refresh the incidents list if on the incidents page
    if (activeSection === "incidents") {
      const incidentsList = document.getElementById("allIncidentsLegacyList");
      if (incidentsList) {
        incidentsList.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #666; grid-column: 1 / -1;">
            Geen incidenten gevonden
          </div>
        `;
      }
    }
  };

  const toggleRole = (role: string) => {
    setNewUnit((prev) => ({
      ...prev,
      rollen: prev.rollen.includes(role)
        ? prev.rollen.filter((r) => r !== role)
        : [...prev.rollen, role],
    }));
  };

  // Enhanced basisteams interface with regional organization
  interface BasisTeam {
    code: string;
    naam: string;
    gemeenten: string[];
    regio: string;
  }

  // Complete basisteams database for Regionale Eenheid Rotterdam
  // GMS Classifications database
  interface GmsClassification {
    code: string;
    mc1: string;
    mc2: string;
    mc3: string;
    prio: number;
    definitie: string;
  }

  // Comprehensive GMS Classification Database from official Dutch police data
  const gmsClassificationsData: GmsClassification[] = [
    // Alarm classifications
    { code: "al", mc1: "Alarm", mc2: "", mc3: "", prio: 5, definitie: "Alle soorten alarmen van detectiesystemen die rechtstreeks op de meldkamer binnenkomen" },
    { code: "alab", mc1: "Alarm", mc2: "Autom. brand", mc3: "", prio: 2, definitie: "Alarmen van aangesloten OMS die direct op de meldkamer binnenkomen" },
    { code: "alabab", mc1: "Alarm", mc2: "Autom. brand", mc3: "Autom. brand OMS", prio: 2, definitie: "Melding via OMS van inwerkingtreding van een automatische brandmelder" },
    { code: "alabbb", mc1: "Alarm", mc2: "Autom. brand", mc3: "Br beheerssysteem", prio: 2, definitie: "Melding via OMS van inwerkingtreding van een automatische blusinstallatie" },
    { code: "alabbm", mc1: "Alarm", mc2: "Autom. brand", mc3: "Brandmelding PAC", prio: 2, definitie: "Binnenkomende brandmeldingen via de PAC van op PAC aangesloten automatische branddetectiesystemen" },
    { code: "alabdk", mc1: "Alarm", mc2: "Autom. brand", mc3: "Drukknopmelding OMS", prio: 2, definitie: "Melding via het OMS van een aangesloten handmelder in controle-/portiersruimtes" },
    { code: "alabhm", mc1: "Alarm", mc2: "Autom. brand", mc3: "Handmelder OMS", prio: 2, definitie: "Brandmeldingen op de meldkamer die direct binnenkomen via de aangesloten OMS" },
    { code: "algs", mc1: "Alarm", mc2: "Autom. Gev stof", mc3: "", prio: 2, definitie: "Automatische meldingen van ontsnapping van een gevaarlijke stof via OMS" },
    { code: "algsom", mc1: "Alarm", mc2: "Autom. Gev stof", mc3: "Gev. stof OMS", prio: 2, definitie: "Melding via OMS van detectie van een gevaarlijke stof" },
    { code: "algspa", mc1: "Alarm", mc2: "Autom. Gev stof", mc3: "Gev. stof PAC", prio: 2, definitie: "Binnenkomende meldingen via PAC van gevaarlijke stof detectiesystemen" },
    { code: "alas", mc1: "Alarm", mc2: "Autom. systeemmelding", mc3: "", prio: 4, definitie: "Binnenkomende meldingen via OMS waarvoor geen repressieve brandweer inzet nodig is" },
    { code: "alhw", mc1: "Alarm", mc2: "Hoog water alarm", mc3: "", prio: 4, definitie: "Alarmen/waarschuwingen afgegeven door Rijkswaterstaat/waterschappen" },
    { code: "allo", mc1: "Alarm", mc2: "Luid/optisch alarm", mc3: "", prio: 3, definitie: "Melding dat ergens een luid/optisch alarm hoor- of zichtbaar is" },
    { code: "alloco", mc1: "Alarm", mc2: "Luid/optisch alarm", mc3: "CO-melder", prio: 3, definitie: "CO-melder alarm" },
    { code: "allogb", mc1: "Alarm", mc2: "Luid/optisch alarm", mc3: "Gebouw", prio: 3, definitie: "Luid/optisch alarm uit/in of aan een gebouw" },
    { code: "allorm", mc1: "Alarm", mc2: "Luid/optisch alarm", mc3: "Rookmelder", prio: 3, definitie: "Rookmelder hoorbaar in object zonder brandindiciaties" },
    { code: "allovv", mc1: "Alarm", mc2: "Luid/optisch alarm", mc3: "Voertuig/Vaartuig", prio: 3, definitie: "Luid/optisch alarm uit/in of aan voer-/vaartuig" },
    { code: "alpa", mc1: "Alarm", mc2: "PAC alarm", mc3: "", prio: 2, definitie: "Alarmmeldingen die via de PAC op de meldkamer binnenkomen" },
    { code: "alpaib", mc1: "Alarm", mc2: "PAC alarm", mc3: "Inbraakalarm", prio: 2, definitie: "Inbraakmeldingen via PAC van aangesloten inbraakdetectiesystemen" },
    { code: "alpaov", mc1: "Alarm", mc2: "PAC alarm", mc3: "Overvalalarm", prio: 2, definitie: "Drukknop overvalmeldingen via de PAC aan de meldkamer doorgegeven" },
    { code: "alpaps", mc1: "Alarm", mc2: "PAC alarm", mc3: "Persoonsalarm", prio: 1, definitie: "Melding via PAC van persoonsgebonden noodoproepsysteem" },
    { code: "alra", mc1: "Alarm", mc2: "RAC alarm", mc3: "", prio: 1, definitie: "Inbraakmeldingen die via de RAC binnenkomen" },
    { code: "alraib", mc1: "Alarm", mc2: "RAC alarm", mc3: "Inbraakalarm", prio: 1, definitie: "Inbraakmeldingen via RAC van aangesloten inbraakdetectiesystemen" },
    { code: "alraov", mc1: "Alarm", mc2: "RAC alarm", mc3: "Overvalalarm", prio: 1, definitie: "Drukknop overvalmeldingen via RAC aan de meldkamer doorgegeven" },
    { code: "alraps", mc1: "Alarm", mc2: "RAC alarm", mc3: "Persoonsalarm", prio: 1, definitie: "Rechtstreekse melding van persoonsgebonden noodoproepsysteem" },
    { code: "alse", mc1: "Alarm", mc2: "Sensing", mc3: "", prio: 2, definitie: "Sensing systeem alarm" },
    { code: "alseal", mc1: "Alarm", mc2: "Sensing", mc3: "Alert", prio: 2, definitie: "Hit vanuit sensing systemen ten behoeve van grensbewaking" },
    { code: "alseah", mc1: "Alarm", mc2: "Sensing", mc3: "ANPR-hit", prio: 2, definitie: "ANPR detectie hit" },
    { code: "alseom", mc1: "Alarm", mc2: "Sensing", mc3: "Opsporingsmiddel", prio: 2, definitie: "Opsporingsmiddel detectie" },
    { code: "alsetz", mc1: "Alarm", mc2: "Sensing", mc3: "Toezichtsalarm", prio: 1, definitie: "GPS-alarm van gedetineerde of TBS'er die voorwaarden niet opvolgt" },
    { code: "altu", mc1: "Alarm", mc2: "Tunnelalarm", mc3: "", prio: 2, definitie: "Automatische alarmmelding vanuit tunnel zonder brandmelding indicatie" },
    { code: "alma", mc1: "Alarm", mc2: "Weeralarm", mc3: "", prio: 4, definitie: "Alarmen/waarschuwingen afgegeven door meteorologische diensten" },
    
    // Bezitsaantasting classifications
    { code: "bz", mc1: "Bezitsaantasting", mc2: "", mc3: "", prio: 5, definitie: "Aantasting van andermans bezit of een poging daartoe" },
    { code: "bzds", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "", prio: 3, definitie: "Het wegnemen of toe-eigenen van enig goed dat aan een ander toebehoort" },
    { code: "bzdsap", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Afpersing", prio: 3, definitie: "Wederrechtelijk bevoordelen door dwingen door geweld/smaad/laster" },
    { code: "bzdsbr", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Beroving", prio: 1, definitie: "Met geweld of dreiging persoon of goederen beroven in openbare ruimte" },
    { code: "bzdsdi", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Dier", prio: 3, definitie: "Diefstal van een dier" },
    { code: "bzdsfd", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Fraude", prio: 3, definitie: "Misleiden of bedriegen met als doel oneerlijk voordeel te verkrijgen" },
    { code: "bzdsgd", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Goederen", prio: 3, definitie: "Diefstal van goederen" },
    { code: "bzdshl", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Heling", prio: 3, definitie: "Afnemen, verkopen of verhandelen van gestolen goederen" },
    { code: "bzdslu", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Luchtvaartuig", prio: 3, definitie: "Diefstal van een luchtvaartuig" },
    { code: "bzdsol", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Oplichting", prio: 3, definitie: "Bewegen tot afgifte van goed door bedrieglijke middelen" },
    { code: "bzdsva", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Vaartuig", prio: 3, definitie: "Diefstal van een vaartuig" },
    { code: "bzdsvd", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Verduistering", prio: 3, definitie: "Opzettelijk en wederrechtelijk toe-eigenen van goed anders verkregen" },
    { code: "bzdsvo", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Voertuig", prio: 3, definitie: "Diefstal van een voertuig" },
    { code: "bzdswk", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Winkeldiefstal", prio: 2, definitie: "Diefstal uit een winkel" },
    { code: "bzdszk", mc1: "Bezitsaantasting", mc2: "Diefstal", mc3: "Zakkenrollerij", prio: 3, definitie: "Diefstal door een zakkenroller" },
    { code: "bzib", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "", prio: 3, definitie: "Door braak zich wederrechtelijk toegang verschaffen met oogmerk diefstal" },
    { code: "bzibbi", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "Bedrijf/Instelling", prio: 2, definitie: "Inbraak in bedrijf of instelling met oogmerk diefstal" },
    { code: "bzibbg", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "Bijgebouw", prio: 2, definitie: "Inbraak in bijgebouw met oogmerk diefstal" },
    { code: "bziblu", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "Luchtvaartuig", prio: 2, definitie: "Inbraak in luchtvaartuig met oogmerk diefstal" },
    { code: "bzibsp", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "Spoorvervoer", prio: 2, definitie: "Inbraak in railvoertuig met oogmerk diefstal" },
    { code: "bzibva", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "Vaartuig", prio: 2, definitie: "Inbraak in vaartuig met oogmerk diefstal" },
    { code: "bzibvo", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "Voertuig", prio: 2, definitie: "Inbraak in voertuig met oogmerk diefstal" },
    { code: "bzibwn", mc1: "Bezitsaantasting", mc2: "Inbraak", mc3: "Woning", prio: 2, definitie: "Inbraak in woning met oogmerk diefstal" },
    { code: "bzov", mc1: "Bezitsaantasting", mc2: "Overval", mc3: "", prio: 1, definitie: "Dwingen tot afgifte van goed door geweld met voorbedachte rade" },
    { code: "bzovbi", mc1: "Bezitsaantasting", mc2: "Overval", mc3: "Bedrijf/Instelling", prio: 1, definitie: "Geplande overval op bedrijf of instelling" },
    { code: "bzovlu", mc1: "Bezitsaantasting", mc2: "Overval", mc3: "Luchtvaartuig", prio: 1, definitie: "Geplande overval op of in luchtvaartuig niet zijnde kaping" },
    { code: "bzovvv", mc1: "Bezitsaantasting", mc2: "Overval", mc3: "Voertuig/Vaartuig", prio: 1, definitie: "Geplande overval op voer- of vaartuig" },
    { code: "bzovwd", mc1: "Bezitsaantasting", mc2: "Overval", mc3: "Waardetransport", prio: 1, definitie: "Met geweld wegnemen van goed van waardetransport" },
    { code: "bzovwn", mc1: "Bezitsaantasting", mc2: "Overval", mc3: "Woning", prio: 1, definitie: "Geplande overval op particulier persoon vaak binnenshuis" },
    { code: "bzsp", mc1: "Bezitsaantasting", mc2: "Stroperij", mc3: "", prio: 2, definitie: "Zonder geweld wegnemen van veldvruchten, dieren met oogmerk toe-eigening" },
    { code: "bzspdi", mc1: "Bezitsaantasting", mc2: "Stroperij", mc3: "Dier", prio: 2, definitie: "Zonder geweld wegnemen van dieren met oogmerk toe-eigening" },
    { code: "bzspgd", mc1: "Bezitsaantasting", mc2: "Stroperij", mc3: "Goederen", prio: 2, definitie: "Zonder geweld wegnemen van klei, bagger, veldvruchten" },
    { code: "bzvn", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "", prio: 3, definitie: "Opzettelijk en wederrechtelijk vernielen van goed dat aan ander toebehoort" },
    { code: "bzvngb", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "Gebouw", prio: 3, definitie: "Vernieling van gebouw" },
    { code: "bzvngd", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "Goederen", prio: 3, definitie: "Vernieling van goederen" },
    { code: "bzvngf", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "Graffiti", prio: 3, definitie: "Vernieling door graffiti" },
    { code: "bzvnlu", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "Luchtvaartuig", prio: 3, definitie: "Vernieling van luchtvaartuig" },
    { code: "bzvnsp", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "Spoorvervoer", prio: 3, definitie: "Vernieling van spoorvervoer" },
    { code: "bzvnva", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "Vaartuig", prio: 3, definitie: "Vernieling van vaartuig" },
    { code: "bzvnvo", mc1: "Bezitsaantasting", mc2: "Vernieling", mc3: "Voertuig", prio: 3, definitie: "Vernieling van voertuig" },
    
    // Brand classifications
    { code: "br", mc1: "Brand", mc2: "", mc3: "", prio: 5, definitie: "Incident waarbij het primair om brand gaat of explosie met brand als effect" },
    { code: "brbg", mc1: "Brand", mc2: "Bijgebouw", mc3: "", prio: 1, definitie: "Brand in bijgebouw dat dienstbaar is aan hoofdgebouw" },
    { code: "brbt", mc1: "Brand", mc2: "Buiten", mc3: "", prio: 2, definitie: "Alle buitenbrandmeldingen, geen industrie/natuur/vervoer/scenario" },
    { code: "brbtar", mc1: "Brand", mc2: "Buiten", mc3: "Afval/Rommel", prio: 2, definitie: "Brandmelding van afval/rommel buiten industriële objecten" },
    { code: "brbtbb", mc1: "Brand", mc2: "Buiten", mc3: "Berm/Ruigte/Bosschage", prio: 2, definitie: "Brandmelding van begroeiing niet zijnde bos/heide/veen/riet" },
    { code: "brbtct", mc1: "Brand", mc2: "Buiten", mc3: "Container", prio: 2, definitie: "Brandmelding van containers/bakken voor opslag afval" },
    { code: "brbtid", mc1: "Brand", mc2: "Buiten", mc3: "Industrie", prio: 2, definitie: "Brandmelding van industrieel aangemerkt terrein" },
    { code: "brgb", mc1: "Brand", mc2: "Gebouw", mc3: "", prio: 1, definitie: "Brandmeldingen van/in gebouwen niet zijnde industrie of speciale scenario's" },
    { code: "brgb01", mc1: "Brand", mc2: "Gebouw", mc3: "01 Woning/Woongebouw", prio: 1, definitie: "Brand in woning of woongebouw" },
    { code: "brgb02", mc1: "Brand", mc2: "Gebouw", mc3: "02 Bijeenkomst", prio: 1, definitie: "Brand in bijeenkomstgebouw" },
    { code: "brgb03", mc1: "Brand", mc2: "Gebouw", mc3: "03 Cel", prio: 1, definitie: "Brand in cellengebouw" },
    { code: "brgb04", mc1: "Brand", mc2: "Gebouw", mc3: "04 Gezondheidszorg", prio: 1, definitie: "Brand in gezondheidsgebouw" },
    { code: "brgb05", mc1: "Brand", mc2: "Gebouw", mc3: "05 Agrarisch", prio: 1, definitie: "Brand in agrarisch gebouw" },
    { code: "brgb06", mc1: "Brand", mc2: "Gebouw", mc3: "06 Kantoor", prio: 1, definitie: "Brand in kantoorgebouw" },
    { code: "brgb07", mc1: "Brand", mc2: "Gebouw", mc3: "07 Logies", prio: 1, definitie: "Brand in logiesgebouw" },
    { code: "brgb08", mc1: "Brand", mc2: "Gebouw", mc3: "08 Onderwijs", prio: 1, definitie: "Brand in onderwijsgebouw" },
    { code: "brgb09", mc1: "Brand", mc2: "Gebouw", mc3: "09 Sport", prio: 1, definitie: "Brand in sportgebouw" },
    { code: "brgb10", mc1: "Brand", mc2: "Gebouw", mc3: "10 Winkel", prio: 1, definitie: "Brand in winkelgebouw" },
  ];

  const basisteamsData: BasisTeam[] = [
    // Rotterdam Stadsregio (A-teams)
    {
      code: "A001",
      naam: "Basisteam Waterweg",
      gemeenten: ["Vlaardingen", "Maassluis", "Hoek van Holland"],
      regio: "Rotterdam Stadsregio",
    },
    {
      code: "A2",
      naam: "Centrum",
      gemeenten: ["Rotterdam"],
      regio: "Rotterdam Stadsregio",
    },
    {
      code: "A3",
      naam: "Noord",
      gemeenten: ["Rotterdam"],
      regio: "Rotterdam Stadsregio",
    },
    {
      code: "A4",
      naam: "Oost",
      gemeenten: ["Rotterdam", "Capelle aan den IJssel"],
      regio: "Rotterdam Stadsregio",
    },
    {
      code: "A5",
      naam: "Zuid",
      gemeenten: ["Rotterdam", "Barendrecht"],
      regio: "Rotterdam Stadsregio",
    },
    {
      code: "A6",
      naam: "West",
      gemeenten: ["Rotterdam"],
      regio: "Rotterdam Stadsregio",
    },
    {
      code: "A7",
      naam: "IJsselmonde",
      gemeenten: ["Rotterdam"],
      regio: "Rotterdam Stadsregio",
    },
    {
      code: "A8",
      naam: "Charlois",
      gemeenten: ["Rotterdam"],
      regio: "Rotterdam Stadsregio",
    },

    // Voorne-Putten & Eilanden (B-teams)
    {
      code: "B1",
      naam: "Voorne-Putten",
      gemeenten: ["Hellevoetsluis", "Brielle", "Westvoorne"],
      regio: "Voorne-Putten",
    },
    {
      code: "B2",
      naam: "Hoeksche Waard",
      gemeenten: ["Hoeksche Waard", "Binnenmaas"],
      regio: "Voorne-Putten",
    },
    {
      code: "B3",
      naam: "Goeree-Overflakkee",
      gemeenten: ["Goeree-Overflakkee"],
      regio: "Goeree-Overflakkee",
    },

    // Drechtsteden & Molenwaard (C-teams)
    {
      code: "C1",
      naam: "Drechtsteden Noord",
      gemeenten: ["Dordrecht", "Zwijndrecht", "Papendrecht"],
      regio: "Drechtsteden",
    },
    {
      code: "C2",
      naam: "Drechtsteden Zuid",
      gemeenten: ["Alblasserdam", "Hendrik-Ido-Ambacht", "Sliedrecht"],
      regio: "Drechtsteden",
    },
    {
      code: "C3",
      naam: "Molenwaard",
      gemeenten: ["Molenwaard", "Liesveld"],
      regio: "Molenwaard",
    },

    // Westland & Midden-Delfland (D-teams)
    {
      code: "D1",
      naam: "Westland",
      gemeenten: ["Westland"],
      regio: "Westland",
    },
    {
      code: "D2",
      naam: "Midden-Delfland",
      gemeenten: ["Midden-Delfland", "Delft"],
      regio: "Westland",
    },
    {
      code: "D3",
      naam: "Lansingerland",
      gemeenten: ["Lansingerland", "Pijnacker-Nootdorp"],
      regio: "Westland",
    },

    // Den Haag Regio (E-teams)
    {
      code: "E1",
      naam: "Rijswijk",
      gemeenten: ["Rijswijk", "Voorburg", "Leidschendam-Voorburg"],
      regio: "Den Haag",
    },
    {
      code: "E2",
      naam: "Zoetermeer",
      gemeenten: ["Zoetermeer", "Waddinxveen"],
      regio: "Den Haag",
    },
    {
      code: "E3",
      naam: "Zuidas",
      gemeenten: ["Zuidplas", "Nieuwkoop"],
      regio: "Den Haag",
    },
  ];

  // Initialize localStorage if not present
  if (typeof window !== "undefined" && !localStorage.getItem("basisteams")) {
    localStorage.setItem("basisteams", JSON.stringify(basisteamsData));
  }

  // Initialize GMS classifications in localStorage
  if (
    typeof window !== "undefined" &&
    !localStorage.getItem("gmsClassifications")
  ) {
    localStorage.setItem(
      "gmsClassifications",
      JSON.stringify(gmsClassificationsData),
    );
  }

  const [basisTeams] = useLocalStorage<BasisTeam[]>(
    "basisteams",
    basisteamsData,
  );

  const [gmsClassifications] = useLocalStorage<GmsClassification[]>(
    "gmsClassifications",
    gmsClassificationsData,
  );

  // GMS Classification database helper functions
  const searchGmsClassifications = (query: string): GmsClassification[] => {
    const storedClassifications = JSON.parse(
      localStorage.getItem("gmsClassifications") || "[]",
    );
    if (!query) return storedClassifications;

    const lowerQuery = query.toLowerCase();
    return storedClassifications.filter(
      (classification: GmsClassification) =>
        classification.code.toLowerCase().includes(lowerQuery) ||
        classification.mc1.toLowerCase().includes(lowerQuery) ||
        classification.mc2.toLowerCase().includes(lowerQuery) ||
        classification.mc3.toLowerCase().includes(lowerQuery) ||
        classification.definitie.toLowerCase().includes(lowerQuery),
    );
  };

  const getClassificationByCode = (
    code: string,
  ): GmsClassification | undefined => {
    const storedClassifications = JSON.parse(
      localStorage.getItem("gmsClassifications") || "[]",
    );
    return storedClassifications.find(
      (classification: GmsClassification) => classification.code === code,
    );
  };

  const getUniqueClassificationsByLevel = (
    level: "mc1" | "mc2" | "mc3",
    parentValue?: string,
  ): string[] => {
    const storedClassifications = JSON.parse(
      localStorage.getItem("gmsClassifications") || "[]",
    ) as GmsClassification[];
    let filtered = storedClassifications;

    // Filter by parent value if provided
    if (level === "mc2" && parentValue) {
      filtered = storedClassifications.filter(
        (c: GmsClassification) => c.mc1 === parentValue,
      );
    } else if (level === "mc3" && parentValue) {
      filtered = storedClassifications.filter(
        (c: GmsClassification) => c.mc2 === parentValue,
      );
    }

    const values = filtered
      .map((c: GmsClassification) => c[level])
      .filter(Boolean);
    const uniqueValues: string[] = [];
    values.forEach((value) => {
      if (value && !uniqueValues.includes(value)) {
        uniqueValues.push(value);
      }
    });
    return uniqueValues.sort();
  };

  const incidentTypes = [
    "Diefstal",
    "Verkeersongeval",
    "Vermiste persoon",
    "Huiselijk geweld",
    "Inbraak",
    "Openbare orde verstoring",
    "Bedreiging",
    "Geweld",
    "Drugsdelict",
    "Vandalisme",
    "Fraude",
    "Overlast",
  ];

  const locations = [
    "Marktplein 15, Amsterdam",
    "Hoofdstraat 42, Rotterdam",
    "Kerkstraat 8, Utrecht",
    "Stationsweg 156, Den Haag",
    "Dorpsstraat 23, Eindhoven",
    "Schoolstraat 67, Groningen",
    "Nieuwstraat 89, Tilburg",
    "Oude Gracht 34, Utrecht",
    "Kalverstraat 123, Amsterdam",
    "Binnenhof 2, Den Haag",
    "Witte de Withstraat 45, Rotterdam",
    "Grote Markt 12, Haarlem",
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update incident times every second
  useEffect(() => {
    const timer = setInterval(() => {
      setIncidents((prev) =>
        prev.map((incident) => {
          const now = new Date();
          const timeDiff = Math.floor(
            (now.getTime() - new Date(incident.timestamp).getTime()) /
              1000 /
              60,
          );
          return { ...incident, timeAgo: timeDiff + " min geleden" };
        }),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [setIncidents]);

  // GMS functionality
  useEffect(() => {
    const initializeGMS = () => {
      // Initialize current time in the GMS form
      const updateGMSTime = () => {
        const timeInput = document.getElementById(
          "gmsTijdstip",
        ) as HTMLInputElement;
        if (timeInput) {
          const now = new Date();
          const localDateTime = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);
          timeInput.value = localDateTime;
        }
      };

      // Update GMS status bar with live Dutch date and time
      const updateGMSStatusDateTime = () => {
        const statusElement = document.getElementById("gmsStatusDateTime");
        if (statusElement) {
          const now = new Date();

          // Dutch day names
          const dayNames = [
            "Zondag",
            "Maandag",
            "Dinsdag",
            "Woensdag",
            "Donderdag",
            "Vrijdag",
            "Zaterdag",
          ];
          const monthNames = [
            "januari",
            "februari",
            "maart",
            "april",
            "mei",
            "juni",
            "juli",
            "augustus",
            "september",
            "oktober",
            "november",
            "december",
          ];

          const dayName = dayNames[now.getDay()];
          const day = now.getDate();
          const month = monthNames[now.getMonth()];
          const year = now.getFullYear();
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          const seconds = String(now.getSeconds()).padStart(2, "0");

          const formattedDateTime = `${dayName} ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
          statusElement.textContent = formattedDateTime;
        }
      };

      // Handle GMS form submission
      const handleGMSSubmit = () => {
        const kladblok = document.getElementById("gmsKladblok");

        // Melder informatie
        const meldernaam = document.getElementById(
          "gmsMeldernaam",
        ) as HTMLInputElement;
        const melderadres = document.getElementById(
          "gmsMelderadres",
        ) as HTMLInputElement;
        const telefoonnummer = document.getElementById(
          "gmsTelefoonnummer",
        ) as HTMLInputElement;

        // Melding locatie (new address fields)
        const straatnaam = document.getElementById(
          "gmsStraatnaam",
        ) as HTMLInputElement;
        const huisnummer = document.getElementById(
          "gmsHuisnummer",
        ) as HTMLInputElement;
        const toevoeging = document.getElementById(
          "gmsToevoeging",
        ) as HTMLInputElement;
        const postcode = document.getElementById(
          "gmsPostcode",
        ) as HTMLInputElement;
        const plaatsnaam = document.getElementById(
          "gmsPlaatsnaam",
        ) as HTMLInputElement;
        const gemeente = document.getElementById(
          "gmsGemeente",
        ) as HTMLInputElement;

        // Classificaties
        const classificatie1 = document.getElementById(
          "gmsClassificatie1",
        ) as HTMLSelectElement;
        const classificatie2 = document.getElementById(
          "gmsClassificatie2",
        ) as HTMLSelectElement;
        const classificatie3 = document.getElementById(
          "gmsClassificatie3",
        ) as HTMLSelectElement;

        // Bestaande velden
        const tijdstip = document.getElementById(
          "gmsTijdstip",
        ) as HTMLInputElement;
        const prioriteit = document.getElementById(
          "gmsPrioriteit",
        ) as HTMLInputElement;
        const output = document.getElementById("gmsOutput");

        if (!kladblok || !output) return;

        // Validate required fields
        if (!straatnaam?.value.trim()) {
          alert("Vul de straatnaam in.");
          return;
        }

        const gmsData = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          aangemaaktOp: new Date().toLocaleString("nl-NL"),
          status: "Nieuw",

          // Melder informatie
          meldernaam: meldernaam?.value.trim() || "",
          melderadres: melderadres?.value.trim() || "",
          telefoonnummer: telefoonnummer?.value.trim() || "",

          // Melding locatie
          straatnaam: straatnaam?.value.trim() || "",
          huisnummer: huisnummer?.value.trim() || "",
          toevoeging: toevoeging?.value.trim() || "",
          postcode: postcode?.value.trim() || "",
          plaatsnaam: plaatsnaam?.value.trim() || "",
          gemeente: gemeente?.value.trim() || "",

          // LMC Classificatie
          classificatie1: classificatie1?.value || "",
          classificatie2: classificatie2?.value || "",
          classificatie3: classificatie3?.value || "",

          // Aanvullende informatie
          opmerkingen: kladblok.textContent || "",
          tijdstip: tijdstip?.value || "",
          prioriteit: parseInt(prioriteit?.value || "3"),
        };

        // Save to localStorage incidenten array
        try {
          const existingIncidenten = JSON.parse(
            localStorage.getItem("incidenten") || "[]",
          );
          existingIncidenten.push(gmsData);
          localStorage.setItem(
            "incidenten",
            JSON.stringify(existingIncidenten),
          );
        } catch (error) {
          console.error("Error saving to localStorage:", error);
        }

        // Display JSON output
        output.textContent = JSON.stringify(gmsData, null, 2);

        // Reset form
        kladblok.textContent = "";

        // Reset melder informatie
        if (meldernaam) meldernaam.value = "";
        if (melderadres) melderadres.value = "";
        if (telefoonnummer) telefoonnummer.value = "";

        // Reset melding locatie
        if (straatnaam) straatnaam.value = "";
        if (huisnummer) huisnummer.value = "";
        if (toevoeging) toevoeging.value = "";
        if (postcode) postcode.value = "";
        if (plaatsnaam) plaatsnaam.value = "";
        if (gemeente) gemeente.value = "";

        // Reset classificaties
        if (classificatie1) classificatie1.value = "";
        if (classificatie2) classificatie2.value = "";
        if (classificatie3) classificatie3.value = "";

        // Reset bestaande velden
        if (prioriteit) prioriteit.value = "3";
        updateGMSTime();

        showNotificationMessage("GMS melding opgeslagen");
      };

      // Add event listeners
      const saveButton = document.getElementById("gmsSaveButton");
      if (saveButton) {
        saveButton.addEventListener("click", handleGMSSubmit);
      }

      // Initialize time immediately and then every minute
      updateGMSTime();
      const timeTimer = setInterval(updateGMSTime, 60000);

      // Initialize GMS status date/time immediately and then every second
      updateGMSStatusDateTime();
      const statusDateTimeTimer = setInterval(updateGMSStatusDateTime, 1000);

      // Setup classification cascading dropdowns
      const setupClassificationDropdowns = () => {
        const mc1Select = document.getElementById(
          "gmsClassificatie1",
        ) as HTMLSelectElement;
        const mc2Select = document.getElementById(
          "gmsClassificatie2",
        ) as HTMLSelectElement;
        const mc3Select = document.getElementById(
          "gmsClassificatie3",
        ) as HTMLSelectElement;

        if (mc1Select && mc2Select && mc3Select) {
          // Handle MC1 change
          mc1Select.addEventListener("change", () => {
            const selectedMC1 = mc1Select.value;

            // Clear and populate MC2
            mc2Select.innerHTML = '<option value="">Selecteer...</option>';
            mc3Select.innerHTML = '<option value="">Selecteer...</option>';

            if (selectedMC1) {
              const mc2Options = getUniqueClassificationsByLevel(
                "MC2",
                selectedMC1,
              );
              mc2Options.forEach((mc2) => {
                const option = document.createElement("option");
                option.value = mc2;
                option.textContent = mc2;
                mc2Select.appendChild(option);
              });
            }
          });

          // Handle MC2 change
          mc2Select.addEventListener("change", () => {
            const selectedMC2 = mc2Select.value;

            // Clear and populate MC3
            mc3Select.innerHTML = '<option value="">Selecteer...</option>';

            if (selectedMC2) {
              const mc3Options = getUniqueClassificationsByLevel(
                "MC3",
                selectedMC2,
              );
              mc3Options.forEach((mc3) => {
                const option = document.createElement("option");
                option.value = mc3;
                option.textContent = mc3;
                mc3Select.appendChild(option);
              });
            }
          });
        }
      };

      setupClassificationDropdowns();

      return () => {
        clearInterval(timeTimer);
        clearInterval(statusDateTimeTimer);
        if (saveButton) {
          saveButton.removeEventListener("click", handleGMSSubmit);
        }
      };
    };

    // Only initialize if GMS section is active
    if (activeSection === "gms") {
      const cleanup = initializeGMS();
      return cleanup;
    }
  }, [activeSection]);

  // Units filter functionality
  useEffect(() => {
    const initializeUnitsFilter = () => {
      const filterInput = document.getElementById(
        "unitsFilter",
      ) as HTMLInputElement;
      if (!filterInput) return;

      const handleFilterChange = () => {
        const filterValue = filterInput.value.toLowerCase();
        const unitRows = document.querySelectorAll(".unit-row");

        unitRows.forEach((row) => {
          const unitData = row.getAttribute("data-unit");
          if (unitData) {
            try {
              const unit = JSON.parse(unitData);
              const roepnaam = unit.roepnaam.toLowerCase();
              const rollen = unit.rollen
                .map((rol: string) => rol.toLowerCase())
                .join(" ");
              const voertuig = unit.voertuigtype.toLowerCase();
              const status = unit.status.toLowerCase();

              const matchesFilter =
                roepnaam.includes(filterValue) ||
                rollen.includes(filterValue) ||
                voertuig.includes(filterValue) ||
                status.includes(filterValue);

              if (matchesFilter) {
                (row as HTMLElement).style.display = "table-row";
              } else {
                (row as HTMLElement).style.display = "none";
              }
            } catch (error) {
              console.error("Error parsing unit data:", error);
            }
          }
        });
      };

      filterInput.addEventListener("input", handleFilterChange);

      return () => {
        filterInput.removeEventListener("input", handleFilterChange);
      };
    };

    // Only initialize if units section is active
    if (activeSection === "units") {
      const cleanup = initializeUnitsFilter();
      return cleanup;
    }
  }, [activeSection]);

  // Basisteams filter functionality
  useEffect(() => {
    const initializeBasisteamsFilter = () => {
      const filterInput = document.getElementById(
        "basisteamsFilter",
      ) as HTMLInputElement;
      if (!filterInput) return;

      const handleFilterChange = () => {
        const filterValue = filterInput.value.toLowerCase();
        const teamRows = document.querySelectorAll(".basisteam-row");

        teamRows.forEach((row) => {
          const teamData = row.getAttribute("data-team");
          if (teamData) {
            try {
              const team = JSON.parse(teamData);
              const code = team.code.toLowerCase();
              const naam = team.naam.toLowerCase();
              const regio = team.regio.toLowerCase();
              const gemeenten = team.gemeenten
                .map((gemeente: string) => gemeente.toLowerCase())
                .join(" ");

              const matchesFilter =
                code.includes(filterValue) ||
                naam.includes(filterValue) ||
                regio.includes(filterValue) ||
                gemeenten.includes(filterValue);

              if (matchesFilter) {
                (row as HTMLElement).style.display = "table-row";
              } else {
                (row as HTMLElement).style.display = "none";
              }
            } catch (error) {
              console.error("Error parsing team data:", error);
            }
          }
        });
      };

      filterInput.addEventListener("input", handleFilterChange);

      return () => {
        filterInput.removeEventListener("input", handleFilterChange);
      };
    };

    // Only initialize if settings section is active
    if (activeSection === "settings") {
      const cleanup = initializeBasisteamsFilter();
      return cleanup;
    }
  }, [activeSection]);

  // Incidents page functionality
  useEffect(() => {
    const loadIncidentsFromStorage = () => {
      const incidentsList = document.getElementById("allIncidentsLegacyList");
      if (!incidentsList) return;

      try {
        const storedIncidenten = JSON.parse(
          localStorage.getItem("incidenten") || "[]",
        );

        if (storedIncidenten.length === 0) {
          incidentsList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666; grid-column: 1 / -1;">
              Geen incidenten gevonden
            </div>
          `;
          return;
        }

        // Sort by timestamp (newest first)
        const sortedIncidenten = storedIncidenten.sort(
          (a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        incidentsList.innerHTML = sortedIncidenten
          .map((incident: any, index: number) => {
            const incidentNumber = `I${String(incident.id || index + 1).padStart(6, "0")}`;
            const formattedTime = new Date(
              incident.timestamp,
            ).toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
            });

            const mc = incident.classificatie1
              ? incident.classificatie1.substring(0, 12)
              : "-";

            // Parse location - street name and house number only
            const locatie =
              incident.straatnaam && incident.huisnummer
                ? `${incident.straatnaam} ${incident.huisnummer}`
                : incident.meldingsadres || "-";

            // Place/city in separate column
            const plaats = incident.plaatsnaam || incident.gemeente || "-";

            const prioriteitNummer = incident.prioriteit || 3;

            // Map status to legacy format
            let status = "Nieuw";
            if (incident.status === "Uitgegeven") status = "Openstaand";
            if (incident.status === "Openstaand") status = "Openstaand";
            if (incident.status === "In wacht") status = "Nieuw";
            if (incident.status === "Afgesloten") status = "Afgesloten";

            const statusClass = `legacy-status-${status.toLowerCase()}`;

            return `
            <div class="legacy-incident-row" data-incident-id="${incident.id || index}" onclick="selectIncidentRow(this)">
              <div class="legacy-col-id">${incidentNumber}</div>
              <div class="legacy-col-tijd">${formattedTime}</div>
              <div class="legacy-col-mc">${mc}</div>
              <div class="legacy-col-locatie" title="${locatie}">${locatie}</div>
              <div class="legacy-col-plaats" title="${plaats}">${plaats}</div>
              <div class="legacy-col-prio">
                <span class="priority-box priority-box-${prioriteitNummer}">${prioriteitNummer}</span>
              </div>
              <div class="legacy-col-status ${statusClass}">${status}</div>
            </div>
          `;
          })
          .join("");

        // Modal functionality
        const openIncidentModal = (incident: any, incidentId: string) => {
          const modal = document.getElementById("incidentModal");
          if (!modal) return;

          // Populate modal with incident data
          const incidentNumber = `I${String(incident.id || incidentId).padStart(6, "0")}`;
          const formattedDateTime = new Date(incident.timestamp).toLocaleString(
            "nl-NL",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          );

          document.getElementById("incidentModalTitle")!.textContent =
            `${incidentNumber} - Details`;
          document.getElementById("modalIncidentNumber")!.textContent =
            incidentNumber;
          document.getElementById("modalIncidentTime")!.textContent =
            formattedDateTime;
          document.getElementById("modalMC1")!.textContent =
            incident.classificatie1 || "-";
          document.getElementById("modalMC2")!.textContent =
            incident.classificatie2 || "-";
          document.getElementById("modalMC3")!.textContent =
            incident.classificatie3 || "-";

          const locatie =
            incident.straatnaam && incident.huisnummer
              ? `${incident.straatnaam} ${incident.huisnummer}`
              : incident.meldingsadres || "-";
          document.getElementById("modalLocation")!.textContent = locatie;
          document.getElementById("modalPlace")!.textContent =
            incident.plaatsnaam || incident.gemeente || "-";
          document.getElementById("modalMunicipality")!.textContent =
            incident.gemeente || "-";

          // Priority with colored box
          const prioriteitNummer = incident.prioriteit || 3;
          const priorityElement = document.getElementById("modalPriority")!;
          priorityElement.innerHTML = `<span class="modal-priority-box priority-box-${prioriteitNummer}">${prioriteitNummer}</span>`;

          // Status
          let status = "Nieuw";
          if (incident.status === "Uitgegeven") status = "Openstaand";
          if (incident.status === "Openstaand") status = "Openstaand";
          if (incident.status === "In wacht") status = "Nieuw";
          if (incident.status === "Afgesloten") status = "Afgesloten";
          document.getElementById("modalStatus")!.textContent = status;

          // Load existing logging
          loadIncidentLogging(incidentId);

          // Reset form fields
          (
            document.getElementById("incidentNoteInput") as HTMLTextAreaElement
          ).value = "";
          (
            document.getElementById("unitAssignmentSelect") as HTMLSelectElement
          ).value = "";
          document.getElementById("assignedUnitDisplay")!.style.display =
            "none";

          // Show modal
          modal.style.display = "flex";

          // Store current incident ID for notes and unit assignment
          (window as any).currentIncidentId = incidentId;
        };

        const loadIncidentLogging = (incidentId: string) => {
          const loggingArea = document.getElementById("incidentLoggingArea");
          if (!loggingArea) return;

          // Get stored logging for this incident
          const incidentLogs = JSON.parse(
            localStorage.getItem(`incident_logs_${incidentId}`) || "[]",
          );

          if (incidentLogs.length === 0) {
            loggingArea.innerHTML =
              '<div style="color: #6c757d; font-style: italic;">Geen logging beschikbaar</div>';
            return;
          }

          loggingArea.innerHTML = incidentLogs
            .map(
              (log: any) => `
            <div class="logging-entry">
              <div class="logging-timestamp">[${log.timestamp}]</div>
              <div>${log.message}</div>
            </div>
          `,
            )
            .join("");
        };

        // Modal close functionality
        const setupModalEventListeners = () => {
          const modal = document.getElementById("incidentModal");
          const closeBtn = document.getElementById("incidentModalClose");
          const closeFooterBtn = document.getElementById(
            "incidentModalCloseBtn",
          );
          const addNoteBtn = document.getElementById("addIncidentNote");
          const assignUnitBtn = document.getElementById("assignUnit");

          if (closeBtn) {
            closeBtn.onclick = () => {
              if (modal) modal.style.display = "none";
            };
          }

          if (closeFooterBtn) {
            closeFooterBtn.onclick = () => {
              if (modal) modal.style.display = "none";
            };
          }

          // Close modal when clicking outside
          if (modal) {
            modal.onclick = (e) => {
              if (e.target === modal) {
                modal.style.display = "none";
              }
            };
          }

          // Add note functionality
          if (addNoteBtn) {
            addNoteBtn.onclick = () => {
              const noteInput = document.getElementById(
                "incidentNoteInput",
              ) as HTMLTextAreaElement;
              const note = noteInput.value.trim();

              if (note && (window as any).currentIncidentId) {
                addIncidentNote((window as any).currentIncidentId, note);
                noteInput.value = "";
              }
            };
          }

          // Assign unit functionality
          if (assignUnitBtn) {
            assignUnitBtn.onclick = () => {
              const unitSelect = document.getElementById(
                "unitAssignmentSelect",
              ) as HTMLSelectElement;
              const selectedUnit = unitSelect.value;

              if (selectedUnit && (window as any).currentIncidentId) {
                assignUnitToIncident(
                  (window as any).currentIncidentId,
                  selectedUnit,
                );
              }
            };
          }
        };

        const addIncidentNote = (incidentId: string, note: string) => {
          const timestamp = new Date().toLocaleString("nl-NL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          // Get existing logs
          const existingLogs = JSON.parse(
            localStorage.getItem(`incident_logs_${incidentId}`) || "[]",
          );

          // Add new log entry
          existingLogs.push({
            timestamp: timestamp,
            message: `NOTITIE: ${note}`,
            type: "note",
          });

          // Save updated logs
          localStorage.setItem(
            `incident_logs_${incidentId}`,
            JSON.stringify(existingLogs),
          );

          // Refresh logging display
          loadIncidentLogging(incidentId);
        };

        const assignUnitToIncident = (
          incidentId: string,
          unitNumber: string,
        ) => {
          const timestamp = new Date().toLocaleString("nl-NL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          // Get existing logs
          const existingLogs = JSON.parse(
            localStorage.getItem(`incident_logs_${incidentId}`) || "[]",
          );

          // Add unit assignment log entry
          existingLogs.push({
            timestamp: timestamp,
            message: `EENHEID GEKOPPELD: ${unitNumber}`,
            type: "unit_assignment",
          });

          // Save updated logs
          localStorage.setItem(
            `incident_logs_${incidentId}`,
            JSON.stringify(existingLogs),
          );

          // Show assigned unit display
          const assignedUnitDisplay = document.getElementById(
            "assignedUnitDisplay",
          );
          const assignedUnitNumber =
            document.getElementById("assignedUnitNumber");

          if (assignedUnitDisplay && assignedUnitNumber) {
            assignedUnitNumber.textContent = unitNumber;
            assignedUnitDisplay.style.display = "block";
          }

          // Refresh logging display
          loadIncidentLogging(incidentId);

          // Reset select
          const unitSelect = document.getElementById(
            "unitAssignmentSelect",
          ) as HTMLSelectElement;
          if (unitSelect) unitSelect.value = "";
        };

        // Add row selection functionality and modal opening
        (window as any).selectIncidentRow = function (row: HTMLElement) {
          // Remove previous selection
          const previousSelected = incidentsList.querySelector(".selected");
          if (previousSelected) {
            previousSelected.classList.remove("selected");
          }

          // Add selection to clicked row
          row.classList.add("selected");

          // Get incident data and open modal
          const incidentId = row.getAttribute("data-incident-id");
          if (incidentId) {
            const incident = sortedIncidenten.find(
              (inc: any) =>
                String(inc.id || sortedIncidenten.indexOf(inc)) === incidentId,
            );

            if (incident) {
              openIncidentModal(incident, incidentId);
            }
          }
        };

        // Initialize modal event listeners
        setupModalEventListeners();
      } catch (error) {
        console.error("Error loading incidents:", error);
        incidentsList.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #666; grid-column: 1 / -1;">
            Fout bij laden van incidenten
          </div>
        `;
      }
    };

    // Only initialize if incidents section is active
    if (activeSection === "incidents") {
      loadIncidentsFromStorage();
    }
  }, [activeSection]);

  // GMS Kladblok functionality
  useEffect(() => {
    const initializeKladblokFeatures = () => {
      const kladblok = document.getElementById("gmsKladblok");
      const verzendButton = document.getElementById("gmsVerzendButton");
      const alertButton = document.getElementById("gmsAlertButton");
      const meldingLogging = document.getElementById("gmsMeldingLogging");
      const priorityInput = document.getElementById(
        "gmsPrioriteit",
      ) as HTMLInputElement;
      const priorityIndicator = document.getElementById("gmsPriorityIndicator");
      const hintsInput = document.getElementById(
        "gmsHintsInput",
      ) as HTMLInputElement;
      const karakteristiekenList = document.getElementById(
        "gmsKarakteristiekenList",
      );

      if (
        !kladblok ||
        !verzendButton ||
        !alertButton ||
        !meldingLogging ||
        !priorityInput ||
        !priorityIndicator ||
        !hintsInput ||
        !karakteristiekenList
      )
        return;

      const sendMessage = (isUrgent = false) => {
        const message = kladblok.textContent?.trim();
        if (!message) return;

        // Smart command processing for address auto-fill
        const processSmartCommands = (text: string) => {
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.trim().startsWith("=")) {
              const addressText = line.substring(1).trim();
              parseAndFillAddress(addressText);
              return true; // Command processed
            }
          }
          return false; // No command found
        };

        // Parse address information and auto-fill form fields
        const parseAndFillAddress = (addressText: string) => {
          // Get form field references
          const straatnaamField = document.getElementById(
            "gmsStraatnaam",
          ) as HTMLInputElement;
          const huisnummerField = document.getElementById(
            "gmsHuisnummer",
          ) as HTMLInputElement;
          const plaatsnaamField = document.getElementById(
            "gmsPlaatsnaam",
          ) as HTMLInputElement;

          let cityName = "";
          let streetName = "";
          let houseNumber = "";
          let feedbackMessage = "";

          // Pattern 1: =Plaatsnaam (just city name)
          if (!addressText.includes("/")) {
            cityName = addressText.trim();
            if (plaatsnaamField) {
              plaatsnaamField.value = cityName;
            }
            feedbackMessage = `📍 Plaatsnaam ingevuld: ${cityName}`;
          }
          // Pattern 2: =Plaatsnaam/Straatnaam Huisnummer
          else {
            const parts = addressText.split("/");
            if (parts.length === 2) {
              cityName = parts[0].trim();
              const streetAndNumber = parts[1].trim();

              // Extract street name and house number
              // Match pattern: "Straatnaam Huisnummer" where number can include letters
              const streetMatch = streetAndNumber.match(
                /^(.+?)\s+(\d+[a-zA-Z]*)$/,
              );

              if (streetMatch) {
                streetName = streetMatch[1].trim();
                houseNumber = streetMatch[2].trim();

                // Fill all three fields
                if (plaatsnaamField) plaatsnaamField.value = cityName;
                if (straatnaamField) straatnaamField.value = streetName;
                if (huisnummerField) huisnummerField.value = houseNumber;

                feedbackMessage = `📍 Adres ingevuld: ${cityName}, ${streetName} ${houseNumber}`;
              } else {
                // If no house number found, just fill city and street
                streetName = streetAndNumber;
                if (plaatsnaamField) plaatsnaamField.value = cityName;
                if (straatnaamField) straatnaamField.value = streetName;

                feedbackMessage = `📍 Adres ingevuld: ${cityName}, ${streetName}`;
              }
            }
          }

          // Add visual feedback
          const logEntry = document.createElement("div");
          logEntry.className = "gms-log-entry";
          logEntry.innerHTML = `
            <span class="gms-log-time">${new Date().toLocaleTimeString("nl-NL")}</span>
            <span class="gms-log-message">${feedbackMessage}</span>
          `;
          meldingLogging.appendChild(logEntry);
          meldingLogging.scrollTop = meldingLogging.scrollHeight;

          // Update header after auto-filling address fields
          const dynamicHeader = document.getElementById("gmsDynamicHeader");
          if (dynamicHeader) {
            const mc1Select = document.getElementById(
              "gmsClassificatie1",
            ) as HTMLSelectElement;
            const mc1Value = mc1Select?.value || "Onbekend";
            const updatedStraatnaam = straatnaamField?.value || "Onbekend";
            const updatedPlaatsnaam = plaatsnaamField?.value || "Onbekend";
            dynamicHeader.textContent = `${mc1Value} – ${updatedStraatnaam} ${updatedPlaatsnaam}`;
          }
        };

        // Check for smart commands first (only for non-urgent messages)
        const commandProcessed = !isUrgent && processSmartCommands(message);

        // If a command was processed, clear the kladblok and return
        if (commandProcessed) {
          kladblok.textContent = "";
          kladblok.focus();
          return;
        }

        // Auto-classification based on keywords (only for non-urgent messages)
        const processAutoClassification = (text: string) => {
          const classificatie1Select = document.getElementById(
            "gmsClassificatie1",
          ) as HTMLSelectElement;
          if (!classificatie1Select) return;

          // Define keyword mappings
          const keywordMappings: { [key: string]: string } = {
            verkeer: "Verkeer",
            geweld: "Geweld",
            diefstal: "Diefstal",
            brand: "Brand",
            overlast: "Overlast",
          };

          // Look for keywords that start with dash
          const words = text.split(/\s+/);
          for (const word of words) {
            if (word.startsWith("-")) {
              const keyword = word.substring(1).toLowerCase();
              if (keywordMappings[keyword]) {
                classificatie1Select.value = keywordMappings[keyword];
                // Add visual feedback
                classificatie1Select.style.backgroundColor = "#d4edda";
                classificatie1Select.style.borderColor = "#28a745";
                setTimeout(() => {
                  classificatie1Select.style.backgroundColor = "";
                  classificatie1Select.style.borderColor = "";
                }, 2000);
                break;
              }
            }
          }
        };

        // Process special karakteristiek commands
        const processKarakteristiekCommands = (text: string) => {
          const words = text.split(/\s+/);

          for (const word of words) {
            if (word === "-bae") {
              // Add or update "Bericht alle eenheden" karakteristiek
              addOrUpdateKarakteristiek("Bericht alle eenheden", "Ja");
              break;
            }
          }
        };

        // Process auto-classification (only for non-urgent messages)
        if (!isUrgent) {
          processAutoClassification(message);
          processKarakteristiekCommands(message);
        }

        // Create timestamp in HH:MM:SS format for urgent messages, HH:MM for regular
        const now = new Date();
        const timestamp = now.toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
          second: isUrgent ? "2-digit" : undefined,
        });

        // Create log entry with urgent styling if needed
        const logEntry = document.createElement("div");
        logEntry.className = isUrgent
          ? "gms-log-entry urgent"
          : "gms-log-entry";

        const messageText = isUrgent ? `🚨 Spoedmelding: ${message}` : message;
        logEntry.innerHTML = `
          <span class="gms-log-time">${timestamp}</span>
          <span class="gms-log-message">${messageText}</span>
        `;

        // Add to logging area (latest at bottom)
        meldingLogging.appendChild(logEntry);

        // Scroll to bottom
        meldingLogging.scrollTop = meldingLogging.scrollHeight;

        // Clear the kladblok
        kladblok.textContent = "";
        kladblok.focus();
      };

      // Handle Verzend button click
      const handleVerzendClick = () => {
        sendMessage();
      };

      // Add or update a karakteristiek entry
      const addOrUpdateKarakteristiek = (name: string, value: string) => {
        // Check if entry already exists
        const existingEntries = Array.from(
          karakteristiekenList.querySelectorAll(".gms-kar-entry"),
        );
        let existingEntry = null;

        for (const entry of existingEntries) {
          const nameElement = entry.querySelector(".gms-kar-entry-name");
          if (nameElement && nameElement.textContent === name) {
            existingEntry = entry;
            break;
          }
        }

        if (existingEntry) {
          // Update existing entry
          const valueElement = existingEntry.querySelector(
            ".gms-kar-entry-value",
          );
          if (valueElement) {
            valueElement.textContent = value;
          }
        } else {
          // Create new entry
          const entry = document.createElement("div");
          entry.className = "gms-kar-entry";
          entry.innerHTML = `
            <div class="gms-kar-entry-name">${name}</div>
            <div class="gms-kar-entry-value">${value}</div>
          `;
          karakteristiekenList.appendChild(entry);
        }
      };

      // Handle Alert button click for urgent messages
      const handleAlertClick = () => {
        sendMessage(true);
      };

      // Handle adding characteristics from Hints/Kar input
      const addKarakteristiek = () => {
        const hintsValue = hintsInput.value.trim();
        if (!hintsValue) return;

        addOrUpdateKarakteristiek(hintsValue, "-");

        // Clear the input
        hintsInput.value = "";
        hintsInput.focus();
      };

      // Handle Enter key on Hints/Kar input
      const handleHintsKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addKarakteristiek();
        }
      };

      // Handle Enter key (but not Shift+Enter or Alt+Enter)
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          sendMessage();
        }
      };

      // Update priority indicator color
      const updatePriorityIndicator = () => {
        const priorityValue = parseInt(priorityInput.value) || 3;

        // Remove all priority classes
        priorityIndicator.className = "gms-priority-indicator";

        // Add the appropriate priority class
        if (priorityValue >= 1 && priorityValue <= 5) {
          priorityIndicator.classList.add(`priority-${priorityValue}`);
        }
      };

      // Handle priority input changes
      const handlePriorityChange = () => {
        updatePriorityIndicator();
      };

      // Initialize priority indicator with default value
      updatePriorityIndicator();

      // Update dynamic header function
      const updateDynamicHeader = () => {
        const mc1Select = document.getElementById(
          "gmsClassificatie1",
        ) as HTMLSelectElement;
        const straatnaamField = document.getElementById(
          "gmsStraatnaam",
        ) as HTMLInputElement;
        const plaatsnaamField = document.getElementById(
          "gmsPlaatsnaam",
        ) as HTMLInputElement;
        const dynamicHeader = document.getElementById("gmsDynamicHeader");

        if (!dynamicHeader) return;

        const mc1Value = mc1Select?.value || "Onbekend";
        const straatnaam = straatnaamField?.value || "Onbekend";
        const plaatsnaam = plaatsnaamField?.value || "Onbekend";

        dynamicHeader.textContent = `${mc1Value} – ${straatnaam} ${plaatsnaam}`;
      };

      // Handle form field changes for dynamic header
      const handleHeaderFieldChange = () => {
        updateDynamicHeader();
      };

      // Get form field references for header updates
      const mc1Select = document.getElementById(
        "gmsClassificatie1",
      ) as HTMLSelectElement;
      const straatnaamField = document.getElementById(
        "gmsStraatnaam",
      ) as HTMLInputElement;
      const plaatsnaamField = document.getElementById(
        "gmsPlaatsnaam",
      ) as HTMLInputElement;

      verzendButton.addEventListener("click", handleVerzendClick);
      alertButton.addEventListener("click", handleAlertClick);
      kladblok.addEventListener("keydown", handleKeyDown);
      hintsInput.addEventListener("keydown", handleHintsKeyDown);
      priorityInput.addEventListener("input", handlePriorityChange);
      priorityInput.addEventListener("change", handlePriorityChange);

      // Add event listeners for dynamic header updates
      if (mc1Select) {
        mc1Select.addEventListener("change", handleHeaderFieldChange);
      }
      if (straatnaamField) {
        straatnaamField.addEventListener("input", handleHeaderFieldChange);
        straatnaamField.addEventListener("change", handleHeaderFieldChange);
      }
      if (plaatsnaamField) {
        plaatsnaamField.addEventListener("input", handleHeaderFieldChange);
        plaatsnaamField.addEventListener("change", handleHeaderFieldChange);
      }

      // Initialize header with current values
      updateDynamicHeader();

      // GMS Status Button Handlers
      const collectGMSFormData = () => {
        // Get all form field values
        const meldernaam =
          (document.getElementById("gmsMeldernaam") as HTMLInputElement)
            ?.value || "";
        const telefoonnummer =
          (document.getElementById("gmsTelefoonnummer") as HTMLInputElement)
            ?.value || "";
        const melderadres =
          (document.getElementById("gmsMelderadres") as HTMLInputElement)
            ?.value || "";
        const straatnaam =
          (document.getElementById("gmsStraatnaam") as HTMLInputElement)
            ?.value || "";
        const huisnummer =
          (document.getElementById("gmsHuisnummer") as HTMLInputElement)
            ?.value || "";
        const toevoeging =
          (document.getElementById("gmsToevoeging") as HTMLInputElement)
            ?.value || "";
        const postcode =
          (document.getElementById("gmsPostcode") as HTMLInputElement)?.value ||
          "";
        const plaatsnaam =
          (document.getElementById("gmsPlaatsnaam") as HTMLInputElement)
            ?.value || "";
        const gemeente =
          (document.getElementById("gmsGemeente") as HTMLInputElement)?.value ||
          "";
        const classificatie1 =
          (document.getElementById("gmsClassificatie1") as HTMLSelectElement)
            ?.value || "";
        const classificatie2 =
          (document.getElementById("gmsClassificatie2") as HTMLSelectElement)
            ?.value || "";
        const classificatie3 =
          (document.getElementById("gmsClassificatie3") as HTMLSelectElement)
            ?.value || "";
        const prioriteit = parseInt(
          (document.getElementById("gmsPrioriteit") as HTMLInputElement)
            ?.value || "3",
        );
        const tijdstip =
          (document.getElementById("gmsTijdstip") as HTMLInputElement)?.value ||
          "";
        const notities = kladblok?.textContent || "";

        // Create location string
        const locationParts = [straatnaam, huisnummer, plaatsnaam].filter(
          (part) => part.trim(),
        );
        const location =
          locationParts.length > 0
            ? locationParts.join(" ")
            : "Onbekende locatie";

        return {
          meldernaam,
          telefoonnummer,
          melderadres,
          straatnaam,
          huisnummer,
          toevoeging,
          postcode,
          plaatsnaam,
          gemeente,
          classificatie1,
          classificatie2,
          classificatie3,
          prioriteit,
          tijdstip,
          notities,
          location,
        };
      };

      const resetGMSForm = () => {
        // Reset all input fields
        const inputs = document.querySelectorAll(
          '.gms-classic-layout input[type="text"], .gms-classic-layout input[type="number"]',
        );
        inputs.forEach((input) => {
          (input as HTMLInputElement).value = "";
        });

        // Reset select fields
        const selects = document.querySelectorAll(".gms-classic-layout select");
        selects.forEach((select) => {
          (select as HTMLSelectElement).selectedIndex = 0;
        });

        // Reset priority to default
        const priorityInput = document.getElementById(
          "gmsPrioriteit",
        ) as HTMLInputElement;
        if (priorityInput) {
          priorityInput.value = "3";
          updatePriorityIndicator();
        }

        // Clear notepad and logging
        if (kladblok) {
          kladblok.textContent = "";
        }
        if (meldingLogging) {
          meldingLogging.innerHTML = "";
        }

        // Reset datetime to current time
        const timeInput = document.getElementById(
          "gmsTijdstip",
        ) as HTMLInputElement;
        if (timeInput) {
          const now = new Date();
          const localDateTime = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);
          timeInput.value = localDateTime;
        }

        // Reset sharing buttons
        const sharingButtons = document.querySelectorAll(".gms-share-btn");
        sharingButtons.forEach((btn) => {
          btn.classList.remove("active");
        });

        // Reset service buttons (B/A)
        const serviceButtons = document.querySelectorAll(".gms-service-btn");
        serviceButtons.forEach((btn) => {
          btn.classList.remove("active");
        });

        // Update header
        updateDynamicHeader();
      };

      // Save incident to localStorage for incidents tab
      const saveIncidentToStorage = (incidentData: any) => {
        try {
          const existingIncidents = JSON.parse(
            localStorage.getItem("incidenten") || "[]",
          );
          const updatedIncidents = [incidentData, ...existingIncidents];
          localStorage.setItem("incidenten", JSON.stringify(updatedIncidents));

          // Refresh incidents tab if currently active
          if (activeSection === "incidents") {
            const loadIncidentsFromStorage = () => {
              const incidentsList = document.getElementById("allIncidentsList");
              if (!incidentsList) return;

              const sortedIncidenten = updatedIncidents.sort(
                (a: any, b: any) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              );

              incidentsList.innerHTML = sortedIncidenten
                .map((incident: any) => {
                  const formattedTime = new Date(
                    incident.timestamp,
                  ).toLocaleString("nl-NL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const prioriteitLabel = `Prio ${incident.prioriteit}`;
                  const prioriteitClass =
                    incident.prioriteit === 1
                      ? "priority-1"
                      : incident.prioriteit === 2
                        ? "priority-2"
                        : incident.prioriteit === 3
                          ? "priority-3"
                          : incident.prioriteit === 4 ||
                              incident.prioriteit === 5
                            ? "priority-4-5"
                            : "priority-3";

                  return `
                  <div class="incident-row">
                    <div class="incident-time">${formattedTime}</div>
                    <div class="incident-location">${incident.gemeente || incident.plaatsnaam || "Onbekend"}</div>
                    <div class="incident-type">${incident.classificatie1 || "Onbekend"}</div>
                    <div>
                      <span class="priority-tag ${prioriteitClass}">
                        ${prioriteitLabel}
                      </span>
                    </div>
                    <div class="incident-status status-${incident.status.toLowerCase().replace(" ", "-")}">${incident.status}</div>
                  </div>
                `;
                })
                .join("");
            };
            loadIncidentsFromStorage();
          }
        } catch (error) {
          console.error("Error saving incident:", error);
        }
      };

      // Event handlers for status buttons
      const handleEindrapport = () => {
        const formData = collectGMSFormData();
        const now = new Date();

        const incidentData = {
          ...formData,
          id: Date.now(),
          timestamp: now.toISOString(),
          status: "Afgesloten",
        };

        // Save to incidents tab only
        saveIncidentToStorage(incidentData);

        // Show notification
        showNotificationMessage(
          "Eindrapport opgeslagen en naar Incidenten verzonden",
        );

        // Reset form
        resetGMSForm();
      };

      const handleUitgifte = () => {
        const formData = collectGMSFormData();
        const now = new Date();

        const incidentData = {
          ...formData,
          id: Date.now(),
          timestamp: now.toISOString(),
          status: "Openstaand",
        };

        // Save to incidents tab only
        saveIncidentToStorage(incidentData);

        // Show notification
        showNotificationMessage(
          "Incident uitgegeven en naar Incidenten verzonden",
        );

        // Reset form
        resetGMSForm();
      };

      const handleSluitAf = () => {
        resetGMSForm();
        showNotificationMessage("Formulier gereset");
      };

      const handleSluit = () => {
        // No specific functionality for now
        showNotificationMessage("Sluit functie nog niet geïmplementeerd");
      };

      // Get button references
      const eindrapportBtn = document.getElementById("gmsEindrapportButton");
      const uitgifteBtn = document.getElementById("gmsUitgifteButton");
      const sluitAfBtn = document.getElementById("gmsSluitAfButton");
      const sluitBtn = document.getElementById("gmsSluitButton");

      // Sharing button functionality
      const handleSharingButtonClick = (event: Event) => {
        const button = event.target as HTMLButtonElement;
        const service = button.getAttribute("data-service");
        const isActive = button.classList.contains("active");

        // Toggle button state
        button.classList.toggle("active");

        // Add log entry
        const now = new Date();
        const timeString = now.toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const emoji = service === "Politie" ? "🚓" : "🚒";
        const action = isActive ? "gedeeld beëindigd met" : "gedeeld met";

        const logEntry = document.createElement("div");
        logEntry.className = "gms-log-entry";
        logEntry.innerHTML = `
          <span class="gms-log-time">${timeString}</span>
          <span class="gms-log-message">${emoji} Melding ${action} ${service}</span>
        `;

        if (meldingLogging) {
          meldingLogging.appendChild(logEntry);
          meldingLogging.scrollTop = meldingLogging.scrollHeight;
        }
      };

      // Service button functionality for B/A buttons
      const handleServiceButtonClick = (event: Event) => {
        const button = event.target as HTMLButtonElement;
        const service = button.getAttribute("data-service");
        const isActive = button.classList.contains("active");

        // Toggle button state
        button.classList.toggle("active");

        // Add log entry
        const now = new Date();
        const timeString = now.toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const emoji = service === "Brandweer" ? "🚒" : "🚑";
        const action = isActive ? "gedeeld beëindigd met" : "gedeeld met";

        const logEntry = document.createElement("div");
        logEntry.className = "gms-log-entry";
        logEntry.innerHTML = `
          <span class="gms-log-time">${timeString}</span>
          <span class="gms-log-message">${emoji} Melding ${action} ${service}</span>
        `;

        if (meldingLogging) {
          meldingLogging.appendChild(logEntry);
          meldingLogging.scrollTop = meldingLogging.scrollHeight;
        }
      };

      // Get sharing button references
      const politieBtn = document.getElementById("gmsSharePolitie");
      const brandweerBtn = document.getElementById("gmsShareBrandweer");

      // Get service button references
      const serviceBrandweerBtn = document.getElementById(
        "gmsServiceBrandweer",
      );
      const serviceAmbulanceBtn = document.getElementById(
        "gmsServiceAmbulance",
      );

      // Add event listeners for status buttons
      if (eindrapportBtn) {
        eindrapportBtn.addEventListener("click", handleEindrapport);
      }
      if (uitgifteBtn) {
        uitgifteBtn.addEventListener("click", handleUitgifte);
      }
      if (sluitAfBtn) {
        sluitAfBtn.addEventListener("click", handleSluitAf);
      }
      if (sluitBtn) {
        sluitBtn.addEventListener("click", handleSluit);
      }

      // Add event listeners for sharing buttons
      if (politieBtn) {
        politieBtn.addEventListener("click", handleSharingButtonClick);
      }
      if (brandweerBtn) {
        brandweerBtn.addEventListener("click", handleSharingButtonClick);
      }

      // Add event listeners for service buttons (B/A)
      if (serviceBrandweerBtn) {
        serviceBrandweerBtn.addEventListener("click", handleServiceButtonClick);
      }
      if (serviceAmbulanceBtn) {
        serviceAmbulanceBtn.addEventListener("click", handleServiceButtonClick);
      }

      return () => {
        verzendButton.removeEventListener("click", handleVerzendClick);
        alertButton.removeEventListener("click", handleAlertClick);
        kladblok.removeEventListener("keydown", handleKeyDown);
        hintsInput.removeEventListener("keydown", handleHintsKeyDown);
        priorityInput.removeEventListener("input", handlePriorityChange);
        priorityInput.removeEventListener("change", handlePriorityChange);

        // Remove header update event listeners
        if (mc1Select) {
          mc1Select.removeEventListener("change", handleHeaderFieldChange);
        }
        if (straatnaamField) {
          straatnaamField.removeEventListener("input", handleHeaderFieldChange);
          straatnaamField.removeEventListener(
            "change",
            handleHeaderFieldChange,
          );
        }
        if (plaatsnaamField) {
          plaatsnaamField.removeEventListener("input", handleHeaderFieldChange);
          plaatsnaamField.removeEventListener(
            "change",
            handleHeaderFieldChange,
          );
        }

        // Remove status button event listeners
        if (eindrapportBtn) {
          eindrapportBtn.removeEventListener("click", handleEindrapport);
        }
        if (uitgifteBtn) {
          uitgifteBtn.removeEventListener("click", handleUitgifte);
        }
        if (sluitAfBtn) {
          sluitAfBtn.removeEventListener("click", handleSluitAf);
        }
        if (sluitBtn) {
          sluitBtn.removeEventListener("click", handleSluit);
        }

        // Remove sharing button event listeners
        if (politieBtn) {
          politieBtn.removeEventListener("click", handleSharingButtonClick);
        }
        if (brandweerBtn) {
          brandweerBtn.removeEventListener("click", handleSharingButtonClick);
        }

        // Remove service button event listeners
        if (serviceBrandweerBtn) {
          serviceBrandweerBtn.removeEventListener(
            "click",
            handleServiceButtonClick,
          );
        }
        if (serviceAmbulanceBtn) {
          serviceAmbulanceBtn.removeEventListener(
            "click",
            handleServiceButtonClick,
          );
        }
      };
    };

    // Only initialize if GMS section is active
    if (activeSection === "gms") {
      const cleanup = initializeKladblokFeatures();
      return cleanup;
    }
  }, [activeSection]);

  // Classification data management
  const defaultClassifications = [
    {
      code: "-alarm",
      MC1: "Alarm",
      MC2: "Autom. brand",
      MC3: "Autom. brand OMS",
    },
    {
      code: "-verkeer",
      MC1: "Verkeer",
      MC2: "Wegverkeer",
      MC3: "Materiële schade",
    },
    {
      code: "-geweld",
      MC1: "Geweld",
      MC2: "Huiselijk geweld",
      MC3: "Letselschade",
    },
    {
      code: "-brand",
      MC1: "Brand",
      MC2: "Woningbrand",
      MC3: "Dodelijk ongeval",
    },
    {
      code: "-diefstal",
      MC1: "Diefstal",
      MC2: "Inbraak woning",
      MC3: "Materiële schade",
    },
    {
      code: "-overlast",
      MC1: "Overlast",
      MC2: "Geluidshinder",
      MC3: "Geen letsel",
    },
    {
      code: "-drugs",
      MC1: "Drugs",
      MC2: "Handel drugs",
      MC3: "Grote hoeveelheid",
    },
    {
      code: "-vermist",
      MC1: "Vermissing",
      MC2: "Vermiste persoon",
      MC3: "Kwetsbare persoon",
    },
    { code: "-water", MC1: "Water", MC2: "Waterongeval", MC3: "Verdrinking" },
    {
      code: "-terrorist",
      MC1: "Terrorisme",
      MC2: "Verdacht object",
      MC3: "Evacuatie",
    },
  ];

  const getClassifications = () => {
    try {
      const stored = localStorage.getItem("classifications");
      return stored ? JSON.parse(stored) : defaultClassifications;
    } catch (error) {
      console.error("Error loading classifications:", error);
      return defaultClassifications;
    }
  };

  const saveClassifications = (classifications: any[]) => {
    try {
      localStorage.setItem("classifications", JSON.stringify(classifications));
    } catch (error) {
      console.error("Error saving classifications:", error);
    }
  };

  // Initialize classifications in localStorage if not present
  useEffect(() => {
    if (!localStorage.getItem("classifications")) {
      saveClassifications(defaultClassifications);
    }
  }, []);

  // Classificaties page functionality
  useEffect(() => {
    const loadClassificationsData = () => {
      const tableBody = document.getElementById("classificatiesTableBody");
      if (!tableBody) return;

      const classifications = getClassifications();

      if (classifications.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
              Geen classificaties gevonden
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = classifications
        .map((classification: any, index: number) => {
          return `
          <tr class="classificatie-row" data-index="${index}">
            <td class="classificatie-code">
              <strong>${classification.code}</strong>
            </td>
            <td class="classificatie-mc1">${classification.MC1}</td>
            <td class="classificatie-mc2">${classification.MC2}</td>
            <td class="classificatie-mc3">${classification.MC3}</td>
            <td class="classificatie-actions">
              <button class="btn btn-secondary btn-sm edit-classification" data-index="${index}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-danger btn-sm delete-classification" data-index="${index}">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `;
        })
        .join("");

      // Add event listeners for edit and delete buttons
      const editButtons = document.querySelectorAll(".edit-classification");
      const deleteButtons = document.querySelectorAll(".delete-classification");

      editButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const index = parseInt(
            (e.target as HTMLElement)
              .closest("button")
              ?.getAttribute("data-index") || "0",
          );
          editClassification(index);
        });
      });

      deleteButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const index = parseInt(
            (e.target as HTMLElement)
              .closest("button")
              ?.getAttribute("data-index") || "0",
          );
          deleteClassification(index);
        });
      });
    };

    const editClassification = (index: number) => {
      const classifications = getClassifications();
      const classification = classifications[index];

      if (classification) {
        const newCode = prompt("Code:", classification.code);
        const newMC1 = prompt("MC1 (Niveau 1):", classification.MC1);
        const newMC2 = prompt("MC2 (Niveau 2):", classification.MC2);
        const newMC3 = prompt("MC3 (Niveau 3):", classification.MC3);

        if (newCode && newMC1 && newMC2 && newMC3) {
          classifications[index] = {
            code: newCode,
            MC1: newMC1,
            MC2: newMC2,
            MC3: newMC3,
          };
          saveClassifications(classifications);
          loadClassificationsData();
          showNotificationMessage("Classificatie bijgewerkt");
        }
      }
    };

    const deleteClassification = (index: number) => {
      if (
        confirm("Weet je zeker dat je deze classificatie wilt verwijderen?")
      ) {
        const classifications = getClassifications();
        classifications.splice(index, 1);
        saveClassifications(classifications);
        loadClassificationsData();
        showNotificationMessage("Classificatie verwijderd");
      }
    };

    const addNewClassification = () => {
      const code = prompt("Code (bijv. -brand):");
      const MC1 = prompt("MC1 (Niveau 1):");
      const MC2 = prompt("MC2 (Niveau 2):");
      const MC3 = prompt("MC3 (Niveau 3):");

      if (code && MC1 && MC2 && MC3) {
        const classifications = getClassifications();

        // Check if code already exists
        const existingIndex = classifications.findIndex(
          (c: any) => c.code === code,
        );
        if (existingIndex !== -1) {
          alert("Deze code bestaat al. Gebruik een andere code.");
          return;
        }

        classifications.push({
          code: code,
          MC1: MC1,
          MC2: MC2,
          MC3: MC3,
        });

        saveClassifications(classifications);
        loadClassificationsData();
        showNotificationMessage("Nieuwe classificatie toegevoegd");
      }
    };

    // Add event listener for new classification button
    const addButton = document.getElementById("addNewClassificationBtn");
    if (addButton) {
      addButton.addEventListener("click", addNewClassification);
    }

    // Only initialize if classificaties section is active
    if (activeSection === "classificaties") {
      loadClassificationsData();
    }

    // Cleanup function
    return () => {
      if (addButton) {
        addButton.removeEventListener("click", addNewClassification);
      }
    };
  }, [activeSection]);

  const showNotificationMessage = (message: string) => {
    setNotification(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const simulateNewIncident = () => {
    const priorities: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
    const randomPriority =
      priorities[Math.floor(Math.random() * priorities.length)];
    const randomType =
      incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const randomLocation =
      locations[Math.floor(Math.random() * locations.length)];
    const randomUnits = Math.floor(Math.random() * 3) + 1;

    const newIncident: Incident = {
      id: Date.now(),
      type: randomType,
      location: randomLocation,
      timestamp: new Date().toISOString(),
      timeAgo: "0 min geleden",
      unitsAssigned: randomUnits,
      priority: randomPriority,
      status: "active",
    };

    setIncidents((prev) => [newIncident, ...prev]);
    showNotificationMessage("Nieuwe melding ontvangen: " + randomType);
  };

  const acceptIncident = (id: number) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, status: "accepted" as const } : inc,
      ),
    );
    showNotificationMessage("Incident geaccepteerd");
  };

  const closeIncident = (id: number) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, status: "closed" as const } : inc,
      ),
    );
    showNotificationMessage("Incident gesloten");
  };

  const removeIncident = (id: number) => {
    setIncidents((prev) => prev.filter((inc) => inc.id !== id));
    showNotificationMessage("Incident verwijderd");
  };

  const calculateStats = (): Stats => {
    const activeIncidents = incidents.filter(
      (inc) => inc.status === "active" || inc.status === "accepted",
    );
    const newIncidents = incidents.filter((inc) => {
      const incidentTime = new Date(inc.timestamp);
      const now = new Date();
      const diffMinutes =
        (now.getTime() - incidentTime.getTime()) / (1000 * 60);
      return diffMinutes <= 30 && inc.status === "active";
    });
    const highPriorityIncidents = activeIncidents.filter(
      (inc) => inc.priority === "high",
    );
    const activeUnits = units.filter((unit) => unit.status === "active");
    const emergencyCallsToday = Math.floor(Math.random() * 50) + 20; // Simulated

    return {
      newIncidents: newIncidents.length,
      activeUnits: activeUnits.length,
      highPriority: highPriorityIncidents.length,
      emergencyCalls: emergencyCallsToday,
    };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString("nl-NL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderPlaceholderSection = (title: string, icon: string) => (
    <div className="section">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
      </div>
      <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
        <i
          className={`bi bi-${icon}`}
          style={{ fontSize: "48px", marginBottom: "16px" }}
        ></i>
        <p>{title} wordt geladen...</p>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main className="main-content">
        <div className="header">
          <h1>Meldkamer Dashboard</h1>
          <div className="header-time">{formatTime(currentTime)}</div>
        </div>

        {activeSection === "dashboard" && (
          <div className="content-section active">
            <StatsGrid stats={calculateStats()} />
            <div className="content-grid">
              <IncidentTable
                incidents={incidents}
                onAccept={acceptIncident}
                onClose={closeIncident}
                onRemove={removeIncident}
                onSimulateNew={simulateNewIncident}
              />
              <UnitsPanel units={units} />
            </div>
          </div>
        )}

        {activeSection === "incidents" && (
          <div className="content-section active">
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Alle Incidenten</h3>
                <button
                  className="delete-all-incidents-btn"
                  onClick={() => setShowDeleteConfirmModal(true)}
                >
                  🗑️ Delete All Incidents
                </button>
              </div>
              <div className="incidents-legacy-content">
                <div className="incidents-legacy-table">
                  <div className="legacy-table-header">
                    <div className="legacy-col-id">Incidentnummer</div>
                    <div className="legacy-col-tijd">Tijd</div>
                    <div className="legacy-col-mc">MC</div>
                    <div className="legacy-col-locatie">Locatie</div>
                    <div className="legacy-col-plaats">Plaats</div>
                    <div className="legacy-col-prio">P</div>
                    <div className="legacy-col-status">Status</div>
                  </div>
                  <div
                    className="legacy-table-body"
                    id="allIncidentsLegacyList"
                  >
                    {/* Incidents will be loaded here */}
                  </div>
                </div>
              </div>

              {/* Incident Details Modal */}
              <div
                id="incidentModal"
                className="incident-modal-overlay"
                style={{ display: "none" }}
              >
                <div className="incident-modal-content">
                  <div className="incident-modal-header">
                    <h3 id="incidentModalTitle">Incident Details</h3>
                    <button
                      className="incident-modal-close"
                      id="incidentModalClose"
                    >
                      ×
                    </button>
                  </div>

                  <div className="incident-modal-body">
                    {/* Incident Details Section */}
                    <div className="incident-details-section">
                      <h4>Incident Gegevens</h4>
                      <div className="incident-details-grid">
                        <div className="incident-detail-item">
                          <label>Incidentnummer:</label>
                          <span id="modalIncidentNumber"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>Tijdstip:</label>
                          <span id="modalIncidentTime"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>MC1:</label>
                          <span id="modalMC1"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>MC2:</label>
                          <span id="modalMC2"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>MC3:</label>
                          <span id="modalMC3"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>Locatie:</label>
                          <span id="modalLocation"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>Plaats:</label>
                          <span id="modalPlace"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>Gemeente:</label>
                          <span id="modalMunicipality"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>Prioriteit:</label>
                          <span id="modalPriority"></span>
                        </div>
                        <div className="incident-detail-item">
                          <label>Status:</label>
                          <span id="modalStatus"></span>
                        </div>
                      </div>
                    </div>

                    {/* Logging Section */}
                    <div className="incident-logging-section">
                      <h4>Logging Historie</h4>
                      <div
                        className="incident-logging-area"
                        id="incidentLoggingArea"
                      >
                        {/* Logging entries will be added here */}
                      </div>
                    </div>

                    {/* Add Note Section */}
                    <div className="incident-note-section">
                      <h4>Nieuwe Notitie</h4>
                      <textarea
                        id="incidentNoteInput"
                        className="incident-note-input"
                        placeholder="Voer notitie in..."
                        rows={3}
                      ></textarea>
                      <button
                        id="addIncidentNote"
                        className="incident-note-btn"
                      >
                        Toevoegen
                      </button>
                    </div>

                    {/* Unit Assignment Section */}
                    <div className="incident-unit-section">
                      <h4>Eenheid Koppelen</h4>
                      <select
                        id="unitAssignmentSelect"
                        className="incident-unit-select"
                      >
                        <option value="">Selecteer eenheid...</option>
                        <option value="5901">5901</option>
                        <option value="4502">4502</option>
                        <option value="7801">7801</option>
                        <option value="3204">3204</option>
                        <option value="6105">6105</option>
                        <option value="2907">2907</option>
                      </select>
                      <button id="assignUnit" className="incident-unit-btn">
                        Koppelen
                      </button>
                      <div
                        id="assignedUnitDisplay"
                        className="assigned-unit-display"
                        style={{ display: "none" }}
                      >
                        <span>
                          Gekoppelde eenheid:{" "}
                          <strong id="assignedUnitNumber"></strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="incident-modal-footer">
                    <button
                      className="incident-modal-close-btn"
                      id="incidentModalCloseBtn"
                    >
                      Sluiten
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirmModal && (
                <div className="delete-confirm-modal-overlay">
                  <div className="delete-confirm-modal-content">
                    <div className="delete-confirm-modal-header">
                      <h3>Bevestiging vereist</h3>
                    </div>
                    <div className="delete-confirm-modal-body">
                      <p>
                        Weet je zeker dat je alle incidenten wilt verwijderen?
                        Deze actie kan niet ongedaan worden gemaakt.
                      </p>
                    </div>
                    <div className="delete-confirm-modal-footer">
                      <button
                        className="delete-confirm-cancel-btn"
                        onClick={() => setShowDeleteConfirmModal(false)}
                      >
                        Annuleren
                      </button>
                      <button
                        className="delete-confirm-delete-btn"
                        onClick={handleDeleteAllIncidents}
                      >
                        Verwijder alles
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {activeSection === "intake" && (
          <div className="content-section active">
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Intake - Meldingen Ontvangst</h3>
              </div>
              <div className="intake-content">
                <div className="intake-info-panel">
                  <div className="intake-stats">
                    <div className="intake-stat-card">
                      <div className="stat-number">24</div>
                      <div className="stat-label">Vandaag ontvangen</div>
                    </div>
                    <div className="intake-stat-card">
                      <div className="stat-number">3</div>
                      <div className="stat-label">In behandeling</div>
                    </div>
                    <div className="intake-stat-card">
                      <div className="stat-number">21</div>
                      <div className="stat-label">Doorgestuurd</div>
                    </div>
                  </div>

                  <div className="intake-instructions">
                    <h4>Intake Procedure</h4>
                    <ol>
                      <li>
                        Ontvang en registreer melding via telefoon
                        (112/0900-8844)
                      </li>
                      <li>
                        Verzamel basisgegevens: locatie, type incident, urgentie
                      </li>
                      <li>
                        Beoordeel prioriteit en classificeer volgens MC-codes
                      </li>
                      <li>Stuur door naar GMS voor verdere afhandeling</li>
                      <li>Monitor status en update indien nodig</li>
                    </ol>
                  </div>

                  <div className="intake-quick-actions">
                    <h4>Snelle Acties</h4>
                    <button className="intake-action-btn primary">
                      📞 Nieuwe Melding Ontvangen
                    </button>
                    <button className="intake-action-btn secondary">
                      📋 Doorsturen naar GMS
                    </button>
                    <button className="intake-action-btn secondary">
                      📊 Dagrapport Genereren
                    </button>
                  </div>
                </div>

                <div className="intake-recent-calls">
                  <h4>Recente Meldingen (Laatste 2 uur)</h4>
                  <div className="recent-calls-list">
                    <div className="call-item">
                      <div className="call-time">22:45</div>
                      <div className="call-details">
                        <div className="call-type">Verkeersongeval</div>
                        <div className="call-location">A20 Vlaardingen</div>
                      </div>
                      <div className="call-status completed">Doorgestuurd</div>
                    </div>
                    <div className="call-item">
                      <div className="call-time">22:32</div>
                      <div className="call-details">
                        <div className="call-type">Inbraak</div>
                        <div className="call-location">
                          Coolsingel 42, Rotterdam
                        </div>
                      </div>
                      <div className="call-status processing">
                        In behandeling
                      </div>
                    </div>
                    <div className="call-item">
                      <div className="call-time">22:18</div>
                      <div className="call-details">
                        <div className="call-type">Overlast</div>
                        <div className="call-location">
                          Marktplein, Vlaardingen
                        </div>
                      </div>
                      <div className="call-status completed">Doorgestuurd</div>
                    </div>
                    <div className="call-item">
                      <div className="call-time">21:56</div>
                      <div className="call-details">
                        <div className="call-type">Huiselijk geweld</div>
                        <div className="call-location">
                          Bergweg 156, Rotterdam
                        </div>
                      </div>
                      <div className="call-status completed">Doorgestuurd</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === "units" && (
          <div className="content-section active">
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Eenheden Beheer</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddUnitForm(true)}
                >
                  <i className="bi bi-plus-lg"></i>
                  Eenheid toevoegen
                </button>
              </div>
              <div className="units-management-content">
                <div className="units-filter-section">
                  <label htmlFor="unitsFilter" className="filter-label">
                    🔍 Filter eenheden
                  </label>
                  <input
                    type="text"
                    id="unitsFilter"
                    className="filter-input"
                    placeholder="Zoek op roepnaam of rol..."
                  />
                </div>

                <div className="units-table-container">
                  <table className="units-table">
                    <thead>
                      <tr>
                        <th>Roepnaam</th>
                        <th># Mensen</th>
                        <th>Rollen</th>
                        <th>Voertuig</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody id="unitsTableBody">
                      {policeUnits.map((unit) => (
                        <tr
                          key={unit.id}
                          className="unit-row"
                          data-unit={JSON.stringify(unit)}
                        >
                          <td className="unit-roepnaam">
                            <strong>{unit.roepnaam}</strong>
                          </td>
                          <td className="unit-mensen">{unit.mensen}</td>
                          <td className="unit-rollen">
                            {unit.rollen.map((rol, index) => (
                              <span key={rol} className="role-tag">
                                {rol}
                                {index < unit.rollen.length - 1 && ", "}
                              </span>
                            ))}
                          </td>
                          <td className="unit-voertuig">{unit.voertuigtype}</td>
                          <td>
                            <span
                              className={`status-badge status-${unit.status.toLowerCase().replace(" ", "-")}`}
                            >
                              {unit.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {showAddUnitForm && (
              <div
                className="modal-overlay"
                onClick={() => setShowAddUnitForm(false)}
              >
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h3>Nieuwe Eenheid Toevoegen</h3>
                    <button
                      className="modal-close"
                      onClick={() => setShowAddUnitForm(false)}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Roepnaam *</label>
                      <input
                        type="text"
                        value={newUnit.roepnaam}
                        onChange={(e) =>
                          setNewUnit((prev) => ({
                            ...prev,
                            roepnaam: e.target.value,
                          }))
                        }
                        placeholder="bijv. RT11-03"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Aantal Mensen</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newUnit.mensen}
                        onChange={(e) =>
                          setNewUnit((prev) => ({
                            ...prev,
                            mensen: parseInt(e.target.value),
                          }))
                        }
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Voertuigtype *</label>
                      <select
                        value={newUnit.voertuigtype}
                        onChange={(e) =>
                          setNewUnit((prev) => ({
                            ...prev,
                            voertuigtype: e.target.value,
                          }))
                        }
                        className="form-input"
                      >
                        <option value="">Selecteer voertuig...</option>
                        {vehicleTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={newUnit.status}
                        onChange={(e) =>
                          setNewUnit((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        className="form-input"
                      >
                        {npStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Inzetrollen * (selecteer één of meer)</label>
                      <div className="checkbox-group">
                        {inzetRollen.map((role) => (
                          <label key={role} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={newUnit.rollen.includes(role)}
                              onChange={() => toggleRole(role)}
                            />
                            <span>{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowAddUnitForm(false)}
                    >
                      Annuleren
                    </button>
                    <button className="btn btn-primary" onClick={addNewUnit}>
                      Eenheid Toevoegen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeSection === "gms" && (
          <div className="content-section active">
            <div id="gms" className="section">
              <div className="section-header">
                <h3 className="section-title">GMS - Meldkamer Simulator</h3>
              </div>
              <div className="gms-content">
                {/* Classic GMS Interface Layout */}
                <div className="gms-classic-layout">
                  {/* Top Header Bar */}
                  <div className="gms-header-bar">
                    <div className="gms-incident-info">
                      <span className="gms-incident-id">P Zaakafhandel 1</span>
                      <span
                        className="gms-incident-time"
                        id="gmsHeaderTime"
                      ></span>
                      <span className="gms-incident-type" id="gmsDynamicHeader">
                        Onbekend – Onbekend Onbekend
                      </span>
                    </div>
                  </div>

                  {/* Main Content Grid */}
                  <div className="gms-main-grid">
                    {/* Left Column */}
                    <div className="gms-left-column">
                      {/* Meldergegevens Block */}
                      <div className="gms-block">
                        <div className="gms-block-title">Meldergegevens</div>
                        <div className="gms-form-row">
                          <div className="gms-field-group">
                            <label>Melder</label>
                            <input
                              type="text"
                              id="gmsMeldernaam"
                              className="gms-field"
                            />
                          </div>
                          <div className="gms-field-group">
                            <label>Tel</label>
                            <input
                              type="text"
                              id="gmsTelefoonnummer"
                              className="gms-field gms-field-small"
                            />
                          </div>
                          <div className="gms-checkboxes">
                            <label>
                              <input type="checkbox" /> Anoniem
                            </label>
                            <label>
                              <input type="checkbox" /> Kopie
                            </label>
                          </div>
                        </div>
                        <div className="gms-form-row">
                          <div className="gms-field-group gms-field-wide">
                            <label>Adres</label>
                            <input
                              type="text"
                              id="gmsMelderadres"
                              className="gms-field"
                            />
                          </div>
                          <div className="gms-field-group">
                            <label>Geslacht</label>
                            <select className="gms-field gms-field-small">
                              <option value="">-</option>
                              <option value="M">M</option>
                              <option value="V">V</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Meldinglocatie Block */}
                      <div className="gms-block">
                        <div className="gms-block-title">Meldinglocatie</div>

                        {/* Row 1: Straatnaam, Huisnummer, Toevoeging */}
                        <div className="gms-address-row">
                          <div className="gms-field-group gms-field-street">
                            <label>Straatnaam</label>
                            <input
                              type="text"
                              id="gmsStraatnaam"
                              className="gms-field"
                            />
                          </div>
                          <div className="gms-field-group gms-field-number">
                            <label>Huisnummer</label>
                            <input
                              type="text"
                              id="gmsHuisnummer"
                              className="gms-field gms-field-small"
                            />
                          </div>
                          <div className="gms-field-group gms-field-extension">
                            <label>Toevoeging</label>
                            <input
                              type="text"
                              id="gmsToevoeging"
                              className="gms-field gms-field-small"
                            />
                          </div>
                        </div>

                        {/* Row 2: Postcode, Plaatsnaam */}
                        <div className="gms-address-row">
                          <div className="gms-field-group gms-field-postal">
                            <label>Postcode</label>
                            <input
                              type="text"
                              id="gmsPostcode"
                              className="gms-field gms-field-small"
                            />
                          </div>
                          <div className="gms-field-group gms-field-city">
                            <label>Plaatsnaam</label>
                            <input
                              type="text"
                              id="gmsPlaatsnaam"
                              className="gms-field"
                            />
                          </div>
                        </div>

                        {/* Row 3: Gemeente (full width) */}
                        <div className="gms-address-row">
                          <div className="gms-field-group gms-field-full">
                            <label>Gemeente</label>
                            <input
                              type="text"
                              id="gmsGemeente"
                              className="gms-field"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Classificaties Block */}
                      <div className="gms-block">
                        <div className="gms-block-title">Classificaties</div>
                        <div className="gms-classificatie-row">
                          <div className="gms-mc-labels">
                            <span>MC1</span>
                            <span>MC2</span>
                            <span>MC3</span>
                          </div>
                          <div className="gms-mc-fields">
                            <select
                              id="gmsClassificatie1"
                              className="gms-field"
                            >
                              <option value="">Selecteer...</option>
                              {getUniqueClassificationsByLevel("MC1").map(
                                (mc1) => (
                                  <option key={mc1} value={mc1}>
                                    {mc1}
                                  </option>
                                ),
                              )}
                            </select>
                            <select
                              id="gmsClassificatie2"
                              className="gms-field"
                            >
                              <option value="">Selecteer...</option>
                            </select>
                            <select
                              id="gmsClassificatie3"
                              className="gms-field"
                            >
                              <option value="">Selecteer...</option>
                            </select>
                          </div>
                        </div>
                        <div className="gms-hints-section">
                          <label>Hints/Kar</label>
                          <input
                            type="text"
                            id="gmsHintsInput"
                            className="gms-field"
                            placeholder="Karakteristieken..."
                          />
                        </div>

                        {/* Karakteristieken Overview */}
                        <div className="gms-karakteristieken-section">
                          <div className="gms-karakteristieken-header">
                            <span className="gms-kar-col-name">
                              Karakteristieknaam
                            </span>
                            <span className="gms-kar-col-value">Waarde</span>
                          </div>
                          <div
                            className="gms-karakteristieken-list"
                            id="gmsKarakteristiekenList"
                          >
                            {/* Dynamic entries will be added here */}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="gms-right-column">
                      {/* Logging Area */}
                      <div className="gms-block gms-logging-block gms-logging-block-tall">
                        <div className="gms-block-title">Melding Logging</div>
                        <div
                          id="gmsMeldingLogging"
                          className="gms-logging-area gms-logging-area-tall"
                        ></div>
                      </div>

                      {/* Main Text Field */}
                      <div className="gms-block gms-text-block gms-text-block-compact">
                        <div className="gms-block-title">Notitieveld</div>
                        <div
                          id="gmsKladblok"
                          contentEditable="true"
                          className="gms-text-area gms-text-area-compact"
                          data-placeholder="Voer hier de melding in..."
                        ></div>
                        <div className="gms-text-controls">
                          <button
                            type="button"
                            className="gms-text-btn"
                            onClick={() => document.execCommand("bold")}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            className="gms-text-btn"
                            onClick={() => document.execCommand("underline")}
                          >
                            U
                          </button>
                          <button
                            type="button"
                            className="gms-text-btn"
                            onClick={() => document.execCommand("italic")}
                          >
                            I
                          </button>
                          <button
                            id="gmsAlertButton"
                            className="gms-alert-btn"
                            title="Markeer als spoedmelding"
                          >
                            ❗
                          </button>
                          <button
                            id="gmsVerzendButton"
                            className="gms-action-btn"
                          >
                            Verzend
                          </button>
                        </div>
                      </div>

                      {/* Additional Fields */}
                      <div className="gms-block gms-additional-block">
                        <div className="gms-form-row">
                          <div className="gms-field-group">
                            <label>Tijdstip</label>
                            <input
                              type="datetime-local"
                              id="gmsTijdstip"
                              className="gms-field"
                              readOnly
                            />
                          </div>
                          <div className="gms-field-group">
                            <label>Prioriteit</label>
                            <div className="gms-priority-group">
                              <input
                                type="number"
                                id="gmsPrioriteit"
                                className="gms-field gms-field-tiny"
                                min="1"
                                max="5"
                                defaultValue="3"
                              />
                              <div
                                id="gmsPriorityIndicator"
                                className="gms-priority-dot"
                              ></div>
                              <div className="gms-service-buttons">
                                <button
                                  type="button"
                                  id="gmsServiceBrandweer"
                                  className="gms-service-btn"
                                  data-service="Brandweer"
                                  title="Brandweer"
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  id="gmsServiceAmbulance"
                                  className="gms-service-btn"
                                  data-service="Ambulance"
                                  title="Ambulance"
                                >
                                  A
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="gms-field-group">
                            <label>Delen met</label>
                            <div className="gms-sharing-buttons">
                              <button
                                type="button"
                                id="gmsSharePolitie"
                                className="gms-share-btn"
                                data-service="Politie"
                              >
                                🚓 Politie
                              </button>
                              <button
                                type="button"
                                id="gmsShareBrandweer"
                                className="gms-share-btn"
                                data-service="Brandweer"
                              >
                                🚒 Brandweer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Status Bar */}
                  <div className="gms-status-bar">
                    <div className="gms-status-left">
                      <span id="gmsStatusDateTime">
                        Woensdag 18 november 2015, 08:27:38
                      </span>
                    </div>
                    <div className="gms-status-right">
                      <button
                        className="gms-status-btn"
                        id="gmsEindrapportButton"
                      >
                        Eindrapport
                      </button>
                      <button className="gms-status-btn" id="gmsUitgifteButton">
                        Uitgifte
                      </button>
                      <button className="gms-status-btn" id="gmsSluitAfButton">
                        Sluit af
                      </button>
                      <button className="gms-status-btn" id="gmsSluitButton">
                        Sluit
                      </button>
                    </div>
                  </div>
                </div>

                {/* JSON Output Section */}
                <div className="gms-output-section">
                  <h4 className="gms-output-title">
                    📊 Opgeslagen Melding (JSON)
                  </h4>
                  <pre id="gmsOutput" className="gms-output"></pre>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === "map" &&
          renderPlaceholderSection("Kaart Overzicht", "geo-alt")}
        {activeSection === "archive" &&
          renderPlaceholderSection("Archief", "archive")}
        {activeSection === "reports" &&
          renderPlaceholderSection("Rapporten", "file-text")}
        {activeSection === "classificaties" && (
          <div className="content-section active">
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Classificaties Beheer</h3>
                <button
                  className="btn btn-primary"
                  id="addNewClassificationBtn"
                >
                  <i className="bi bi-plus-lg"></i>
                  Nieuwe Classificatie
                </button>
              </div>
              <div className="classificaties-content">
                <div className="classificaties-table-container">
                  <table className="classificaties-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>MC1 (Niveau 1)</th>
                        <th>MC2 (Niveau 2)</th>
                        <th>MC3 (Niveau 3)</th>
                        <th>Acties</th>
                      </tr>
                    </thead>
                    <tbody id="classificatiesTableBody">
                      {/* Classifications will be loaded here dynamically */}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === "settings" && (
          <div className="content-section active">
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Basisteams Eenheid Rotterdam</h3>
              </div>
              <div className="basisteams-content">
                <div className="basisteams-filter-section">
                  <label htmlFor="basisteamsFilter" className="filter-label">
                    🔍 Filter basisteams
                  </label>
                  <input
                    type="text"
                    id="basisteamsFilter"
                    className="filter-input"
                    placeholder="Zoek op teamcode, naam of gemeente..."
                  />
                </div>

                <div className="basisteams-table-container">
                  <table className="basisteams-table">
                    <thead>
                      <tr>
                        <th>Teamcode</th>
                        <th>Teamnaam</th>
                        <th>Regio</th>
                        <th>Gemeenten</th>
                      </tr>
                    </thead>
                    <tbody>
                      {basisTeams.map((team) => (
                        <tr
                          key={team.code}
                          className="basisteam-row"
                          data-team={JSON.stringify(team)}
                        >
                          <td className="team-code">
                            <strong>{team.code}</strong>
                          </td>
                          <td className="team-naam">{team.naam}</td>
                          <td className="team-regio">{team.regio}</td>
                          <td className="team-gemeenten">
                            {team.gemeenten.map((gemeente, index) => (
                              <span key={gemeente} className="gemeente-tag">
                                {gemeente}
                                {index < team.gemeenten.length - 1 && ", "}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className={`notification ${showNotification ? "show" : ""}`}>
        {notification}
      </div>
    </div>
  );
}
