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
  plaatsnaam?: string;
  mc1?: string;
  mc2?: string;
  notities?: string;
  karakteristieken?: any[];
  status?: string;
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

  // Set initial selected incident
  useEffect(() => {
    if (incidents.length > 0 && !selectedIncident) {
      setSelectedIncident(incidents[0]);
    }
  }, [incidents, selectedIncident]);

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
    setSelectedIncident(incident);
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
      plaatsnaam: formData.plaatsnaam,
      mc1: selectedMC1,
      mc2: selectedMC2,
      mc3: selectedMC3,
      notities: "",
      karakteristieken: [],
      status: "Openstaand"
    };

    // Add to incidents list (at the beginning for newest first)
    setIncidents(prev => [newIncident, ...prev]);
    
    // Select the new incident
    setSelectedIncident(newIncident);

    // Add logging entry
    addLoggingEntry(`📋 Melding ${newIncidentNumber} uitgegeven - ${mcCode} ${location}`);

    // Clear form for next incident
    setFormData({
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
    
    // Reset classifications
    setSelectedMC1("");
    setSelectedMC2("");
    setSelectedMC3("");
    setPriorityValue(2);

    // Clear dropdowns
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
      
      addLoggingEntry(`📁 Melding ${selectedIncident.nr} gearchiveerd`);
      
      // Select first remaining incident or clear selection
      const remainingIncidents = incidents.filter(inc => inc.id !== selectedIncident.id);
      setSelectedIncident(remainingIncidents.length > 0 ? remainingIncidents[0] : null);
    }
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

  // Shortcode mapping for quick classification
  const shortcodeMappings = {
    // Ongeval codes
    '-ogovls': { MC1: 'Ongeval', MC2: 'Wegvervoer', MC3: 'Letsel' },
    '-osvls': { MC1: 'Ongeval', MC2: 'Spoorvervoer', MC3: 'Letsel' },
    '-wegvervoer': { MC1: 'Ongeval', MC2: 'Wegvervoer', MC3: '' },
    '-spoorvervoer': { MC1: 'Ongeval', MC2: 'Spoorvervoer', MC3: '' },

    // Geweld & Veiligheid codes
    '-steekpartij': { MC1: 'Veiligheid & Openbare Orde', MC2: 'Geweld', MC3: 'Lichamelijk letsel' },
    '-mesaanval': { MC1: 'Veiligheid & Openbare Orde', MC2: 'Geweld', MC3: 'Lichamelijk letsel' },
    '-vechtpartij': { MC1: 'Veiligheid & Openbare Orde', MC2: 'Geweld', MC3: 'Vechtpartij' },
    '-bedreiging': { MC1: 'Veiligheid & Openbare Orde', MC2: 'Geweld', MC3: 'Bedreiging' },

    // Brand codes
    '-woningbrand': { MC1: 'Brand', MC2: 'Gebouwbrand', MC3: 'Woningbrand' },
    '-autobrand': { MC1: 'Brand', MC2: 'Voertuigbrand', MC3: 'Personenauto' },
    '-buitenbrand': { MC1: 'Brand', MC2: 'Buitenbrand', MC3: 'Natuurbrand' },

    // Bezitsaantasting codes
    '-inbraak': { MC1: 'Bezitsaantasting', MC2: 'Inbraak', MC3: 'Woning' },
    '-diefstal': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Eenvoudige diefstal' },
    '-autodiefstal': { MC1: 'Bezitsaantasting', MC2: 'Diefstal', MC3: 'Diefstal motorvoertuig' },

    // Gezondheid codes
    '-ambulance': { MC1: 'Gezondheid', MC2: 'Ambulancevervoer', MC3: 'Spoed' },
    '-reanimatie': { MC1: 'Gezondheid', MC2: 'Reanimatie', MC3: 'Hartstilstand' },
    '-afstemverzoek': { MC1: 'Dienstverlening', MC2: 'Afstemverzoek', MC3: 'Ambulance' }
  };

  // Function to detect and apply shortcodes for classification, address, and caller info
  const detectAndApplyShortcodes = (text: string) => {
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1].trim();

    // Address shortcode: =[stad]/[straatnaam] [huisnummer]
    if (lastLine.startsWith('=')) {
      const addressMatch = lastLine.match(/^=([^\/]+)\/(.+?)(\d+)$/i);
      if (addressMatch) {
        const [, stad, straatnaam, huisnummer] = addressMatch;
        
        // Fill address fields
        setFormData(prev => ({
          ...prev,
          straatnaam: straatnaam.trim(),
          huisnummer: huisnummer.trim(),
          plaatsnaam: stad.trim()
        }));

        addLoggingEntry(`📍 Adres automatisch ingevuld: ${straatnaam.trim()} ${huisnummer.trim()}, ${stad.trim()}`);
        return true;
      }
    }

    // Caller info shortcode: m/[meldernaam];[telefoonnummer]
    if (lastLine.startsWith('m/')) {
      const callerMatch = lastLine.match(/^m\/([^;]+);(.+)$/i);
      if (callerMatch) {
        const [, meldernaam, telefoonnummer] = callerMatch;
        
        // Fill caller fields
        setFormData(prev => ({
          ...prev,
          melderNaam: meldernaam.trim(),
          telefoonnummer: telefoonnummer.trim()
        }));

        addLoggingEntry(`👤 Meldergegevens automatisch ingevuld: ${meldernaam.trim()}, ${telefoonnummer.trim()}`);
        return true;
      }
    }

    // Classification shortcode: -[code]
    if (lastLine.startsWith('-')) {
      // Direct shortcode match
      const shortcode = lastLine.split(' ')[0];
      if (shortcodeMappings[shortcode]) {
        const classification = shortcodeMappings[shortcode];
        applyClassification(classification.MC1, classification.MC2, classification.MC3, shortcode);
        return true;
      }

      // Keyword combination detection
      const keywords = lastLine.substring(1).split(' ').filter(word => word.length > 2);
      const possibleMatch = findClassificationByKeywords(keywords);
      if (possibleMatch) {
        applyClassification(possibleMatch.MC1, possibleMatch.MC2, possibleMatch.MC3, lastLine);
        return true;
      }
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

  // Function to apply classification to dropdowns
  const applyClassification = (mc1: string, mc2: string, mc3: string, detectedCode: string) => {
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (mc1Select && mc2Select && mc3Select && lmcClassifications.length > 0) {
      console.log(`Applying classification: ${mc1} > ${mc2} > ${mc3}`);

      // Set MC1
      mc1Select.value = mc1;
      setSelectedMC1(mc1);

      // Manually populate MC2 dropdown
      mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
      const mc2Options = Array.from(new Set(
        lmcClassifications
          .filter(c => c.MC1 === mc1 && c.MC2 && c.MC2.trim() !== "")
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
        setSelectedMC2(mc2);

        // Manually populate MC3 dropdown
        mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
        const mc3Options = Array.from(new Set(
          lmcClassifications
            .filter(c => c.MC1 === mc1 && c.MC2 === mc2 && c.MC3 && c.MC3.trim() !== "")
            .map(c => c.MC3)
        )).sort();

        console.log(`MC3 options found: ${mc3Options.length}`, mc3Options);

        mc3Options.forEach(mc3Option => {
          const option = document.createElement('option');
          option.value = mc3Option;
          option.textContent = mc3Option;
          mc3Select.appendChild(option);
        });

        if (mc3) {
          setTimeout(() => {
            mc3Select.value = mc3;
            setSelectedMC3(mc3);

            // Find and apply the matching classification
            const matchingClassification = lmcClassifications.find(c => 
              c.MC1 === mc1 && c.MC2 === mc2 && c.MC3 === mc3
            );

            if (matchingClassification && selectedIncident) {
              const updatedIncident = {
                ...selectedIncident,
                mc: matchingClassification.Code.toUpperCase(),
                mc1: mc1,
                mc2: mc2,
                mc3: mc3
              };
              setSelectedIncident(updatedIncident);
            }
          }, 50);
        }
      }

      // Classification applied silently
    }
  };

  const handleKladblokKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = kladblokText.trim();
      if (message) {
        // Try to detect and apply shortcodes (address, caller info, or classification)
        const shortcodeDetected = detectAndApplyShortcodes(message);

        // Only add to log if it's not a shortcode, or if it is a classification shortcode
        if (!shortcodeDetected || message.startsWith('-')) {
          addLoggingEntry(message);
        }
        setKladblokText("");
      }
    }
  };

  const initializeLMCDropdowns = () => {
    const mc1Select = document.getElementById('gms2-mc1-select') as HTMLSelectElement;
    const mc2Select = document.getElementById('gms2-mc2-select') as HTMLSelectElement;
    const mc3Select = document.getElementById('gms2-mc3-select') as HTMLSelectElement;

    if (mc1Select && mc2Select && mc3Select) {
      // Populate MC1 dropdown
      const mc1Options = Array.from(new Set(lmcClassifications.map(c => c.MC1).filter(Boolean))).sort();
      mc1Select.innerHTML = '<option value="">Selecteer MC1...</option>';
      mc1Options.forEach(mc1 => {
        const option = document.createElement('option');
        option.value = mc1;
        option.textContent = mc1;
        mc1Select.appendChild(option);
      });

      // MC1 change handler
      mc1Select.addEventListener('change', (e) => {
        const selectedMC1 = (e.target as HTMLSelectElement).value;
        setSelectedMC1(selectedMC1);

        // Clear and populate MC2
        mc2Select.innerHTML = '<option value="">Selecteer MC2...</option>';
        mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
        setSelectedMC2("");
        setSelectedMC3("");

        if (selectedMC1) {
          const mc2Options = Array.from(new Set(
            lmcClassifications
              .filter(c => c.MC1 === selectedMC1 && c.MC2)
              .map(c => c.MC2)
          )).sort();

          mc2Options.forEach(mc2 => {
            const option = document.createElement('option');
            option.value = mc2;
            option.textContent = mc2;
            mc2Select.appendChild(option);
          });
        }
      });

      // MC2 change handler
      mc2Select.addEventListener('change', (e) => {
        const selectedMC2 = (e.target as HTMLSelectElement).value;
        setSelectedMC2(selectedMC2);

        // Clear and populate MC3
        mc3Select.innerHTML = '<option value="">Selecteer MC3...</option>';
        setSelectedMC3("");

        if (selectedMC2 && selectedMC1) {
          const mc3Options = Array.from(new Set(
            lmcClassifications
              .filter(c => c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && c.MC3 && c.MC3.trim() !== "")
              .map(c => c.MC3)
          )).sort();

          console.log(`MC3 options for ${selectedMC1}/${selectedMC2}:`, mc3Options);

          mc3Options.forEach(mc3 => {
            const option = document.createElement('option');
            option.value = mc3;
            option.textContent = mc3;
            mc3Select.appendChild(option);
          });
        }
      });

      // MC3 change handler
      mc3Select.addEventListener('change', (e) => {
        const selectedMC3 = (e.target as HTMLSelectElement).value;
        setSelectedMC3(selectedMC3);

        // Find matching classification and update incident
        if (selectedMC3 && selectedMC2 && selectedMC1) {
          const matchingClassification = lmcClassifications.find(c => 
            c.MC1 === selectedMC1 && c.MC2 === selectedMC2 && c.MC3 === selectedMC3
          );

          if (matchingClassification && selectedIncident) {
            // Update incident with classification
            const updatedIncident = {
              ...selectedIncident,
              mc: matchingClassification.Code.toUpperCase(),
              mc1: selectedMC1,
              mc2: selectedMC2,
              mc3: selectedMC3
            };
            setSelectedIncident(updatedIncident);

            // Classification applied silently
          }
        }
      });
    }
  };

  return (
    <div className="gms2-container">
      {/* Top Menu Bar */}
      <div className="gms2-menu-bar">
        <div className="gms2-menu-left">
          <span className="gms2-menu-item">Start</span>
          <span className="gms2-menu-item">Beheer</span>
          <span className="gms2-menu-item">Incident</span>
          <span className="gms2-menu-item">Werkplek</span>
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
                  <div key={`empty-lopend-row-${index}`} className="gms2-table-row">
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
                <span>Nr</span>
                <span>Pri</span>
                <span>Tijd</span>
                <span>MC</span>
                <span>Locatie (Object - Straat)</span>
                <span>Plaats</span>
                <span>Roepnr</span>
                <span>Pos</span>
              </div>
              {incidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className={`gms2-table-row ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
                  onClick={() => handleIncidentSelect(incident)}
                >
                  <span>{incident.nr}</span>
                  <span>{incident.prio}</span>
                  <span>{incident.tijd}</span>
                  <span className="gms2-mc-cell">{incident.mc}</span>
                  <span>{incident.locatie}</span>
                  <span>{incident.plaats}</span>
                  <span>{incident.roepnr}</span>
                  <span>{incident.positie}</span>
                </div>
              ))}
              {/* Fill remaining rows */}
              {Array.from({ length: Math.max(0, 15 - incidents.length) }).map((_, index) => (
                <div key={`empty-openstaand-row-${index}`} className="gms2-table-row">
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
            {selectedIncident ? `P:${selectedIncident.locatie || 'Nieuwe melding'}` : 'P: Nieuwe melding'}
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
                  <span className="gms2-time-display">08:23</span>
                  <span className="gms2-field-label">Aangemaakt:</span>
                  <input type="text" className="gms2-input medium" value="Janssen" readOnly />
                  <span className="gms2-field-label">Koppie</span>
                  <button className="gms2-btn small">Koppie</button>
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
                  <span className="gms2-field-label">Nr:</span>
                  <input 
                    type="text" 
                    className="gms2-input extra-small" 
                    value={formData.huisnummer}
                    onChange={(e) => handleFormChange('huisnummer', e.target.value)}
                  />
                  <span className="gms2-field-label">PC:</span>
                  <input 
                    type="text" 
                    className="gms2-input postal" 
                    value={formData.postcode}
                    onChange={(e) => handleFormChange('postcode', e.target.value)}
                    placeholder="1234AB"
                  />
                  <span className="gms2-field-label">Pts:</span>
                  <input 
                    type="text" 
                    className="gms2-input place" 
                    value={formData.plaatsnaam}
                    onChange={(e) => handleFormChange('plaatsnaam', e.target.value)}
                    placeholder="Plaats"
                  />
                  <span className="gms2-field-label">Gem:</span>
                  <input 
                    type="text" 
                    className="gms2-input small" 
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
                  <button className="gms2-btn tab-btn">Hist. Meldblok</button>
                  <button className="gms2-btn tab-btn">Locatietreffers</button>
                  <button className="gms2-btn tab-btn">Statusoverzicht</button>
                  <button className="gms2-btn tab-btn">Overige inzet</button>
                </div>

                {/* Logging Section */}
                <div className="gms2-history-section">
                  <div className="gms2-history-scrollbox" id="gms2-logging-display">
                    {loggingEntries.map((entry) => (
                      <div key={entry.id} className="gms2-history-entry">
                        {entry.timestamp} {entry.message}
                      </div>
                    ))}
                  </div>
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
                    {/* Empty table ready for data input */}
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={`char-row-${index}`} className="gms2-char-row">
                        <span></span>
                        <span></span>
                      </div>
                    ))}
                  </div>



                  <div className="gms2-kladblok-modern">
                    <textarea 
                      value={kladblokText}
                      onChange={(e) => setKladblokText(e.target.value)}
                      onKeyPress={handleKladblokKeyPress}
                      className="gms2-kladblok-textarea"
                      placeholder="Kladblok - Snelcodes: -inbraak, -steekpartij | Adres: =Stad/Straat 123 | Melder: m/Naam;0612345678 (Enter om uit te voeren)"
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

                  <div className="gms2-action-buttons">
                    <select className="gms2-dropdown">
                      <option>Testmelding</option>
                    </select>
                    <button className="gms2-btn" onClick={handleUitgifte}>Uitgifte</button>
                    <button className="gms2-btn" onClick={handleArchiveer}>Archiveer</button>
                    <button className="gms2-btn">Sluit</button>
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