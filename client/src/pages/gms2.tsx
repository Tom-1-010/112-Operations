import { useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";

interface LMCClassification {
  MC1: string;
  MC2: string;
  MC3: string;
  Code: string;
  PRIO: number;
  DEFINITIE: string;
}

interface GmsIncident {
  id: number;
  nr: number;
  prio: number;
  tijd: string;
  mc: string;
  locatie: string;
  plaats: string;
  roepnr: string;
  positie: string;
  melderNaam?: string;
  melderAdres?: string;
  telefoonnummer?: string;
  straatnaam?: string;
  huisnummer?: string;
  toevoeging?: string;
  postcode?: string;
  plaatsnaam?: string;
  gemeente?: string;
  mc1?: string;
  mc2?: string;
  mc3?: string;
  notities?: string;
  karakteristieken?: any[];
  status?: string;
  functie?: string;
  meldingslogging?: string;
  tijdstip?: string;
  prioriteit?: number;
  assignedUnits?: AssignedUnit[];
}

interface AssignedUnit {
  roepnummer: string;
  soort_voertuig: string;
  ov_tijd?: string;
  ar_tijd?: string;
  tp_tijd?: string;
  nb_tijd?: string;
  am_tijd?: string;
  vr_tijd?: string;
  fd_tijd?: string;
  ga_tijd?: string;
}

export default function GMS2() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedIncident, setSelectedIncident] = useState<GmsIncident | null>(null);
  const [kladblokText, setKladblokText] = useState("");
  const [mc1Value, setMc1Value] = useState("Bezitsaantasting");
  const [mc2Value, setMc2Value] = useState("Inbraak");
  const [notitiesText, setNotitiesText] = useState("");
  const [priorityValue, setPriorityValue] = useState(2);
  const [loggingEntries, setLoggingEntries] = useState<Array<{
    id: number;
    timestamp: string;
    message: string;
  }>>([]);
  const [lmcClassifications, setLmcClassifications] = useState<LMCClassification[]>([]);
  const [selectedMC1, setSelectedMC1] = useState("");
  const [selectedMC2, setSelectedMC2] = useState("");
  const [selectedMC3, setSelectedMC3] = useState("");
  const [activeLoggingTab, setActiveLoggingTab] = useState("hist-meldblok");
  const [bagSearchResults, setBagSearchResults] = useState<any[]>([]);
  const [bagSearchQuery, setBagSearchQuery] = useState("");
  const [karakteristieken, setKarakteristieken] = useState<any[]>([]);
  const [karakteristiekenDatabase, setKarakteristiekenDatabase] = useState<any[]>([]);
  const [selectedKarakteristieken, setSelectedKarakteristieken] = useState<any[]>([]);

  // Form state for new incidents
  const [formData, setFormData] = useState({
    melderNaam: "",
    telefoonnummer: "",
    melderAdres: "",
    huisnummer: "",
    toevoeging: "",
    gemeente: "",
    straatnaam: "",
    postcode: "",
    plaatsnaam: "",
    functie: "",
    roepnummer: ""
  });

  // Get next incident number from localStorage, starting from 20250001
  const getNextIncidentNumber = () => {
    const lastNumber = localStorage.getItem("lastIncidentNumber");
    let nextNumber = lastNumber ? parseInt(lastNumber) + 1 : 20250001;
    localStorage.setItem("lastIncidentNumber", nextNumber.toString());
    return nextNumber;
  };

  // Initialize incident number if not exists
  useEffect(() => {
    if (!localStorage.getItem("lastIncidentNumber")) {
      localStorage.setItem("lastIncidentNumber", "20250000");
    }
  }, []);

  // Incidents state management with proper loading and saving
  const [incidents, setIncidents] = useLocalStorage<GmsIncident[]>("gms2Incidents", []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-selection disabled to ensure "Nieuw" workflow works correctly
  // No automatic incident selection - user must manually select incidents

  // Load LMC classifications
  useEffect(() => {
    const loadLMCClassifications = async () => {
      try {
        const response = await fetch('/lmc_classifications.json');
        const data = await response.json();
        setLmcClassifications(data);
        console.log('Loaded LMC classifications:', data.length, 'entries');
      } catch (error) {
        console.error('Error loading LMC classifications:', error);
      }
    };

    loadLMCClassifications();
  }, []);

  // Load karakteristieken database
  useEffect(() => {
    const loadKarakteristieken = async () => {
      try {
        const response = await fetch('/api/karakteristieken');
        const data = await response.json();
        setKarakteristiekenDatabase(data);
        console.log('Loaded karakteristieken database:', data.length, 'entries');

        // Debug: Show sample codes
        if (data.length > 0) {
          console.log('📋 Sample karakteristieken codes:', data.slice(0, 10).map(k => ({
            code: k.ktCode,
            naam: k.ktNaam,
            type: k.ktType
          })));

          // Check specifically for ovdp-related codes
          const ovdpCodes = data.filter(k => 
            k.ktCode && k.ktCode.toLowerCase().includes('ovdp') ||
            k.ktNaam && k.ktNaam.toLowerCase().includes('ovdp')
          );
          if (ovdpCodes.length > 0) {
            console.log('🔍 Found OVDP-related codes:', ovdpCodes);
          } else {
            console.log('❌ No OVDP-related codes found in database');
          }
        }
      } catch (error) {
        console.error('Error loading karakteristieken:', error);
      }
    };

    loadKarakteristieken();
  }, []);

  // Initialize dropdowns when classifications are loaded
  useEffect(() => {
    if (lmcClassifications.length > 0) {
      initializeLMCDropdowns();
    }
  }, [lmcClassifications]);

  const formatDateTime = (date: Date) => {
    const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                   'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${dayName} ${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  };

  const handleIncidentSelect = (incident: GmsIncident) => {
    console.log(`📋 Selecting incident ${incident.nr} for editing`);

    // Set selected incident first
    setSelectedIncident(incident);

    // Load all incident data into form fields
    if (incident) {
      const incidentFormData = {
        melderNaam: incident.melderNaam || "",
        telefoonnummer: incident.telefoonnummer || "",
        melderAdres: incident.melderAdres || "",
        huisnummer: incident.huisnummer || "",
        toevoeging: incident.toevoeging || "",
        gemeente: incident.gemeente || "",
        straatnaam: incident.straatnaam || "",
        postcode: incident.postcode || "",
        plaatsnaam: incident.plaatsnaam || "",
        functie: incident.functie || "",
        roepnummer: incident.roepnr || ""
      };

      console.log(`📋 Loading incident data into form:`, incidentFormData);
      setFormData(incidentFormData);

      // Set MC classifications immediately and ensure they persist
      const mc1Value = incident.mc1 || "";
      const mc2Value = incident.mc2 || "";
      const mc3Value = incident.mc3 || "";

      console.log(`📋 Setting MC values: MC1="${mc1Value}", MC2="${mc2Value}", MC3="${mc3Value}"`);

      setSelectedMC1(mc1Value);
      setSelectedMC2(mc2Value);
      setSelectedMC3(mc3Value);

      // Set priority
      if (incident.prio) setPriorityValue(incident.prio);

      // Set notes if available
      if (incident.notities) setNotitiesText(incident.notities);

      // Load karakteristieken if available
      if (incident.karakteristieken && Array.isArray(incident.karakteristieken)) {
        setSelectedKarakteristieken(incident.karakteristieken);
      } else {
        setSelectedKarakteristieken([]);
      }

      // Load logging history if available - IMPORTANT: Clear first, then load
      setLoggingEntries([]); // Clear any existing entries first

      if (incident.meldingslogging) {
        const loggingLines = incident.meldingslogging.split('\n').filter(line => line.trim());
        const parsedEntries = loggingLines.map((line, index) => ({
          id: Date.now() + index + Math.random(), // Ensure unique IDs
          timestamp: line.substring(0, 20),
          message: line.substring(21)
        }));

        console.log(`📋 Loading ${parsedEntries.length} logging entries for incident ${incident.nr}`);
        setLoggingEntries(parsedEntries);
      }

      // Restore MC classifications in dropdowns with proper MC3 preservation
      setTimeout(() => {
        const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
        const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
        const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

        if (mc1Select && incident.mc1) {
          // First populate MC1 dropdown if not already populated
          if (mc1Select.options.length <= 1) {
            const mc1Options = Array.from(new Set(lmcClassifications.map(c => c.MC1).filter(Boolean))).sort();
            mc1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
            mc1Options.forEach(mc1 => {
              const option = document.createElement('option');
              option.value = mc1;
              option.textContent = mc1;
              mc1Select.appendChild(option);
            });
          }
          mc1Select.value = incident.mc1;

          setTimeout(() => {
            if (mc2Select && incident.mc2) {
              // Populate MC2 dropdown based on selected MC1
              const mc2Options = Array.from(new Set(
                lmcClassifications
                  .filter(c => c.MC1 === incident.mc1 && c.MC2 && c.MC2.trim() !== "")
                  .map(c => c.MC2)
              )).sort();

              mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
              mc2Options.forEach(mc2 => {
                const option = document.createElement('option');
                option.value = mc2;
                option.textContent = mc2;
                mc2Select.appendChild(option);
              });
              mc2Select.value = incident.mc2;

              setTimeout(() => {
                if (mc3Select && incident.mc3) {
                  // Populate MC3 dropdown based on selected MC1 and MC2
                  const mc3Options = Array.from(new Set(
                    lmcClassifications
                      .filter(c => c.MC1 === incident.mc1 && c.MC2 === incident.mc2 && c.MC3 && c.MC3.trim() !== "")
                      .map(c => c.MC3)
                  )).sort();

                  mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
                  mc3Options.forEach(mc3 => {
                    const option = document.createElement('option');
                    option.value = mc3;
                    option.textContent = mc3;
                    mc3Select.appendChild(option);
                  });
                  mc3Select.value = incident.mc3;

                  console.log(`📋 Restored complete classification: MC1="${incident.mc1}", MC2="${incident.mc2}", MC3="${incident.mc3}"`);
                }
              }, 100);
            }
          }, 100);
        }
      }, 250);


    }
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle "Update" button click for existing incidents
  const handleUpdate = () => {
    if (selectedIncident) {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Get current values from the UI dropdowns to ensure we have the latest state
      const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
      const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
      const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

      // Priority order: dropdown value > state value > original incident value > empty string
      const currentMC1 = mc1Select?.value || selectedMC1 || selectedIncident.mc1 || "";
      const currentMC2 = mc2Select?.value || selectedMC2 || selectedIncident.mc2 || "";
      const currentMC3 = mc3Select?.value || selectedMC3 || selectedIncident.mc3 || "";

      console.log(`📝 Update - Preserving MC values: MC1="${currentMC1}", MC2="${currentMC2}", MC3="${currentMC3}"`);

      // Determine MC code based on selected classification
      let mcCode = selectedIncident.mc;
      if (currentMC3 && currentMC2 && currentMC1) {
        const matchingClassification = lmcClassifications.find(c => 
          c.MC1 === currentMC1 && c.MC2 === currentMC2 && c.MC3 === currentMC3
        );
        if (matchingClassification) {
          mcCode = matchingClassification.Code.toUpperCase();
        }
      } else if (currentMC2 && currentMC1) {
        const matchingClassification = lmcClassifications.find(c => 
          c.MC1 === currentMC1 && c.MC2 === currentMC2
        );
        if (matchingClassification) {
          mcCode = matchingClassification.Code.toUpperCase();
        }
      }

      // Create location string
      const location = formData.straatnaam && formData.huisnummer 
        ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
        : formData.straatnaam?.toUpperCase() || "";

      const updatedIncident: GmsIncident = {
        ...selectedIncident,
        prio: priorityValue,
        mc: mcCode,
        locatie: location,
        plaats: formData.plaatsnaam?.substring(0, 3).toUpperCase() || "",
        melderNaam: formData.melderNaam,
        melderAdres: formData.melderAdres,  
        telefoonnummer: formData.telefoonnummer,
        straatnaam: formData.straatnaam,
        huisnummer: formData.huisnummer,
        toevoeging: formData.toevoeging,
        postcode: formData.postcode,
        plaatsnaam: formData.plaatsnaam,
        gemeente: formData.gemeente,
        functie: formData.functie,
        mc1: currentMC1,
        mc2: currentMC2,
        mc3: currentMC3,
        notities: notitiesText,
        karakteristieken: selectedKarakteristieken,
        meldingslogging: loggingEntries.map(entry => `${entry.timestamp} ${entry.message}`).join('\n'),
        prioriteit: priorityValue
      };

      // Update state variables to match what we just saved
      setSelectedMC1(currentMC1);
      setSelectedMC2(currentMC2);
      setSelectedMC3(currentMC3);

      // Update incident in list
      setIncidents(prev => prev.map(inc => 
        inc.id === selectedIncident.id ? updatedIncident : inc
      ));

      // Update selected incident
      setSelectedIncident(updatedIncident);


    }
  };

  // Handle "Uitgifte" button click
  const handleUitgifte = () => {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newIncidentNumber = getNextIncidentNumber();

    // Determine MC code based on selected classification
    let mcCode = "";
    if (selectedMC3 && selectedMC2 && selectedMC1) {
      const matchingClassification = lmcClassifications.find(c => 
        c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && c.MC3 === selectedMC3
      );
      if (matchingClassification) {
        mcCode = matchingClassification.Code.toUpperCase();
      }
    } else if (selectedMC2 && selectedMC1) {
      const matchingClassification = lmcClassifications.find(c => 
        c.MC1 === selectedMC1 && c.MC2 === selectedMC2
      );
      if (matchingClassification) {
        mcCode = matchingClassification.Code.toUpperCase();
      }
    }

    // Create location string
    const location = formData.straatnaam && formData.huisnummer 
      ? `${formData.straatnaam.toUpperCase()} ${formData.huisnummer}${formData.toevoeging ? formData.toevoeging : ''}`
      : formData.straatnaam?.toUpperCase() || "";

    const newIncident: GmsIncident = {
      id: Date.now(),
      nr: newIncidentNumber,
      prio: priorityValue,
      tijd: timeString,
      mc: mcCode,
      locatie: location,
      plaats: formData.plaatsnaam?.substring(0, 3).toUpperCase() || "",
      roepnr: formData.roepnummer || "",
      positie: "",
      melderNaam: formData.melderNaam,
      melderAdres: formData.melderAdres,  
      telefoonnummer: formData.telefoonnummer,
      straatnaam: formData.straatnaam,
      huisnummer: formData.huisnummer,
      toevoeging: formData.toevoeging,
      postcode: formData.postcode,
      plaatsnaam: formData.plaatsnaam,
      gemeente: formData.gemeente,
      functie: formData.functie,
      mc1: selectedMC1,
      mc2: selectedMC2,
      mc3: selectedMC3,
      notities: notitiesText,
      karakteristieken: selectedKarakteristieken,
      status: "Openstaand",
      meldingslogging: loggingEntries.map(entry => `${entry.timestamp} ${entry.message}`).join('\n'),
      tijdstip: new Date().toISOString(),
      prioriteit: priorityValue
    };

    // Add to incidents list (at the beginning for newest first)
    setIncidents(prev => [newIncident, ...prev]);

    // Clear selected incident so "Uitgifte" button stays for next incident
    setSelectedIncident(null);

    // Only clear classifications and notes, keep address data intact
    setSelectedMC1("");
    setSelectedMC2("");
    setSelectedMC3("");
    setPriorityValue(2);
    setNotitiesText("");

    // Clear classification dropdowns only
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (mc1Select) mc1Select.value = "";
    if (mc2Select) mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
    if (mc3Select) mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
  };

  // Handle "Archiveer" button click
  const handleArchiveer = () => {
    if (selectedIncident) {
      const updatedIncident = {
        ...selectedIncident,
        status: "Gearchiveerd"
      };

      // Update incident in list
      setIncidents(prev => prev.map(inc => 
        inc.id === selectedIncident.id ? updatedIncident : inc
      ));

      // Remove from openstaande incidenten by filtering out archived ones
      setIncidents(prev => prev.filter(inc => inc.id !== selectedIncident.id));



      // Select first remaining incident or clear selection
      const remainingIncidents = incidents.filter(inc => inc.id !== selectedIncident.id);
      setSelectedIncident(remainingIncidents.length > 0 ? remainingIncidents[0] : null);
    }
  };

  // Handle "Nieuw" button click - Complete reset for new incident
  const handleNieuw = () => {
    // Generate a unique session ID for this new incident to prevent data mixing
    const newSessionId = `new_incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🆕 Starting completely new incident with session ID: ${newSessionId}`);

    // STEP 1: Immediately clear selected incident to break all connections
    setSelectedIncident(null);

    // STEP 2: Complete form data reset with empty object
    const cleanFormData = {
      melderNaam: "",
      telefoonnummer: "",
      melderAdres: "",
      huisnummer: "",
      toevoeging: "",
      gemeente: "",
      straatnaam: "",
      postcode: "",
      plaatsnaam: "",
      functie: "",
      roepnummer: ""
    };
    setFormData(cleanFormData);

    // STEP 3: Reset ALL classification states immediately
    setSelectedMC1("");
    setSelectedMC2("");
    setSelectedMC3("");
    setPriorityValue(2);
    setNotitiesText("");
    setSelectedKarakteristieken([]);

    // STEP 4: Clear kladblok and logging IMMEDIATELY - NO ADDING ENTRIES
    setKladblokText(""); // Keep kladblok completely empty
    setLoggingEntries([]); // Complete immediate reset - no entries at all

    // STEP 5: Force DOM elements to reset without delays
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    // Clear all dropdowns immediately and remove any existing event listeners
    if (mc1Select) {
      mc1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
      mc1Select.value = "";
      // Clear any bound data or state
      mc1Select.removeAttribute('data-current-value');
    }
    if (mc2Select) {
      mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
      mc2Select.value = "";
      mc2Select.removeAttribute('data-current-value');
    }
    if (mc3Select) {
      mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
      mc3Select.value = "";
      mc3Select.removeAttribute('data-current-value');
    }

    // STEP 6: Force complete reinitialization of dropdown system
    if (lmcClassifications.length > 0) {
      // Immediate reinitialization without delay
      setTimeout(() => {
        console.log(`🔄 Reinitializing dropdowns for new incident ${newSessionId.slice(-8)}`);
        initializeLMCDropdowns();
      }, 10);
    }

    // STEP 7: Reset activeLoggingTab to ensure clean state
    setActiveLoggingTab("hist-meldblok");

    // NO STEP 8 - Keep logging completely empty for new incident
    // The user can start fresh without any pre-filled logging entries

    console.log(`✅ New incident reset complete - session: ${newSessionId} - completely clean state`);
  };

  const addLoggingEntry = (message: string) => {
    const now = new Date();
    const dateStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = now.getFullYear();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const timestamp = `${dateStr}:${monthStr} ${yearStr} ${timeStr} OC RTD`;

    const newEntry = {
      id: Date.now(),
      timestamp,
      message: message.trim()
    };

    setLoggingEntries(prev => [newEntry, ...prev]);
  };

  // Handle Werkplek popup window
  const handleWerkplekClick = () => {
    const windowFeatures = "width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no";
    const popupWindow = window.open("", "GMS2_Werkplek", windowFeatures);

    if (popupWindow) {
      // Create a complete HTML document for the popup
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>GMS2 Werkplek</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Arial, sans-serif;
              background: #f5f5f5;
            }
            .popup-header {
              background: #333;
              color: white;
              padding: 10px;
              font-weight: bold;
            }
            .popup-content {
              padding: 20px;
            }
            .data-sync-indicator {
              background: #4CAF50;
              color: white;
              padding: 5px 10px;
              border-radius: 3px;
              font-size: 12px;
              margin-bottom: 10px;
            }
            .incident-summary {
              background: white;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 15px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .current-incident {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .incident-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 10px;
            }
            .detail-item {
              padding: 8px;
              background: #f9f9f9;
              border-radius: 3px;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="popup-header">
            GMS2 Werkplek - Data Verbonden
          </div>
          <div class="popup-content">
            <div class="data-sync-indicator">
              🔗 Live data-verbinding actief
            </div>
            <div id="incident-data" class="incident-summary">
              <div class="current-incident">Laden van incident data...</div>
            </div>
          </div>

          <script>
            // Live data synchronization
            function updateIncidentData() {
              const mainWindow = window.opener;
              if (mainWindow && !mainWindow.closed) {
                try {
                  // Access the React state from the main window
                  const selectedIncident = mainWindow.gms2SelectedIncident;
                  const incidents = mainWindow.gms2Incidents || [];

                  const incidentDataDiv = document.getElementById('incident-data');

                  if (selectedIncident) {
                    incidentDataDiv.innerHTML = \`
                      <div class="current-incident">
                        Actief Incident: #\${selectedIncident.nr || 'Nieuw'}
                      </div>
                      <div class="incident-details">
                        <div class="detail-item">
                          <div class="detail-label">Locatie:</div>
                          <div>\${selectedIncident.locatie || 'Niet ingevuld'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Classificatie:</div>
                          <div>\${selectedIncident.mc3 || selectedIncident.mc2 || selectedIncident.mc1 || selectedIncident.mc || 'Niet geclassificeerd'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Prioriteit:</div>
                          <div>P\${selectedIncident.prio || 'Onbekend'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Tijd:</div>
                          <div>\${selectedIncident.tijd || 'Niet ingevuld'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Plaats:</div>
                          <div>\${selectedIncident.plaats || 'Niet ingevuld'}</div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-label">Status:</div>
                          <div>\${selectedIncident.status || 'Openstaand'}</div>
                        </div>
                      </div>
                      <div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 3px;">
                        <strong>Totaal incidenten:</strong> \${incidents.length}
                      </div>
                    \`;
                  } else {
                    incidentDataDiv.innerHTML = \`
                      <div class="current-incident">
                        Geen incident geselecteerd
                      </div>
                      <div style="margin-top: 10px; color: #666;">
                        Selecteer een incident in het hoofdscherm om details te zien
                      </div>
                      <div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 3px;">
                        <strong>Totaal incidenten:</strong> \${incidents.length}
                      </div>
                    \`;
                  }
                } catch (error) {
                  console.error('Error syncing data:', error);
                }
              } else {
                document.getElementById('incident-data').innerHTML = \`
                  <div class="current-incident" style="color: red;">
                    ❌ Verbinding met hoofdscherm verloren
                  </div>
                  <div style="margin-top: 10px; color: #666;">
                    Het hoofdscherm is gesloten of niet meer beschikbaar
                  </div>
                \`;
              }
            }

            // Update every 2 seconds
            setInterval(updateIncidentData, 2000);

            // Initial update
            updateIncidentData();

            // Handle window close
            window.addEventListener('beforeunload', function() {
              if (window.opener && !window.opener.closed) {
                console.log('Werkplek window closing');
              }
            });
          </script>
        </body>
        </html>
      `;

      popupWindow.document.write(htmlContent);
      popupWindow.document.close();

      // Store references for data sync
      popupWindow.focus();

      console.log('🪟 Werkplek window opened with live data connection');
    } else {
      console.error('❌ Failed to open popup window - check popup blocker');
      alert('Kon het Werkplek venster niet openen. Controleer de popup blocker instellingen.');
    }
  };

  // Expose state to popup windows for data sync
  useEffect(() => {
    (window as any).gms2SelectedIncident = selectedIncident;
    (window as any).gms2Incidents = incidents;
  }, [selectedIncident, incidents]);

  // Enhanced shortcode mapping with official LMC codes
  const shortcodeMappings = {
    // Officiële LMC codes
    '-vkweoi': { MC1: 'Verkeer', MC2: 'Wegvervoer', MC3: 'Onder invloed', code: 'vkweoi' },
    '-ogovls': { MC1: 'Ongeval', MC2: 'Overig', MC3: 'Letsel', code: 'ogovls' },
    '-ogwels': { MC1: 'Ongeval', MC2: 'Wegvervoer', MC3: 'Letsel', code: 'ogwels' },
    '-ogspls': { MC1: 'Ongeval', MC2: 'Spoorvervoer', MC3: 'Letsel', code: 'ogspls' },
    '-ogwtls': { MC1: 'Ongeval', MC2: 'Water', MC3: 'Letsel', code: 'ogwtls' },

    // Geweld & Veiligheid codes
    '-steekpartij': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Steekpartij', code: 'vogwst' },
    '-vogwst': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Steekpartij', code: 'vogwst' },
    '-schietpartij': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Schietpartij', code: 'vogwsi' },
    '-vogwsi': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Schietpartij', code: 'vogwsi' },
    '-mishandeling': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Mishandeling', code: 'vogwmh' },
    '-vechtpartij': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Vechtpartij', code: 'vogwve' },
    '-bedreiging': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Bedreiging', code: 'vogwbd' },
    '-gijzeling': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Gijzeling', code: 'vogwgz' },
    '-ontvoering': { MC1: 'Veiligheid en openbare orde', MC2: 'Geweld', MC3: 'Ontvoering', code: 'vogwon' },

    // Brand codes
    '-brgb01': { MC1: 'Brand', MC2: 'Gebouw', MC3: '01 Woning/Woongebouw', code: 'brgb01' },
    '-brwe': { MC1: 'Brand', MC2: 'Wegvervoer', MC3: '', code: 'brwe' },
    '-brsp': { MC1: 'Brand', MC2: 'Spoorvervoer', MC3: '', code: 'brsp' },
    '-brsh': { MC1: 'Brand', MC2: 'Scheepvaart', MC3: '', code: 'brsh' },
    '-brnt': { MC1: 'Brand', MC2: 'Natuur', MC3: '', code: 'brnt' },
    '-brbt': { MC1: 'Brand', MC2: 'Buiten', MC3: '', code: 'brbt' },

    // Bezitsaantasting codes  
    '-bzibwn': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Woning', code: 'bzibwn' },
    '-bzibbi': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Bedrijf/Instelling', code: 'bzibbi' },
    '-bzibvo': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Voertuig', code: 'bzibvo' },
    '-bzdsbr': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Beroving', code: 'bzdsbr' },
    '-bzdsvo': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Voertuig', code: 'bzdsvo' },
    '-bzdswk': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Winkeldiefstal', code: 'bzdswk' },
    '-bzovbi': { MC1: 'Bezitsaantasting', MC2: 'Overval', MC3: 'Bedrijf/Instelling', code: 'bzovbi' },
    '-bzovwn': { MC1: 'Bezitsaantasting', MC2: 'Overval', MC3: 'Woning', code: 'bzovwn' },

    // Verkeer codes
    '-vkweav': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Achtervolging', code: 'vkweav' },
    '-vkwesr': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Spookrijder', code: 'vkwesr' },
    '-vkweps': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Persoon o/b rijbaan', code: 'vkweps' },
    '-vkwest': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Verkeersstremming', code: 'vkwest' },

    // Gezondheid codes
    '-gzra': { MC1: 'Gezondheid', MC2: 'Reanimatie', MC3: '', code: 'gzra' },
    '-gzpz': { MC1: 'Gezondheid', MC2: 'Poging zelfdoding', MC3: '', code: 'gzpz' },
    '-gzsp': { MC1: 'Gezondheid', MC2: 'Suicidaal persoon', MC3: '', code: 'gzsp' },
    '-gzoz': { MC1: 'Gezondheid', MC2: 'Onwel/Ziekte', MC3: '', code: 'gzoz' },

    // Alarm codes
    '-alraib': { MC1: 'Alarm', MC2: 'RAC alarm', MC3: 'Inbraakalarm', code: 'alraib' },
    '-alraov': { MC1: 'Alarm', MC2: 'RAC alarm', MC3: 'Overvalalarm', code: 'alraov' },
    '-alabab': { MC1: 'Alarm', MC2: 'Autom. brand', MC3: 'Autom. brand OMS', code: 'alabab' },

    // Dienstverlening
    '-dvpoav': { MC1: 'Dienstverlening', MC2: 'Politie', MC3: 'Aantreffen van', code: 'dvpoav' },
    '-dvpovm': { MC1: 'Dienstverlening', MC2: 'Politie', MC3: 'Vermissing', code: 'dvpovm' },

    // Leefmilieu
    '-lmol': { MC1: 'Leefmilieu', MC2: 'Overlast van/door', MC3: '', code: 'lmol' },
    '-lmolje': { MC1: 'Leefmilieu', MC2: 'Overlast van/door', MC3: 'Jeugd', code: 'lmolje' },
    '-lmolps': { MC1: 'Leefmilieu', MC2: 'Overlast van/door', MC3: 'Persoon', code: 'lmolps' },

    // Gemakkelijke synoniemen/alternatieve namen
    '-inbraak': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Woning', code: 'bzibwn' },
    '-woningbrand': { MC1: 'Brand', MC2: 'Gebouw', MC3: '01 Woning/Woongebouw', code: 'brgb01' },
    '-autobrand': { MC1: 'Brand', MC2: 'Wegvervoer', MC3: '', code: 'brwe' },
    '-reanimatie': { MC1: 'Gezondheid', MC2: 'Reanimatie', MC3: '', code: 'gzra' },
    '-ambulance': { MC1: 'Gezondheid', MC2: 'Onwel/Ziekte', MC3: '', code: 'gzoz' },
    '-overval': { MC1: 'Bezitsaantasting', MC2: 'Overval', MC3: 'Bedrijf/Instelling', code: 'bzovbi' },
    '-autodiefstal': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Voertuig', code: 'bzdsvo' },
    '-spookrijder': { MC1: 'Verkeer', MC2: 'Wegverkeer', MC3: 'Spookrijder', code: 'vkwesr' }
  };

  // BAG API functions
  const searchBAGAddress = async (query: string) => {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`/api/bag/search?q=${encodedQuery}&limit=20`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features.map((feature: any) => ({
          straatnaam: feature.properties.straatnaam || '',
          huisnummer: feature.properties.huisnummer || '',
          huisletter: feature.properties.huisletter || '',
          huisnummertoevoeging: feature.properties.huisnummertoevoeging || '',
          postcode: feature.properties.postcode || '',
          plaatsnaam: feature.properties.plaatsnaam || '',
          gemeente: feature.properties.gemeentenaam || '',
          volledigAdres: `${feature.properties.straatnaam || ''} ${feature.properties.huisnummer || ''}${feature.properties.huisletter || ''}${feature.properties.huisnummertoevoeging ? '-' + feature.properties.huisnummertoevoeging : ''}, ${feature.properties.postcode || ''} ${feature.properties.plaatsnaam || ''}`
        }));
      }
      return [];
    } catch (error) {
      console.error('BAG API error:', error);
      return [];
    }
  };

  // Enhanced BAG search for specific address parts
  const searchBAGSpecific = async (stad: string, straat: string, huisnummer: string = '') => {
    try {
      let query: string;
      let encodedQuery: string;
      let response: Response;
      let data: any;

      if (huisnummer) {
        // Try exact match with house number first
        query = `${straat} ${huisnummer} ${stad}`;
        encodedQuery = encodeURIComponent(query);
        response = await fetch(`/api/bag/search?q=${encodedQuery}&limit=5`);
        data = await response.json();

        if (data.features && data.features.length > 0) {
          return data.features.map((feature: any) => ({
            straatnaam: feature.properties.straatnaam || '',
            huisnummer: feature.properties.huisnummer || '',
            huisletter: feature.properties.huisletter || '',
            huisnummertoevoeging: feature.properties.huisnummertoevoeging || '',
            postcode: feature.properties.postcode || '',
            plaatsnaam: feature.properties.plaatsnaam || '',
            gemeente: feature.properties.gemeentenaam || '',
            volledigAdres: `${feature.properties.straatnaam || ''} ${feature.properties.huisnummer || ''}${feature.properties.huisletter || ''}${feature.properties.huisnummertoevoeging ? '-' + feature.properties.huisnummertoevoeging : ''}, ${feature.properties.postcode || ''} ${feature.properties.plaatsnaam || ''}`
          }));
        }
      }

      // Try broader search (street + city, with or without house number filter)
      query = `${straat} ${stad}`;
      encodedQuery = encodeURIComponent(query);
      response = await fetch(`/api/bag/search?q=${encodedQuery}&limit=10`);
      data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features
          .filter((feature: any) => !huisnummer || feature.properties.huisnummer == huisnummer)
          .map((feature: any) => ({
            straatnaam: feature.properties.straatnaam || '',
            huisnummer: feature.properties.huisnummer || '',
            huisletter: feature.properties.huisletter || '',
            huisnummertoevoeging: feature.properties.huisnummertoevoeging || '',
            postcode: feature.properties.postcode || '',
            plaatsnaam: feature.properties.plaatsnaam || '',
            gemeente: feature.properties.gemeentenaam || '',
            volledigAdres: `${feature.properties.straatnaam || ''} ${feature.properties.huisnummer || ''}${feature.properties.huisletter || ''}${feature.properties.huisnummertoevoeging ? '-' + feature.properties.huisnummertoevoeging : ''}, ${feature.properties.postcode || ''} ${feature.properties.plaatsnaam || ''}`
          }));
      }

      return [];
    } catch (error) {
      console.error('BAG API Error:', error);
      return [];
    }
  };

  const fillAddressFromBAG = async (stad: string, straatnaam: string, huisnummer: string) => {
    console.log(`🔍 Zoeken naar adres: ${straatnaam} ${huisnummer}, ${stad}`);

    const results = await searchBAGSpecific(stad, straatnaam, huisnummer);

    if (results.length > 0) {
      const bestMatch = results[0];

      // Combine number and additions properly
      const fullHuisnummer = `${bestMatch.huisnummer}${bestMatch.huisletter || ''}${bestMatch.huisnummertoevoeging ? '-' + bestMatch.huisnummertoevoeging : ''}`;

      const completeAddressData = {
        straatnaam: bestMatch.straatnaam,
        huisnummer: fullHuisnummer,
        postcode: bestMatch.postcode,
        plaatsnaam: bestMatch.plaatsnaam,
        gemeente: bestMatch.gemeente
      };

      console.log(`✅ Adres gevonden via BAG API:`, completeAddressData);

      setFormData(prev => ({
        ...prev,
        ...completeAddressData
      }));

      if (selectedIncident) {
        setSelectedIncident({
          ...selectedIncident,
          ...completeAddressData
        });
      }

      addLoggingEntry(`📍 Adres automatisch aangevuld via BAG API: ${bestMatch.volledigAdres}`);

      // Switch to Locatietreffers tab and clear search
      setActiveLoggingTab('locatietreffers');
      setBagSearchQuery("");
      setBagSearchResults([]);

      return completeAddressData;
    } else {
      console.log(`❌ Geen adres gevonden voor: ${straatnaam} ${huisnummer}, ${stad}`);
      addLoggingEntry(`❌ Geen adres gevonden in BAG API voor: ${straatnaam} ${huisnummer}, ${stad}`);
      return null;
    }
  };

  // Function to process karakteristieken from kladblok text
  const processKarakteristieken = (text: string) => {
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1].trim();

    console.log(`🏷️ Processing karakteristieken for: "${lastLine}"`);

    // Check if karakteristieken database is loaded
    if (!Array.isArray(karakteristiekenDatabase) || karakteristiekenDatabase.length === 0) {
      console.warn('⚠️ Karakteristieken database not loaded yet');
      return false;
    }

    // Check if line contains karakteristieken codes (starts with -)
    if (!lastLine.startsWith('-')) {
      return false;
    }

    // Improved parsing - handle "-code value" patterns
    const codePattern = /-(\w+)(?:\s+(.+?))?(?=\s+-|\s*$)/g;
    let processed = false;
    let match;

    while ((match = codePattern.exec(lastLine)) !== null) {
      const code = match[1];
      const value = match[2] ? match[2].trim() : '';

      console.log(`🔍 Parsing karakteristiek: code="${code}", value="${value}"`);
      processed = processKarakteristiekCode(code, value) || processed;
    }

    // Fallback: if no matches with regex, try simple space-based parsing
    if (!processed) {
      const parts = lastLine.split(/\s+/).map(part => part.trim()).filter(part => part.length > 0);
      let currentCode = '';
      let currentValue = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part.startsWith('-')) {
          // Process previous code if exists
          if (currentCode) {
            processed = processKarakteristiekCode(currentCode, currentValue) || processed;
          }

          // Start new code
          currentCode = part.substring(1); // Remove the -
          currentValue = '';
        } else if (currentCode) {
          // Add to current value
          currentValue = currentValue ? `${currentValue} ${part}` : part;
        }
      }

      // Process the last code
      if (currentCode) {
        processed = processKarakteristiekCode(currentCode, currentValue) || processed;
      }
    }

    return processed;
  };

  // Check for OVDP-related codes
    console.log("🔍 Found OVDP-related codes:", karakteristiekenDatabase.filter(k => 
      k.ktCode?.toLowerCase().includes('ovdp') || 
      k.ktNaam?.toLowerCase().includes('overval') ||
      k.ktNaam?.toLowerCase().includes('diefstal')
    ).slice(0, 10));

    // Common abbreviations mapping for better shortcode detection
    const commonAbbreviations: Record<string, string[]> = {
      'pol': ['politie', 'police'],
      'brw': ['brandweer', 'brand'],
      'ambu': ['ambulance', 'ambu'],
      'gew': ['gewonden', 'gewond'],
      'dd': ['doden', 'dood'],
      'pers': ['personen', 'persoon'],
      'ovdp': ['overval', 'diefstal', 'poging'],
      'betr': ['betreft'],
      'opgelp': ['opgelost', 'oplosing'],
      'vtgs': ['vracht', 'tank', 'gevaarlijke stof'],
      'ddrs': ['daders', 'dader'],
      'nzrz': ['niet zelfredding', 'zelfreddend'],
      'iobj': ['in object', 'object'],
      'tewt': ['te water', 'water'],
      'verm': ['vermist', 'vermissing'],
      'aanh': ['aanhouding', 'aanhouden']
    };

    function processKarakteristiekCode(code: string, value: string) {
    console.log(`🔍 Looking for karakteristiek with code: "${code}", value: "${value}"`);

    const fullInput = `${code} ${value}`.toLowerCase().trim();
    console.log(`🔍 Full input: "${fullInput}"`);

    let foundKarakteristiek = null;
    let finalValue = value;

    // Step 1: Try parser-based exact matching first (highest priority)
    foundKarakteristiek = karakteristiekenDatabase.find(k => {
      if (!k.ktParser) return false;
      const parser = k.ktParser.toLowerCase().trim();
      const searchInput = `-${fullInput}`.toLowerCase().trim();
      console.log(`🔍 Comparing parser "${parser}" with input "${searchInput}"`);
      return parser === searchInput;
    });

    if (foundKarakteristiek) {
      console.log(`✅ Found exact parser match: "${foundKarakteristiek.ktNaam}" via parser "${foundKarakteristiek.ktParser}"`);
      finalValue = foundKarakteristiek.ktWaarde || value;
    }

    // Step 1b: If no exact match, try partial parser matching
    if (!foundKarakteristiek) {
      const partialMatches = karakteristiekenDatabase.filter(k => {
        if (!k.ktParser) return false;
        const parser = k.ktParser.toLowerCase().trim();
        const searchInput = `-${fullInput}`.toLowerCase().trim();

        // Check if the search input matches the parser pattern closely
        const parserWords = parser.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
        const inputWords = searchInput.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);

        // Count matching words
        let matchCount = 0;
        for (const inputWord of inputWords) {
          for (const parserWord of parserWords) {
            if (inputWord === parserWord || inputWord.includes(parserWord) || parserWord.includes(inputWord)) {
              matchCount++;
              break;
            }
          }
        }

        // Require at least 80% word match
        const matchRatio = matchCount / Math.max(inputWords.length, parserWords.length);
        return matchRatio >= 0.8;
      });

      if (partialMatches.length > 0) {
        // Sort by best match (most matching words)
        partialMatches.sort((a, b) => {
          const aParser = a.ktParser.toLowerCase();
          const bParser = b.ktParser.toLowerCase();
          const searchInput = `-${fullInput}`.toLowerCase();

          const aScore = aParser.split(' ').filter(word => searchInput.includes(word)).length;
          const bScore = bParser.split(' ').filter(word => searchInput.includes(word)).length;

          return bScore - aScore;
        });

        foundKarakteristiek = partialMatches[0];
        console.log(`✅ Found partial parser match: "${foundKarakteristiek.ktNaam}" via parser "${foundKarakteristiek.ktParser}"`);
        finalValue = foundKarakteristiek.ktWaarde || value;
      }
    }

    // Step 2: Direct code match
    if (!foundKarakteristiek) {
      foundKarakteristiek = karakteristiekenDatabase.find(k =>
        k.ktCode?.toLowerCase() === code.toLowerCase()
      );
      if (foundKarakteristiek) {
        console.log(`✅ Found direct code match: "${foundKarakteristiek.ktNaam}" for code "${code}"`);
      }
    }

    // Step 3: Direct name match
    if (!foundKarakteristiek) {
      foundKarakteristiek = karakteristiekenDatabase.find(k =>
        k.ktNaam?.toLowerCase() === code.toLowerCase()
      );
      if (foundKarakteristiek) {
        console.log(`✅ Found direct name match: "${foundKarakteristiek.ktNaam}" for name "${code}"`);
      }
    }

    // Step 4: Handle "aantal [type] [number]" patterns specifically
    if (!foundKarakteristiek && code === 'aantal') {
      const aantalMatch = fullInput.match(/aantal\s+(\w+)\s+(\d+)/);
      if (aantalMatch) {
        const [, type, number] = aantalMatch;
        finalValue = number;

        const typeToCodeMap = {
          'verdachten': 'ddrs', 'daders': 'ddrs', 'dader': 'ddrs',
          'doden': 'dd', 'dood': 'dd',
          'gewonden': 'gew', 'gewond': 'gew',
          'aanhoudingen': 'aanh', 'aanhouding': 'aanh',
          'personen': 'pers', 'persoon': 'pers',
          'vermisten': 'verm', 'vermist': 'verm',
          'water': 'tewt', 'zelfredz': 'nzrz', 'object': 'iobj', 'dieren': 'dier'
        };

        const targetCode = typeToCodeMap[type];
        if (targetCode) {
          foundKarakteristiek = karakteristiekenDatabase.find(k => 
            k.ktCode && k.ktCode.toLowerCase() === targetCode.toLowerCase()
          );
          if (foundKarakteristiek) {
            console.log(`✅ Found "aantal [type] [number]" match: "${type}" -> "${targetCode}" with value "${finalValue}"`);
          }
        }
      }

      // Handle "aantal [type]" without number
      if (!foundKarakteristiek) {
        const aantalSimpleMatch = fullInput.match(/aantal\s+(\w+)$/);
        if (aantalSimpleMatch) {
          const [, type] = aantalSimpleMatch;
          finalValue = '1';

          const typeToCodeMap = {
            'verdachten': 'ddrs', 'daders': 'ddrs', 'dader': 'ddrs',
            'doden': 'dd', 'dood': 'dd',
            'gewonden': 'gew', 'gewond': 'gew',
            'aanhoudingen': 'aanh', 'aanhouding': 'aanh',
            'personen': 'pers', 'persoon': 'pers',
            'vermisten': 'verm', 'vermist': 'verm'
          };

          const targetCode = typeToCodeMap[type];
          if (targetCode) {
            foundKarakteristiek = karakteristiekenDatabase.find(k => 
              k.ktCode && k.ktCode.toLowerCase() === targetCode.toLowerCase()
            );
            if (foundKarakteristiek) {
              console.log(`✅ Found "aantal [type]" match: "${type}" -> "${targetCode}" with default value "${finalValue}"`);
            }
          }
        }
      }
    }

    // Step 5: Handle special "inzet pol [specific]" patterns
    if (!foundKarakteristiek && code === 'inzet' && value.startsWith('pol ')) {
      const specificPart = value.substring(4);
      foundKarakteristiek = karakteristiekenDatabase.find(k => 
        k.ktCode && k.ktCode.toLowerCase() === 'ipa'
      );
      if (foundKarakteristiek) {
        finalValue = specificPart;
        console.log(`✅ Found "inzet pol [specific]" match: "${specificPart}" for Inzet Pol algemeen`);
      }
    }

    // Step 6: Enhanced fuzzy matching by name content with improved precision
    if (!foundKarakteristiek) {
      const searchWords = fullInput.toLowerCase().split(' ').filter(w => w.length > 2);

      const fuzzyMatches = karakteristiekenDatabase.filter(k => {
        const name = k.ktNaam?.toLowerCase() || '';
        const ktCode = k.ktCode?.toLowerCase() || '';

        // Check abbreviation mappings first
        const codeAbbrevs = commonAbbreviations[ktCode] || [];
        for (const abbrev of codeAbbrevs) {
          if (fullInput.toLowerCase().includes(abbrev.toLowerCase()) || abbrev.toLowerCase().includes(fullInput.toLowerCase())) {
            return true;
          }
        }

        // Calculate word-based similarity score with higher precision
        let exactWordMatches = 0;
        let partialWordMatches = 0;
        const nameWords = name.split(' ').filter(w => w.length > 2);

        for (const searchWord of searchWords) {
          for (const nameWord of nameWords) {
            if (searchWord === nameWord) {
              exactWordMatches += 3; // Higher weight for exact matches
            } else if (searchWord.includes(nameWord) || nameWord.includes(searchWord)) {
              partialWordMatches += 1;
            }
          }
        }

        const totalScore = exactWordMatches + partialWordMatches;

        // Require higher threshold and prioritize exact word matches
        return totalScore >= 4 && exactWordMatches >= 2;
      });

      if (fuzzyMatches.length > 0) {
        // Sort by relevance: prioritize exact word matches and shorter names
        fuzzyMatches.sort((a, b) => {
          const aName = a.ktNaam?.toLowerCase() || '';
          const bName = b.ktNaam?.toLowerCase() || '';
          const searchLower = fullInput.toLowerCase();

          // Calculate exact word match scores
          const aWords = aName.split(' ').filter(w => w.length > 2);
          const bWords = bName.split(' ').filter(w => w.length > 2);

          let aExactMatches = 0;
          let bExactMatches = 0;

          for (const searchWord of searchWords) {
            if (aWords.includes(searchWord)) aExactMatches++;
            if (bWords.includes(searchWord)) bExactMatches++;
          }

          // First priority: more exact word matches
          if (aExactMatches !== bExactMatches) {
            return bExactMatches - aExactMatches;
          }

          // Second priority: shorter names (more specific)
          return aName.length - bName.length;
        });

        foundKarakteristiek = fuzzyMatches[0];
        console.log(`✅ Found precise fuzzy match: "${foundKarakteristiek.ktNaam}" for input "${fullInput}"`);
      }
    }

    if (!foundKarakteristiek) {
      console.log(`❌ No karakteristiek found for code: ${code}`);
      return false;
    }

    console.log(`✅ Found karakteristiek: ${foundKarakteristiek.ktNaam} for code: ${code} (type: ${foundKarakteristiek.ktType})`);

    // Determine final value based on type
    if (foundKarakteristiek.ktType === 'Vrije tekst' || foundKarakteristiek.ktType === 'Getal') {
      if (!finalValue) {
        finalValue = value || '';
      }
      console.log(`📝 Using determined value for ${foundKarakteristiek.ktType}: "${finalValue}"`);
    } else if (foundKarakteristiek.ktType === 'Ja/Nee') {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || 'Ja';
    } else if (foundKarakteristiek.ktType === 'Enkelvoudige opsom') {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || '';
    } else if (foundKarakteristiek.ktType === 'Meervoudige opsom') {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || '';
    } else {
      finalValue = finalValue || value || foundKarakteristiek.ktWaarde || '';
    }

    // Check if this exact karakteristiek already exists
    const existingIndex = selectedKarakteristieken.findIndex(k => 
      k.ktCode === foundKarakteristiek.ktCode && k.ktNaam === foundKarakteristiek.ktNaam
    );

    if (existingIndex !== -1) {
      // Update existing karakteristiek 
      setSelectedKarakteristieken(prev => {
        const updated = [...prev];
        const existing = updated[existingIndex];

        if (foundKarakteristiek.ktType === 'Meervoudige opsom' && 
            finalValue && existing.waarde && !existing.waarde.includes(finalValue)) {
          updated[existingIndex] = {
            ...existing,
            waarde: `${existing.waarde}, ${finalValue}`
          };
          console.log(`📝 Appended value to existing karakteristiek: ${existing.waarde} + ${finalValue}`);
        } else if (finalValue) {
          updated[existingIndex] = {
            ...existing,
            waarde: finalValue
          };
          console.log(`📝 Updated existing karakteristiek with new value: ${finalValue}`);
        }

        return updated;
      });
    } else {
      // Add new karakteristiek
      const newKarakteristiek = {
        id: Date.now() + Math.random(),
        ktNaam: foundKarakteristiek.ktNaam,
        ktType: foundKarakteristiek.ktType,
        waarde: finalValue,
        ktCode: foundKarakteristiek.ktCode
      };

      console.log(`📝 Added new karakteristiek:`, newKarakteristiek);
      setSelectedKarakteristieken(prev => [...prev, newKarakteristiek]);
    }

    return true;
  };

  // Enhanced function to detect and apply shortcodes for classification, address, and caller info
  const detectAndApplyShortcodes = async (text: string) => {
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1].trim();

    const incidentContext = selectedIncident ? `incident ${selectedIncident.nr}` : 'NIEUWE MELDING';
    console.log(`🔍 Shortcode detection for: "${lastLine}" | Context: ${incidentContext}`);

    // Address shortcode: =[stad]/[straatnaam] [huisnummer]
    if (lastLine.startsWith('=')) {
      const addressMatch = lastLine.match(/^=([^\/]+)\/(.+?)\s+(\d+)$/i);
      if (addressMatch) {
        const [, stad, straatnaam, huisnummer] = addressMatch;

        console.log(`📍 Address shortcode detected: ${stad} / ${straatnaam} ${huisnummer}`);

        // Switch to Locatietreffers tab immediately
        setActiveLoggingTab('locatietreffers');

        // Fill address data from BAG API
        await fillAddressFromBAG(stad, straatnaam, huisnummer);

        return true;
      }
    }

    // Caller info shortcode: m/[meldernaam];[telefoonnummer]
    if (lastLine.startsWith('m/')) {
      const callerMatch = lastLine.match(/^m\/([^;]+);(.+)$/i);
      if (callerMatch) {
        const [, meldernaam, telefoonnummer] = callerMatch;

        console.log(`👤 Caller shortcode detected: ${meldernaam} / ${telefoonnummer}`);

        // ALWAYS update form data regardless of incident selection
        const newCallerData = {
          melderNaam: meldernaam.trim(),
          telefoonnummer: telefoonnummer.trim()
        };

        setFormData(prev => {
          const updated = {
            ...prev,
            ...newCallerData
          };
          console.log(`👤 Form data updated for ${incidentContext}:`, updated);
          return updated;
        ```javascript
        });

        // Only update selected incident if one exists (editing mode)
        if (selectedIncident) {
          const updatedIncident = {
            ...selectedIncident,
            ...newCallerData
          };
          setSelectedIncident(updatedIncident);
          console.log(`👤 Existing incident updated: ${selectedIncident.nr}`);
        }

        return true;
      }
    }

    // Object shortcode: o/[object/gebouw]
    if (lastLine.startsWith('o/')) {
      const objectMatch = lastLine.match(/^o\/(.+)$/i);
      if (objectMatch) {
        const [, objectGebouw] = objectMatch;

        console.log(`🏢 Object shortcode detected: ${objectGebouw}`);

        // ALWAYS update form data regardless of incident selection
        const newObjectData = {
          functie: objectGebouw.trim()
        };

        setFormData(prev => {
          const updated = {
            ...prev,
            ...newObjectData
          };
          console.log(`🏢 Object field updated for ${incidentContext}:`, updated);
          return updated;
        });

        // Only update selected incident if one exists (editing mode)
        if (selectedIncident) {
          const updatedIncident = {
            ...selectedIncident,
            ...newObjectData
          };
          setSelectedIncident(updatedIncident);
          console.log(`🏢 Existing incident updated: ${selectedIncident.nr}`);
        }

        return true;
      }
    }

    // Classification shortcode: -[code]
    if (lastLine.startsWith('-')) {
      const inputCode = lastLine.split(' ')[0].toLowerCase(); // Normalize to lowercase

      console.log(`🔍 Zoeken naar classificatie shortcode: ${inputCode} voor ${incidentContext}`);

      // Direct shortcode match (case-insensitive)
      let matchedMapping = null;
      for (const [code, mapping] of Object.entries(shortcodeMappings)) {
        if (code.toLowerCase() === inputCode) {
          matchedMapping = mapping;
          break;
        }
      }

      if (matchedMapping) {
        console.log(`✅ Shortcode gevonden voor ${incidentContext}:`, matchedMapping);
        applyClassification(matchedMapping.MC1, matchedMapping.MC2, matchedMapping.MC3, inputCode);
        return true;
      }

      // Try to find by LMC code directly
      const directCodeMatch = lmcClassifications.find(c => 
        c.Code.toLowerCase() === inputCode.substring(1) // Remove the '-' prefix
      );

      if (directCodeMatch) {
        console.log(`✅ Directe LMC code gevonden voor ${incidentContext}:`, directCodeMatch);
        applyClassification(directCodeMatch.MC1, directCodeMatch.MC2, directCodeMatch.MC3, inputCode);
        return true;
      }

      // Fallback: keyword combination detection
      const keywords = lastLine.substring(1).split(' ').filter(word => word.length > 2);
      const possibleMatch = findClassificationByKeywords(keywords);
      if (possibleMatch) {
        console.log(`✅ Keyword match gevonden voor ${incidentContext}:`, possibleMatch);
        applyClassification(possibleMatch.MC1, possibleMatch.MC2, possibleMatch.MC3, lastLine);
        return true;
      }

      // No match found
      console.warn(`❌ Geen match gevonden voor: ${inputCode} in ${incidentContext}`);
      return false;
    }

    return false;
  };

  // Function to find classification by keywords
  const findClassificationByKeywords = (keywords: string[]) => {
    for (const classification of lmcClassifications) {
      const classificationText = `${classification.MC1} ${classification.MC2} ${classification.MC3} ${classification.DEFINITIE}`.toLowerCase();

      let matchCount = 0;
      for (const keyword of keywords) {
        if (classificationText.includes(keyword)) {
          matchCount++;
        }
      }

      // If at least 60% of keywords match, consider it a match
      if (matchCount >= Math.ceil(keywords.length * 0.6)) {
        return classification;
      }
    }

    return null;
  };

  // Enhanced function to apply classification to dropdowns with persistence
  const applyClassification = (mc1: string, mc2: string, mc3: string, detectedCode: string) => {
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (!mc1Select || !mc2Select || !mc3Select || lmcClassifications.length === 0) {
      console.warn('❌ Classification dropdowns not found or no classifications loaded');
      return;
    }

    console.log(`🔧 Applying classification: ${mc1} > ${mc2} > ${mc3} (code: ${detectedCode})`);

    // Step 1: Validate and find exact match in classifications
    const exactMatch = lmcClassifications.find(c => 
      c.MC1 === mc1 && 
      (mc2 === '' || c.MC2 === mc2) && 
      (mc3 === '' || c.MC3 === mc3)
    );

    if (!exactMatch) {
      console.warn(`❌ No exact match found for ${mc1} > ${mc2} > ${mc3}`);
      return;
    }

    // Step 2: Update state immediately to prevent race conditions
    setSelectedMC1(mc1);
    if (mc2) setSelectedMC2(mc2);
    if (mc3) setSelectedMC3(mc3);

    // Step 3: Populate MC1 dropdown and set value
    const mc1Options = Array.from(new Set(
      lmcClassifications.map(c => c.MC1).filter(Boolean)
    )).sort();

    mc1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
    mc1Options.forEach(mc1Option => {
      const option = document.createElement('option');
      option.value = mc1Option;
      option.textContent = mc1Option;
      mc1Select.appendChild(option);
    });
    mc1Select.value = mc1;

    // Step 4: Populate MC2 dropdown if MC1 is set
    mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
    if (mc1) {
      const mc2Options = Array.from(new Set(
        lmcClassifications
          .filter(c => c.MC1 === mc1 && c.MC2)
          .map(c => c.MC2)
      )).sort();

      mc2Options.forEach(mc2Option => {
        const option = document.createElement('option');
        option.value = mc2Option;
        option.textContent = mc2Option;
        mc2Select.appendChild(option);
      });

      if (mc2) {
        mc2Select.value = mc2;
      }
    }

    // Step 5: Populate MC3 dropdown if MC2 is set
    mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
    if (mc1 && mc2) {
      const mc3Options = Array.from(new Set(
        lmcClassifications
          .filter(c => c.MC1 === mc1 && c.MC2 === mc2 && c.MC3 && c.MC3.trim() !== "")
          .map(c => c.MC3)
      )).sort();

      mc3Options.forEach(mc3Option => {
        const option = document.createElement('option');
        option.value = mc3Option;
        option.textContent = mc3Option;
        mc3Select.appendChild(option);
      });

      if (mc3) {
        mc3Select.value = mc3;
      }
    }

    // Step 6: Apply priority from classification
    const finalClassification = lmcClassifications.find(c => 
      c.MC1 === mc1 && 
      c.MC2 === (mc2 || '') && 
      c.MC3 === (mc3 || '')
    );

    if (finalClassification) {
      setPriorityValue(finalClassification.PRIO);

      // Update incident if one is selected
      if (selectedIncident) {
        const updatedIncident = {
          ...selectedIncident,
          mc: finalClassification.Code.toUpperCase(),
          mc1: mc1,
          mc2: mc2 || '',
          mc3: mc3 || '',
          prio: finalClassification.PRIO
        };
        setSelectedIncident(updatedIncident);
      }

      }
  };

  const handleKladblokKeyPress = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = kladblokText.trim();
      if (message) {
        console.log(`🎯 Processing kladblok input: "${message}"`);

        // Special handling for address commands - enhanced to support both with and without house number
        if (message.startsWith('=')) {
          // This will be handled by detectAndApplyShortcodes, but we process it here first for immediate feedback
          const cleanInput = message.substring(1).trim();

          if (cleanInput.includes('/')) {
            console.log(`📍 Manual address command via Enter: ${message}`);

            // Switch to Locatietreffers tab
            setActiveLoggingTab('locatietreffers');

            // Let detectAndApplyShortcodes handle the actual processing
            const processed = await detectAndApplyShortcodes(message);
            if (processed) {
              // Clear kladblok and search results
              setKladblokText("");
              setBagSearchResults([]);
              return; // Exit early, address was processed
            }
          }
        }



        // First try to process karakteristieken
        const karakteristiekProcessed = processKarakteristieken(message);

        // Then try to detect and apply other shortcodes (caller info or classification)
        const shortcodeDetected = await detectAndApplyShortcodes(message);

        // Always add user input to log, regardless of processing
        addLoggingEntry(message);

        // Log karakteristieken processing to console only
        if (karakteristiekProcessed) {
          console.log(`✅ Karakteristieken successfully processed for: "${message}"`);
        }

        // Add feedback for shortcode detection
        if (shortcodeDetected && !karakteristiekProcessed) {
          console.log(`✅ Shortcode successfully processed for: "${message}"`);
        }

        // If nothing was processed, log it
        if (!karakteristiekProcessed && !shortcodeDetected) {
          console.log(`ℹ️ No processing applied to: "${message}" - added to logging only`);
        }

        setKladblokText("");

        // Clear any search results if we processed something
        if (bagSearchResults.length > 0) {
          setBagSearchResults([]);
        }
      }
    }
  };

  // Handle kladblok text changes for real-time BAG API integration
  const handleKladblokChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setKladblokText(newText);

    // Check if user is typing an address query (starts with =)
    if (newText.startsWith('=')) {
      // Switch to Locatietreffers tab immediately
      setActiveLoggingTab('locatietreffers');

      // Extract the search query (remove the = prefix)
      const searchQuery = newText.substring(1);

      if (searchQuery.length >= 2) {
        console.log(`🔍 Real-time BAG search for: "${searchQuery}"`);

        // Update the search input and trigger search
        setBagSearchQuery(searchQuery);

        try {
          const results = await searchBAGAddress(searchQuery);
          setBagSearchResults(results);
          console.log(`📍 Found ${results.length} addresses for "${searchQuery}"`);
        } catch (error) {
          console.error('Error during real-time BAG search:', error);
          setBagSearchResults([]);
        }
      } else {
        // Clear results if query is too short
        setBagSearchResults([]);
      }
    } else {
      // If not an address query, clear BAG search results
      if (bagSearchResults.length > 0) {
        setBagSearchResults([]);
      }
    }
  };

  // Improved dropdown initialization with stable event handlers and persistent values
  const initializeLMCDropdowns = () => {
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (!mc1Select || !mc2Select || !mc3Select) {
      console.warn('❌ MC dropdowns not found in DOM');
      return;
    }

    const context = selectedIncident ? `incident ${selectedIncident.nr}` : 'nieuwe melding';
    console.log(`🔧 Initializing LMC dropdowns for ${context} with ${lmcClassifications.length} classifications`);

    // Remove existing event listeners to prevent duplicates
    mc1Select.replaceWith(mc1Select.cloneNode(true));
    mc2Select.replaceWith(mc2Select.cloneNode(true));
    mc3Select.replaceWith(mc3Select.cloneNode(true));

    // Get fresh references after replacement
    const freshMC1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const freshMC2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const freshMC3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    // Store current values before reinitializing (but only if we're NOT doing a fresh reset)
    const currentMC1 = selectedIncident ? selectedMC1 : "";
    const currentMC2 = selectedIncident ? selectedMC2 : "";
    const currentMC3 = selectedIncident ? selectedMC3 : "";

    // Populate MC1 dropdown
    const mc1Options = Array.from(new Set(lmcClassifications.map(c => c.MC1).filter(Boolean))).sort();
    freshMC1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
    mc1Options.forEach(mc1 => {
      const option = document.createElement('option');
      option.value = mc1;
      option.textContent = mc1;
      freshMC1Select.appendChild(option);
    });

    // Restore MC1 value if it was previously set (only for existing incidents)
    if (currentMC1 && selectedIncident) {
      freshMC1Select.value = currentMC1;
    }

    // MC1 change handler with persistence
    freshMC1Select.addEventListener('change', (e) => {
      const selectedMC1Value = (e.target as HTMLSelectElement).value;
      setSelectedMC1(selectedMC1Value);

      // Clear and populate MC2
      freshMC2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
      freshMC3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
      setSelectedMC2("");
      setSelectedMC3("");

      if (selectedMC1Value) {
        const mc2Options = Array.from(new Set(
          lmcClassifications
            .filter(c => c.MC1 === selectedMC1Value && c.MC2)
            .map(c => c.MC2)
        )).sort();

        mc2Options.forEach(mc2 => {
          const option = document.createElement('option');
          option.value = mc2;
          option.textContent = mc2;
          freshMC2Select.appendChild(option);
        });

        // Update priority based on MC1
        updatePriorityFromClassification(selectedMC1Value, "", "");
      }
    });

    // MC2 change handler with persistence
    freshMC2Select.addEventListener('change', (e) => {
      const selectedMC2Value = (e.target as HTMLSelectElement).value;
      setSelectedMC2(selectedMC2Value);

      // Clear and populate MC3
      freshMC3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
      setSelectedMC3("");

      if (selectedMC2Value && selectedMC1) {
        const mc3Options = Array.from(new Set(
          lmcClassifications
            .filter(c => c.MC1 === selectedMC1 && c.MC2 === selectedMC2Value && c.MC3 && c.MC3.trim() !== "")
            .map(c => c.MC3)
        )).sort();

        mc3Options.forEach(mc3 => {
          const option = document.createElement('option');
          option.value = mc3;
          option.textContent = mc3;
          freshMC3Select.appendChild(option);
        });

        // Update priority based on MC1 + MC2
        updatePriorityFromClassification(selectedMC1, selectedMC2Value, "");
      }
    });

    // MC3 change handler with persistence
    freshMC3Select.addEventListener('change', (e) => {
      const selectedMC3Value = (e.target as HTMLSelectElement).value;
      setSelectedMC3(selectedMC3Value);

      // Update priority and incident with full classification
      if (selectedMC3Value && selectedMC2 && selectedMC1) {
        updatePriorityFromClassification(selectedMC1, selectedMC2, selectedMC3Value);

        const matchingClassification = lmcClassifications.find(c => 
          c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && c.MC3 === selectedMC3Value
        );

        if (matchingClassification) {
          setPriorityValue(matchingClassification.PRIO);

          if (selectedIncident) {
            const updatedIncident = {
              ...selectedIncident,
              mc: matchingClassification.Code.toUpperCase(),
              mc1: selectedMC1,
              mc2: selectedMC2,
              mc3: selectedMC3Value,
              prio: matchingClassification.PRIO
            };
            setSelectedIncident(updatedIncident);
          }

          }
      }
    });

    // Only restore previously selected values if we're editing an existing incident
    if (selectedIncident && currentMC1) {
      setTimeout(() => {
        // First populate all dropdowns properly
        freshMC1Select.value = currentMC1;
        freshMC1Select.dispatchEvent(new Event('change'));

        setTimeout(() => {
          if (currentMC2) {
            freshMC2Select.value = currentMC2;
            freshMC2Select.dispatchEvent(new Event('change'));

            setTimeout(() => {
              if (currentMC3) {
                freshMC3Select.value = currentMC3;
                // Update state to ensure MC3 is preserved
                setSelectedMC3(currentMC3);
                console.log(`🔧 Dropdown initialization: MC3 restored and state updated to "${currentMC3}"`);
              }
            }, 100);
          }
        }, 100);
      }, 100);
    }

    console.log(`✅ LMC dropdowns initialized for ${context} - ready for shortcodes`);
  };

  // Helper function to update priority from classification
  const updatePriorityFromClassification = (mc1: string, mc2: string, mc3: string) => {
    const matchingClassification = lmcClassifications.find(c => 
      c.MC1 === mc1 && 
      (mc2 === "" || c.MC2 === mc2) && 
      (mc3 === "" || c.MC3 === mc3)
    );

    if (matchingClassification) {
      setPriorityValue(matchingClassification.PRIO);
    }
  };

  //Karakteristieken database
  const [karakteristiekenDb, setKarakteristiekenDb] = useState<any[]>([]);
  useEffect(() => {
    const loadKarakteristieken = async () => {
      try {
        console.log('🔄 Loading karakteristieken...');
        const response = await fetch('/api/karakteristieken');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`📊 Loaded ${data.length} karakteristieken`);

        // Test: show sample data
        if (data.length > 0) {
          console.log('📋 Sample karakteristiek:', {
            naam: data[0].ktNaam,
            type: data[0].ktType,
            waarde: data[0].ktWaarde,
            parser: data[0].ktParser
          });

          // Test: look for common patterns
          const inzetPatterns = data.filter(k => k.ktParser && k.ktParser.toLowerCase().includes('inzet'));
          console.log(`🔍 Found ${inzetPatterns.length} 'inzet' patterns`);

          const polPatterns = data.filter(k => k.ktParser && k.ktParser.toLowerCase().includes('pol'));
          console.log(`🔍 Found ${polPatterns.length} 'pol' patterns`);
        }

        setKarakteristiekenDb(data);
      } catch (error) {
        console.error('❌ Error loading karakteristieken:', error);
      }
    };

    loadKarakteristieken();
  }, []);

  // Function to find matching karakteristieken for input text
  const findMatchingKarakteristieken = (inputText: string) => {
    if (!inputText || !karakteristiekenDb.length) {
      console.log("❌ No input text or karakteristieken database");
      return [];
    }

    const searchText = inputText.toLowerCase().trim();
    console.log(`🔍 Searching for: "${searchText}" in ${karakteristiekenDb.length} karakteristieken`);

    const matches = karakteristiekenDb.filter(k => {
      if (!k.ktParser) return false;

      const parser = k.ktParser.toLowerCase();
      // Remove leading dash if present
      const cleanParser = parser.startsWith('-') ? parser.substring(1).trim() : parser.trim();

      // More flexible matching - check if any word in the search matches any word in the parser
      const searchWords = searchText.split(/\s+/);
      const parserWords = cleanParser.split(/\s+/);

      // Check for exact phrase match first
      if (cleanParser.includes(searchText) || searchText.includes(cleanParser)) {
        return true;
      }

      // Check for word matches
      const hasWordMatch = searchWords.some(searchWord => 
        parserWords.some(parserWord => 
          parserWord.includes(searchWord) || searchWord.includes(parserWord)
        )
      );

      return hasWordMatch;
    });

    console.log(`✅ Found ${matches.length} matches for "${searchText}"`);
    if (matches.length > 0) {
      console.log('📋 First few matches:', matches.slice(0, 3).map(m => m.ktParser));
    }
    return matches;
  };

  return (
    <div className="gms2-container">
      {/* Top Menu Bar */}
      <div className="gms2-menu-bar">
        <div className="gms2-menu-left">
          <span className="gms2-menu-item">Start</span>
          <span className="gms2-menu-item">Beheer</span>
          <span className="gms2-menu-item">Incident</span>
          <span 
            className="gms2-menu-item" 
            onClick={handleWerkplekClick}
            style={{ cursor: 'pointer' }}
          >
            Werkplek
          </span>
          <span className="gms2-menu-item">Mail</span>
          <span className="gms2-menu-item">Configuratie</span>
          <span className="gms2-menu-item">GIS</span>
          <span className="gms2-menu-item">Telefoon</span>
          <span className="gms2-menu-item">Koppeling</span>
          <span className="gms2-menu-item">Help</span>
        </div>
        <div className="gms2-menu-right">
          <span className="gms2-menu-item">A</span>
          <span className="gms2-menu-item">m</span>
          <span className="gms2-menu-item">⊗</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="gms2-tab-bar">
        <div className="gms2-tab active">Oproepen</div>
        <div className="gms2-tab">Incidenten POL</div>
      </div>

      {/* Main Content Area */}
      <div className="gms2-main-content">
        {/* Left Panel - Incidents Table */}
        <div className="gms2-left-panel">
          {/* Lopende incidenten section */}
          <div className="gms2-section">
            <div className="gms2-section-header">Lopende incidenten</div>
            <div className="gms2-incidents-table">
              <div className="gms2-table-header">
                <span>Nr</span>
                <span>Pri</span>
                <span>MC</span>
                <span>Locatie (Object - Straat)</span>
                <span>Plaats</span>
                <span>Roepnr</span>
                <span>Tijd</span>
                <span>PC</span>
              </div>
              {/* Empty rows for lopende incidenten */}
              <div className="gms2-empty-rows">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={`empty-lopend-${Date.now()}-${index}-${Math.random()}`} className="gms2-table-row">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Openstaande incidenten section */}
          <div className="gms2-section">
            <div className="gms2-section-header">Openstaande incidenten</div>
            <div className="gms2-incidents-table">
              <div className="gms2-table-header">
                <span>Prio</span>
                <span>Locatie (Object - Straat)</span>
                <span>Plaats</span>
                <span>Classificatie</span>
                <span>Roepnr</span>
                <span>Nr</span>
                <span>Tijd</span>
                <span>Pos</span>
              </div>
              {incidents.map((incident) => {
                // Determine the most specific MC classification
                const mcClassification = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || '';

                return (
                  <div 
                    key={incident.id} 
                    className={`gms2-table-row ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
                    onClick={() => handleIncidentSelect(incident)}
                  >
                    <span>{incident.prio}</span>
                    <span>{incident.locatie}</span>
                    <span>{incident.plaats}</span>
                    <span className="gms2-mc-cell">{mcClassification}</span>
                    <span>{incident.roepnr}</span>
                    <span>{incident.nr}</span>
                    <span>{incident.tijd}</span>
                    <span>{incident.positie}</span>
                  </div>
                );
              })}
              {/* Fill remaining rows */}
              {Array.from({ length: Math.max(0, 15 - incidents.length) }).map((_, index) => (
                <div key={`empty-openstaand-${Date.now()}-${index}-${Math.random()}`} className="gms2-table-row">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Incident Details */}
        <div className="gms2-right-panel">
          {/* Incident Header */}
          <div className="gms2-incident-header">
            {selectedIncident ? `P:${selectedIncident.locatie || selectedIncident.mc || 'Bestaande melding'}` : 'P: Nieuwe melding'}
          </div>

              {/* Incident Form */}
          <div className="gms2-incident-form">
                {/* Title Row */}
                <div className="gms2-title-section">
                  <span className="gms2-title-text">P: {selectedIncident?.mc2 || 'Nieuwe melding'}</span>
                  <span className="gms2-incident-id">{selectedIncident?.nr || 'Nieuw'}</span>
                </div>

                {/* Time Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Tijd:</span>
                  <span className="gms2-time-display">
                    {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
                  </span>
                  <span className="gms2-field-label">Aangemaakt:</span>
                  <input type="text" className="gms2-input medium" value="OC-RT" readOnly />
                </div>

                {/* === MELDERGEGEVENS SECTIE === */}
                <div className="gms2-section-header">
                  <span className="gms2-section-title">Meldergegevens</span>
                </div>

                {/* Melder Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Melder:</span>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    value={formData.melderNaam}
                    onChange={(e) => handleFormChange('melderNaam', e.target.value)}
                  />
                  <span className="gms2-field-label">Tel:</span>
                  <input 
                    type="text" 
                    className="gms2-input medium" 
                    value={formData.telefoonnummer}
                    onChange={(e) => handleFormChange('telefoonnummer', e.target.value)}
                  />
                  <button className="gms2-btn small">Anoniem</button>
                </div>

                {/* Melder Adres Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Adres:</span>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    value={formData.melderAdres}
                    onChange={(e) => handleFormChange('melderAdres', e.target.value)}
                  />
                  <span className="gms2-field-label">Gem:</span>
                  <input 
                    type="text" 
                    className="gms2-input small" 
                    value={formData.gemeente}
                    onChange={(e) => handleFormChange('gemeente', e.target.value)}
                  />
                </div>

                {/* Visual separator between melder and location sections */}
                <div className="gms2-section-separator"></div>

                {/* === INCIDENTLOCATIE SECTIE === */}
                <div className="gms2-section-header">
                  <span className="gms2-section-title">Incidentlocatie</span>
                </div>

                {/* Adres Row - Straat, Nr, PC, Pts, Gem */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Straat:</span>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    value={formData.straatnaam}
                    onChange={(e) => handleFormChange('straatnaam', e.target.value)}
                    placeholder="Straatnaam"
                  />
                  <span className="gms2-field-label compact">Nr:</span>
                  <input 
                    type="text" 
                    className="gms2-input extra-small" 
                    value={formData.huisnummer}
                    onChange={(e) => handleFormChange('huisnummer', e.target.value)}
                  />
                  <span className="gms2-field-label compact">PC:</span>
                  <input 
                    type="text" 
                    className="gms2-input postal" 
                    value={formData.postcode}
                    onChange={(e) => handleFormChange('postcode', e.target.value)}
                    placeholder="1234AB"
                  />
                  <span className="gms2-field-label compact">Pts:</span>
                  <input 
                    type="text" 
                    className="gms2-input place-wide" 
                    value={formData.plaatsnaam}
                    onChange={(e) => handleFormChange('plaatsnaam', e.target.value)}
                    placeholder="Plaats"
                  />
                  <span className="gms2-field-label compact">Gem:</span>
                  <input 
                    type="text" 
                    className="gms2-input extra-small" 
                    value={formData.gemeente}
                    onChange={(e) => handleFormChange('gemeente', e.target.value)}
                  />
                </div>

                {/* Object Row */}
                <div className="gms2-form-row">
                  <span className="gms2-field-label">Object:</span>
                  <input 
                    type="text" 
                    className="gms2-input wide" 
                    value={formData.functie}
                    onChange={(e) => handleFormChange('functie', e.target.value)}
                    placeholder="Object/gebouw"
                  />
                </div>



                {/* Action Buttons Row */}
                <div className="gms2-button-row">
                  <button className="gms2-btn small">COM</button>
                  <button className="gms2-btn small">EDB</button>
                  <button className="gms2-btn small">DUB</button>
                  <button className="gms2-btn small">AOL</button>
                  <button className="gms2-btn small">OGS</button>
                  <button className="gms2-btn small">OBJ</button>
                  <button className="gms2-btn small">LOC</button>
                  <button className="gms2-btn small">PROC</button>
                  <button className="gms2-btn small">IV</button>
                  <button className="gms2-btn small">IV+</button>
                  <button className="gms2-btn small">TK</button>
                  <button className="gms2-btn small">OMS</button>
                  <button className="gms2-btn small">RND</button>
                </div>

                {/* Tab Row */}
                <div className="gms2-button-row">
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'hist-meldblok' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('hist-meldblok')}
                  >
                    Hist. Meldblok
                  </button>
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'locatietreffers' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('locatietreffers')}
                  >
                    Locatietreffers
                  </button>
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'statusoverzicht' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('statusoverzicht')}
                  >
                    Statusoverzicht
                  </button>
                  <button 
                    className={`gms2-btn tab-btn ${activeLoggingTab === 'overige-inzet' ? 'active' : ''}`}
                    onClick={() => setActiveLoggingTab('overige-inzet')}
                  >
                    Overige inzet
                  </button>
                </div>

                {/* Dynamic Tabbed Content */}
                <div className="gms2-history-section">
                  {activeLoggingTab === 'hist-meldblok' && (
                    <div className="gms2-history-scrollbox" id="gms2-logging-display">
                      {loggingEntries.map((entry) => (
                        <div key={entry.id} className="gms2-history-entry">
                          {entry.timestamp} {entry.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeLoggingTab === 'locatietreffers' && (
                    <div className="gms2-locatietreffers">
                      <div className="gms2-search-container">
                        <input
                          type="text"
                          className="gms2-search-input"
                          placeholder="Zoek adres via BAG API... (bijv. Rotterdam Kleiweg 12)"
                          value={bagSearchQuery}
                          onChange={async (e) => {
                            const query = e.target.value;
                            setBagSearchQuery(query);

                            if (query.length >= 2) {
                              console.log(`🔍 Manual search for: "${query}"`);
                              const results = await searchBAGAddress(query);
                              setBagSearchResults(results);
                            } else {
                              setBagSearchResults([]);
                            }
                          }}
                          onKeyPress={async (e) => {
                            if (e.key === 'Enter' && bagSearchQuery.length > 0) {
                              if (bagSearchResults.length === 1) {
                                // Auto-select if only one result
                                const result = bagSearchResults[0];
                                const fullHuisnummer = `${result.huisnummer}${result.huisletter || ''}${result.huisnummertoevoeging ? '-' + result.huisnummertoevoeging : ''}`;

                                const addressData = {
                                  straatnaam: result.straatnaam,
                                  huisnummer: fullHuisnummer,
                                  postcode: result.postcode,
                                  plaatsnaam: result.plaatsnaam,
                                  gemeente: result.gemeente
                                };

                                setFormData(prev => ({ ...prev, ...addressData }));
                                if (selectedIncident) {
                                  setSelectedIncident({ ...selectedIncident, ...addressData });
                                }

                                addLoggingEntry(`📍 Adres geselecteerd: ${result.volledigAdres}`);
                                setBagSearchQuery("");
                                setBagSearchResults([]);
                              } else if (bagSearchResults.length === 0) {
                                // Try fallback search
                                const fallbackResults = await searchBAGAddress(bagSearchQuery);
                                if (fallbackResults.length > 0) {
                                  const result = fallbackResults[0];
                                  setFormData(prev => ({ ...prev, postcode: result.postcode }));
                                  addLoggingEntry(`📍 Postcode automatisch ingevuld: ${result.postcode}`);
                                } else {
                                  addLoggingEntry(`❌ Geen adres gevonden voor: "${bagSearchQuery}"`);
                                }
                              }
                            }
                          }}
                        />
                      </div>

                      <div className="gms2-search-help">
                        💡 Tip: Begin te typen met = in het kladblok voor automatisch zoeken
                      </div>

                      <div className="gms2-search-results">
                        {bagSearchResults.map((result, index) => {
                          const fullHuisnummer = `${result.huisnummer}${result.huisletter || ''}${result.huisnummertoevoeging ? '-' + result.huisnummertoevoeging : ''}`;
                          return (
                            <div
                              key={index}
                              className="gms2-address-result"
                              onClick={() => {
                                const addressData = {
                                  straatnaam: result.straatnaam,
                                  huisnummer: fullHuisnummer,
                                  postcode: result.postcode,
                                  plaatsnaam: result.plaatsnaam,
                                  gemeente: result.gemeente
                                };

                                setFormData(prev => ({ ...prev, ...addressData }));
                                if (selectedIncident) {
                                  setSelectedIncident({ ...selectedIncident, ...addressData });
                                }

                                addLoggingEntry(`📍 Adres geselecteerd: ${result.volledigAdres}`);
                                setBagSearchQuery("");
                                setBagSearchResults([]);

                                // Clear any =address query from kladblok
                                if (kladblokText.startsWith('=')) {
                                  setKladblokText('');
                                }
                              }}
                            >
                              <div className="gms2-address-main">{result.volledigAdres}</div>
                              <div className="gms2-address-details">
                                {result.gemeente} | {result.postcode}
                              </div>                              </div>
                            );
                        })}

                        {bagSearchQuery.length >= 2 && bagSearchResults.length === 0 && (
                          <div className="gms2-no-results">
                            <div>Geen adressen gevonden voor "{bagSearchQuery}"</div>
                            <div style={{ fontSize: '10px', marginTop: '4px', color: '#999' }}>
                              Probeer een andere zoekterm of gebruik de volledige syntax
                            </div>
                          </div>
                        )}

                        {bagSearchQuery.length < 2 && bagSearchResults.length === 0 && (
                          <div className="gms2-search-instructions">
                            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Hoe te gebruiken:</div>
                            <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                              • Type in het kladblok: <strong>=Rotterdam/Kleiweg 12</strong><br/>
                              • Of zoek direct hier: <strong>Rotterdam Kleiweg</strong><br/>
                              • Klik op een resultaat om automatisch in te vullen
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeLoggingTab === 'statusoverzicht' && (
                    <div className="gms2-status-overview">
                      <div className="gms2-status-table-container">
                        <div className="gms2-status-table">
                          {/* Header row */}
                          <div className="gms2-status-header-row">
                            <div className="gms2-status-cell header-dp">D<br/>P</div>
                            <div className="gms2-status-cell header-roepnaam">Roepnaam</div>
                            <div className="gms2-status-cell header-soort">Soort voe</div>
                            <div className="gms2-status-cell header-ov">ov</div>
                            <div className="gms2-status-cell header-ar">ar</div>
                            <div className="gms2-status-cell header-tp">tp</div>
                            <div className="gms2-status-cell header-nb">nb</div>
                            <div className="gms2-status-cell header-am">am</div>
                            <div className="gms2-status-cell header-vr">vr</div>
                            <div className="gms2-status-cell header-fd">fd</div>
                            <div className="gms2-status-cell header-ga">GA</div>
                          </div>

                          {/* Sample data rows to match the photo */}
                          <div className="gms2-status-data-row">```text
                            <div className="gms2-status-cell data-dp">P</div>
                            <div className="gms2-status-cell data-roepnaam">RTB101</div>
                            <div className="gms2-status-cell data-soort">SurvBus</div>
                            <div className="gms2-status-cell data-ov">13:19</div>
                            <div className="gms2-status-cell data-ar">13:19</div>
                            <div className="gms2-status-cell data-tp"></div>
                            <div className="gms2-status-cell data-nb"></div>
                            <div className="gms2-status-cell data-am"></div>
                            <div className="gms2-status-cell data-vr"></div>
                            <div className="gms2-status-cell data-fd"></div>
                            <div className="gms2-status-cell data-ga"></div>
                          </div>

                          <div className="gms2-status-data-row">
                            <div className="gms2-status-cell data-dp">P</div>
                            <div className="gms2-status-cell data-roepnaam">RTB160</div>
                            <div className="gms2-status-cell data-soort">WykAuto</div>
                            <div className="gms2-status-cell data-ov">13:22</div>
                            <div className="gms2-status-cell data-ar"></div>
                            <div className="gms2-status-cell data-tp"></div>
                            <div className="gms2-status-cell data-nb"></div>
                            <div className="gms2-status-cell data-am"></div>
                            <div className="gms2-status-cell data-vr"></div>
                            <div className="gms2-status-cell data-fd"></div>
                            <div className="gms2-status-cell data-ga"></div>
                          </div>

                          <div className="gms2-status-data-row">
                            <div className="gms2-status-cell data-dp">P</div>
                            <div className="gms2-status-cell data-roepnaam">RTB188</div>
                            <div className="gms2-status-cell data-soort">SurvAut</div>
                            <div className="gms2-status-cell data-ov">13:22</div>
                            <div className="gms2-status-cell data-ar">13:24</div>
                            <div className="gms2-status-cell data-tp">13:24</div>
                            <div className="gms2-status-cell data-nb"></div>
                            <div className="gms2-status-cell data-am"></div>
                            <div className="gms2-status-cell data-vr">13:47</div>
                            <div className="gms2-status-cell data-fd"></div>
                            <div className="gms2-status-cell data-ga"></div>
                          </div>

                          {/* Dynamic rows for assigned units from selected incident */}
                          {selectedIncident && selectedIncident.assignedUnits && selectedIncident.assignedUnits.map((unit, index) => (
                            <div key={unit.roepnummer} className="gms2-status-data-row">
                              <div className="gms2-status-cell data-dp">P</div>
                              <div className="gms2-status-cell data-roepnaam">{unit.roepnummer}</div>
                              <div className="gms2-status-cell data-soort">{unit.soort_voertuig || 'SurvBus'}</div>
                              <div className="gms2-status-cell data-ov">{unit.ov_tijd || ''}</div>
                              <div className="gms2-status-cell data-ar">{unit.ar_tijd || ''}</div>
                              <div className="gms2-status-cell data-tp">{unit.tp_tijd || ''}</div>
                              <div className="gms2-status-cell data-nb">{unit.nb_tijd || ''}</div>
                              <div className="gms2-status-cell data-am">{unit.am_tijd || ''}</div>
                              <div className="gms2-status-cell data-vr">{unit.vr_tijd || ''}</div>
                              <div className="gms2-status-cell data-fd">{unit.fd_tijd || ''}</div>
                              <div className="gms2-status-cell data-ga">{unit.ga_tijd || ''}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeLoggingTab === 'overige-inzet' && (
                    <div className="gms2-tab-content">
                      <div className="gms2-content-placeholder">
                        Overige inzet - Inhoud volgt later
                      </div>
                    </div>
                  )}
                </div>

                {/* LMC Classification dropdowns row */}
                <div className="gms2-dropdown-tabs">
                  <div className="gms2-tab-group">
                    <select 
                      id="gms2-mc1-select" 
                      className="gms2-dropdown" 
                      style={{ backgroundColor: '#f5f5f5' }}
                    >
                      <option value="">Selecteer MC1...</option>
                    </select>
                  </div>
                  <div className="gms2-tab-group">
                    <select 
                      id="gms2-mc2-select" 
                      className="gms2-dropdown" 
                      style={{ backgroundColor: '#f5f5f5' }}
                    >
                      <option value="">Selecteer MC2...</option>
                    </select>
                  </div>
                  <div className="gms2-tab-group">
                    <select 
                      id="gms2-mc3-select" 
                      className="gms2-dropdown" 
                      style={{ backgroundColor: '#f5f5f5' }}
                    >
                      <option value="">Selecteer MC3...</option>
                    </select>
                  </div>
                </div>

                {/* Main characteristics layout */}
                <div className="gms2-characteristics-layout">
                  <div className="gms2-characteristics-table">
                    <div className="gms2-char-header">
                      <span>Karakteristieken</span>
                      <span>Waarde</span>
                    </div>
                    {/* Dynamic karakteristieken rows */}
                    {selectedKarakteristieken.map((kar, index) => (
                      <div key={`kar-${kar.id || Date.now()}-${index}-${kar.ktCode || 'nocode'}-${Math.random()}`} className="gms2-char-row">
                        <span title={kar.ktCode ? `Code: ${kar.ktCode}` : ''}>{kar.ktNaam}</span>
                        <span>{kar.waarde || ''}</span>
                      </div>
                    ))}
                    {/* Fill remaining rows */}
                    {Array.from({ length: Math.max(0, 8 - selectedKarakteristieken.length) }).map((_, index) => (
                      <div key={`empty-char-${Date.now()}-${index}-${Math.random()}`} className="gms2-char-row">
                        <span></span>
                        <span></span>
                      </div>
                    ))}
                  </div>



                  <div className="gms2-kladblok-modern">
                    <textarea 
                      value={kladblokText}
                      onChange={handleKladblokChange}
                      onKeyPress={handleKladblokKeyPress}
                      className="gms2-kladblok-textarea"
                      placeholder="Kladblok - Snelcodes: -inbraak, -steekpartij | Karakteristieken: -aanh 1, -ovdp, -afkruisen rijstrook 1 | Adres: =Rotterdam/Kleiweg 12 | Melder: m/Naam;0612345678 | Object: o/Winkelcentrum (Enter om uit te voeren)"
                    />
                  </div>
                </div>

                {/* Bottom action section */}
                <div className="gms2-bottom-actions">
                  <div className="gms2-priority-buttons">
                    <span>P:</span>
                    <select 
                      className="gms2-priority-dropdown" 
                      value={priorityValue}
                      onChange={(e) => setPriorityValue(parseInt(e.target.value))}
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                    </select>
                  </div>

                  <div className="gms2-service-options">
                    <div className="gms2-service-col">
                      <input type="checkbox" />
                      <span>P</span>
                      <input type="checkbox" />
                    </div>
                    <div className="gms2-service-col">
                      <input 
                        type="checkbox" 
                        id="share-brandweer"
                        onChange={(e) => {
                          const action = e.target.checked ? "gedeeld met" : "delen beëindigd met";
                          addLoggingEntry(`🚒 Melding ${action} Brandweer`);
                        }}
                      />
                      <span>B</span>
                    </div>
                    <div className="gms2-service-col">
                      <input 
                        type="checkbox" 
                        id="share-ambulance"
                        onChange={(e) => {
                          const action = e.target.checked ? "gedeeld met" : "delen beëindigd met";
                          addLoggingEntry(`🚑 Melding ${action} Ambulance`);
                        }}
                      />
                      <span>A</span>
                    </div>
                  </div>

                  <div className="gms2-action-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select className="gms2-dropdown" style={{ minWidth: '100px' }}>
                      <option>Testmelding</option>
                    </select>
                    {selectedIncident ? (
                      <button className="gms2-btn" onClick={handleUpdate} style={{ minWidth: '60px' }}>Update</button>
                    ) : (
                      <button className="gms2-btn" onClick={handleUitgifte} style={{ minWidth: '60px' }}>Uitgifte</button>
                    )}
                    <button className="gms2-btn" onClick={handleArchiveer} style={{ minWidth: '70px' }}>Archiveer</button>
                    <button className="gms2-btn" onClick={handleNieuw} style={{ minWidth: '50px' }}>Nieuw</button>
                  </div>
                </div>
              </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="gms2-status-bar">
        <div className="gms2-status-left">
          <span>Bericht: 0000000000</span>
          <select className="gms2-select small">
            <option>Bericht</option>
          </select>
          <span>POL</span>
          <select className="gms2-select small">
            <option>⬜</option>
          </select>
        </div>
        <div className="gms2-status-center">
          <span>{formatDateTime(currentTime)}</span>
        </div>
        <div className="gms2-status-right">
          <span>7193</span>
          <button className="gms2-btn small">1</button>
          <button className="gms2-btn small">2</button>
          <button className="gms2-btn small">3</button>
          <button className="gms2-btn small">4</button>
        </div>
      </div>
    </div>
  );
}