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
  
  // GMS Incidents database for complete incident lifecycle
  const [gmsIncidents, setGmsIncidents] = useLocalStorage<any[]>(
    "gmsIncidentsDB",
    [],
  );
  
  // Current active incident in GMS
  const [currentGmsIncident, setCurrentGmsIncident] = useState<any>(null);
  
  // Settings subtab state
  const [activeSettingsTab, setActiveSettingsTab] = useState("basisteams");
  
  // Phone numbers management with localStorage fallback
  const [phoneNumbers, setPhoneNumbers] = useLocalStorage<any[]>("telefoonlijst", []);
  
  // Ensure phoneNumbers is always an array
  const phoneNumbersArray = Array.isArray(phoneNumbers) ? phoneNumbers : [];
  
  // Chat state management
  const [activeChatTab, setActiveChatTab] = useState("burgers");
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Enhanced AI Conversation Engine for Emergency Services
  const generateColleagueResponse = (contact: any, userMessage: string, conversationHistory: any[] = []) => {
    const message = userMessage.toLowerCase();
    
    // Enhanced Dutch emergency terminology analysis
    const isUrgent = /urgent|spoed|direct|nu|emergency|prio|meteen|code rood|code geel|alarm|acuut/.test(message);
    const isLocation = /waar|locatie|adres|plaats|richting|straat|wijk|gebied|route/.test(message);
    const isStatus = /status|situatie|stand|update|rapport|overzicht/.test(message);
    const isRequest = /kun je|kan je|wil je|zou je|help|stuur|regel|informeer|activeer|mobiliseer/.test(message);
    const isQuestion = /\?/.test(userMessage) || /wat|wie|waar|wanneer|waarom|hoe/.test(message);
    
    // Emergency incident types detection
    const incidentTypes = {
      fire: /brand|vuur|rook|brandweer|blussen|woningbrand|bedrijfsbrand/.test(message),
      medical: /ambulance|ziekenwagen|gewond|letsel|onwel|hartstilstand|reanimatie/.test(message),
      police: /politie|inbraak|diefstal|geweld|arrestatie|verdachte|overval/.test(message),
      traffic: /verkeer|ongeval|aanrijding|file|wegafsluiting|a20|snelweg/.test(message),
      public: /overlast|verstoring|openbare orde|relschoppers|vechtpartij/.test(message)
    };
    
    // Role-specific personality and knowledge base with incident-specific responses
    const roleProfiles = {
      "Dienstchef": {
        tone: "autoritair en beslissend",
        expertise: ["operationeel overzicht", "resource management", "perscontacten", "escalatieprocedures"],
        responses: {
          urgent: [
            "Urgent genoteerd. Ik schakel direct over naar code geel. Welke eenheden heb je nodig?",
            "Dit krijgt mijn onmiddellijke aandacht. Ik mobiliseer extra mankracht.",
            "Prioriteit 1 - ik neem persoonlijk de leiding over deze operatie."
          ],
          location: [
            "Ik ken dat gebied goed. Laat me de beste aanrijroute voor je regelen.",
            "Die locatie valt onder district Zuid. Ik stuur de dichtstbijzijnde eenheden.",
            "Complexe locatie - ik regel coördinatie met verkeersdienst voor toegang."
          ],
          status: [
            "Operationeel overzicht: 12 eenheden actief, 3 in reserve. Alles onder controle.",
            "Situatie is stabiel. Ik houd alle partijen geïnformeerd via het commandocentrum.",
            "Status groen op alle fronten. Pers is nog niet geïnformeerd."
          ],
          request: [
            "Akkoord, ik regel dat direct via mijn kanalen.",
            "Geen probleem, ik heb de autoriteit om dat goed te keuren.",
            "Dat valt onder mijn verantwoordelijkheid - wordt onmiddellijk geregeld."
          ],
          fire: [
            "Brand geregistreerd. Ik schakel direct de brandweer in en regel perimeter.",
            "Woningbrand - ik activeer tankautospuit en hoogwerker. Evacuatie nodig?",
            "Code rood brand. Ik regel omliggende korpsen voor bijstand."
          ],
          medical: [
            "Medische nood - ambulance wordt direct ingezet. Traumahelikopter nodig?",
            "Ik schakel A1 ambulance in. MMT wordt gealarmeerd voor ondersteuning.",
            "Spoedeisende hulp geactiveerd. Ziekenhuis is geïnformeerd."
          ],
          police: [
            "Politie-inzet geregeld. Hoeveel eenheden zijn ter plaatse nodig?",
            "Ik stuur surveillanceteams. Arrestatieteam wordt geactiveerd.",
            "Politieoptreden - ik coördineer met OvdD en regel ondersteuning."
          ],
          default: [
            "Spreek je met urgentie? Dan neem ik direct actie.",
            "Ik heb volledige operationele autoriteit hier. Wat heb je nodig?",
            "Als dienstchef kan ik alle resources inzetten. Geef me de details."
          ]
        }
      },
      "Teamleider": {
        tone: "praktisch en operationeel",
        expertise: ["tactische operaties", "team coördinatie", "terreinkennis", "veiligheidsprocedures"],
        responses: {
          urgent: [
            "Team alpha staat gereed! Geef me coördinaten en we rukken uit.",
            "Spoedmelding - ik stuur direct twee surveillanceauto's jouw kant op.",
            "Mijn team is al onderweg. ETA 4 minuten ter plaatse."
          ],
          location: [
            "Die straat ken ik goed - smalle toegang, let op geparkeerde auto's.",
            "Wijk Rotterdam-Zuid, sector 7. Mijn eenheden patrouilleren daar nu.",
            "Moeilijk bereikbaar gebied. Ik stuur een motor vooruit voor verkenning."
          ],
          status: [
            "Team operationeel: 6 man actief, 2 in voertuigen, alles 100% beschikbaar.",
            "Situatie ter plaatse onder controle. Verdachte aangehouden, geen incidenten.",
            "Gebied afgezet, forensisch onderzoek loopt. Verwachte afronding over 2 uur."
          ],
          request: [
            "Roger dat. Mijn team pakt het op - wordt direct uitgevoerd.",
            "Komt voor elkaar. Ik delegeer naar surveillant De Jong, hij kent het protocol.",
            "Geen probleem, ik regel versterking en kom persoonlijk kijken."
          ],
          fire: [
            "Brand - ik stuur direct een team ter ondersteuning van de brandweer.",
            "Mijn eenheden gaan assisteren bij evacuatie en perimeter bewaking.",
            "Team wordt ingezet voor crowd control en brandweer ondersteuning."
          ],
          medical: [
            "Medisch incident - ik stuur surveillanten voor begeleiding ambulance.",
            "Team regelt vrije doorgang voor ambulancedienst.",
            "Mijn mensen assisteren bij medische noodhulp."
          ],
          police: [
            "Politie-operatie - mijn team staat gereed voor ondersteuning.",
            "Ik coördineer met andere teams voor gezamenlijke actie.",
            "Team wordt ingezet volgens tactisch plan."
          ],
          traffic: [
            "Verkeersincident - ik stuur team voor afsluiting en regeling.",
            "Mijn eenheden regelen verkeersomleidingen ter plaatse.",
            "Team gaat assisteren bij verkeersafhandeling."
          ],
          public: [
            "Openbare orde - ik stuur extra patrouilles naar het gebied.",
            "Team wordt ingezet voor handhaving en deëscalatie.",
            "Mijn eenheden gaan assisteren bij ordehandhaving."
          ],
          default: [
            "Teamleider hier - mijn jongens staan paraat voor elke klus.",
            "Operationeel team beschikbaar. Wat moet er gebeuren?",
            "Direct inzetbaar met volledig team. Geef instructies door."
          ]
        }
      },
      "Coördinator": {
        tone: "systematisch en ondersteunend",
        expertise: ["communicatie", "logistiek", "planning", "multi-agency coördinatie"],
        responses: {
          urgent: [
            "Urgentie geregistreerd. Ik activeer het crisisteam en informeer alle betrokken diensten.",
            "Code rood procedures in werking. Ambulance, brandweer en bijzondere bijstand worden geactiveerd.",
            "Spoedsysteem actief - alle communicatie loopt nu via prioriteitskanaal."
          ],
          location: [
            "Locatie geplot in het systeem. Ik coördineer toegangsroutes met verkeerscentrale.",
            "GPS coördinaten doorgestuurd naar alle eenheden. Kaartmateriaal beschikbaar.",
            "Gebied gemarkeerd als operationeel. Ik regel perimeter en verkeersomleidingen."
          ],
          status: [
            "Realtime overview: 15 actieve incidenten, 23 eenheden ingezet, capaciteit 78%.",
            "Communicatie verloopt vlot. Alle diensten zijn sync en rapporteren volgens schema.",
            "Operationele status optimaal. Back-up systemen functioneren, geen verstoringen."
          ],
          request: [
            "Verzoek genoteerd en doorgegeven. Ik monitor de voortgang en rapporteer terug.",
            "Coördinatie gestart. Ik breng alle partijen bij elkaar en regel de uitvoering.",
            "Opdracht in het systeem gezet. Ik zorg voor follow-up en statusupdates."
          ],
          fire: [
            "Brand coördinatie - ik verbind brandweer met politie en ambulance.",
            "Ik regel logistieke ondersteuning voor brandbestrijding.",
            "Coördineer evacuatieprocedures met alle betrokken diensten."
          ],
          medical: [
            "Medische coördinatie - ik schakel alle benodigde diensten in.",
            "Ik regel vrije toegang voor hulpdiensten naar locatie.",
            "Coördineer ziekenhuisopname en nazorg procedures."
          ],
          police: [
            "Politie coördinatie - ik verbind alle operationele teams.",
            "Ik regel communicatie tussen verschillende politie-eenheden.",
            "Coördineer tactische ondersteuning en backup."
          ],
          traffic: [
            "Verkeer coördinatie - ik schakel verkeerscentrale en wegbeheer in.",
            "Ik regel omleidingen en verkeersinformatie naar publiek.",
            "Coördineer berging en wegopruiming."
          ],
          public: [
            "Openbare orde coördinatie - ik schakel ME en extra eenheden in.",
            "Ik regel communicatie met burgemeester en bestuur.",
            "Coördineer media-aanpak en informatievoorziening."
          ],
          default: [
            "Coördinatiecentrum hier. Ik zorg voor de verbindingen tussen alle diensten.",
            "Alles loopt via mij - communicatie, planning en logistieke ondersteuning.",
            "Operationele coördinatie actief. Hoe kan ik de operatie ondersteunen?"
          ]
        }
      },
      "Centralist": {
        tone: "alert en ondersteunend",
        expertise: ["meldingen", "communicatie", "protocollen", "administratie"],
        responses: {
          urgent: [
            "Spoedmelding - ik schakel direct door naar de eerstvolgende beschikbare eenheid.",
            "112 lijn vrijgehouden. Alle nieuwe meldingen route ik om naar collega's.",
            "Prioriteit omhoog gezet. Ik monitor alle kanalen voor gerelateerde meldingen."
          ],
          location: [
            "Adresgegevens geverifieerd in het systeem. Bewoners en bijzonderheden bekend.",
            "Locatie gekoppeld aan eerdere meldingen. Zie historiek in het dossier.",
            "Postcode gebied bekende probleemlocatie. Extra aandachtspunten genoteerd."
          ],
          status: [
            "Meldkamer status: 23 open calls, gemiddelde wachttijd 45 seconden.",
            "Communicatielijn helder. Alle eenheden bereikbaar, systemen operationeel.",
            "Administratie bijgewerkt. Alle rapporten ingevoerd, dossier compleet."
          ],
          request: [
            "Ik regel dat direct via het systeem. Koppeling naar de juiste dienstverlening.",
            "Verzoek gelogd en doorgestuurd. Ik houd de status bij en inform je over updates.",
            "Direct opgepakt. Ik neem contact op met de betreffende dienst namens jou."
          ],
          fire: [
            "Brand melding ontvangen. Ik informeer direct de brandweer en regel coördinatie.",
            "Woningbrand - tankautospuit wordt gealarmeerd. Adres doorgestuurd.",
            "Brandmelding geregistreerd. Ik schakel automatisch door naar de kazerne."
          ],
          medical: [
            "Ambulance wordt direct gealarmeerd. Ik geef de details door aan de bemanning.",
            "Medische spoed - A1 rit geactiveerd. ETA wordt doorgegeven.",
            "Ziekenwagen onderweg. Ik houd contact met de ambulancedienst."
          ],
          police: [
            "Politiemelding doorgegeven. Surveillancewagen wordt naar locatie gestuurd.",
            "Ik schakel direct door naar de eerstvolgende politie-eenheid.",
            "Melding geregistreerd en doorgezet naar de wijkagent."
          ],
          default: [
            "Meldkamer centraal - ik houd alle lijnen open en ondersteun waar nodig.",
            "Communicatie hub actief. Wat kan ik voor je betekenen in de operatie?",
            "Alle systemen online. Ik sta klaar voor ondersteuning en coördinatie."
          ]
        }
      },
      "ACO OC Rotterdam": {
        tone: "operationeel commandocentrum",
        expertise: ["regionale coördinatie", "operationele commando", "eenheid dispatch", "situational awareness"],
        responses: {
          urgent: [
            "ACO OC Rotterdam - spoedmelding genoteerd. Ik activeer onmiddellijk de benodigde eenheden.",
            "Operationeel commando geactiveerd. Welke ondersteuning is vereist ter plaatse?",
            "Rotterdam OC hier - ik schakel direct over naar spoedroutine."
          ],
          location: [
            "Rotterdam gebied - ik ken de locatie. Beste aanrijroute wordt berekend.",
            "OC Rotterdam coördineert toegang tot die locatie. Verkeer wordt omgeleid.",
            "Gebied Rotterdam-centrum/zuid/noord - onze eenheden zijn in de buurt."
          ],
          status: [
            "OC Rotterdam operationeel status: alle eenheden beschikbaar, systemen online.",
            "Huidige operaties Rotterdam: 8 actieve incidenten, voldoende capaciteit.",
            "Commandocentrum Rotterdam - alle communicatielijnen helder."
          ],
          request: [
            "ACO Rotterdam regelt dat direct. Ik coördineer met de betreffende diensten.",
            "Operationeel commando Rotterdam neemt het over. Wordt direct uitgevoerd.",
            "OC Rotterdam heeft de autoriteit - ik handel dit persoonlijk af."
          ],
          fire: [
            "Brandmelding Rotterdam - ik informeer direct de brandweer en regel ondersteuning.",
            "Woningbrand gemeld - ACO Rotterdam activeert tankautospuit en hoogwerker.",
            "Brand Rotterdam gebied - ik coördineer met kazerne Charlois voor snelle inzet."
          ],
          medical: [
            "Medische noodsituatie - ACO Rotterdam schakelt ambulancedienst in.",
            "Rotterdam ambulancedienst wordt gealarmeerd. Ik regel spoedinzet.",
            "Medische spoed Rotterdam - ik activeer A1 rit en informeer het ziekenhuis."
          ],
          police: [
            "Politie Rotterdam wordt ingeschakeld. Ik stuur surveillanceteam ter plaatse.",
            "ACO Rotterdam coördineert politie-inzet. Welke ondersteuning is nodig?",
            "Rotterdam politie ontvangt melding. Ik regel directe respons."
          ],
          default: [
            "ACO OC Rotterdam operationeel. Hoe kan ik de situatie ondersteunen?",
            "Operationeel Commando Rotterdam staat klaar. Wat vereist onze aandacht?",
            "Rotterdam commandocentrum hier - alle middelen zijn beschikbaar."
          ]
        }
      },
      "OVD OC": {
        tone: "kalm, autoritair, direct, professioneel",
        expertise: ["grote incidenten coördinatie", "eenheden informeren", "opschaling", "hulpdiensten afstemming", "politiecapaciteit inzet"],
        responses: {
          urgent: [
            "OVD OC hier - spoedmelding ontvangen. Ik stuur direct de benodigde eenheden ter plaatse.",
            "Begrijpen, ik schakel onmiddellijk over naar code geel en mobiliseer extra mankracht.",
            "OVD OC neemt de leiding - ik coördineer alle beschikbare middelen voor deze situatie."
          ],
          location: [
            "Locatie bekend - ik stuur het dichtstbijzijnde basisteam en regel toegang.",
            "Ik ken dat gebied, stuur direct verkeerspolitie voor afsluiting en begeleiding.",
            "Locatie genoteerd - ik coördineer met de wijkagent voor lokale kennis."
          ],
          status: [
            "Status update: 6 eenheden actief, 3 basisteams beschikbaar, recherche stand-by.",
            "Operationele situatie stabiel - alle teams zijn bereikbaar en inzetbaar.",
            "Huidige capaciteit: voldoende mankracht, verkeerspolitie en ME beschikbaar."
          ],
          request: [
            "Begrepen, ik regel dat direct via mijn bevoegdheden als OVD.",
            "Komt voor elkaar - ik neem contact op met de juiste diensten en houd je op de hoogte.",
            "Dat valt onder mijn verantwoordelijkheid, wordt onmiddellijk uitgevoerd."
          ],
          fire: [
            "Begrijpelijk. Ik stem direct af met de brandweercentrale en regel de inzet.",
            "Woningbrand - ik informeer de brandweer en stuur politie ter ondersteuning voor afzetting.",
            "Brand gemeld - ik coördineer met brandweer, regel verkeersafsluiting en evacuatie."
          ],
          medical: [
            "Medische nood - ik activeer ambulancedienst en stuur politie voor begeleiding.",
            "Ik schakel direct de ambulancedienst in en regel vrije doorgang.",
            "Ambulance wordt gealarmeerd - ik coördineer met ziekenhuis voor opname."
          ],
          police: [
            "Dank je, ik licht de recherche direct in en stuur ter plaatse. Hou me op de hoogte van nieuwe info.",
            "Ik stuur direct een basisteam en verkeerspolitie ter ondersteuning. Ik blijf stand-by voor verdere instructies.",
            "Politie-inzet gecoördineerd - surveillanceteam en wijkagent zijn onderweg."
          ],
          traffic: [
            "Verkeersongeval - ik stuur verkeerspolitie en regel berging via weginspectie.",
            "Ik coördineer met verkeerscentrale voor omleidingen en stuur toezicht ter plaatse.",
            "Verkeerssituatie - ik activeer wegbeheer en regel politiebegeleiding."
          ],
          public: [
            "Openbare orde verstoring - ik stuur ME en basisteams voor handhaving.",
            "Overlast gemeld - ik coördineer met wijkteam en stuur extra patrouilles.",
            "Ik regel directe politie-inzet en neem contact op met burgemeester voor eventuele maatregelen."
          ],
          default: [
            "OVD OC hier, wat vereist mijn aandacht?",
            "Officier van Dienst beschikbaar - geef me de situatieschets.",
            "OVD OC operationeel, hoe kan ik de operatie ondersteunen?"
          ]
        }
      }
    };

    // Get role profile or create custom one based on function and notes
    let profile = roleProfiles[contact.functie as keyof typeof roleProfiles];
    
    if (!profile) {
      // Create custom profile based on function name and notes
      profile = {
        tone: "professioneel en behulpzaam",
        expertise: ["algemene ondersteuning", "hulpverlening"],
        responses: {
          urgent: [`Als ${contact.functie} spring ik direct bij voor deze urgentie.`],
          location: [`Ik ken het gebied redelijk goed in mijn rol als ${contact.functie}.`],
          status: [`Vanuit mijn positie als ${contact.functie} kan ik bevestigen dat alles loopt.`],
          request: [`Natuurlijk, als ${contact.functie} kan ik dat voor je regelen.`],
          default: [`${contact.functie} hier, hoe kan ik je helpen?`]
        }
      };
    }

    // Enhance responses based on notes/comments
    if (contact.opmerkingen) {
      const notes = contact.opmerkingen.toLowerCase();
      
      if (notes.includes('specialist')) {
        profile.expertise.push("gespecialiseerde kennis");
        profile.responses.default.push(`Met mijn specialistische achtergrond kan ik hier specifiek advies over geven.`);
      }
      
      if (notes.includes('ervaren')) {
        profile.responses.default.push(`Door mijn jarenlange ervaring herken ik dit soort situaties direct.`);
      }
      
      if (notes.includes('verkeer')) {
        profile.expertise.push("verkeersmanagement");
        profile.responses.location.push(`Verkeerssituatie is mijn expertise - ik regel optimale routes.`);
      }
      
      if (notes.includes('nacht')) {
        profile.responses.default.push(`Nachtdienst is mijn specialiteit, 24/7 beschikbaar.`);
      }
      
      if (notes.includes('crisis')) {
        profile.responses.urgent.push(`Crisismanagement is precies waar ik voor opgeleid ben.`);
      }
    }

    // Select appropriate response category based on context and incident type
    let selectedResponses;
    
    // Priority 1: Check for specific incident types (using optional chaining)
    if (incidentTypes.fire && (profile.responses as any).fire) {
      selectedResponses = (profile.responses as any).fire;
    } else if (incidentTypes.medical && (profile.responses as any).medical) {
      selectedResponses = (profile.responses as any).medical;
    } else if (incidentTypes.police && (profile.responses as any).police) {
      selectedResponses = (profile.responses as any).police;
    } else if (incidentTypes.traffic && (profile.responses as any).traffic) {
      selectedResponses = (profile.responses as any).traffic;
    } else if (incidentTypes.public && (profile.responses as any).public) {
      selectedResponses = (profile.responses as any).public;
    }
    // Priority 2: Check for context categories
    else if (isUrgent) {
      selectedResponses = profile.responses.urgent;
    } else if (isLocation) {
      selectedResponses = profile.responses.location;
    } else if (isStatus) {
      selectedResponses = profile.responses.status;
    } else if (isRequest) {
      selectedResponses = profile.responses.request;
    } else {
      selectedResponses = profile.responses.default;
    }

    // Add conversational context
    if (conversationHistory.length > 2) {
      const contextual = [
        `Zoals we eerder bespraken...`,
        `In aanvulling op mijn vorige bericht...`,
        `Update: de situatie ontwikkelt zich verder...`
      ];
      if (Math.random() > 0.7) {
        selectedResponses = [...selectedResponses, ...contextual];
      }
    }

    // Return contextual response
    const randomIndex = Math.floor(Math.random() * selectedResponses.length);
    return selectedResponses[randomIndex];
  };

  const startConversationWithContact = (contact: any) => {
    setActiveChatTab("collega");
    setCurrentConversation(contact);
    
    // Generate role-specific greeting
    const greetings = {
      "Dienstchef": [
        "Dienstchef hier. Ik hoop dat het geen spoedgeval is?",
        "Je spreekt met de dienstchef. Wat vereist mijn aandacht?",
        "Dienstcommando beschikbaar. Geef me een situatieschets."
      ],
      "Teamleider": [
        "Teamleider operationeel. Mijn jongens staan klaar - wat is er aan de hand?",
        "Team alpha leader hier. Hebben we een operationele situatie?",
        "Teamcommando beschikbaar. Welke ondersteuning heb je nodig?"
      ],
      "Coördinator": [
        "Coördinatiecentrum. Alle systemen zijn online - hoe kan ik helpen?",
        "Operationele coördinatie hier. Welke verbindingen moet ik leggen?",
        "Communicatiecentrale beschikbaar. Wat moet gecoördineerd worden?"
      ],
      "Centralist": [
        "Meldkamer hier. Ik zie je oproep binnenkomen - wat is de situatie?",
        "Communicatie centraal. Alle lijnen zijn helder - ga je gang.",
        "112 centralist beschikbaar. Hoe kan ik je ondersteunen?"
      ]
    };
    
    let greeting = `Hallo, je spreekt met ${contact.functie}. Wat kan ik voor je doen?`;
    
    const roleGreetings = greetings[contact.functie as keyof typeof greetings];
    if (roleGreetings) {
      greeting = roleGreetings[Math.floor(Math.random() * roleGreetings.length)];
    }
    
    // Add context from notes if available
    if (contact.opmerkingen) {
      if (contact.opmerkingen.toLowerCase().includes('specialist')) {
        greeting += " Mijn specialistische kennis staat tot je beschikking.";
      }
      if (contact.opmerkingen.toLowerCase().includes('nacht')) {
        greeting += " Nachtdienst operationeel.";
      }
    }
    
    const initialMessage = {
      id: Date.now(),
      sender: contact.functie,
      content: greeting,
      timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      type: 'incoming'
    };
    
    setChatMessages([initialMessage]);
  };

  const sendMessageToColleague = (message: string) => {
    if (!currentConversation || !message.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'Meldkamer',
      content: message,
      timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      type: 'outgoing'
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Generate AI response after a short delay
    setTimeout(() => {
      const aiResponse = generateColleagueResponse(currentConversation, message, chatMessages);
      const responseMessage = {
        id: Date.now() + 1,
        sender: currentConversation.functie,
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        type: 'incoming'
      };
      setChatMessages(prev => [...prev, responseMessage]);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState({
    functie: "",
    omschrijving: "",
    telefoonnummer: "",
    beginDienst: "",
    eindeDienst: "",
    bereikbaar24u: false,
    opmerkingen: "",
  });
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
  // Official LMC Classifications database - using exact structure from LMC_classificaties.json
  interface GmsClassification {
    MC1: string;
    MC2: string;
    MC3: string;
    code: string;
    prio: number;
    uitleg: string;
  }

  // Load official LMC classifications from the provided JSON file
  const getOfficialLMCClassifications = (): GmsClassification[] => {
    return [
      {
        "MC1": "Alarm",
        "MC2": "Autom. brand",
        "MC3": "Autom. brand OMS",
        "code": "alabab",
        "prio": 2,
        "uitleg": "Melding via OMS van inwerkingtreding van een automatische brandmelder"
      },
      {
        "MC1": "Alarm",
        "MC2": "Autom. brand",
        "MC3": "Br beheerssysteem",
        "code": "alabbb",
        "prio": 2,
        "uitleg": "Melding via OMS van inwerkingtreding van een automatische blusinstallatie"
      },
      {
        "MC1": "Alarm",
        "MC2": "Autom. brand",
        "MC3": "Brandmelding PAC",
        "code": "alabbm",
        "prio": 2,
        "uitleg": "Binnenkomende brandmeldingen via de PAC van op PAC aangesloten automatische branddetectiesystemen."
      },
      {
        "MC1": "Alarm",
        "MC2": "Autom. brand",
        "MC3": "Drukknopmelding OMS",
        "code": "alabdk",
        "prio": 2,
        "uitleg": "Melding via het OMS van een aangesloten handmelder in controle-/portiersruimtes van risicovolle objecten. Bediening mag uitsluitend door kundige medewerkers worden verricht. Dit zijn dan ook meldingen waaraan de hoogste urgentie moet worden gegeven voor afhandeling melding."
      },
      {
        "MC1": "Alarm",
        "MC2": "Autom. brand",
        "MC3": "Handmelder OMS",
        "code": "alabhm",
        "prio": 2,
        "uitleg": "Brandmeldingen op de meldkamer die direct binnenkomen via de aangesloten OMS, en automatische brandmeldingen via de PAC aan de meldkamer doorgegeven."
      },
      {
        "MC1": "Alarm",
        "MC2": "Autom. Gev stof",
        "MC3": "Gev. stof OMS",
        "code": "algsom",
        "prio": 2,
        "uitleg": "Melding via OMS van detectie van een gevaarlijke stof."
      },
      {
        "MC1": "Alarm",
        "MC2": "Autom. Gev stof",
        "MC3": "Gev. stof PAC",
        "code": "algspa",
        "prio": 2,
        "uitleg": "Binnenkomende meldingen via PAC van op PAC aangesloten automatische Gevaarlijke Stof detectiesystemen."
      },
      {
        "MC1": "Alarm",
        "MC2": "Luid/optisch alarm",
        "MC3": "Gebouw",
        "code": "allogb",
        "prio": 3,
        "uitleg": "Melding door een persoon aan de meldkamer dat uit/ in of aan een gebouw een luid/optisch (bijvoorbeeld inbraak-, brand-, (co)gas) alarm hoor- of zichtbaar is waarop door de beheerder/gebruiker van het betreffende object niet gereageerd lijkt te worden."
      },
      {
        "MC1": "Alarm",
        "MC2": "Luid/optisch alarm",
        "MC3": "Rookmelder",
        "code": "allorm",
        "prio": 3,
        "uitleg": "Melding door een persoon aan de meldkamer zonder dat diegene toegang heeft tot het object, maar voldoende kennis heeft van het object, om te bepalen dat in het object een rookmelder hoorbaar is. Verder zijn er geen indicaties dat er brand is, maar waarop vanuit/door de beheerder/gebruiker van het betreffende object niet gereageerd lijkt te worden."
      },
      {
        "MC1": "Alarm",
        "MC2": "Luid/optisch alarm",
        "MC3": "Voertuig/Vaartuig",
        "code": "allovv",
        "prio": 3,
        "uitleg": "Melding van een persoon aan de meldkamer dat uit/in of aan een voer-/vaartuig een luid/optisch (b.v. inbraak-, brand-, (co)gas) alarm hoor-/zichtbaar is waarop vanuit/door de beheerder/gebruiker van het betreffende object niet gereageerd lijkt te worden."
      },
      {
        "MC1": "Alarm",
        "MC2": "PAC alarm",
        "MC3": "Inbraakalarm",
        "code": "alpaib",
        "prio": 2,
        "uitleg": "Inbraakmeldingen die via de PAC binnenkomen van de op PAC aangesloten inbraak detectiesystemen."
      },
      {
        "MC1": "Alarm",
        "MC2": "PAC alarm",
        "MC3": "Overvalalarm",
        "code": "alpaov",
        "prio": 2,
        "uitleg": "(Drukknop) overvalmeldingen via de PAC aan de meldkamer doorgegeven, van systemen voor het doorgeven van een overvalmelding."
      },
      {
        "MC1": "Alarm",
        "MC2": "PAC alarm",
        "MC3": "Persoonsalarm",
        "code": "alpaps",
        "prio": 1,
        "uitleg": "Melding via de PAC van een persoonsgebonden noodoproepsysteem met de indicatie dat hulp van de OOV dienst nodig is."
      },
      {
        "MC1": "Alarm",
        "MC2": "RAC alarm",
        "MC3": "Inbraakalarm",
        "code": "alraib",
        "prio": 1,
        "uitleg": "Inbraakmeldingen die via de RAC binnenkomen van de op RAC aangesloten inbraakdetectie systemen."
      },
      {
        "MC1": "Alarm",
        "MC2": "RAC alarm",
        "MC3": "Overvalalarm",
        "code": "alraov",
        "prio": 1,
        "uitleg": "(Drukknop) overvalmeldingen aan de meldkamer doorgegeven via de RAC, van systemen voor het doorgeven van een overvalmelding."
      },
      {
        "MC1": "Alarm",
        "MC2": "RAC alarm",
        "MC3": "Persoonsalarm",
        "code": "alraps",
        "prio": 1,
        "uitleg": "Melding die rechtstreeks op de meldkamer binnenkomt van een speciaal voor het doorgeven van noodoproepen bedoeld, op de persoon, draagbaar middel. Dit is geen C2000-verbindingsmiddel."
      },
      {
        "MC1": "Alarm",
        "MC2": "Sensing",
        "MC3": "Alert",
        "code": "alseal",
        "prio": 2,
        "uitleg": "Alert is een hit vanuit een van de bij de marechaussee gebruikte sensing systemen ten behoeve van de grensbewaking van de lucht, land of zeegrenzen. "
      },
      {
        "MC1": "Alarm",
        "MC2": "Sensing",
        "MC3": "Toezichtsalarm",
        "code": "alsetz",
        "prio": 1,
        "uitleg": "Een gedetineerde of TBS-er krijgt een GPS band waardoor hij voordurend onder toezicht is. Als de betrokkene de naleving van bijzondere voorwaarde niet opvolgt, volgt er een melding naar de MKP."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Afpersing",
        "code": "bzdsap",
        "prio": 3,
        "uitleg": "Bij een afpersing (in de volksmond: chantage) probeert iemand zich wederrechtelijk te bevoordelen door een ander, al dan niet met geweld/smaad/laster/openbaarmaking, te dwingen iets te geven/te doen/niet te doen/te dulden. Dit kan gepaard gaan met een cybercomponent of seksueel getint materiaal. De daders willen geen politie-inmenging."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Beroving",
        "code": "bzdsbr",
        "prio": 1,
        "uitleg": "Met geweld of dreiging daartoe een persoon of goederen beroven in de openbare ruimte, niet zijnde een waardetransport."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Dier",
        "code": "bzdsdi",
        "prio": 3,
        "uitleg": "Diefstal van een dier."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Fraude",
        "code": "bzdsfd",
        "prio": 3,
        "uitleg": "Het misleiden, bedriegen of schenden van vertrouwen met als doel een oneerlijk of onrechtvaardig voordeel danwel winst te verkrijgen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Goederen",
        "code": "bzdsgd",
        "prio": 3,
        "uitleg": "Diefstal van goederen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Heling",
        "code": "bzdshl",
        "prio": 3,
        "uitleg": "Heling is het afnemen, verkopen of verhandelen van hetgeen iemand anders gestolen heeft."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Luchtvaartuig",
        "code": "bzdslu",
        "prio": 3,
        "uitleg": "Diefstal van een luchtvaartuig."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Oplichting",
        "code": "bzdsol",
        "prio": 3,
        "uitleg": "Iemand bewegen tot afgifte van enig goed door middel van het aanwenden van bedrieglijke middelen of door het toepassen van listige kunstgrepen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Vaartuig",
        "code": "bzdsva",
        "prio": 3,
        "uitleg": "Zie diefstal."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Verduistering",
        "code": "bzdsvd",
        "prio": 3,
        "uitleg": "Het opzettelijk en wederrechtelijk toe-eigenen van enig goed dat geheel, of ten dele, aan een ander toebehoort en dat men anders dan door een misdrijf in het bezit gekregen heeft."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Voertuig",
        "code": "bzdsvo",
        "prio": 3,
        "uitleg": "Diefstal van een voertuig"
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Winkeldiefstal",
        "code": "bzdswk",
        "prio": 2,
        "uitleg": "Diefstal uit een winkel"
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Diefstal",
        "MC3": "Zakkenrollerij",
        "code": "bzdszk",
        "prio": 3,
        "uitleg": "Diefstal door een zakkenroller"
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Inbraak",
        "MC3": "Bedrijf/Instelling",
        "code": "bzibbi",
        "prio": 2,
        "uitleg": "Door middel van braak zich wederrechtelijk toegang verschaffen tot een bedrijf of instelling, met het oogmerk om diefstal te plegen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Inbraak",
        "MC3": "Bijgebouw",
        "code": "bzibbg",
        "prio": 2,
        "uitleg": "Door middel van braak zich wederrechtelijk toegang verschaffen, met het oogmerk om diefstal te plegen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Inbraak",
        "MC3": "Luchtvaartuig",
        "code": "bziblu",
        "prio": 2,
        "uitleg": "Door middel van braak zich wederrechtelijk toegang verschaffen tot een luchtvaartuig, met het oogmerk om diefstal te plegen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Inbraak",
        "MC3": "Spoorvervoer",
        "code": "bzibsp",
        "prio": 2,
        "uitleg": "Door middel van braak zich wederrechtelijk toegang verschaffen tot een railvoertuig, met het oogmerk om diefstal te plegen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Inbraak",
        "MC3": "Vaartuig",
        "code": "bzibva",
        "prio": 2,
        "uitleg": "Door middel van braak zich wederrechtelijk toegang verschaffen tot een vaartuig, met het oogmerk om diefstal te plegen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Inbraak",
        "MC3": "Voertuig",
        "code": "bzibvo",
        "prio": 2,
        "uitleg": "Door middel van braak zich wederrechtelijk toegang verschaffen tot een voertuig, met het oogmerk om diefstal te plegen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Inbraak",
        "MC3": "Woning",
        "code": "bzibwn",
        "prio": 2,
        "uitleg": "Door middel van braak zich wederrechtelijk toegang verschaffen tot een woning, met het oogmerk om diefstal te plegen."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Overval",
        "MC3": "Bedrijf/Instelling",
        "code": "bzovbi",
        "prio": 1,
        "uitleg": "Een geplande overval op een bedrijf of instelling"
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Overval",
        "MC3": "Luchtvaartuig",
        "code": "bzovlu",
        "prio": 1,
        "uitleg": "Een geplande overval op of in luchtvaartuig niet zijnde een kaping."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Overval",
        "MC3": "Voertuig/Vaartuig",
        "code": "bzovvv",
        "prio": 1,
        "uitleg": "Een geplande overval op een voer- of vaartuig."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Overval",
        "MC3": "Waardetransport",
        "code": "bzovwd",
        "prio": 1,
        "uitleg": "Het met geweld of bedreiging met geweld wegnemen of afpersen van enig goed, gepleegd tegen personen in een afgeschermde ruimte of op een gepland dan wel georganiseerd waardetransport of poging daartoe."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Overval",
        "MC3": "Woning",
        "code": "bzovwn",
        "prio": 1,
        "uitleg": "Een geplande overval op een particulier persoon vaak binnenshuis"
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Stroperij",
        "MC3": "Dier",
        "code": "bzspdi",
        "prio": 2,
        "uitleg": "Zonder geweld of dreiging daartoe, het geheel of ten dele, aan een ander toebehorende dier(en) wegnemen met het oogmerk van toe-eigening."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Stroperij",
        "MC3": "Goederen",
        "code": "bzspgd",
        "prio": 2,
        "uitleg": "Zonder geweld of dreiging daartoe, het geheel of ten dele, aan een ander toebehorende klei, bagger, veldvruchten etc. wegnemen met het oogmerk van toe-eigening."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Vernieling",
        "MC3": "Gebouw",
        "code": "bzvngb",
        "prio": 3,
        "uitleg": "Zie vernieling."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Vernieling",
        "MC3": "Goederen",
        "code": "bzvngd",
        "prio": 3,
        "uitleg": "Zie vernieling."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Vernieling",
        "MC3": "Graffiti",
        "code": "bzvngf",
        "prio": 3,
        "uitleg": "Zie vernieling. Immers, het herstellen van de schade brengt zodanige kosten met zich mee dat van beschadiging mag worden uitgegaan."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Vernieling",
        "MC3": "Luchtvaartuig",
        "code": "bzvnlu",
        "prio": 3,
        "uitleg": "Zie vernieling."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Vernieling",
        "MC3": "Spoorvervoer",
        "code": "bzvnsp",
        "prio": 3,
        "uitleg": "Zie vernieling."
      },
      {
        "MC1": "Bezitsaantasting",
        "MC2": "Vernieling",
        "MC3": "Vaartuig",
        "code": "bzvnva",
        "prio": 3,
        "uitleg": "Zie vernieling."
      }
    ];
  };

  const gmsClassificationsData: GmsClassification[] = getOfficialLMCClassifications();

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

  const [basisTeams] = useLocalStorage<BasisTeam[]>(
    "basisteams",
    basisteamsData,
  );

  // Initialize GMS classifications with complete official data
  const [gmsClassifications, setGmsClassifications] = useState<GmsClassification[]>([]);

  // Load complete official LMC classifications
  useEffect(() => {
    const loadOfficialClassifications = async () => {
      // Don't clear existing data - preserve it for reliability
      
      try {
        const response = await fetch('/lmc_classifications.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const officialClassifications: GmsClassification[] = await response.json();
        
        localStorage.setItem("gmsClassifications", JSON.stringify(officialClassifications));
        setGmsClassifications(officialClassifications);
        console.log("Loaded complete official GMS classifications:", officialClassifications.length, "entries");
      } catch (error) {
        console.warn("Could not load from server, checking localStorage...");
        
        // Try to load from localStorage if server fails
        const storedClassifications = localStorage.getItem("gmsClassifications");
        if (storedClassifications) {
          try {
            const parsedClassifications = JSON.parse(storedClassifications);
            setGmsClassifications(parsedClassifications);
            console.log("Loaded GMS classifications from localStorage:", parsedClassifications.length, "entries");
          } catch (parseError) {
            console.error("Failed to parse stored classifications");
            setGmsClassifications([]);
          }
        } else {
          console.error("No classifications available in localStorage");
          setGmsClassifications([]);
        }
      }
    };

    loadOfficialClassifications();
  }, []);

  // GMS Classification database helper functions
  const searchGmsClassifications = (query: string): GmsClassification[] => {
    if (!query) return gmsClassifications;

    const lowerQuery = query.toLowerCase();
    return gmsClassifications.filter(
      (classification: GmsClassification) =>
        classification.code.toLowerCase().includes(lowerQuery) ||
        classification.MC1.toLowerCase().includes(lowerQuery) ||
        classification.MC2.toLowerCase().includes(lowerQuery) ||
        classification.MC3.toLowerCase().includes(lowerQuery) ||
        classification.uitleg.toLowerCase().includes(lowerQuery),
    );
  };

  const getClassificationByCode = (
    code: string,
  ): GmsClassification | undefined => {
    return gmsClassifications.find(
      (classification: GmsClassification) => classification.code === code,
    );
  };

  const getUniqueClassificationsByLevel = (
    level: "MC1" | "MC2" | "MC3",
    parentValue?: string,
  ): string[] => {
    // Use React state instead of localStorage for real-time updates
    let filtered = gmsClassifications;

    // Filter by parent value if provided
    if (level === "MC2" && parentValue) {
      filtered = gmsClassifications.filter(
        (c: GmsClassification) => c.MC1 === parentValue,
      );
    } else if (level === "MC3" && parentValue) {
      filtered = gmsClassifications.filter(
        (c: GmsClassification) => c.MC2 === parentValue,
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
      // Track if operator acceptance has been logged for this incident
      let operatorAcceptanceLogged = false;

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

      // Auto-log operator acceptance when any field is first clicked
      const logOperatorAcceptance = () => {
        if (operatorAcceptanceLogged) return;
        
        const meldingLogging = document.getElementById("gmsMeldingLogging");
        if (!meldingLogging) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString("nl-NL", {
          day: "2-digit",
          month: "2-digit", 
          year: "numeric"
        });
        const timeStr = now.toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit"
        });

        // Determine active discipline (default to Politie)
        const activeDiscipline = "P--"; // Could be enhanced to detect actual discipline

        const logEntry = document.createElement("div");
        logEntry.className = "gms-log-entry operator-acceptance";
        logEntry.innerHTML = `
          <span class="gms-log-time">${timeStr}</span>
          <span class="gms-log-message">Oproep aangenomen door discipline ${activeDiscipline} op ${dateStr} ${timeStr}</span>
        `;

        // Add to top of logging area
        if (meldingLogging.firstChild) {
          meldingLogging.insertBefore(logEntry, meldingLogging.firstChild);
        } else {
          meldingLogging.appendChild(logEntry);
        }

        operatorAcceptanceLogged = true;
        console.log(`Operator acceptance logged at ${dateStr} ${timeStr}`);
      };

      // Setup auto-logging on field interactions
      const setupFieldInteractionLogging = () => {
        const fieldSelectors = [
          'input[id^="gms"]',
          'select[id^="gms"]', 
          'textarea[id^="gms"]',
          '#gmsKladblok'
        ];

        fieldSelectors.forEach(selector => {
          const fields = document.querySelectorAll(selector);
          fields.forEach(field => {
            field.addEventListener('focus', logOperatorAcceptance, { once: false });
            field.addEventListener('click', logOperatorAcceptance, { once: false });
          });
        });
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



      // Handle notepad note submission (Verzend button in notepad)
      const handleNotePadSubmit = () => {
        console.log('🚀 CLASSIFICATION DETECTION TRIGGERED');
        
        const kladblok = document.getElementById("gmsKladblok");
        
        if (!kladblok) {
          console.error('❌ Kladblok element not found!');
          return;
        }
        
        const notitieText = kladblok.textContent || kladblok.innerText || '';
        console.log('📝 Raw note content:', JSON.stringify(notitieText));
        console.log('📝 Note length:', notitieText.length);
        
        if (!notitieText.trim()) {
          console.log('⚠️ Empty note content, skipping classification');
          return;
        }
        
        // Only process classification detection, don't save full form
        if (notitieText.trim()) {
          // Process classification codes
          const mc1Select = document.getElementById("gmsClassificatie1") as HTMLSelectElement;
          const mc2Select = document.getElementById("gmsClassificatie2") as HTMLSelectElement;
          const mc3Select = document.getElementById("gmsClassificatie3") as HTMLSelectElement;
          const prioriteitSelect = document.getElementById("gmsPrioriteit") as HTMLSelectElement;
          
          console.log('🔧 Dropdown elements found:', {
            mc1Select: !!mc1Select,
            mc2Select: !!mc2Select,
            mc3Select: !!mc3Select,
            prioriteitSelect: !!prioriteitSelect
          });

          if (mc1Select && mc2Select && mc3Select) {
            console.log('✅ All dropdown elements found, proceeding with classification detection');
            const classificationsData = localStorage.getItem("gmsClassifications");
            const storedClassifications = (classificationsData && classificationsData !== "undefined") ? JSON.parse(classificationsData) : [] as GmsClassification[];
            console.log('🔍 Starting classification search with', storedClassifications.length, 'classifications loaded');
            console.log('📝 Input text:', `"${notitieText}"`);
            
            // Quick test: check if we have any "brgb" codes in our data
            const testBrgb = storedClassifications.filter(c => c.code.toLowerCase().includes('brgb'));
            console.log('🧪 Test - BRGB codes available:', testBrgb.length, testBrgb.slice(0, 3));
            
            // Test specific searches
            const testOngevall = storedClassifications.filter(c => 
              c.MC1.toLowerCase().includes('ongeval') || 
              c.MC2.toLowerCase().includes('wegvervoer') ||
              c.MC3.toLowerCase().includes('letsel')
            );
            console.log('🧪 Test - Ongeval/wegvervoer/letsel matches:', testOngevall.length);
            
            const lines = notitieText.split('\n');
            let matchedClassification = null;

            for (const line of lines) {
              const trimmedLine = line.trim();
              console.log('🔍 Processing line:', trimmedLine);
              
              // Check for Meldergegevens format (m/phone/name)
              if (trimmedLine.startsWith('m/') && trimmedLine.length > 2) {
                const melderData = trimmedLine.substring(2); // Remove 'm/' prefix
                const parts = melderData.split('/');
                
                if (parts.length >= 2) {
                  const phoneNumber = parts[0].trim();
                  const melderName = parts.slice(1).join('/').trim(); // Join remaining parts for name
                  
                  console.log('📞 Processing Meldergegevens:', { phoneNumber, melderName });
                  
                  // Fill in the Meldergegevens fields
                  const phoneField = document.getElementById("gmsTelefoonnummer") as HTMLInputElement;
                  const nameField = document.getElementById("gmsMeldernaam") as HTMLInputElement;
                  
                  if (phoneField) {
                    phoneField.value = phoneNumber;
                    console.log('✅ Phone number set to:', phoneNumber);
                  } else {
                    console.error('❌ Phone field not found');
                  }
                  
                  if (nameField) {
                    nameField.value = melderName;
                    console.log('✅ Melder name set to:', melderName);
                  } else {
                    console.error('❌ Name field not found');
                  }
                  
                  // Log the automatic fill
                  const timestamp = new Date().toLocaleTimeString('nl-NL');
                  console.log(`${timestamp} ✅ Meldergegevens automatisch ingevuld: ${melderName} - ${phoneNumber}`);
                } else {
                  console.log('⚠️ Invalid Meldergegevens format. Expected: m/phone/name');
                }
                
                continue; // Skip to next line
              }
              
              // Check for location commands starting with =
              if (trimmedLine.startsWith('=') && trimmedLine.length > 1) {
                const locationData = trimmedLine.substring(1); // Remove the =
                console.log('📍 Processing location command:', locationData);
                
                // Parse location data
                let plaatsnaam = '';
                let straatnaam = '';
                let huisnummer = '';
                
                // Handle format: =Rotterdam+ (plus sign is optional and ignored)
                if (locationData.endsWith('+')) {
                  plaatsnaam = locationData.slice(0, -1).trim();
                }
                // Handle format: =Rotterdam/Laan op zuid 12
                else if (locationData.includes('/')) {
                  const [city, streetAndNumber] = locationData.split('/');
                  plaatsnaam = city.trim();
                  
                  // Parse street and number
                  const streetParts = streetAndNumber.trim().split(' ');
                  const lastPart = streetParts[streetParts.length - 1];
                  
                  // Check if last part is a number
                  const isNumber = /^\d+[a-zA-Z]*$/.test(lastPart);
                  
                  if (isNumber) {
                    huisnummer = lastPart;
                    straatnaam = streetParts.slice(0, -1).join(' ');
                  } else {
                    straatnaam = streetAndNumber.trim();
                  }
                }
                // Handle format: =Rotterdam
                else {
                  plaatsnaam = locationData.trim();
                }
                
                // Fill in the location fields
                const plaatsnaamField = document.getElementById("gmsPlaatsnaam") as HTMLInputElement;
                const straatnaamField = document.getElementById("gmsStraatnaam") as HTMLInputElement;
                const huisnummerField = document.getElementById("gmsHuisnummer") as HTMLInputElement;
                
                if (plaatsnaamField && plaatsnaam) {
                  plaatsnaamField.value = plaatsnaam;
                  console.log('✅ Plaatsnaam set to:', plaatsnaam);
                }
                
                if (straatnaamField && straatnaam) {
                  straatnaamField.value = straatnaam;
                  console.log('✅ Straatnaam set to:', straatnaam);
                }
                
                if (huisnummerField && huisnummer) {
                  huisnummerField.value = huisnummer;
                  console.log('✅ Huisnummer set to:', huisnummer);
                }
                
                // Log the automatic fill
                const timestamp = new Date().toLocaleTimeString('nl-NL');
                console.log(`${timestamp} ✅ Locatie automatisch ingevuld: ${plaatsnaam}${straatnaam ? ' / ' + straatnaam : ''}${huisnummer ? ' ' + huisnummer : ''}`);
                
                continue; // Skip to next line
              }
              
              // Check for hyphen-based codes (-brgb, -wvoi, etc.)
              if (trimmedLine.startsWith('-') && trimmedLine.length > 1) {
                const searchQuery = trimmedLine.substring(1).trim();
                console.log('🎯 Searching for hyphen-based code:', searchQuery);
                
                // 1. Try exact code match first
                matchedClassification = storedClassifications.find(c => 
                  c.code.toLowerCase() === searchQuery.toLowerCase()
                );
                console.log('🔍 1. Exact code match result:', matchedClassification ? `Found: ${matchedClassification.code}` : 'Not found');
                
                // 2. Try partial code match (e.g., -bz matches bzdsap, bzdsbr, etc.)
                if (!matchedClassification) {
                  matchedClassification = storedClassifications.find(c => 
                    c.code.toLowerCase().startsWith(searchQuery.toLowerCase())
                  );
                  console.log('🔍 2. Partial code match result:', matchedClassification ? `Found: ${matchedClassification.code}` : 'Not found');
                }
                
                // 3. Special mappings for common abbreviations
                if (!matchedClassification) {
                  const specialMappings: Record<string, string> = {
                    'wegverkeer onder invloed': 'vkweoi',
                    'onder invloed': 'vkweoi',
                    'bz': 'bzdsap', // Default to first bz code
                    'brgb': 'brgb01', // Default to first brgb code
                    'vkwebz': 'vkwebz' // Direct mapping for vkwebz
                  };
                  
                  const mappedCode = specialMappings[searchQuery.toLowerCase()];
                  if (mappedCode) {
                    matchedClassification = storedClassifications.find(c => 
                      c.code.toLowerCase() === mappedCode.toLowerCase()
                    );
                    console.log('🔍 3. Special mapping result:', matchedClassification ? `Found: ${matchedClassification.code}` : 'Not found');
                  } else {
                    console.log('🔍 3. No special mapping found for:', searchQuery.toLowerCase());
                  }
                }
                
                // 4. Try text matches for full classification strings
                if (!matchedClassification) {
                  const searchWords = searchQuery.toLowerCase().split(' ').filter(word => word.length > 2);
                  console.log('🔍 4. Searching for words:', searchWords);
                  
                  matchedClassification = storedClassifications.find(c => {
                    const fullClassification = `${c.MC1} ${c.MC2} ${c.MC3}`.toLowerCase();
                    const uitleg = c.uitleg.toLowerCase();
                    
                    // Check if all search words are present in the classification or explanation
                    return searchWords.every(word => 
                      fullClassification.includes(word) || 
                      uitleg.includes(word) ||
                      c.MC1.toLowerCase().includes(word) ||
                      c.MC2.toLowerCase().includes(word) ||
                      c.MC3.toLowerCase().includes(word)
                    );
                  });
                  console.log('🔍 4. Multi-word match result:', matchedClassification ? `Found: ${matchedClassification.code}` : 'Not found');
                }
                
                // 5. Try individual text matches for MC1, MC2, MC3
                if (!matchedClassification) {
                  matchedClassification = storedClassifications.find(c => 
                    c.MC3.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.MC2.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.MC1.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  console.log('🔍 4. Individual text match result:', matchedClassification ? `Found: ${matchedClassification.code}` : 'Not found');
                }
                
                // 5. Try fuzzy matching for partial matches
                if (!matchedClassification && searchQuery.length > 3) {
                  matchedClassification = storedClassifications.find(c => {
                    const searchLower = searchQuery.toLowerCase();
                    return c.MC1.toLowerCase().includes(searchLower) ||
                           c.MC2.toLowerCase().includes(searchLower) ||
                           c.MC3.toLowerCase().includes(searchLower) ||
                           c.uitleg.toLowerCase().includes(searchLower) ||
                           searchLower.includes(c.MC1.toLowerCase()) ||
                           searchLower.includes(c.MC2.toLowerCase()) ||
                           searchLower.includes(c.MC3.toLowerCase());
                  });
                  console.log('🔍 5. Fuzzy match result:', matchedClassification ? `Found: ${matchedClassification.code}` : 'Not found');
                }
                
                if (matchedClassification) {
                  console.log('✅ Match found for hyphen code:', matchedClassification);
                  break;
                }
              }
              
              // Check for text-based classifications without hyphen
              else if (trimmedLine.length > 2) {
                const searchQuery = trimmedLine.toLowerCase();
                console.log('🎯 Searching for text-based classification:', searchQuery);
                
                matchedClassification = storedClassifications.find(c => 
                  c.MC3.toLowerCase().includes(searchQuery) ||
                  c.MC2.toLowerCase().includes(searchQuery) ||
                  c.MC1.toLowerCase().includes(searchQuery) ||
                  searchQuery.includes(c.MC3.toLowerCase()) ||
                  searchQuery.includes(c.MC2.toLowerCase()) ||
                  searchQuery.includes(c.MC1.toLowerCase())
                );
                
                if (matchedClassification) {
                  console.log('✅ Match found for text:', matchedClassification);
                  break;
                }
              }
            }

            // Apply the matched classification
            if (matchedClassification) {
              console.log('🎯 MATCHED CLASSIFICATION:', matchedClassification);
              console.log('🔧 Starting dropdown population...');
              
              // Debug current dropdown state
              console.log('📋 Current dropdown elements:', {
                mc1Select: mc1Select?.id,
                mc2Select: mc2Select?.id, 
                mc3Select: mc3Select?.id,
                prioriteitSelect: prioriteitSelect?.id
              });
              
              // Step 1: Populate MC1 dropdown and set value
              console.log('📋 Populating MC1...');
              mc1Select.innerHTML = '<option value="">Selecteer...</option>';
              
              // Get MC1 options from stored classifications
              const mc1Values = storedClassifications.map(c => c.MC1).filter(Boolean);
              const mc1Options = Array.from(new Set(mc1Values)).sort();
              console.log('📋 MC1 options available:', mc1Options.length, mc1Options);
              
              mc1Options.forEach(mc1 => {
                const option = document.createElement('option');
                option.value = mc1;
                option.textContent = mc1;
                mc1Select.appendChild(option);
              });
              mc1Select.value = matchedClassification.MC1;
              console.log('✅ MC1 set to:', mc1Select.value);
              
              // Step 2: Populate MC2 dropdown if MC2 exists
              if (matchedClassification.MC2 && matchedClassification.MC2.trim() !== '') {
                console.log('📋 Populating MC2...');
                mc2Select.innerHTML = '<option value="">Selecteer...</option>';
                
                // Get MC2 options from stored classifications for the selected MC1
                const mc2Values = storedClassifications
                  .filter(c => c.MC1 === matchedClassification.MC1)
                  .map(c => c.MC2)
                  .filter(Boolean);
                const mc2Options = Array.from(new Set(mc2Values)).sort();
                console.log('📋 MC2 options for', matchedClassification.MC1, ':', mc2Options.length, mc2Options);
                
                mc2Options.forEach(mc2 => {
                  const option = document.createElement('option');
                  option.value = mc2;
                  option.textContent = mc2;
                  mc2Select.appendChild(option);
                });
                mc2Select.value = matchedClassification.MC2;
                console.log('✅ MC2 set to:', mc2Select.value);
                
                // Step 3: Populate MC3 dropdown if MC3 exists
                if (matchedClassification.MC3 && matchedClassification.MC3.trim() !== '') {
                  console.log('📋 Populating MC3...');
                  mc3Select.innerHTML = '<option value="">Selecteer...</option>';
                  
                  // Get MC3 options from stored classifications for the selected MC2
                  const mc3Values = storedClassifications
                    .filter(c => c.MC2 === matchedClassification.MC2)
                    .map(c => c.MC3)
                    .filter(Boolean);
                  const mc3Options = Array.from(new Set(mc3Values)).sort();
                  console.log('📋 MC3 options for', matchedClassification.MC2, ':', mc3Options.length, mc3Options);
                  
                  mc3Options.forEach(mc3 => {
                    const option = document.createElement('option');
                    option.value = mc3;
                    option.textContent = mc3;
                    mc3Select.appendChild(option);
                  });
                  mc3Select.value = matchedClassification.MC3;
                  console.log('✅ MC3 set to:', mc3Select.value);
                } else {
                  console.log('⚠️ No MC3 in matched classification');
                  mc3Select.innerHTML = '<option value="">Selecteer...</option>';
                }
              } else {
                console.log('⚠️ No MC2 in matched classification');
                mc2Select.innerHTML = '<option value="">Selecteer...</option>';
                mc3Select.innerHTML = '<option value="">Selecteer...</option>';
              }
              
              // Step 4: Set priority
              if (prioriteitSelect && matchedClassification.prio) {
                prioriteitSelect.value = matchedClassification.prio.toString();
                console.log('✅ Priority set to:', prioriteitSelect.value);
              }
              
              // Final verification
              const finalValues = {
                MC1: mc1Select.value,
                MC2: mc2Select.value,
                MC3: mc3Select.value,
                Priority: prioriteitSelect?.value || 'not set'
              };
              console.log('🎯 FINAL DROPDOWN VALUES:', finalValues);
              
              // Log the automatic classification to console
              const timestamp = new Date().toLocaleTimeString('nl-NL');
              console.log(`${timestamp} ✅ Classificatie toegepast: ${matchedClassification.MC1}${matchedClassification.MC2 ? ' / ' + matchedClassification.MC2 : ''}${matchedClassification.MC3 ? ' / ' + matchedClassification.MC3 : ''} (Prio ${matchedClassification.prio})`);
            } else {
              console.log('❌ No classification matched for input');
              console.log('💡 Available classification samples:', storedClassifications.slice(0, 5).map(c => ({
                code: c.code,
                MC1: c.MC1,
                MC2: c.MC2,
                MC3: c.MC3
              })));
            }
          }
          
          // Filter out only m/ command lines from the logging display (keep = lines)
          const filteredText = notitieText
            .split('\n')
            .filter(line => !line.trim().startsWith('m/'))
            .join('\n')
            .trim();
          
          // Add the filtered note to the logging section
          const meldingLogging = document.getElementById("gmsMeldingLogging");
          if (meldingLogging && filteredText.trim()) {
            const timestamp = new Date().toLocaleString('nl-NL', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            // Create log entry element
            const logEntry = document.createElement('div');
            logEntry.className = 'gms-log-entry';
            logEntry.innerHTML = `
              <span class="gms-log-timestamp">[${timestamp}]</span>
              <span class="gms-log-content">${filteredText}</span>
            `;
            
            // Insert at the top of the logging area
            if (meldingLogging.firstChild) {
              meldingLogging.insertBefore(logEntry, meldingLogging.firstChild);
            } else {
              meldingLogging.appendChild(logEntry);
            }
            
            // Also log to console
            console.log(`${timestamp} Note: ${filteredText}`);
          }
          
          // Clear the notepad after sending
          kladblok.textContent = '';
        }
      };

      // Handle full GMS form submission (separate function for actual form saving)
      const handleGMSFormSubmit = () => {
        console.log('💾 FORM SUBMIT - Saving full GMS form');
        
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

        // Save to localStorage and create incident for Incidents tab
        try {
          // Get current incident data if exists (for updates)
          const currentIncidentData = localStorage.getItem('currentGmsIncident');
          let incidentId = null;
          let isNewIncident = false;
          
          if (currentIncidentData) {
            const parsedIncident = JSON.parse(currentIncidentData);
            incidentId = parsedIncident.incidentId;
          } else {
            // Create new incident ID
            incidentId = Date.now();
            isNewIncident = true;
          }
          
          // Create comprehensive incident data with all GMS form information
          const completeIncidentData = {
            incidentId: incidentId,
            type: gmsData.classificatie1 || 'Onbekend',
            location: gmsData.straatnaam && gmsData.huisnummer 
              ? `${gmsData.straatnaam} ${gmsData.huisnummer}` 
              : gmsData.straatnaam || 'Onbekend',
            timestamp: new Date().toISOString(),
            priority: gmsData.prioriteit === 1 ? 'high' : gmsData.prioriteit === 2 ? 'medium' : 'low',
            status: 'active',
            // Complete GMS form data
            melderNaam: gmsData.meldernaam,
            melderAdres: gmsData.melderadres,
            telefoonnummer: gmsData.telefoonnummer,
            straatnaam: gmsData.straatnaam,
            huisnummer: gmsData.huisnummer,
            toevoeging: gmsData.toevoeging,
            postcode: gmsData.postcode,
            plaatsnaam: gmsData.plaatsnaam,
            gemeente: gmsData.gemeente,
            mc1: gmsData.classificatie1,
            mc2: gmsData.classificatie2,
            mc3: gmsData.classificatie3,
            notities: gmsData.opmerkingen,
            tijdstip: gmsData.tijdstip,
            lastUpdated: new Date().toISOString()
          };
          
          // Save complete incident data
          localStorage.setItem('currentGmsIncident', JSON.stringify(completeIncidentData));
          localStorage.setItem(`gmsData_${incidentId}`, JSON.stringify(completeIncidentData));
          
          // Add to main incidents list for Incidents tab
          if (isNewIncident) {
            const newIncident: Incident = {
              id: incidentId,
              type: gmsData.classificatie1 || 'Onbekend',
              location: gmsData.straatnaam && gmsData.huisnummer 
                ? `${gmsData.straatnaam} ${gmsData.huisnummer}` 
                : gmsData.straatnaam || 'Onbekend',
              timestamp: new Date().toISOString(),
              timeAgo: 'Nu',
              unitsAssigned: 0,
              priority: gmsData.prioriteit === 1 ? 'high' : gmsData.prioriteit === 2 ? 'medium' : 'low',
              status: 'active'
            };
            
            // Add to React state incidents list
            setIncidents(prev => [newIncident, ...prev]);
            
            console.log(`Created new incident ${incidentId} and added to Incidents tab`);
          } else {
            // Update existing incident in React state
            setIncidents(prev => prev.map(inc => 
              inc.id === incidentId 
                ? {
                    ...inc,
                    type: gmsData.classificatie1 || inc.type,
                    location: gmsData.straatnaam && gmsData.huisnummer 
                      ? `${gmsData.straatnaam} ${gmsData.huisnummer}` 
                      : gmsData.straatnaam || inc.location,
                    priority: gmsData.prioriteit === 1 ? 'high' : gmsData.prioriteit === 2 ? 'medium' : 'low',
                    lastUpdated: new Date().toISOString()
                  }
                : inc
            ));
            
            console.log(`Updated existing incident ${incidentId}`);
          }
          
          // Also save to legacy incidenten array for compatibility
          const existingIncidenten = JSON.parse(
            localStorage.getItem("incidenten") || "[]",
          );
          
          if (isNewIncident) {
            existingIncidenten.push(gmsData);
            localStorage.setItem(
              "incidenten",
              JSON.stringify(existingIncidenten),
            );
          }
          
        } catch (error) {
          console.error("Error saving incident data:", error);
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

        showNotificationMessage("GMS melding opgeslagen en toegevoegd aan incidenten");
        
        // Do NOT redirect to incidents tab - stay on GMS page
        console.log('✅ Form saved successfully, staying on GMS page');
      };

      // Enhanced helper function to collect all GMS form data comprehensively
      const collectGMSFormData = () => {
        const melderNaam = (document.getElementById("gmsMeldernaam") as HTMLInputElement)?.value?.trim() || '';
        const melderAdres = (document.getElementById("gmsMelderadres") as HTMLInputElement)?.value?.trim() || '';
        const telefoonnummer = (document.getElementById("gmsTelefoonnummer") as HTMLInputElement)?.value?.trim() || '';
        
        const straatnaam = (document.getElementById("gmsStraatnaam") as HTMLInputElement)?.value?.trim() || '';
        const huisnummer = (document.getElementById("gmsHuisnummer") as HTMLInputElement)?.value?.trim() || '';
        const toevoeging = (document.getElementById("gmsToevoeging") as HTMLInputElement)?.value?.trim() || '';
        const postcode = (document.getElementById("gmsPostcode") as HTMLInputElement)?.value?.trim() || '';
        const plaatsnaam = (document.getElementById("gmsPlaatsnaam") as HTMLInputElement)?.value?.trim() || '';
        const gemeente = (document.getElementById("gmsGemeente") as HTMLInputElement)?.value?.trim() || '';
        
        const mc1 = (document.getElementById("gmsClassificatie1") as HTMLSelectElement)?.value || '';
        const mc2 = (document.getElementById("gmsClassificatie2") as HTMLSelectElement)?.value || '';
        const mc3 = (document.getElementById("gmsClassificatie3") as HTMLSelectElement)?.value || '';
        
        const tijdstip = (document.getElementById("gmsTijdstip") as HTMLInputElement)?.value || new Date().toISOString().slice(0, 16);
        const prioriteit = parseInt((document.getElementById("gmsPrioriteit") as HTMLSelectElement)?.value || '3');
        
        const meldingLoggingElement = document.getElementById("gmsMeldingLogging");
        const meldingslogging = meldingLoggingElement?.innerHTML || '';
        const notities = document.getElementById("gmsKladblok")?.textContent || '';
        
        // Create comprehensive location string
        const locationParts = [straatnaam, huisnummer, plaatsnaam].filter(part => part.trim());
        const location = locationParts.length > 0 ? locationParts.join(" ") : "Onbekende locatie";
        
        // Create incident type from classifications
        const type = mc3 || mc2 || mc1 || "Onbekend incident";
        
        if (!straatnaam) {
          showNotificationMessage("Vul minimaal de straatnaam in om uit te geven");
          return null;
        }
        
        return {
          // Compatibility with both naming conventions
          melderNaam,
          meldernaam: melderNaam,
          melderAdres,
          melderadres: melderAdres,
          telefoonnummer,
          
          // Location data
          straatnaam,
          huisnummer,
          toevoeging,
          postcode,
          plaatsnaam,
          gemeente,
          location,
          
          // Classification data
          mc1,
          mc2,
          mc3,
          classificatie1: mc1,
          classificatie2: mc2,
          classificatie3: mc3,
          type,
          
          // Operational data
          tijdstip,
          prioriteit,
          priority: prioriteit <= 2 ? 'high' : prioriteit === 3 ? 'medium' : 'low',
          meldingslogging,
          notities,
          
          // Metadata
          timeAgo: "Nu",
          unitsAssigned: 0,
          aangemaaktOp: new Date().toISOString()
        };
      };

      // Helper function to calculate time ago
      const calculateTimeAgo = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffMins < 1) return 'zojuist';
        if (diffMins < 60) return `${diffMins} min geleden`;
        if (diffHours < 24) return `${diffHours} uur geleden`;
        return `${Math.floor(diffHours / 24)} dagen geleden`;
      };

      // Handle "Uitgifte" button - dispatch incident to central database
      const handleUitgifte = () => {
        console.log('Uitgifte button clicked - Dispatching incident');
        
        // Collect all form data including current logging
        const formData = collectGMSFormData();
        if (!formData) return;
        
        // Create or update incident in central database
        const incidentId = currentGmsIncident?.id || Date.now();
        
        // Create complete incident object with all data
        const completeIncident = {
          id: incidentId,
          // Meldergegevens
          melderNaam: formData.melderNaam,
          melderAdres: formData.melderAdres,
          telefoonnummer: formData.telefoonnummer,
          // Meldingslocatie
          straatnaam: formData.straatnaam,
          huisnummer: formData.huisnummer,
          toevoeging: formData.toevoeging,
          postcode: formData.postcode,
          plaatsnaam: formData.plaatsnaam,
          gemeente: formData.gemeente,
          // Classificaties
          mc1: formData.mc1,
          mc2: formData.mc2,
          mc3: formData.mc3,
          // Tijdstip en prioriteit
          tijdstip: formData.tijdstip,
          prioriteit: formData.prioriteit,
          // Status en logging
          status: "Uitgegeven",
          meldingslogging: formData.meldingslogging,
          notities: formData.notities,
          // Metadata
          aangemaaktOp: currentGmsIncident?.aangemaaktOp || new Date().toISOString(),
          uitgegeven: new Date().toISOString()
        };
        
        console.log('Saving complete incident:', completeIncident);
        
        // Save to GMS incidents database
        setGmsIncidents(prev => {
          const existing = prev.find(inc => inc.id === incidentId);
          if (existing) {
            return prev.map(inc => inc.id === incidentId ? completeIncident : inc);
          } else {
            return [...prev, completeIncident];
          }
        });
        
        // Create simplified incident for main incidents list
        const mainIncident: Incident = {
          id: incidentId,
          type: formData.mc1 || 'Melding',
          location: `${formData.straatnaam} ${formData.huisnummer || ''}`.trim() + (formData.plaatsnaam ? `, ${formData.plaatsnaam}` : ''),
          timestamp: formData.tijdstip,
          timeAgo: calculateTimeAgo(new Date(formData.tijdstip)),
          unitsAssigned: 0,
          priority: formData.prioriteit === 1 ? 'high' : formData.prioriteit === 2 ? 'medium' : 'low',
          status: 'active'
        };
        
        setIncidents(prev => {
          const existing = prev.find(inc => inc.id === incidentId);
          if (existing) {
            return prev.map(inc => inc.id === incidentId ? mainIncident : inc);
          } else {
            return [...prev, mainIncident];
          }
        });
        
        // Save to localStorage for persistence (using both naming conventions)
        const storageIncident = {
          ...completeIncident,
          // Support legacy field names for compatibility
          meldernaam: formData.melderNaam,
          melderadres: formData.melderAdres,
          classificatie1: formData.mc1,
          classificatie2: formData.mc2,
          classificatie3: formData.mc3,
          timestamp: formData.tijdstip
        };
        
        const existingIncidenten = JSON.parse(localStorage.getItem("incidenten") || "[]");
        const existingIndex = existingIncidenten.findIndex((inc: any) => (inc.id || inc.incidentId) === incidentId);
        
        if (existingIndex >= 0) {
          existingIncidenten[existingIndex] = storageIncident;
        } else {
          existingIncidenten.push(storageIncident);
        }
        
        localStorage.setItem("incidenten", JSON.stringify(existingIncidenten));
        
        // Update current incident state but stay on GMS
        setCurrentGmsIncident(completeIncident);
        
        showNotificationMessage("Incident uitgegeven en toegevoegd aan overzicht");
        console.log('Incident dispatched and saved to database and localStorage');
      };

      // Telefoon Dashboard Interactive Functionality
      const initializeTelefoonDashboard = () => {
        // Chat functionality
        const chatSendBtn = document.getElementById('chatSendBtn');
        const chatInput = document.getElementById('chatInput') as HTMLInputElement;
        const chatMessages = document.getElementById('chatMessages');
        
        const sendChatMessage = () => {
          if (!chatInput || !chatMessages) return;
          
          const messageText = chatInput.value.trim();
          if (!messageText) return;
          
          const timestamp = new Date().toLocaleTimeString('nl-NL', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Create outgoing message
          const messageDiv = document.createElement('div');
          messageDiv.className = 'chat-message outgoing';
          messageDiv.innerHTML = `
            <div class="message-sender">Meldkamer</div>
            <div class="message-content">${messageText}</div>
            <div class="message-time">${timestamp}</div>
          `;
          
          chatMessages.appendChild(messageDiv);
          chatMessages.scrollTop = chatMessages.scrollHeight;
          
          // Clear input
          chatInput.value = '';
          
          // Simulate response after 2-3 seconds
          setTimeout(() => {
            const responseDiv = document.createElement('div');
            responseDiv.className = 'chat-message incoming';
            const responses = [
              'Bedankt voor de snelle reactie.',
              'Ik begrijp het. Hulpdiensten zijn onderweg.',
              'Kunt u op een veilige plek blijven?',
              'We houden contact voor updates.',
              'De eenheden zijn ter plaatse aangekomen.'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            responseDiv.innerHTML = `
              <div class="message-sender">Melder - 06-12345678</div>
              <div class="message-content">${randomResponse}</div>
              <div class="message-time">${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</div>
            `;
            
            chatMessages.appendChild(responseDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }, 2000 + Math.random() * 1000);
        };
        
        if (chatSendBtn) {
          chatSendBtn.addEventListener('click', sendChatMessage);
        }
        
        if (chatInput) {
          chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendChatMessage();
            }
          });
        }
        
        // Chat tab switching
        const chatTabs = document.querySelectorAll('.chat-tab');
        chatTabs.forEach(tab => {
          tab.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const chatType = target.dataset.chat;
            
            // Remove active class from all tabs
            chatTabs.forEach(t => t.classList.remove('active'));
            target.classList.add('active');
            
            // Update chat messages based on chat type
            if (chatMessages) {
              let newContent = '';
              const timestamp = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
              
              switch (chatType) {
                case 'burgers':
                  newContent = `
                    <div class="chat-message incoming">
                      <div class="message-sender">Melder - 06-12345678</div>
                      <div class="message-content">Er is een verkeersongeval op de A20 richting Den Haag, ter hoogte van afslag Vlaardingen.</div>
                      <div class="message-time">14:23</div>
                    </div>
                    <div class="chat-message outgoing">
                      <div class="message-sender">Meldkamer</div>
                      <div class="message-content">Dank u voor de melding. Zijn er gewonden? En kunt u de exacte locatie bevestigen?</div>
                      <div class="message-time">14:24</div>
                    </div>
                  `;
                  break;
                case 'collega':
                  newContent = `
                    <div class="chat-message incoming">
                      <div class="message-sender">Dienstchef</div>
                      <div class="message-content">Status update: alle eenheden zijn operationeel. Nieuwe richtlijnen voor avonddienst zijn beschikbaar.</div>
                      <div class="message-time">${timestamp}</div>
                    </div>
                    <div class="chat-message outgoing">
                      <div class="message-sender">Centralist</div>
                      <div class="message-content">Begrepen. Ik heb de nieuwe richtlijnen gelezen en geïmplementeerd.</div>
                      <div class="message-time">${timestamp}</div>
                    </div>
                  `;
                  break;
                case 'partners':
                  newContent = `
                    <div class="chat-message incoming">
                      <div class="message-sender">Brandweer Rotterdam</div>
                      <div class="message-content">Incident A20 onder controle. Geen extra assistentie nodig. Verwachte afhandeltijd: 30 minuten.</div>
                      <div class="message-time">${timestamp}</div>
                    </div>
                    <div class="chat-message outgoing">
                      <div class="message-sender">Meldkamer</div>
                      <div class="message-content">Ontvangen. Houden jullie ons op de hoogte van ontwikkelingen.</div>
                      <div class="message-time">${timestamp}</div>
                    </div>
                  `;
                  break;
              }
              
              chatMessages.innerHTML = newContent;
            }
          });
        });
        
        // Contact button functionality
        const contactButtons = document.querySelectorAll('.contact-btn');
        contactButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const service = target.dataset.service || target.dataset.colleague || target.dataset.partner;
            const buttonText = target.textContent?.trim() || '';
            
            // Visual feedback
            target.style.background = '#ffeb3b';
            setTimeout(() => {
              target.style.background = '';
            }, 200);
            
            // Simulate call initiation
            const statusBar = document.querySelector('.telefoon-status-bar .status-left');
            if (statusBar) {
              const callStatus = document.createElement('span');
              callStatus.className = 'call-status';
              callStatus.textContent = `📞 Verbinding maken met ${buttonText.split('\n')[0]}...`;
              callStatus.style.color = '#ff9800';
              
              statusBar.appendChild(callStatus);
              
              setTimeout(() => {
                callStatus.textContent = `📞 Verbonden met ${buttonText.split('\n')[0]}`;
                callStatus.style.color = '#4caf50';
                
                setTimeout(() => {
                  callStatus.remove();
                }, 5000);
              }, 2000);
            }
            
            console.log(`📞 Calling ${service}: ${buttonText}`);
          });
        });
      };
      
      // Initialize telefoon dashboard if on intake page
      if (activeSection === 'intake') {
        setTimeout(initializeTelefoonDashboard, 100);
      }

      // Add event listeners for both button click and Enter key
      const verzendButton = document.getElementById("gmsVerzendButton");
      const uitgifteButton = document.getElementById("gmsUitgifteButton");
      const kladblokElement = document.getElementById("gmsKladblok");
      
      if (verzendButton) {
        console.log('📌 Verzend button found, attaching notepad submit listener');
        verzendButton.addEventListener("click", (e) => {
          e.preventDefault();
          console.log('🔥 VERZEND BUTTON CLICKED - Event triggered');
          handleNotePadSubmit();
        });
        
        // Classification system ready - all functions operational
        
        // Basic classification system verification
        const storedClassifications = JSON.parse(localStorage.getItem("gmsClassifications") || "[]");
        console.log('📊 Classifications loaded:', storedClassifications.length, 'entries available');
      } else {
        console.error('❌ Verzend button not found! Available buttons:', 
          Array.from(document.querySelectorAll('button')).map(b => b.id).filter(id => id));
      }
      
      // Add Enter key support for kladblok
      if (kladblokElement) {
        console.log('📌 Kladblok found, attaching Enter key listener');
        kladblokElement.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            console.log('⌨️ ENTER KEY PRESSED - Event triggered');
            handleNotePadSubmit();
          }
        });
      } else {
        console.error('❌ Kladblok element not found!');
      }
      
      // Form save button (for full form submission)
      const saveButton = document.getElementById("gmsSaveButton");
      if (saveButton) {
        console.log('📌 Save button found, attaching form submit listener');
        saveButton.addEventListener("click", handleGMSFormSubmit);
      }

      // Uitgifte button (for incident dispatch)
      if (uitgifteButton) {
        console.log('📌 Uitgifte button found, attaching dispatch listener');
        uitgifteButton.addEventListener("click", handleUitgifte);
      }

      // Helper function to clear GMS form
      const clearGMSForm = () => {
        const form = document.querySelector('.gms-form');
        if (form) {
          const inputs = form.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            if (input instanceof HTMLInputElement) {
              input.value = '';
            } else if (input instanceof HTMLSelectElement) {
              input.value = '';
            } else if (input instanceof HTMLTextAreaElement) {
              input.value = '';
            }
          });
        }
        
        const kladblok = document.getElementById("gmsKladblok");
        if (kladblok) kladblok.textContent = "";
        
        const meldingLogging = document.getElementById("gmsMeldingLogging");
        if (meldingLogging) meldingLogging.innerHTML = "";
        
        updateGMSTime();
        setCurrentGmsIncident(null);
      };

      // Helper function to populate classification dropdowns
      const populateClassificationDropdowns = (mc1Field: HTMLSelectElement, mc2Field: HTMLSelectElement, mc3Field: HTMLSelectElement, mc1Value: string, mc2Value: string, mc3Value: string) => {
        const storedClassifications = JSON.parse(localStorage.getItem("gmsClassifications") || "[]");
        
        // Populate MC1
        mc1Field.innerHTML = '<option value="">Selecteer...</option>';
        const mc1Options = Array.from(new Set(storedClassifications.map((c: any) => c.MC1).filter(Boolean))).sort();
        mc1Options.forEach((mc1, index) => {
          const option = document.createElement('option');
          option.value = String(mc1);
          option.textContent = String(mc1);
          mc1Field.appendChild(option);
        });
        mc1Field.value = mc1Value;
        
        // Populate MC2 if MC1 is set
        if (mc1Value && mc2Value) {
          mc2Field.innerHTML = '<option value="">Selecteer...</option>';
          const mc2Options = Array.from(new Set(storedClassifications.filter((c: any) => c.MC1 === mc1Value).map((c: any) => c.MC2).filter(Boolean))).sort();
          mc2Options.forEach((mc2, index) => {
            const option = document.createElement('option');
            option.value = String(mc2);
            option.textContent = String(mc2);
            mc2Field.appendChild(option);
          });
          mc2Field.value = mc2Value;
          
          // Populate MC3 if MC2 is set
          if (mc2Value && mc3Value) {
            mc3Field.innerHTML = '<option value="">Selecteer...</option>';
            const mc3Options = Array.from(new Set(storedClassifications.filter((c: any) => c.MC2 === mc2Value).map((c: any) => c.MC3).filter(Boolean))).sort();
            mc3Options.forEach((mc3, index) => {
              const option = document.createElement('option');
              option.value = String(mc3);
              option.textContent = String(mc3);
              mc3Field.appendChild(option);
            });
            mc3Field.value = mc3Value;
          }
        }
      };



      // Handle incident closure buttons
      const handleIncidentClosure = (actionType: string) => {
        if (currentGmsIncident) {
          // Update incident status in GMS database
          setGmsIncidents(prev => prev.map(inc => 
            inc.id === currentGmsIncident.id 
              ? { ...inc, status: "Afgesloten", afgesloten: new Date().toISOString() }
              : inc
          ));
          
          // Remove from main incidents list
          setIncidents(prev => prev.filter(inc => inc.id !== currentGmsIncident.id));
          
          // Clear current incident and form
          clearGMSForm();
          
          showNotificationMessage(
            actionType === 'close' ? 'Incident afgesloten' : 'Eindrapport voltooid'
          );
          
          console.log(`Incident ${actionType === 'close' ? 'closed' : 'finalized'} and removed from active list`);
        } else {
          showNotificationMessage('Geen actief incident om af te sluiten');
        }
      };

      // Sluit af button
      const sluitAfButton = document.getElementById("gmsSluitAfButton");
      if (sluitAfButton) {
        sluitAfButton.addEventListener("click", () => handleIncidentClosure('close'));
      }

      // Eindrapport button
      const eindrapportButton = document.getElementById("gmsEindrapportButton");
      if (eindrapportButton) {
        eindrapportButton.addEventListener("click", () => handleIncidentClosure('finalize'));
      }

      // Initialize time immediately and then every minute
      updateGMSTime();
      const timeTimer = setInterval(updateGMSTime, 60000);

      // Initialize GMS status date/time immediately and then every second
      updateGMSStatusDateTime();
      const statusDateTimeTimer = setInterval(updateGMSStatusDateTime, 1000);

      // Setup classification cascading dropdowns with priority integration
      const setupClassificationDropdowns = () => {
        const mc1Select = document.getElementById("gmsClassificatie1") as HTMLSelectElement;
        const mc2Select = document.getElementById("gmsClassificatie2") as HTMLSelectElement;
        const mc3Select = document.getElementById("gmsClassificatie3") as HTMLSelectElement;
        const prioriteitSelect = document.getElementById("gmsPrioriteit") as HTMLSelectElement;
        const notitieveld = document.getElementById("gmsKladblok") as HTMLElement;
        // Removed logging panel dependency to fix null reference error

        // Populate MC1 dropdown without auto-selecting any value
        if (mc1Select && gmsClassifications.length > 0) {
          mc1Select.innerHTML = '<option value="">Selecteer...</option>';
          const mc1Options = getUniqueClassificationsByLevel("MC1");
          mc1Options.forEach(mc1 => {
            const option = document.createElement('option');
            option.value = mc1;
            option.textContent = mc1;
            mc1Select.appendChild(option);
          });
        }

        // Function to update priority based on selected classification
        const updatePriorityFromClassification = () => {
          const selectedMC1 = mc1Select.value;
          const selectedMC2 = mc2Select.value;
          const selectedMC3 = mc3Select.value;

          if (selectedMC1) {
            const storedClassifications = JSON.parse(localStorage.getItem("gmsClassifications") || "[]") as GmsClassification[];
            
            // Find most specific match (MC3 > MC2 > MC1)
            let matchingClassification;
            if (selectedMC3) {
              matchingClassification = storedClassifications.find(c => 
                c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && c.MC3 === selectedMC3
              );
            } else if (selectedMC2) {
              matchingClassification = storedClassifications.find(c => 
                c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && !c.MC3
              );
            } else {
              matchingClassification = storedClassifications.find(c => 
                c.MC1 === selectedMC1 && !c.MC2 && !c.MC3
              );
            }

            if (matchingClassification && prioriteitSelect) {
              prioriteitSelect.value = matchingClassification.prio.toString();
              
              // Update priority visual indicator
              const priorityIndicator = document.getElementById("gmsPriorityIndicator");
              if (priorityIndicator) {
                // Remove existing priority classes
                priorityIndicator.className = "gms-priority-dot";
                // Add new priority class
                priorityIndicator.classList.add(`priority-${matchingClassification.prio}`);
              }
              
              // Log the priority update to console
              const timestamp = new Date().toLocaleTimeString('nl-NL');
              console.log(`${timestamp} Prioriteit automatisch ingesteld op ${matchingClassification.prio} voor classificatie ${matchingClassification.code}`);
            }
          }
        };



        if (mc1Select && mc2Select && mc3Select) {
          // Handle MC1 change
          mc1Select.addEventListener("change", () => {
            const selectedMC1 = mc1Select.value;
            
            // Clear and populate MC2
            mc2Select.innerHTML = '<option value="">Selecteer...</option>';
            mc3Select.innerHTML = '<option value="">Selecteer...</option>';
            
            if (selectedMC1) {
              const mc2Options = getUniqueClassificationsByLevel("MC2", selectedMC1);
              mc2Options.forEach(mc2 => {
                const option = document.createElement('option');
                option.value = mc2;
                option.textContent = mc2;
                mc2Select.appendChild(option);
              });
            }
            
            updatePriorityFromClassification();
          });

          // Handle MC2 change
          mc2Select.addEventListener("change", () => {
            const selectedMC2 = mc2Select.value;
            
            // Clear and populate MC3
            mc3Select.innerHTML = '<option value="">Selecteer...</option>';
            
            if (selectedMC2) {
              const mc3Options = getUniqueClassificationsByLevel("MC3", selectedMC2);
              mc3Options.forEach(mc3 => {
                const option = document.createElement('option');
                option.value = mc3;
                option.textContent = mc3;
                mc3Select.appendChild(option);
              });
            }
            
            updatePriorityFromClassification();
          });

          // Handle MC3 change - auto-fill MC1 and MC2 when MC3 is selected
          mc3Select.addEventListener("change", () => {
            const selectedMC3 = mc3Select.value;
            
            if (selectedMC3) {
              const classificationsData = localStorage.getItem("gmsClassifications");
              const storedClassifications = (classificationsData && classificationsData !== "undefined") ? JSON.parse(classificationsData) : [] as GmsClassification[];
              
              // Find the classification that matches this MC3 value
              const matchingClassification = storedClassifications.find(c => c.MC3 === selectedMC3);
              
              if (matchingClassification) {
                // Auto-fill MC1 and MC2
                mc1Select.value = matchingClassification.MC1;
                
                if (matchingClassification.MC2) {
                  // Populate MC2 dropdown first
                  mc2Select.innerHTML = '<option value="">Selecteer...</option>';
                  const mc2Options = getUniqueClassificationsByLevel("MC2", matchingClassification.MC1);
                  mc2Options.forEach(mc2 => {
                    const option = document.createElement('option');
                    option.value = mc2;
                    option.textContent = mc2;
                    mc2Select.appendChild(option);
                  });
                  mc2Select.value = matchingClassification.MC2;
                }
                
                // Log the auto-fill action
                const timestamp = new Date().toLocaleTimeString('nl-NL');
                console.log(`${timestamp} ✅ MC1/MC2 automatisch ingevuld bij MC3 selectie: ${matchingClassification.MC1} / ${matchingClassification.MC2 || 'n.v.t.'} / ${matchingClassification.MC3}`);
              }
            }
            
            updatePriorityFromClassification();
          });
        }

        // Note: Real-time classification detection disabled - only processes on "Verzend" button click
      };

      setupClassificationDropdowns();

      // Load incident data if available
      const loadIncidentData = () => {
        const currentIncidentData = localStorage.getItem('currentGmsIncident');
        console.log('🔍 Checking for incident data in localStorage:', currentIncidentData);
        
        if (currentIncidentData) {
          try {
            const incidentData = JSON.parse(currentIncidentData);
            console.log('📋 Loading incident data into GMS:', incidentData);
            
            // Pre-fill form fields with incident data
            const melderNaamField = document.getElementById("gmsMeldernaam") as HTMLInputElement;
            const melderAdresField = document.getElementById("gmsMelderadres") as HTMLInputElement;
            const telefoonnummerField = document.getElementById("gmsTelefoonnummer") as HTMLInputElement;
            const straatnaamField = document.getElementById("gmsStraatnaam") as HTMLInputElement;
            const huisnummerField = document.getElementById("gmsHuisnummer") as HTMLInputElement;
            const toevoegingField = document.getElementById("gmsToevoeging") as HTMLInputElement;
            const postcodeField = document.getElementById("gmsPostcode") as HTMLInputElement;
            const plaatsnaamField = document.getElementById("gmsPlaatsnaam") as HTMLInputElement;
            const gemeenteField = document.getElementById("gmsGemeente") as HTMLInputElement;
            const tijdstipField = document.getElementById("gmsTijdstip") as HTMLInputElement;
            const prioriteitField = document.getElementById("gmsPrioriteit") as HTMLSelectElement;
            const mc1Field = document.getElementById("gmsClassificatie1") as HTMLSelectElement;
            const mc2Field = document.getElementById("gmsClassificatie2") as HTMLSelectElement;
            const mc3Field = document.getElementById("gmsClassificatie3") as HTMLSelectElement;
            const kladblokField = document.getElementById("gmsKladblok") as HTMLElement;
            
            console.log('🔍 Found form fields:', {
              straatnaam: !!straatnaamField,
              tijdstip: !!tijdstipField,
              prioriteit: !!prioriteitField,
              mc1: !!mc1Field
            });
            
            // Fill in the fields with stored data and log each action
            if (melderNaamField && incidentData.melderNaam) {
              melderNaamField.value = incidentData.melderNaam;
              console.log('✅ Set melder naam:', incidentData.melderNaam);
            }
            if (melderAdresField && incidentData.melderAdres) {
              melderAdresField.value = incidentData.melderAdres;
              console.log('✅ Set melder adres:', incidentData.melderAdres);
            }
            if (telefoonnummerField && incidentData.telefoonnummer) {
              telefoonnummerField.value = incidentData.telefoonnummer;
              console.log('✅ Set telefoonnummer:', incidentData.telefoonnummer);
            }
            if (straatnaamField && incidentData.straatnaam) {
              straatnaamField.value = incidentData.straatnaam;
              console.log('✅ Set straatnaam:', incidentData.straatnaam);
            }
            if (huisnummerField && incidentData.huisnummer) {
              huisnummerField.value = incidentData.huisnummer;
              console.log('✅ Set huisnummer:', incidentData.huisnummer);
            }
            if (toevoegingField && incidentData.toevoeging) {
              toevoegingField.value = incidentData.toevoeging;
              console.log('✅ Set toevoeging:', incidentData.toevoeging);
            }
            if (postcodeField && incidentData.postcode) {
              postcodeField.value = incidentData.postcode;
              console.log('✅ Set postcode:', incidentData.postcode);
            }
            if (plaatsnaamField && incidentData.plaatsnaam) {
              plaatsnaamField.value = incidentData.plaatsnaam;
              console.log('✅ Set plaatsnaam:', incidentData.plaatsnaam);
            }
            if (gemeenteField && incidentData.gemeente) {
              gemeenteField.value = incidentData.gemeente;
              console.log('✅ Set gemeente:', incidentData.gemeente);
            }
            if (tijdstipField && incidentData.tijdstip) {
              tijdstipField.value = incidentData.tijdstip;
              console.log('✅ Set tijdstip:', incidentData.tijdstip);
            } else if (tijdstipField && incidentData.timestamp) {
              tijdstipField.value = incidentData.timestamp;
              console.log('✅ Set tijdstip from timestamp:', incidentData.timestamp);
            }
            
            // Set priority field properly
            if (prioriteitField) {
              let priorityValue = '3'; // default
              if (incidentData.prioriteit) {
                priorityValue = incidentData.prioriteit.toString();
              } else if (incidentData.priority) {
                // Convert string priority to number
                if (incidentData.priority === 'high') priorityValue = '1';
                else if (incidentData.priority === 'medium') priorityValue = '2';
                else priorityValue = '3';
              }
              prioriteitField.value = priorityValue;
              console.log('✅ Set prioriteit:', priorityValue);
            }
            
            // Restore classification dropdowns with proper cascading
            const restoreClassifications = () => {
              if (mc1Field && incidentData.mc1) {
                // First populate MC1 dropdown
                mc1Field.innerHTML = '<option value="">Selecteer...</option>';
                const mc1Options = getUniqueClassificationsByLevel("MC1");
                mc1Options.forEach(mc1 => {
                  const option = document.createElement('option');
                  option.value = mc1;
                  option.textContent = mc1;
                  mc1Field.appendChild(option);
                });
                mc1Field.value = incidentData.mc1;
                console.log('✅ Restored MC1:', incidentData.mc1);
                
                // Then populate and set MC2 if available
                if (mc2Field && incidentData.mc2) {
                  mc2Field.innerHTML = '<option value="">Selecteer...</option>';
                  const mc2Options = getUniqueClassificationsByLevel("MC2", incidentData.mc1);
                  mc2Options.forEach(mc2 => {
                    const option = document.createElement('option');
                    option.value = mc2;
                    option.textContent = mc2;
                    mc2Field.appendChild(option);
                  });
                  mc2Field.value = incidentData.mc2;
                  console.log('✅ Restored MC2:', incidentData.mc2);
                  
                  // Finally populate and set MC3 if available
                  if (mc3Field && incidentData.mc3) {
                    mc3Field.innerHTML = '<option value="">Selecteer...</option>';
                    const mc3Options = getUniqueClassificationsByLevel("MC3", incidentData.mc2);
                    mc3Options.forEach(mc3 => {
                      const option = document.createElement('option');
                      option.value = mc3;
                      option.textContent = mc3;
                      mc3Field.appendChild(option);
                    });
                    mc3Field.value = incidentData.mc3;
                    console.log('✅ Restored MC3:', incidentData.mc3);
                  }
                }
              }
            };
            
            // Restore classifications after a brief delay to ensure dropdown setup is complete
            setTimeout(restoreClassifications, 100);
            
            // Note: Do NOT prefill the kladblok when reopening incidents
            // The notepad should always start empty for new notes
            if (kladblokField) {
              kladblokField.textContent = '';
              console.log('✅ Kladblok kept empty for new notes');
            }
            
            // If no specific location data, use the incident location
            if (straatnaamField && !incidentData.straatnaam && incidentData.location) {
              straatnaamField.value = incidentData.location;
              console.log('✅ Set straatnaam from location:', incidentData.location);
            }
            
            console.log('🎯 GMS form pre-filled with incident data successfully');
          } catch (error) {
            console.error('❌ Failed to load incident data:', error);
          }
        } else {
          console.log('❌ No incident data found in localStorage');
        }
      };

      // Load current incident data into GMS form if available
      const loadCurrentIncidentData = () => {
        if (currentGmsIncident) {
          console.log('Loading incident data into GMS form:', currentGmsIncident);
          
          // Get all form field references
          const melderNaamField = document.getElementById("gmsMeldernaam") as HTMLInputElement;
          const melderAdresField = document.getElementById("gmsMelderadres") as HTMLInputElement;
          const telefoonnummerField = document.getElementById("gmsTelefoonnummer") as HTMLInputElement;
          const straatnaamField = document.getElementById("gmsStraatnaam") as HTMLInputElement;
          const huisnummerField = document.getElementById("gmsHuisnummer") as HTMLInputElement;
          const toevoegingField = document.getElementById("gmsToevoeging") as HTMLInputElement;
          const postcodeField = document.getElementById("gmsPostcode") as HTMLInputElement;
          const plaatsnaamField = document.getElementById("gmsPlaatsnaam") as HTMLInputElement;
          const gemeenteField = document.getElementById("gmsGemeente") as HTMLInputElement;
          const tijdstipField = document.getElementById("gmsTijdstip") as HTMLInputElement;
          const prioriteitField = document.getElementById("gmsPrioriteit") as HTMLSelectElement;
          const mc1Field = document.getElementById("gmsClassificatie1") as HTMLSelectElement;
          const mc2Field = document.getElementById("gmsClassificatie2") as HTMLSelectElement;
          const mc3Field = document.getElementById("gmsClassificatie3") as HTMLSelectElement;
          const meldingLoggingField = document.getElementById("gmsMeldingLogging");
          const kladblokField = document.getElementById("gmsKladblok");
          
          console.log('Found form fields, populating with data...');
          
          // Fill meldergegevens
          if (melderNaamField) melderNaamField.value = currentGmsIncident.melderNaam || '';
          if (melderAdresField) melderAdresField.value = currentGmsIncident.melderAdres || '';
          if (telefoonnummerField) telefoonnummerField.value = currentGmsIncident.telefoonnummer || '';
          
          // Fill meldingslocatie
          if (straatnaamField) straatnaamField.value = currentGmsIncident.straatnaam || '';
          if (huisnummerField) huisnummerField.value = currentGmsIncident.huisnummer || '';
          if (toevoegingField) toevoegingField.value = currentGmsIncident.toevoeging || '';
          if (postcodeField) postcodeField.value = currentGmsIncident.postcode || '';
          if (plaatsnaamField) plaatsnaamField.value = currentGmsIncident.plaatsnaam || '';
          if (gemeenteField) gemeenteField.value = currentGmsIncident.gemeente || '';
          
          // Fill tijdstip en prioriteit
          if (tijdstipField) tijdstipField.value = currentGmsIncident.tijdstip || '';
          if (prioriteitField) prioriteitField.value = (currentGmsIncident.prioriteit || 3).toString();
          
          // Restore meldingslogging exactly as it was saved
          if (meldingLoggingField && currentGmsIncident.meldingslogging) {
            meldingLoggingField.innerHTML = currentGmsIncident.meldingslogging;
            console.log('Restored meldingslogging');
          }
          
          // Keep notepad empty for new notes
          if (kladblokField) kladblokField.textContent = '';
          
          // Restore classifications with proper cascading
          setTimeout(() => {
            const classificationsData = localStorage.getItem("gmsClassifications");
            const storedClassifications = (classificationsData && classificationsData !== "undefined") ? JSON.parse(classificationsData) : [];
            
            if (mc1Field && currentGmsIncident.mc1) {
              console.log('Restoring classifications:', currentGmsIncident.mc1, currentGmsIncident.mc2, currentGmsIncident.mc3);
              
              // Populate MC1 dropdown
              mc1Field.innerHTML = '<option value="">Selecteer...</option>';
              const mc1Options = Array.from(new Set(storedClassifications.map((c: any) => c.MC1).filter(Boolean))).sort();
              mc1Options.forEach((mc1) => {
                const option = document.createElement('option');
                option.value = String(mc1);
                option.textContent = String(mc1);
                mc1Field.appendChild(option);
              });
              mc1Field.value = currentGmsIncident.mc1;
              
              // Populate MC2 if available
              if (mc2Field && currentGmsIncident.mc2) {
                mc2Field.innerHTML = '<option value="">Selecteer...</option>';
                const mc2Options = Array.from(new Set(storedClassifications.filter((c: any) => c.MC1 === currentGmsIncident.mc1).map((c: any) => c.MC2).filter(Boolean))).sort();
                mc2Options.forEach((mc2) => {
                  const option = document.createElement('option');
                  option.value = String(mc2);
                  option.textContent = String(mc2);
                  mc2Field.appendChild(option);
                });
                mc2Field.value = currentGmsIncident.mc2;
                
                // Populate MC3 if available
                if (mc3Field && currentGmsIncident.mc3) {
                  mc3Field.innerHTML = '<option value="">Selecteer...</option>';
                  const mc3Options = Array.from(new Set(storedClassifications.filter((c: any) => c.MC2 === currentGmsIncident.mc2).map((c: any) => c.MC3).filter(Boolean))).sort();
                  mc3Options.forEach((mc3) => {
                    const option = document.createElement('option');
                    option.value = String(mc3);
                    option.textContent = String(mc3);
                    mc3Field.appendChild(option);
                  });
                  mc3Field.value = currentGmsIncident.mc3;
                }
              }
              
              console.log('Classifications restored successfully');
            }
          }, 200);
          
          console.log('Incident data loaded into GMS form successfully');
        } else {
          console.log('No current incident to load');
        }
      };

      // Load incident data after a brief delay to ensure form is ready
      setTimeout(loadCurrentIncidentData, 500);

      return () => {
        clearInterval(timeTimer);
        clearInterval(statusDateTimeTimer);
        if (saveButton) {
          saveButton.removeEventListener("click", handleGMSFormSubmit);
        }
        if (verzendButton) {
          verzendButton.removeEventListener("click", handleNotePadSubmit);
        }
        if (uitgifteButton) {
          uitgifteButton.removeEventListener("click", handleUitgifte);
        }
        if (sluitAfButton) {
          sluitAfButton.removeEventListener("click", () => handleIncidentClosure('close'));
        }
        if (eindrapportButton) {
          eindrapportButton.removeEventListener("click", () => handleIncidentClosure('finalize'));
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

            // Combine MC1, MC2, MC3 classifications
            const mc1 = incident.classificatie1 || "";
            const mc2 = incident.classificatie2 || "";
            const mc3 = incident.classificatie3 || "";
            const combinedMC = [mc1, mc2, mc3].filter(Boolean).join(" / ") || "-";
            
            // Get assigned units (placeholder for now)
            const assignedUnits = incident.toegewezenEenheden || "Geen";

            return `
            <div class="legacy-incident-row" data-incident-id="${incident.id || index}" onclick="redirectToGMS(${incident.id || index})">
              <div class="legacy-col-prio">
                <div class="priority-circle priority-${prioriteitNummer}">${prioriteitNummer}</div>
              </div>
              <div class="legacy-col-mc" title="${combinedMC}">${combinedMC}</div>
              <div class="legacy-col-locatie" title="${locatie}">${locatie}</div>
              <div class="legacy-col-plaats" title="${plaats}">${plaats}</div>
              <div class="legacy-col-id">${incidentNumber}</div>
              <div class="legacy-col-units">${assignedUnits}</div>
              <div class="legacy-col-status ${statusClass}">${status}</div>
            </div>
          `;
          })
          .join("");

        // Make redirectToGMS globally accessible
        (window as any).redirectToGMS = (incidentId: number) => {
          console.log('Redirecting incident to GMS:', incidentId);
          
          // Get fresh incident data from localStorage
          const storedIncidenten = JSON.parse(localStorage.getItem("incidenten") || "[]");
          const incident = storedIncidenten.find((inc: any) => (inc.id || inc.incidentId) === incidentId);
          
          if (!incident) {
            console.error('Incident not found in storage:', incidentId);
            return;
          }

          console.log('Found incident data:', incident);
          
          // Switch to GMS tab first
          setActiveSection('gms');
          
          // Load the complete incident data into GMS form
          setTimeout(() => {
            loadIncidentIntoGMS(incident);
          }, 100);
        };
      } catch (error) {
        console.error("Error loading incidents:", error);
        const incidentsList = document.getElementById("allIncidentsLegacyList");
        if (incidentsList) {
          incidentsList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666; grid-column: 1 / -1;">
              Fout bij laden van incidenten
            </div>
          `;
        }
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

        // Use existing incident ID if available, otherwise create new
        const incidentId = currentGmsIncident?.id || Date.now();

        const incidentData = {
          ...formData,
          id: incidentId,
          timestamp: currentGmsIncident?.timestamp || now.toISOString(),
          status: "Afgesloten",
          afgesloten: now.toISOString()
        };

        // Save to incidents tab
        saveIncidentToStorage(incidentData);
        
        // Update GMS incidents database
        setGmsIncidents(prev => {
          const existing = prev.find(inc => inc.id === incidentId);
          if (existing) {
            return prev.map(inc => inc.id === incidentId ? { ...inc, ...incidentData } : inc);
          } else {
            return [...prev, incidentData];
          }
        });

        // Show notification
        showNotificationMessage(
          "Eindrapport opgeslagen en naar Incidenten verzonden",
        );

        // DO NOT reset form - preserve data for review
        // Only clear the notepad for new notes
        const kladblok = document.getElementById("gmsKladblok");
        if (kladblok) {
          kladblok.textContent = "";
        }
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

      // Uitgifte handler function
      const handleUitgifte = () => {
        const formData = collectGMSFormData();
        if (!formData) return;
        
        const now = new Date();
        const incidentId = currentGmsIncident?.id || Date.now();
        
        const incidentData = {
          ...formData,
          id: incidentId,
          timestamp: currentGmsIncident?.timestamp || now.toISOString(),
          status: "Uitgegeven",
        };

        // Save to localStorage for persistence
        const existingIncidenten = JSON.parse(localStorage.getItem("incidenten") || "[]");
        const existingIndex = existingIncidenten.findIndex((inc: any) => (inc.id || inc.incidentId) === incidentId);
        
        if (existingIndex >= 0) {
          existingIncidenten[existingIndex] = incidentData;
        } else {
          existingIncidenten.push(incidentData);
        }
        
        localStorage.setItem("incidenten", JSON.stringify(existingIncidenten));

        // Update GMS incidents database
        setGmsIncidents(prev => {
          const existing = prev.find(inc => inc.id === incidentId);
          if (existing) {
            return prev.map(inc => inc.id === incidentId ? { ...inc, ...incidentData } : inc);
          } else {
            return [...prev, incidentData];
          }
        });

        // Set as current incident to maintain form state
        setCurrentGmsIncident(incidentData);

        showNotificationMessage("Incident uitgegeven en naar Incidenten verzonden");

        // Clear the notepad for new notes
        const kladblok = document.getElementById("gmsKladblok");
        if (kladblok) {
          kladblok.textContent = "";
        }
      };

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

      // Setup auto-logging on field interactions
      setupFieldInteractionLogging();

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
    
    // Remove GMS data for closed incident
    localStorage.removeItem(`gmsData_${id}`);
    
    // Clear current GMS incident if it matches the closed incident
    const currentIncident = localStorage.getItem('currentGmsIncident');
    if (currentIncident) {
      try {
        const parsedIncident = JSON.parse(currentIncident);
        if (parsedIncident.incidentId === id) {
          localStorage.removeItem('currentGmsIncident');
          console.log(`Cleared GMS data for closed incident ${id}`);
        }
      } catch (error) {
        console.error('Error clearing GMS data:', error);
      }
    }
    
    showNotificationMessage("Incident gesloten");
  };

  const removeIncident = (id: number) => {
    setIncidents((prev) => prev.filter((inc) => inc.id !== id));
    // Remove GMS data for this incident when it's deleted
    localStorage.removeItem(`gmsData_${id}`);
    showNotificationMessage("Incident verwijderd");
  };

  // Helper function for updating dynamic header
  const updateDynamicHeader = () => {
    const mc1Select = document.getElementById("gmsClassificatie1") as HTMLSelectElement;
    const straatnaamField = document.getElementById("gmsStraatnaam") as HTMLInputElement;
    const plaatsnaamField = document.getElementById("gmsPlaatsnaam") as HTMLInputElement;
    const dynamicHeader = document.getElementById("gmsDynamicHeader");

    if (!dynamicHeader) return;

    const mc1Value = mc1Select?.value || "Onbekend";
    const straatnaam = straatnaamField?.value || "Onbekend";
    const plaatsnaam = plaatsnaamField?.value || "Onbekend";

    dynamicHeader.textContent = `${mc1Value} – ${straatnaam} ${plaatsnaam}`;
  };

  // Enhanced helper function to load incident data into GMS form with full persistence
  const loadIncidentIntoGMS = (incidentData: any) => {
    console.log('Loading comprehensive incident data into GMS form:', incidentData);
    
    // Set current incident
    setCurrentGmsIncident(incidentData);
    
    // Use setTimeout to ensure DOM elements are available
    setTimeout(() => {
      // Get all form field references
      const melderNaamField = document.getElementById("gmsMeldernaam") as HTMLInputElement;
      const melderAdresField = document.getElementById("gmsMelderadres") as HTMLInputElement;
      const telefoonnummerField = document.getElementById("gmsTelefoonnummer") as HTMLInputElement;
      const straatnaamField = document.getElementById("gmsStraatnaam") as HTMLInputElement;
      const huisnummerField = document.getElementById("gmsHuisnummer") as HTMLInputElement;
      const toevoegingField = document.getElementById("gmsToevoeging") as HTMLInputElement;
      const postcodeField = document.getElementById("gmsPostcode") as HTMLInputElement;
      const plaatsnaamField = document.getElementById("gmsPlaatsnaam") as HTMLInputElement;
      const gemeenteField = document.getElementById("gmsGemeente") as HTMLInputElement;
      const tijdstipField = document.getElementById("gmsTijdstip") as HTMLInputElement;
      const prioriteitField = document.getElementById("gmsPrioriteit") as HTMLSelectElement;
      const mc1Field = document.getElementById("gmsClassificatie1") as HTMLSelectElement;
      const mc2Field = document.getElementById("gmsClassificatie2") as HTMLSelectElement;
      const mc3Field = document.getElementById("gmsClassificatie3") as HTMLSelectElement;
      const meldingLoggingField = document.getElementById("gmsMeldingLogging");
      const kladblokField = document.getElementById("gmsKladblok");
      
      // Fill meldergegevens (support both naming conventions)
      if (melderNaamField) {
        melderNaamField.value = incidentData.melderNaam || incidentData.meldernaam || '';
      }
      if (melderAdresField) {
        melderAdresField.value = incidentData.melderAdres || incidentData.melderadres || '';
      }
      if (telefoonnummerField && incidentData.telefoonnummer) {
        telefoonnummerField.value = incidentData.telefoonnummer;
      }
      
      // Fill locatie gegevens
      if (straatnaamField && incidentData.straatnaam) straatnaamField.value = incidentData.straatnaam;
      if (huisnummerField && incidentData.huisnummer) huisnummerField.value = incidentData.huisnummer;
      if (toevoegingField && incidentData.toevoeging) toevoegingField.value = incidentData.toevoeging;
      if (postcodeField && incidentData.postcode) postcodeField.value = incidentData.postcode;
      if (plaatsnaamField && incidentData.plaatsnaam) plaatsnaamField.value = incidentData.plaatsnaam;
      if (gemeenteField && incidentData.gemeente) gemeenteField.value = incidentData.gemeente;
      
      // Fill operationele gegevens
      if (tijdstipField && incidentData.tijdstip) {
        tijdstipField.value = incidentData.tijdstip;
      }
      if (prioriteitField && incidentData.prioriteit) {
        prioriteitField.value = incidentData.prioriteit.toString();
      }
      
      // Restore melding logging with full HTML content
      if (meldingLoggingField && incidentData.meldingslogging) {
        console.log('Restoring melding logging data:', incidentData.meldingslogging);
        meldingLoggingField.innerHTML = incidentData.meldingslogging;
        // Scroll to bottom to show latest entries
        meldingLoggingField.scrollTop = meldingLoggingField.scrollHeight;
      } else {
        console.log('No melding logging data to restore or element not found');
      }
      
      // Only clear notepad for new notes, keep existing data
      if (kladblokField && !incidentData.preserveNotepad) {
        kladblokField.textContent = '';
      }
      
      // Restore classificaties with proper cascading (delayed for dropdown population)
      setTimeout(() => {
        const mc1Value = incidentData.mc1 || incidentData.classificatie1 || '';
        const mc2Value = incidentData.mc2 || incidentData.classificatie2 || '';
        const mc3Value = incidentData.mc3 || incidentData.classificatie3 || '';
        
        if (mc1Field && mc1Value) {
          mc1Field.value = mc1Value;
          // Trigger change event to populate cascading dropdowns
          mc1Field.dispatchEvent(new Event('change', { bubbles: true }));
          
          setTimeout(() => {
            if (mc2Field && mc2Value) {
              mc2Field.value = mc2Value;
              mc2Field.dispatchEvent(new Event('change', { bubbles: true }));
              
              setTimeout(() => {
                if (mc3Field && mc3Value) {
                  mc3Field.value = mc3Value;
              }
                // Update dynamic header after all fields are populated
                updateDynamicHeader();
              }, 100);
            }
          }, 100);
        } else {
          // Update header even if no classifications
          updateDynamicHeader();
        }
      }, 200);
      
      console.log('Full incident data loaded into GMS form with persistence');
    }, 50);
  };

  // Handle new incident creation in GMS
  const handleNewIncident = () => {
    console.log('Creating new incident in GMS');
    setCurrentGmsIncident(null);
    setActiveSection('gms');
    showNotificationMessage('Nieuw incident gestart in GMS');
  };

  // Enhanced incident click handler with comprehensive data loading
  const handleIncidentClick = (incident: Incident) => {
    console.log('Opening incident in GMS with full data persistence:', incident.id);
    
    // Find the complete incident data in GMS database
    const gmsIncident = gmsIncidents.find(gmsInc => gmsInc.id === incident.id);
    
    if (gmsIncident) {
      console.log('Found complete GMS incident data, loading all fields:', gmsIncident);
      
      // Switch to GMS tab first
      setActiveSection('gms');
      
      // Use a timeout to ensure the GMS tab has loaded before populating fields
      setTimeout(() => {
        loadIncidentIntoGMS(gmsIncident);
      }, 100);
      
      showNotificationMessage(`Incident ${incident.id} volledig geladen in GMS`);
    } else {
      console.log('No GMS data found, reconstructing from incident data');
      
      // Parse location from incident data with better handling
      let straatnaam = '';
      let huisnummer = '';
      let plaatsnaam = '';
      
      // Split location by comma to separate street from city
      const locationParts = incident.location.split(',');
      if (locationParts.length >= 2) {
        const streetPart = locationParts[0].trim();
        plaatsnaam = locationParts[1].trim();
        
        // Extract house number from street part
        const streetWords = streetPart.split(' ');
        const lastWord = streetWords[streetWords.length - 1];
        if (/^\d+/.test(lastWord)) {
          huisnummer = lastWord;
          straatnaam = streetWords.slice(0, -1).join(' ');
        } else {
          straatnaam = streetPart;
        }
      } else {
        straatnaam = incident.location;
        plaatsnaam = 'Rotterdam';
      }
      
      // Create comprehensive incident with all available data
      const reconstructedIncident = {
        id: incident.id,
        melderNaam: '',
        meldernaam: '',
        melderAdres: '',
        melderadres: '',
        telefoonnummer: '',
        straatnaam: straatnaam,
        huisnummer: huisnummer,
        toevoeging: '',
        postcode: '',
        plaatsnaam: plaatsnaam,
        gemeente: plaatsnaam,
        location: incident.location,
        mc1: incident.type || '',
        mc2: '',
        mc3: '',
        classificatie1: incident.type || '',
        classificatie2: '',
        classificatie3: '',
        type: incident.type || 'Onbekend incident',
        tijdstip: incident.timestamp,
        prioriteit: incident.priority === 'high' ? 1 : incident.priority === 'medium' ? 2 : 3,
        priority: incident.priority,
        status: 'Bestaand',
        meldingslogging: '',
        notities: '',
        timeAgo: incident.timeAgo,
        unitsAssigned: incident.unitsAssigned,
        aangemaaktOp: incident.timestamp
      };
      
      // Switch to GMS tab first
      setActiveSection('gms');
      
      // Save to GMS incidents for future persistence
      setGmsIncidents(prev => {
        const existing = prev.find(inc => inc.id === incident.id);
        if (!existing) {
          return [...prev, reconstructedIncident];
        }
        return prev;
      });
      
      // Use a timeout to ensure the GMS tab has loaded before populating fields
      setTimeout(() => {
        loadIncidentIntoGMS(reconstructedIncident);
      }, 100);
      
      showNotificationMessage(`Incident ${incident.id} gereconstrueerd in GMS`);
    }
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
        {activeSection !== "gms" && (
          <div className="header">
            <h1>Meldkamer Dashboard</h1>
            <div className="header-time">{formatTime(currentTime)}</div>
          </div>
        )}

        {activeSection === "dashboard" && (
          <div className="content-section active">
            <StatsGrid stats={calculateStats()} />
            <div className="content-grid">
              <div className="section">
                <div className="section-header">
                  <h3 className="section-title">Dashboard Overzicht</h3>
                </div>
                <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                  <p>Welkom bij het Meldkamer Dashboard</p>
                  <p>Gebruik de navigatie om naar specifieke secties te gaan</p>
                </div>
              </div>
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
                    <div className="legacy-col-prio">Prio</div>
                    <div className="legacy-col-mc">MC1 / MC2 / MC3</div>
                    <div className="legacy-col-locatie">Straatnaam + Huisnummer</div>
                    <div className="legacy-col-plaats">Plaatsnaam</div>
                    <div className="legacy-col-id">Incident Nummer</div>
                    <div className="legacy-col-units">Toegewezen Eenheden</div>
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
            <div className="telefoon-dashboard">
              {/* Header */}
              <div className="telefoon-header">
                <h2 className="telefoon-title">Telefoon Dashboard - Meldkamer Rotterdam</h2>
                <div className="telefoon-header-buttons">
                  <button 
                    className="telefoon-header-btn gms-btn"
                    onClick={() => setActiveSection('gms')}
                  >
                    Naar GMS
                  </button>
                  <button 
                    className="telefoon-header-btn new-tab-btn"
                    onClick={() => window.open(window.location.href, '_blank')}
                  >
                    Nieuw Tabblad
                  </button>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="telefoon-main-grid">
                
                {/* Left Column - Chat Section */}
                <div className="telefoon-chat-section">
                  <div className="chat-tabs">
                    <button 
                      className={`chat-tab ${activeChatTab === "burgers" ? "active" : ""}`} 
                      onClick={() => setActiveChatTab("burgers")}
                    >
                      Burgers
                    </button>
                    <button 
                      className={`chat-tab ${activeChatTab === "collega" ? "active" : ""}`} 
                      onClick={() => setActiveChatTab("collega")}
                    >
                      Collega's
                    </button>
                    <button 
                      className={`chat-tab ${activeChatTab === "partners" ? "active" : ""}`} 
                      onClick={() => setActiveChatTab("partners")}
                    >
                      Ketenpartners
                    </button>
                  </div>

                  <div className="chat-container">
                    <div className="chat-messages" id="chatMessages">
                      {activeChatTab === "burgers" && (
                        <>
                          <div className="chat-message incoming">
                            <div className="message-sender">Melder - 06-12345678</div>
                            <div className="message-content">Er is een verkeersongeval op de A20 richting Den Haag, ter hoogte van afslag Vlaardingen.</div>
                            <div className="message-time">14:23</div>
                          </div>
                          <div className="chat-message outgoing">
                            <div className="message-sender">Meldkamer</div>
                            <div className="message-content">Dank u voor de melding. Zijn er gewonden? En kunt u de exacte locatie bevestigen?</div>
                            <div className="message-time">14:24</div>
                          </div>
                        </>
                      )}
                      
                      {activeChatTab === "collega" && (
                        <>
                          {currentConversation && (
                            <div className="conversation-header">
                              <strong>Gesprek met: {currentConversation.functie}</strong>
                              <span className="conversation-phone">{currentConversation.telefoonnummer}</span>
                            </div>
                          )}
                          
                          {chatMessages.length === 0 && !currentConversation && (
                            <div className="no-conversation">
                              <p>Geen actief gesprek. Klik op een collega rechts om een gesprek te starten.</p>
                            </div>
                          )}
                          
                          {chatMessages.map((message) => (
                            <div key={message.id} className={`chat-message ${message.type}`}>
                              <div className="message-sender">{message.sender}</div>
                              <div className="message-content">{message.content}</div>
                              <div className="message-time">{message.timestamp}</div>
                            </div>
                          ))}
                        </>
                      )}
                      
                      {activeChatTab === "partners" && (
                        <div className="chat-message incoming">
                          <div className="message-sender">Rijkswaterstaat - 0800-8002</div>
                          <div className="message-content">We hebben het incident ontvangen. Wegbeheer is onderweg naar de locatie.</div>
                          <div className="message-time">14:26</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="chat-input-section">
                      <input 
                        type="text" 
                        className="chat-input" 
                        placeholder={
                          activeChatTab === "collega" && currentConversation 
                            ? `Bericht naar ${currentConversation.functie}...`
                            : "Typ uw bericht..."
                        }
                        id="chatInput"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            if (activeChatTab === "collega" && input.value.trim()) {
                              sendMessageToColleague(input.value);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button 
                        className="chat-send-btn" 
                        id="chatSendBtn"
                        onClick={() => {
                          const input = document.getElementById('chatInput') as HTMLInputElement;
                          if (activeChatTab === "collega" && input?.value.trim()) {
                            sendMessageToColleague(input.value);
                            input.value = '';
                          }
                        }}
                      >
                        Verzend
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Contact Panels */}
                <div className="telefoon-contact-section">
                  
                  {/* AI Telephone Conversations - Placeholder */}
                  <div className="contact-panel ai-conversations-panel">
                    <h3 className="panel-title">AI Telefoonconversaties</h3>
                    <div className="ai-placeholder-content">
                      <div className="placeholder-message">
                        <strong>Toekomstige functionaliteit:</strong>
                        <p>Hier komen dynamische AI-gestuurde telefoongesprekken met noodmelders via 112 en andere emergency services.</p>
                      </div>
                      <div className="placeholder-features">
                        <div className="feature-item">• Realtime conversatie simulatie</div>
                        <div className="feature-item">• Intelligente respons generatie</div>
                        <div className="feature-item">• Automatische incident classificatie</div>
                        <div className="feature-item">• Geïntegreerde GMS koppeling</div>
                      </div>
                    </div>
                  </div>

                  {/* Colleagues */}
                  <div className="contact-panel colleague-panel">
                    <h3 className="panel-title">Collega's</h3>
                    <div className="contact-grid">
                      <button className="contact-btn colleague" data-colleague="supervisor">
                        Dienstchef
                        <span className="contact-status online">Online</span>
                      </button>
                      <button className="contact-btn colleague" data-colleague="coordinator">
                        Coördinator
                        <span className="contact-status online">Online</span>
                      </button>
                      <button className="contact-btn colleague" data-colleague="teamleader">
                        Teamleider
                        <span className="contact-status away">Afwezig</span>
                      </button>
                      <button className="contact-btn colleague" data-colleague="backup">
                        Back-up Centralist
                        <span className="contact-status online">Online</span>
                      </button>
                      
                      {/* Dynamic phone numbers from Telefoonlijst */}
                      {phoneNumbersArray.map((phone) => (
                        <button 
                          key={phone.id} 
                          className="contact-btn colleague phone-contact" 
                          data-colleague={phone.functie}
                          data-phone={phone.telefoonnummer}
                          title={`${phone.omschrijving} - ${phone.telefoonnummer}`}
                          onClick={() => startConversationWithContact(phone)}
                        >
                          {phone.functie}
                          <span className="contact-number">{phone.telefoonnummer}</span>
                          {phone.bereikbaar24u ? (
                            <span className="contact-status online">24/7</span>
                          ) : (
                            <span className="contact-status away">Dienst</span>
                          )}
                        </button>
                      ))}
                      
                      {phoneNumbersArray.length === 0 && (
                        <div className="no-phone-contacts">
                          <small>Geen extra contacten. Voeg nummers toe via Instellingen → Telefoonlijst</small>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* External Partners */}
                  <div className="contact-panel partner-panel">
                    <h3 className="panel-title">Externe Partners</h3>
                    <div className="contact-grid">
                      <button className="contact-btn partner" data-partner="rijkswaterstaat">
                        Rijkswaterstaat
                        <span className="contact-number">0800-8002</span>
                      </button>
                      <button className="contact-btn partner" data-partner="gemeente">
                        Gemeente Rotterdam
                        <span className="contact-number">14010</span>
                      </button>
                      <button className="contact-btn partner" data-partner="ov">
                        OV Controle
                        <span className="contact-number">0900-9292</span>
                      </button>
                      <button className="contact-btn partner" data-partner="defensie">
                        Koninklijke Marechaussee
                        <span className="contact-number">0900-0141</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Status Bar */}
              <div className="telefoon-status-bar">
                <div className="status-left">
                  <span className="call-status">Lijn 1: Beschikbaar</span>
                  <span className="call-status">Lijn 2: In gesprek</span>
                  <span className="call-status">Lijn 3: Beschikbaar</span>
                </div>
                <div className="status-right">
                  <span className="active-calls">Actieve gesprekken: 2</span>
                  <span className="queue-count">Wachtrij: 0</span>
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
          <div className="content-section active gms-fullscreen">
            <div id="gms" className="gms-wrapper">
              <div className="gms-content">
                {/* Classic GMS Interface Layout */}
                <div className="gms-classic-layout">
                  {/* Top Header Bar */}
                  <div className="gms-header-bar">
                    <div className="gms-incident-info">
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
                        <div className="gms-notitie-container">
                          <div className="gms-notitie-left">
                            <div
                              id="gmsKladblok"
                              contentEditable="true"
                              className="gms-text-area gms-text-area-compact"
                              data-placeholder="Voer hier de melding in..."
                            ></div>
                          </div>
                          <div className="gms-notitie-right">
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
              {/* GMS Timestamp at bottom left */}
              <div className="gms-timestamp">
                {formatTime(currentTime)}
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
                <h3 className="section-title">Instellingen</h3>
              </div>
              
              {/* Settings Subtabs */}
              <div className="gms-subtabs">
                <button 
                  className={`gms-subtab ${activeSettingsTab === "basisteams" ? "active" : ""}`}
                  onClick={() => setActiveSettingsTab("basisteams")}
                >
                  Basisteams
                </button>
                <button 
                  className={`gms-subtab ${activeSettingsTab === "telefoonlijst" ? "active" : ""}`}
                  onClick={() => setActiveSettingsTab("telefoonlijst")}
                >
                  Telefoonlijst
                </button>
              </div>

              {/* Basisteams Tab Content */}
              {activeSettingsTab === "basisteams" && (
                <div className="basisteams-content">
                  <div className="basisteams-filter-section">
                    <label htmlFor="basisteamsFilter" className="filter-label">
                      Filter basisteams
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
              )}

              {/* Telefoonlijst Tab Content */}
              {activeSettingsTab === "telefoonlijst" && (
                <div className="telefoonlijst-content">
                  <div className="telefoonlijst-header">
                    <h4 className="telefoonlijst-title">Telefoonlijst Beheer</h4>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowPhoneForm(!showPhoneForm)}
                    >
                      Telefoonnummer toevoegen
                    </button>
                  </div>

                  {/* Phone Number Form */}
                  {showPhoneForm && (
                    <div className="telefoon-form-container">
                      <div className="telefoon-form">
                        <h5>Nieuw Telefoonnummer Toevoegen</h5>
                        
                        <div className="gms-form-row">
                          <div className="gms-field-group">
                            <label>Functie *</label>
                            <input
                              type="text"
                              className="gms-field"
                              value={newPhoneNumber.functie}
                              onChange={(e) => setNewPhoneNumber(prev => ({...prev, functie: e.target.value}))}
                              placeholder="Bijv. Dienstchef, Teamleider"
                            />
                          </div>
                          <div className="gms-field-group">
                            <label>Omschrijving *</label>
                            <input
                              type="text"
                              className="gms-field"
                              value={newPhoneNumber.omschrijving}
                              onChange={(e) => setNewPhoneNumber(prev => ({...prev, omschrijving: e.target.value}))}
                              placeholder="Korte beschrijving van de functie"
                            />
                          </div>
                        </div>

                        <div className="gms-form-row">
                          <div className="gms-field-group">
                            <label>Telefoonnummer *</label>
                            <input
                              type="tel"
                              className="gms-field"
                              value={newPhoneNumber.telefoonnummer}
                              onChange={(e) => setNewPhoneNumber(prev => ({...prev, telefoonnummer: e.target.value}))}
                              placeholder="06-12345678"
                            />
                          </div>
                          <div className="gms-field-group">
                            <label>
                              <input
                                type="checkbox"
                                checked={newPhoneNumber.bereikbaar24u}
                                onChange={(e) => setNewPhoneNumber(prev => ({...prev, bereikbaar24u: e.target.checked}))}
                              />
                              24 uur bereikbaar
                            </label>
                          </div>
                        </div>

                        {!newPhoneNumber.bereikbaar24u && (
                          <div className="gms-form-row">
                            <div className="gms-field-group">
                              <label>Tijdstip begin dienst</label>
                              <input
                                type="time"
                                className="gms-field"
                                value={newPhoneNumber.beginDienst}
                                onChange={(e) => setNewPhoneNumber(prev => ({...prev, beginDienst: e.target.value}))}
                              />
                            </div>
                            <div className="gms-field-group">
                              <label>Tijdstip einde dienst</label>
                              <input
                                type="time"
                                className="gms-field"
                                value={newPhoneNumber.eindeDienst}
                                onChange={(e) => setNewPhoneNumber(prev => ({...prev, eindeDienst: e.target.value}))}
                              />
                            </div>
                          </div>
                        )}

                        <div className="gms-form-row">
                          <div className="gms-field-group gms-field-full">
                            <label>Opmerkingen</label>
                            <textarea
                              className="gms-field"
                              rows={3}
                              value={newPhoneNumber.opmerkingen}
                              onChange={(e) => setNewPhoneNumber(prev => ({...prev, opmerkingen: e.target.value}))}
                              placeholder="Extra informatie of opmerkingen..."
                            />
                          </div>
                        </div>

                        <div className="telefoon-form-buttons">
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              if (!newPhoneNumber.functie || !newPhoneNumber.omschrijving || !newPhoneNumber.telefoonnummer) {
                                alert("Vul alle verplichte velden in");
                                return;
                              }

                              const savedPhoneNumber = {
                                ...newPhoneNumber,
                                id: Date.now() + Math.random(), // Generate unique ID
                                createdAt: new Date().toISOString()
                              };

                              console.log('Saving phone number:', savedPhoneNumber);
                              console.log('Current phoneNumbers before save:', phoneNumbersArray);
                              
                              setPhoneNumbers(prev => {
                                const prevArray = Array.isArray(prev) ? prev : [];
                                const updated = [...prevArray, savedPhoneNumber];
                                console.log('Updated phoneNumbers:', updated);
                                return updated;
                              });
                              setNewPhoneNumber({
                                functie: "", omschrijving: "", telefoonnummer: "",
                                beginDienst: "", eindeDienst: "", bereikbaar24u: false, opmerkingen: ""
                              });
                              setShowPhoneForm(false);
                              setNotification("Telefoonnummer succesvol toegevoegd");
                              setShowNotification(true);
                              setTimeout(() => setShowNotification(false), 3000);
                            }}
                          >
                            Opslaan
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setShowPhoneForm(false)}
                          >
                            Annuleren
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phone Numbers List */}
                  <div className="telefoonlijst-table-container">
                    <table className="telefoonlijst-table">
                      <thead>
                        <tr>
                          <th>Functie</th>
                          <th>Omschrijving</th>
                          <th>Telefoonnummer</th>
                          <th>Diensttijden</th>
                          <th>Opmerkingen</th>
                          <th>Acties</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phoneNumbersArray.map((phone) => (
                          <tr key={phone.id} className="telefoon-row">
                            <td className="telefoon-functie"><strong>{phone.functie}</strong></td>
                            <td className="telefoon-omschrijving">{phone.omschrijving}</td>
                            <td className="telefoon-nummer">{phone.telefoonnummer}</td>
                            <td className="telefoon-dienst">
                              {phone.bereikbaar24u ? "24/7" : `${phone.beginDienst || "?"} - ${phone.eindeDienst || "?"}`}
                            </td>
                            <td className="telefoon-opmerkingen">{phone.opmerkingen || "-"}</td>
                            <td className="telefoon-acties">
                              <button
                                className="btn btn-danger btn-small"
                                onClick={() => {
                                  if (confirm("Weet u zeker dat u dit telefoonnummer wilt verwijderen?")) {
                                    setPhoneNumbers(prev => {
                                      const prevArray = Array.isArray(prev) ? prev : [];
                                      return prevArray.filter(p => p.id !== phone.id);
                                    });
                                    setNotification("Telefoonnummer verwijderd");
                                    setShowNotification(true);
                                    setTimeout(() => setShowNotification(false), 3000);
                                  }
                                }}
                              >
                                Verwijder
                              </button>
                            </td>
                          </tr>
                        ))}
                        {phoneNumbersArray.length === 0 && (
                          <tr>
                            <td colSpan={6} className="no-data">
                              Geen telefoonnummers gevonden. Klik op "Telefoonnummer toevoegen" om een nummer toe te voegen.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
