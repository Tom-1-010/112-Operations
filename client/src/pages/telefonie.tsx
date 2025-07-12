import { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, Clock, User, MapPin, Save, Share2, Plus, History, AlertTriangle, MessageCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ActiveCall {
  id: string;
  phoneNumber: string;
  callerName?: string;
  location?: string;
  startTime: Date;
  status: 'active' | 'on_hold' | 'transferring';
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  sender: 'caller' | 'operator';
  message: string;
  timestamp: Date;
  type: 'text' | 'system';
}

interface CallHistory {
  id: string;
  phoneNumber: string;
  callerName?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'completed' | 'ongoing' | 'failed' | 'transferred';
  summary?: string;
}

export default function TelefoniePage() {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [dialNumber, setDialNumber] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [frequentNumbers, setFrequentNumbers] = useState<string[]>([
    '0900-8844', // Politie niet-spoed
    '0900-1450', // Brandweer niet-spoed
    '088-6661100', // GGD
    '0800-1351', // Veilig thuis
  ]);

  const queryClient = useQueryClient();

  // Fetch emergency calls from database
  const { data: emergencyCalls = [], isLoading } = useQuery({
    queryKey: ['/api/emergency-calls'],
    queryFn: async () => {
      const response = await fetch('/api/emergency-calls');
      if (!response.ok) throw new Error('Failed to fetch emergency calls');
      return response.json();
    }
  });

  // Mutation to generate new emergency call
  const generateEmergencyCall = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/emergency-calls/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to generate emergency call');
      return response.json();
    },
    onSuccess: (newCall) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-calls'] });
      
      // Create realistic call scenario based on the template data
      const templateData = newCall.templateData;
      let initialMessage = '';
      
      if (templateData) {
        // Generate realistic opening based on template
        const openingPhrases = {
          'slachtoffer': [
            'Hallo, ik moet de politie hebben. Er is net...',
            'Hallo, ik wil aangifte doen van...',
            'Hallo politie, ik ben net...',
            'Hallo, ik heb hulp nodig. Er is...'
          ],
          'omstander': [
            'Hallo, ik zie hier iets verdachts gebeuren...',
            'Hallo politie, ik ben getuige van...',
            'Hallo, ik zie hier een situatie die niet goed is...',
            'Hallo, ik wil een melding doen van iets wat ik zie...'
          ],
          'betrokkene': [
            'Hallo, ik moet melding doen van een incident...',
            'Hallo politie, er is hier iets gebeurd...',
            'Hallo, ik wil een situatie melden...',
            'Hallo, ik ben betrokken bij een incident...'
          ]
        };
        
        const phrases = openingPhrases[templateData.melderType] || openingPhrases['slachtoffer'];
        const randomOpening = phrases[Math.floor(Math.random() * phrases.length)];
        
        // Create initial message based on template
        initialMessage = `${randomOpening} ${templateData.classificatie.toLowerCase()}. ${templateData.situatie}`;
      } else {
        // Fallback to simple scenario
        initialMessage = newCall.description || 'Er is een incident gebeurd waar ik melding van wil doen.';
      }

      // Start simulated call with realistic data
      const simulatedCall: ActiveCall = {
        id: newCall.id.toString(),
        phoneNumber: newCall.phoneNumber,
        callerName: newCall.callerName || 'Onbekend',
        location: newCall.callerLocation || newCall.address,
        startTime: new Date(newCall.callStartTime),
        status: 'active',
        messages: [
          {
            id: '1',
            sender: 'system',
            message: `Inkomende 112-melding ontvangen - ${templateData?.categorie || 'Politie'} ${templateData?.spoed ? '(SPOED)' : ''}`,
            timestamp: new Date(),
            type: 'system'
          },
          {
            id: '2',
            sender: 'caller',
            message: initialMessage,
            timestamp: new Date(),
            type: 'text'
          }
        ]
      };
      setActiveCall(simulatedCall);
      setCurrentTemplate(templateData);
      setQuestionIndex(0);
    },
    onError: (error) => {
      console.error('Error generating emergency call:', error);
    }
  });

  // Simulate incoming call - now generates real database entry
  const simulateIncomingCall = () => {
    generateEmergencyCall.mutate();
  };

  const endCall = () => {
    if (activeCall) {
      const callRecord: CallHistory = {
        id: activeCall.id,
        phoneNumber: activeCall.phoneNumber,
        callerName: activeCall.callerName,
        startTime: activeCall.startTime,
        endTime: new Date(),
        duration: Math.floor((new Date().getTime() - activeCall.startTime.getTime()) / 1000),
        status: 'completed',
        summary: 'Melding geregistreerd'
      };
      setCallHistory(prev => [callRecord, ...prev]);
      setActiveCall(null);
      setCurrentTemplate(null);
      setQuestionIndex(0);
    }
  };

  // Intelligent question helper based on 112 templates
  const getNextQuestion = () => {
    if (!currentTemplate || !currentTemplate.intakeVragen) return null;
    
    const questions = currentTemplate.intakeVragen;
    if (questionIndex >= questions.length) return null;
    
    return questions[questionIndex];
  };

  const askNextQuestion = () => {
    const nextQuestion = getNextQuestion();
    if (!nextQuestion || !activeCall) return;
    
    const questionMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'operator',
      message: nextQuestion.vraag,
      timestamp: new Date(),
      type: 'text'
    };
    
    setActiveCall({
      ...activeCall,
      messages: [...activeCall.messages, questionMessage]
    });
    
    setQuestionIndex(prev => prev + 1);
  };

  const transferToGMS = () => {
    if (activeCall) {
      const updatedCall = { ...activeCall, status: 'transferring' as const };
      setActiveCall(updatedCall);
      // Simulate transfer
      setTimeout(() => {
        endCall();
      }, 2000);
    }
  };

  const sendMessage = () => {
    if (currentMessage.trim() && activeCall) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'operator',
        message: currentMessage,
        timestamp: new Date(),
        type: 'text'
      };
      setActiveCall({
        ...activeCall,
        messages: [...activeCall.messages, newMessage]
      });
      setCurrentMessage('');
    }
  };

  const dialCall = () => {
    if (dialNumber.trim()) {
      const newCall: ActiveCall = {
        id: Date.now().toString(),
        phoneNumber: dialNumber,
        startTime: new Date(),
        status: 'active',
        messages: [
          {
            id: '1',
            sender: 'system',
            message: `Uitgaand gesprek naar ${dialNumber}`,
            timestamp: new Date(),
            type: 'system'
          }
        ]
      };
      setActiveCall(newCall);
      setDialNumber('');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="telefonie-container">
      <div className="telefonie-header">
        <div className="header-left">
          <Phone className="header-icon" />
          <h1>Telefonie</h1>
        </div>
        <div className="header-right">
          <button 
            className="btn btn-primary" 
            onClick={simulateIncomingCall}
            disabled={generateEmergencyCall.isPending}
          >
            <Plus size={16} />
            {generateEmergencyCall.isPending ? 'Genereert...' : 'Simuleer Inkomende Oproep'}
          </button>
        </div>
      </div>

      <div className="telefonie-content">
        {/* Active Call Panel */}
        <div className="active-call-panel">
          <div className="panel-header">
            <h2>Actief Gesprek</h2>
            {activeCall && (
              <div className="call-status">
                <div className={`status-indicator ${activeCall.status}`}></div>
                <span>
                  {activeCall.status === 'active' && 'Actief'}
                  {activeCall.status === 'on_hold' && 'In de wacht'}
                  {activeCall.status === 'transferring' && 'Doorverbinden...'}
                </span>
              </div>
            )}
          </div>

          {activeCall ? (
            <div className="active-call-content">
              {/* Caller Information */}
              <div className="caller-info">
                <div className="caller-details">
                  <div className="caller-item">
                    <Phone size={16} />
                    <span>{activeCall.phoneNumber}</span>
                  </div>
                  <div className="caller-item">
                    <User size={16} />
                    <span>{activeCall.callerName || 'Onbekend'}</span>
                  </div>
                  {activeCall.location && (
                    <div className="caller-item">
                      <MapPin size={16} />
                      <span>{activeCall.location}</span>
                    </div>
                  )}
                  <div className="caller-item">
                    <Clock size={16} />
                    <span>Gestart: {formatTime(activeCall.startTime)}</span>
                  </div>
                </div>
              </div>

              {/* Chat Window */}
              <div className="chat-window">
                <div className="chat-messages">
                  {activeCall.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.sender} ${message.type}`}
                    >
                      <div className="message-content">
                        {message.message}
                      </div>
                      <div className="message-time">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type uw antwoord..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button onClick={sendMessage}>Verstuur</button>
                </div>
              </div>

              {/* Intelligent Question Helper */}
              {currentTemplate && (
                <div className="question-helper">
                  <div className="helper-header">
                    <h3>Gesprekshulp</h3>
                    {currentTemplate.spoed && (
                      <span className="spoed-indicator">
                        <AlertTriangle size={16} />
                        SPOED
                      </span>
                    )}
                  </div>
                  <div className="template-info">
                    <span className="template-category">{currentTemplate.categorie}</span>
                    <span className="template-subcategory">{currentTemplate.subcategorie}</span>
                  </div>
                  {getNextQuestion() && (
                    <div className="next-question">
                      <p><strong>Volgende vraag:</strong></p>
                      <p>{getNextQuestion().vraag}</p>
                      <button className="btn btn-info" onClick={askNextQuestion}>
                        <MessageCircle size={16} />
                        Stel Vraag
                      </button>
                    </div>
                  )}
                  {currentTemplate.locatieContextPrompt && (
                    <div className="location-context">
                      <p><strong>Locatie context:</strong></p>
                      <p>{currentTemplate.locatieContextPrompt}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Call Actions */}
              <div className="call-actions">
                <button className="btn btn-danger" onClick={endCall}>
                  <PhoneOff size={16} />
                  Beëindig Gesprek
                </button>
                <button className="btn btn-warning" onClick={transferToGMS}>
                  <Share2 size={16} />
                  Doorverbind naar GMS
                </button>
                <button className="btn btn-success">
                  <Save size={16} />
                  Opslaan Melding
                </button>
              </div>
            </div>
          ) : (
            <div className="no-active-call">
              <Phone size={48} />
              <h3>Geen actief gesprek</h3>
              <p>Wacht op inkomende oproep of start een uitgaand gesprek</p>
            </div>
          )}
        </div>

        {/* Dialer Panel */}
        <div className="dialer-panel">
          <div className="panel-header">
            <h2>Uitbellen</h2>
          </div>
          <div className="dialer-content">
            <div className="dial-input">
              <input
                type="tel"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder="Voer telefoonnummer in..."
              />
              <button className="btn btn-primary" onClick={dialCall}>
                <PhoneCall size={16} />
                Bel
              </button>
            </div>
            
            <div className="frequent-numbers">
              <h3>Veelgebruikte Nummers</h3>
              <div className="numbers-grid">
                {frequentNumbers.map((number, index) => (
                  <div key={index} className="number-item" onClick={() => setDialNumber(number)}>
                    <Phone size={14} />
                    <span>{number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Call History */}
        <div className="call-history-panel">
          <div className="panel-header">
            <h2>112 Meldingen</h2>
            <History size={20} />
          </div>
          <div className="history-content">
            {isLoading ? (
              <div className="loading">
                <p>Laden van meldingen...</p>
              </div>
            ) : emergencyCalls.length === 0 ? (
              <div className="no-history">
                <p>Geen 112-meldingen beschikbaar</p>
              </div>
            ) : (
              <div className="history-list">
                {emergencyCalls.slice(0, 10).map((call: any) => (
                  <div key={call.id} className="history-item">
                    <div className="history-main">
                      <div className="history-number">{call.phoneNumber}</div>
                      <div className="history-caller">{call.callerName || 'Onbekend'}</div>
                      <div className="history-time">
                        {formatTime(new Date(call.callStartTime))}
                        {call.callDuration && (
                          <span className="duration"> - {formatDuration(call.callDuration)}</span>
                        )}
                      </div>
                    </div>
                    <div className="history-details">
                      <div className={`history-status ${call.callStatus}`}>
                        {call.callStatus === 'completed' && 'Voltooid'}
                        {call.callStatus === 'active' && 'Actief'}
                        {call.callStatus === 'failed' && 'Mislukt'}
                        {call.callStatus === 'transferred' && 'Doorverbonden'}
                      </div>
                      <div className={`emergency-type ${call.emergencyType}`}>
                        {call.emergencyType === 'police' && 'Politie'}
                        {call.emergencyType === 'fire' && 'Brandweer'}
                        {call.emergencyType === 'medical' && 'Medisch'}
                        {call.emergencyType === 'other' && 'Anders'}
                      </div>
                      <div className="urgency-level">
                        Urgentie: {call.urgencyLevel}/5
                      </div>
                      {call.description && (
                        <div className="history-description">{call.description}</div>
                      )}
                      {call.address && (
                        <div className="history-address">{call.address}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}