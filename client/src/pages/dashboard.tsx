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

      // Handle GMS form submission
      const handleGMSSubmit = () => {
        const kladblok = document.getElementById("gmsKladblok");
        
        // Melder informatie
        const meldernaam = document.getElementById("gmsMeldernaam") as HTMLInputElement;
        const melderadres = document.getElementById("gmsMelderadres") as HTMLInputElement;
        const telefoonnummer = document.getElementById("gmsTelefoonnummer") as HTMLInputElement;
        
        // Melding locatie
        const meldingsadres = document.getElementById("gmsMeldingsadres") as HTMLInputElement;
        const postcode = document.getElementById("gmsPostcode") as HTMLInputElement;
        const gemeente = document.getElementById("gmsGemeente") as HTMLInputElement;
        
        // Classificaties
        const classificatie1 = document.getElementById("gmsClassificatie1") as HTMLSelectElement;
        const classificatie2 = document.getElementById("gmsClassificatie2") as HTMLSelectElement;
        const classificatie3 = document.getElementById("gmsClassificatie3") as HTMLSelectElement;
        
        // Bestaande velden
        const locatie = document.getElementById("gmsLocatie") as HTMLInputElement;
        const tijdstip = document.getElementById("gmsTijdstip") as HTMLInputElement;
        const soortMelding = document.getElementById("gmsSoortMelding") as HTMLSelectElement;
        const prioriteit = document.getElementById("gmsPrioriteit") as HTMLInputElement;
        const output = document.getElementById("gmsOutput");

        if (!kladblok || !output) return;

        // Validate required fields
        if (!meldingsadres?.value.trim() && !locatie?.value.trim()) {
          alert("Vul minimaal het meldingsadres of locatie in.");
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
          meldingsadres: meldingsadres?.value.trim() || "",
          postcode: postcode?.value.trim() || "",
          gemeente: gemeente?.value.trim() || "",
          
          // LMC Classificatie
          classificatie1: classificatie1?.value || "",
          classificatie2: classificatie2?.value || "",
          classificatie3: classificatie3?.value || "",
          
          // Aanvullende informatie
          opmerkingen: kladblok.textContent || "",
          locatie: locatie?.value.trim() || "",
          tijdstip: tijdstip?.value || "",
          soortMelding: soortMelding?.value || "",
          prioriteit: parseInt(prioriteit?.value || "3")
        };

        // Save to localStorage incidenten array
        try {
          const existingIncidenten = JSON.parse(localStorage.getItem('incidenten') || '[]');
          existingIncidenten.push(gmsData);
          localStorage.setItem('incidenten', JSON.stringify(existingIncidenten));
        } catch (error) {
          console.error('Error saving to localStorage:', error);
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
        if (meldingsadres) meldingsadres.value = "";
        if (postcode) postcode.value = "";
        if (gemeente) gemeente.value = "";
        
        // Reset classificaties
        if (classificatie1) classificatie1.value = "";
        if (classificatie2) classificatie2.value = "";
        if (classificatie3) classificatie3.value = "";
        
        // Reset bestaande velden
        if (locatie) locatie.value = "";
        if (soortMelding) soortMelding.value = "";
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

      return () => {
        clearInterval(timeTimer);
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
      const incidentsList = document.getElementById('allIncidentsList');
      if (!incidentsList) return;

      try {
        const storedIncidenten = JSON.parse(localStorage.getItem('incidenten') || '[]');
        
        if (storedIncidenten.length === 0) {
          incidentsList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
              Geen incidenten gevonden
            </div>
          `;
          return;
        }

        // Sort by timestamp (newest first)
        const sortedIncidenten = storedIncidenten.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        incidentsList.innerHTML = sortedIncidenten.map((incident: any) => {
          const formattedTime = new Date(incident.timestamp).toLocaleString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const prioriteitLabel = incident.prioriteit === 1 ? 'Zeer Hoog' :
                                 incident.prioriteit === 2 ? 'Hoog' :
                                 incident.prioriteit === 3 ? 'Gemiddeld' :
                                 incident.prioriteit === 4 ? 'Laag' :
                                 incident.prioriteit === 5 ? 'Zeer Laag' :
                                 'Gemiddeld';

          const prioriteitClass = incident.prioriteit <= 2 ? 'priority-high' :
                                 incident.prioriteit === 3 ? 'priority-medium' :
                                 'priority-low';

          return `
            <div class="incident-row">
              <div class="incident-time">${formattedTime}</div>
              <div class="incident-location">${incident.gemeente || incident.locatie || 'Onbekend'}</div>
              <div class="incident-type">${incident.soortMelding || 'Onbekend'}</div>
              <div>
                <span class="priority-tag ${prioriteitClass}">
                  ${prioriteitLabel}
                </span>
              </div>
              <div class="incident-status">${incident.status}</div>
            </div>
          `;
        }).join('');

      } catch (error) {
        console.error('Error loading incidents:', error);
        incidentsList.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #666;">
            Fout bij laden van incidenten
          </div>
        `;
      }
    };

    // Only initialize if incidents section is active
    if (activeSection === 'incidents') {
      loadIncidentsFromStorage();
    }
  }, [activeSection]);

  // GMS Kladblok functionality
  useEffect(() => {
    const initializeKladblokFeatures = () => {
      const kladblok = document.getElementById('gmsKladblok');
      const verzendButton = document.getElementById('gmsVerzendButton');
      const meldingLogging = document.getElementById('gmsMeldingLogging');
      const priorityInput = document.getElementById('gmsPrioriteit') as HTMLInputElement;
      const priorityIndicator = document.getElementById('gmsPriorityIndicator');
      
      if (!kladblok || !verzendButton || !meldingLogging || !priorityInput || !priorityIndicator) return;

      const sendMessage = () => {
        const message = kladblok.textContent?.trim();
        if (!message) return;

        // Auto-classification based on keywords
        const processAutoClassification = (text: string) => {
          const classificatie1Select = document.getElementById('gmsClassificatie1') as HTMLSelectElement;
          if (!classificatie1Select) return;

          // Define keyword mappings
          const keywordMappings: { [key: string]: string } = {
            'verkeer': 'Verkeer',
            'geweld': 'Geweld',
            'diefstal': 'Diefstal',
            'brand': 'Brand',
            'overlast': 'Overlast'
          };

          // Look for keywords that start with dash
          const words = text.split(/\s+/);
          for (const word of words) {
            if (word.startsWith('-')) {
              const keyword = word.substring(1).toLowerCase();
              if (keywordMappings[keyword]) {
                classificatie1Select.value = keywordMappings[keyword];
                // Add visual feedback
                classificatie1Select.style.backgroundColor = '#d4edda';
                classificatie1Select.style.borderColor = '#28a745';
                setTimeout(() => {
                  classificatie1Select.style.backgroundColor = '';
                  classificatie1Select.style.borderColor = '';
                }, 2000);
                break;
              }
            }
          }
        };

        // Process auto-classification
        processAutoClassification(message);

        // Create timestamp in HH:MM format
        const now = new Date();
        const timestamp = now.toLocaleTimeString('nl-NL', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // Create log entry
        const logEntry = document.createElement('div');
        logEntry.className = 'gms-log-entry';
        logEntry.innerHTML = `
          <span class="gms-log-time">${timestamp}</span>
          <span class="gms-log-message">${message}</span>
        `;

        // Add to logging area (latest at bottom)
        meldingLogging.appendChild(logEntry);
        
        // Scroll to bottom
        meldingLogging.scrollTop = meldingLogging.scrollHeight;

        // Clear the kladblok
        kladblok.textContent = '';
        kladblok.focus();
      };

      // Handle Verzend button click
      const handleVerzendClick = () => {
        sendMessage();
      };

      // Handle Enter key (but not Shift+Enter or Alt+Enter)
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          sendMessage();
        }
      };

      // Update priority indicator color
      const updatePriorityIndicator = () => {
        const priorityValue = parseInt(priorityInput.value) || 3;
        
        // Remove all priority classes
        priorityIndicator.className = 'gms-priority-indicator';
        
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

      verzendButton.addEventListener('click', handleVerzendClick);
      kladblok.addEventListener('keydown', handleKeyDown);
      priorityInput.addEventListener('input', handlePriorityChange);
      priorityInput.addEventListener('change', handlePriorityChange);

      return () => {
        verzendButton.removeEventListener('click', handleVerzendClick);
        kladblok.removeEventListener('keydown', handleKeyDown);
        priorityInput.removeEventListener('input', handlePriorityChange);
        priorityInput.removeEventListener('change', handlePriorityChange);
      };
    };

    // Only initialize if GMS section is active
    if (activeSection === 'gms') {
      const cleanup = initializeKladblokFeatures();
      return cleanup;
    }
  }, [activeSection]);

  // Classification data management
  const defaultClassifications = [
    { code: "-alarm", MC1: "Alarm", MC2: "Autom. brand", MC3: "Autom. brand OMS" },
    { code: "-verkeer", MC1: "Verkeer", MC2: "Wegverkeer", MC3: "Materiële schade" },
    { code: "-geweld", MC1: "Geweld", MC2: "Huiselijk geweld", MC3: "Letselschade" },
    { code: "-brand", MC1: "Brand", MC2: "Woningbrand", MC3: "Dodelijk ongeval" },
    { code: "-diefstal", MC1: "Diefstal", MC2: "Inbraak woning", MC3: "Materiële schade" },
    { code: "-overlast", MC1: "Overlast", MC2: "Geluidshinder", MC3: "Geen letsel" },
    { code: "-drugs", MC1: "Drugs", MC2: "Handel drugs", MC3: "Grote hoeveelheid" },
    { code: "-vermist", MC1: "Vermissing", MC2: "Vermiste persoon", MC3: "Kwetsbare persoon" },
    { code: "-water", MC1: "Water", MC2: "Waterongeval", MC3: "Verdrinking" },
    { code: "-terrorist", MC1: "Terrorisme", MC2: "Verdacht object", MC3: "Evacuatie" }
  ];

  const getClassifications = () => {
    try {
      const stored = localStorage.getItem('classifications');
      return stored ? JSON.parse(stored) : defaultClassifications;
    } catch (error) {
      console.error('Error loading classifications:', error);
      return defaultClassifications;
    }
  };

  const saveClassifications = (classifications: any[]) => {
    try {
      localStorage.setItem('classifications', JSON.stringify(classifications));
    } catch (error) {
      console.error('Error saving classifications:', error);
    }
  };

  // Initialize classifications in localStorage if not present
  useEffect(() => {
    if (!localStorage.getItem('classifications')) {
      saveClassifications(defaultClassifications);
    }
  }, []);

  // Classificaties page functionality
  useEffect(() => {
    const loadClassificationsData = () => {
      const tableBody = document.getElementById('classificatiesTableBody');
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

      tableBody.innerHTML = classifications.map((classification: any, index: number) => {
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
      }).join('');

      // Add event listeners for edit and delete buttons
      const editButtons = document.querySelectorAll('.edit-classification');
      const deleteButtons = document.querySelectorAll('.delete-classification');

      editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const index = parseInt((e.target as HTMLElement).closest('button')?.getAttribute('data-index') || '0');
          editClassification(index);
        });
      });

      deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const index = parseInt((e.target as HTMLElement).closest('button')?.getAttribute('data-index') || '0');
          deleteClassification(index);
        });
      });
    };

    const editClassification = (index: number) => {
      const classifications = getClassifications();
      const classification = classifications[index];
      
      if (classification) {
        const newCode = prompt('Code:', classification.code);
        const newMC1 = prompt('MC1 (Niveau 1):', classification.MC1);
        const newMC2 = prompt('MC2 (Niveau 2):', classification.MC2);
        const newMC3 = prompt('MC3 (Niveau 3):', classification.MC3);

        if (newCode && newMC1 && newMC2 && newMC3) {
          classifications[index] = {
            code: newCode,
            MC1: newMC1,
            MC2: newMC2,
            MC3: newMC3
          };
          saveClassifications(classifications);
          loadClassificationsData();
          showNotificationMessage('Classificatie bijgewerkt');
        }
      }
    };

    const deleteClassification = (index: number) => {
      if (confirm('Weet je zeker dat je deze classificatie wilt verwijderen?')) {
        const classifications = getClassifications();
        classifications.splice(index, 1);
        saveClassifications(classifications);
        loadClassificationsData();
        showNotificationMessage('Classificatie verwijderd');
      }
    };

    const addNewClassification = () => {
      const code = prompt('Code (bijv. -brand):');
      const MC1 = prompt('MC1 (Niveau 1):');
      const MC2 = prompt('MC2 (Niveau 2):');
      const MC3 = prompt('MC3 (Niveau 3):');

      if (code && MC1 && MC2 && MC3) {
        const classifications = getClassifications();
        
        // Check if code already exists
        const existingIndex = classifications.findIndex((c: any) => c.code === code);
        if (existingIndex !== -1) {
          alert('Deze code bestaat al. Gebruik een andere code.');
          return;
        }

        classifications.push({
          code: code,
          MC1: MC1,
          MC2: MC2,
          MC3: MC3
        });

        saveClassifications(classifications);
        loadClassificationsData();
        showNotificationMessage('Nieuwe classificatie toegevoegd');
      }
    };

    // Add event listener for new classification button
    const addButton = document.getElementById('addNewClassificationBtn');
    if (addButton) {
      addButton.addEventListener('click', addNewClassification);
    }

    // Only initialize if classificaties section is active
    if (activeSection === 'classificaties') {
      loadClassificationsData();
    }

    // Cleanup function
    return () => {
      if (addButton) {
        addButton.removeEventListener('click', addNewClassification);
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
              </div>
              <div className="incidents-content">
                <div className="incidents-table">
                  <div className="incident-row" style={{ background: '#f8f9fa', fontWeight: 600 }}>
                    <div>Tijdstip</div>
                    <div>Gemeente</div>
                    <div>Soort Melding</div>
                    <div>Prioriteit</div>
                    <div>Status</div>
                  </div>
                  <div id="allIncidentsList">
                    {/* Incidents will be loaded here */}
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
                <div className="gms-form-grid">
                  <div className="gms-notepad-section">
                    <label className="gms-label">📝 Kladblok</label>
                    <div
                      id="gmsKladblok"
                      contentEditable="true"
                      className="gms-kladblok"
                    ></div>
                    <button
                      id="gmsVerzendButton"
                      className="btn btn-secondary gms-verzend-btn"
                    >
                      📤 Verzend
                    </button>
                    
                    <div className="gms-logging-section">
                      <label className="gms-label">📋 Melding Logging</label>
                      <div
                        id="gmsMeldingLogging"
                        className="gms-melding-logging"
                      ></div>
                    </div>
                  </div>

                  <div className="gms-form-sections">
                    {/* Melder Informatie - Left Column */}
                    <div className="gms-melder-section">
                      <h4 className="gms-section-title">👤 Melder Informatie</h4>
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsMeldernaam">🧍 Meldernaam</label>
                        <input
                          type="text"
                          id="gmsMeldernaam"
                          className="gms-input"
                          placeholder="Naam van de melder..."
                        />
                      </div>
                      
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsMelderadres">🏠 Melderadres</label>
                        <input
                          type="text"
                          id="gmsMelderadres"
                          className="gms-input"
                          placeholder="Adres van de melder..."
                        />
                      </div>
                      
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsTelefoonnummer">📞 Telefoonnummer melder</label>
                        <input
                          type="tel"
                          id="gmsTelefoonnummer"
                          className="gms-input"
                          placeholder="Telefoonnummer..."
                        />
                      </div>
                    </div>

                    {/* Melding Locatie - Right Column */}
                    <div className="gms-melding-section">
                      <h4 className="gms-section-title">📍 Melding Locatie</h4>
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsMeldingsadres">📍 Meldingsadres</label>
                        <input
                          type="text"
                          id="gmsMeldingsadres"
                          className="gms-input"
                          placeholder="Adres van het incident..."
                        />
                      </div>
                      
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsPostcode">🔢 Postcode</label>
                        <input
                          type="text"
                          id="gmsPostcode"
                          className="gms-input"
                          placeholder="1234 AB"
                        />
                      </div>
                      
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsGemeente">🏙️ Gemeente</label>
                        <input
                          type="text"
                          id="gmsGemeente"
                          className="gms-input"
                          placeholder="Gemeente naam..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Classificatie Section */}
                  <div className="gms-classificatie-section">
                    <h4 className="gms-section-title">📋 LMC Classificatie</h4>
                    <div className="gms-classificatie-grid">
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsClassificatie1">Classificatie 1</label>
                        <select id="gmsClassificatie1" className="gms-input">
                          <option value="">Selecteer classificatie 1...</option>
                          <option value="Verkeer">Verkeer</option>
                          <option value="Geweld">Geweld</option>
                          <option value="Diefstal">Diefstal</option>
                          <option value="Brand">Brand</option>
                          <option value="Overlast">Overlast</option>
                        </select>
                      </div>
                      
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsClassificatie2">Classificatie 2</label>
                        <select id="gmsClassificatie2" className="gms-input">
                          <option value="">Selecteer classificatie 2...</option>
                          <option value="Wegverkeer">Wegverkeer</option>
                          <option value="Fietsverkeer">Fietsverkeer</option>
                          <option value="Voetganger">Voetganger</option>
                          <option value="Openbaar vervoer">Openbaar vervoer</option>
                        </select>
                      </div>
                      
                      <div className="gms-form-group">
                        <label className="gms-label" htmlFor="gmsClassificatie3">Classificatie 3</label>
                        <select id="gmsClassificatie3" className="gms-input">
                          <option value="">Selecteer classificatie 3...</option>
                          <option value="Onder invloed">Onder invloed</option>
                          <option value="Materiële schade">Materiële schade</option>
                          <option value="Letselschade">Letselschade</option>
                          <option value="Dodelijk ongeval">Dodelijk ongeval</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bestaande velden */}
                  <div className="gms-existing-fields">
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsLocatie">📍 Locatie (legacy)</label>
                      <input
                        type="text"
                        id="gmsLocatie"
                        className="gms-input"
                        placeholder="Voer locatie in..."
                      />
                    </div>
                    
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsTijdstip">⏰ Tijdstip</label>
                      <input
                        type="datetime-local"
                        id="gmsTijdstip"
                        className="gms-input"
                        readOnly
                      />
                    </div>
                    
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsSoortMelding">🚨 Soort melding</label>
                      <select id="gmsSoortMelding" className="gms-input">
                        <option value="">Selecteer soort melding...</option>
                        <option value="Inbraak woning">Inbraak woning</option>
                        <option value="Brandmelding">Brandmelding</option>
                        <option value="Verkeersongeval">Verkeersongeval</option>
                      </select>
                    </div>
                    
                    <div className="gms-form-group">
                      <label className="gms-label" htmlFor="gmsPrioriteit">⚡ Prioriteit (1-5)</label>
                      <div className="gms-priority-wrapper">
                        <input
                          type="number"
                          id="gmsPrioriteit"
                          className="gms-input gms-priority-input"
                          min="1"
                          max="5"
                          defaultValue="3"
                        />
                        <div 
                          id="gmsPriorityIndicator" 
                          className="gms-priority-indicator"
                        ></div>
                      </div>
                      <div className="gms-priority-help">
                        1 is hoogste prioriteit, 5 is laagste
                      </div>
                    </div>
                    
                    <button
                      id="gmsSaveButton"
                      className="btn btn-primary gms-save-btn"
                    >
                      💾 Melding opslaan
                    </button>
                  </div>
                </div>

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
