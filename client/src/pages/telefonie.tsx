import { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, Clock, User, MapPin, Save, Share2, Plus, History } from 'lucide-react';

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
  const [frequentNumbers, setFrequentNumbers] = useState<string[]>([
    '0900-8844', // Politie niet-spoed
    '0900-1450', // Brandweer niet-spoed
    '088-6661100', // GGD
    '0800-1351', // Veilig thuis
  ]);

  // Simulate incoming call
  const simulateIncomingCall = () => {
    const newCall: ActiveCall = {
      id: Date.now().toString(),
      phoneNumber: '06-12345678',
      callerName: 'Onbekend',
      location: 'Rotterdam Centrum',
      startTime: new Date(),
      status: 'active',
      messages: [
        {
          id: '1',
          sender: 'system',
          message: 'Gesprek gestart',
          timestamp: new Date(),
          type: 'system'
        },
        {
          id: '2',
          sender: 'caller',
          message: 'Hallo, ik wil graag aangifte doen van een diefstal.',
          timestamp: new Date(),
          type: 'text'
        }
      ]
    };
    setActiveCall(newCall);
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
    }
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
          <button className="btn btn-primary" onClick={simulateIncomingCall}>
            <Plus size={16} />
            Simuleer Inkomende Oproep
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
            <h2>Gespreksgeschiedenis</h2>
            <History size={20} />
          </div>
          <div className="history-content">
            {callHistory.length === 0 ? (
              <div className="no-history">
                <p>Geen gespreksgeschiedenis beschikbaar</p>
              </div>
            ) : (
              <div className="history-list">
                {callHistory.slice(0, 10).map((call) => (
                  <div key={call.id} className="history-item">
                    <div className="history-main">
                      <div className="history-number">{call.phoneNumber}</div>
                      <div className="history-time">
                        {formatTime(call.startTime)}
                        {call.duration && (
                          <span className="duration"> - {formatDuration(call.duration)}</span>
                        )}
                      </div>
                    </div>
                    <div className="history-details">
                      <div className={`history-status ${call.status}`}>
                        {call.status === 'completed' && 'Voltooid'}
                        {call.status === 'ongoing' && 'Lopend'}
                        {call.status === 'failed' && 'Mislukt'}
                        {call.status === 'transferred' && 'Doorverbonden'}
                      </div>
                      {call.summary && (
                        <div className="history-summary">{call.summary}</div>
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