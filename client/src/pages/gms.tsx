import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GmsIncident {
  id: number;
  vrijeLnotitie: string;
  locatie: string;
  tijdstip: string;
  soortMelding: string;
  prioriteit: number;
  status: string;
  aangemaaktOp: string;
}

interface GmsFormData {
  vrijeLnotitie: string;
  locatie: string;
  tijdstip: string;
  soortMelding: string;
  prioriteit: number;
  status: string;
}

export default function GmsPage() {
  const [formData, setFormData] = useState<GmsFormData>({
    vrijeLnotitie: '',
    locatie: '',
    tijdstip: '',
    soortMelding: '',
    prioriteit: 3,
    status: 'Nieuw'
  });

  const queryClient = useQueryClient();

  // Initialize current time
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFormData(prev => ({ ...prev, tijdstip: localDateTime }));
  }, []);

  // Fetch incidents
  const { data: incidents = [], isLoading } = useQuery<GmsIncident[]>({
    queryKey: ['/api/gms-incidents'],
    queryFn: async () => {
      const response = await fetch('/api/gms-incidents');
      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }
      return response.json();
    },
  });

  // Create incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: async (data: GmsFormData) => {
      const response = await fetch('/api/gms-incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create incident');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gms-incidents'] });
      // Reset form
      setFormData({
        vrijeLnotitie: '',
        locatie: '',
        tijdstip: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        soortMelding: '',
        prioriteit: 3,
        status: 'Nieuw'
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createIncidentMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'prioriteit' ? parseInt(value) : value
    }));
  };

  const getPriorityData = (priority: number) => {
    const priorities = {
      1: { emoji: '🟢', text: 'Zeer Laag', color: '#28a745' },
      2: { emoji: '🟡', text: 'Laag', color: '#ffc107' },
      3: { emoji: '⚠️', text: 'Gemiddeld', color: '#fd7e14' },
      4: { emoji: '🔴', text: 'Hoog', color: '#dc3545' },
      5: { emoji: '🚨', text: 'Zeer Hoog', color: '#6f42c1' }
    };
    return priorities[priority as keyof typeof priorities] || priorities[3];
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL');
  };

  return (
    <div className="gms-container" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          color: 'white',
          padding: '25px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2.5em', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🚔 GMS
          </h1>
          <p style={{ fontSize: '1.1em', opacity: 0.9 }}>
            Politie Meldkamer Simulator
          </p>
        </div>

        <div style={{
          padding: '30px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px'
        }}>
          <div style={{
            background: '#f8f9fa',
            borderRadius: '10px',
            padding: '25px',
            borderLeft: '5px solid #2a5298'
          }}>
            <h2 style={{ color: '#2a5298', marginBottom: '20px', fontSize: '1.3em' }}>
              📝 Vrije Notitie
            </h2>
            <textarea
              name="vrijeLnotitie"
              value={formData.vrijeLnotitie}
              onChange={handleInputChange}
              placeholder="Typ hier een beschrijving van het incident..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '15px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'vertical',
                background: 'white'
              }}
            />
          </div>

          <div style={{
            background: '#f8f9fa',
            borderRadius: '10px',
            padding: '25px',
            borderLeft: '5px solid #2a5298'
          }}>
            <h2 style={{ color: '#2a5298', marginBottom: '20px', fontSize: '1.3em' }}>
              📋 Aanname Scherm
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#495057', fontSize: '14px' }}>
                  📍 Locatie
                </label>
                <input
                  type="text"
                  name="locatie"
                  value={formData.locatie}
                  onChange={handleInputChange}
                  placeholder="Voer de locatie in..."
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#495057', fontSize: '14px' }}>
                  ⏰ Tijdstip
                </label>
                <input
                  type="datetime-local"
                  name="tijdstip"
                  value={formData.tijdstip}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#495057', fontSize: '14px' }}>
                  🚨 Soort Melding
                </label>
                <select
                  name="soortMelding"
                  value={formData.soortMelding}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="">Selecteer soort melding...</option>
                  <option value="Inbraak woning">🏠 Inbraak woning</option>
                  <option value="Brandmelding">🔥 Brandmelding</option>
                  <option value="Verkeersongeval">🚗 Verkeersongeval</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#495057', fontSize: '14px' }}>
                  ⚡ Prioriteit (1-5)
                </label>
                <input
                  type="number"
                  name="prioriteit"
                  value={formData.prioriteit}
                  onChange={handleInputChange}
                  min="1"
                  max="5"
                  required
                  style={{
                    maxWidth: '100px',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <span style={{ fontSize: '1.5em' }}>{getPriorityData(formData.prioriteit).emoji}</span>
                  <span style={{
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: '15px',
                    color: 'white',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    backgroundColor: getPriorityData(formData.prioriteit).color
                  }}>
                    {getPriorityData(formData.prioriteit).text}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={createIncidentMutation.isPending}
                style={{
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                }}
              >
                {createIncidentMutation.isPending ? '⏳ Opslaan...' : '💾 Melding Opslaan'}
              </button>
            </form>
          </div>

          <div style={{
            gridColumn: '1 / -1',
            background: '#f8f9fa',
            borderRadius: '10px',
            padding: '25px',
            borderLeft: '5px solid #2a5298',
            marginTop: '20px'
          }}>
            <h2 style={{ color: '#2a5298', marginBottom: '20px', fontSize: '1.3em' }}>
              📋 Opgeslagen Meldingen
            </h2>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {isLoading ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  Laden...
                </p>
              ) : (incidents as GmsIncident[]).length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  Geen meldingen gevonden
                </p>
              ) : (
                (incidents as GmsIncident[]).map((incident: GmsIncident) => {
                  const priorityData = getPriorityData(incident.prioriteit);
                  return (
                    <div
                      key={incident.id}
                      style={{
                        border: '1px solid #e9ecef',
                        marginBottom: '10px',
                        padding: '15px',
                        borderRadius: '8px',
                        background: 'white'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '10px'
                      }}>
                        <div>
                          <strong style={{ color: '#2a5298' }}>{incident.soortMelding}</strong>
                          <span style={{
                            marginLeft: '10px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: 'white',
                            background: priorityData.color
                          }}>
                            {priorityData.emoji} {priorityData.text}
                          </span>
                        </div>
                        <small style={{ color: '#666' }}>#{incident.id}</small>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Locatie:</strong> {incident.locatie}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Tijdstip:</strong> {formatTime(incident.tijdstip)}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Status:</strong> {incident.status}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Aangemaakt:</strong> {formatTime(incident.aangemaaktOp)}
                      </div>
                      <div>
                        <strong>Notitie:</strong> {incident.vrijeLnotitie}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}