import { useState, useEffect } from 'react';

interface P2000LightboardProps {
  className?: string;
}

interface AlarmData {
  id: string;
  type: string;
  location: string;
  timestamp: string;
  pagerText?: string;
}

export default function P2000Lightboard({ className = '' }: P2000LightboardProps) {
  const [currentAlarm, setCurrentAlarm] = useState<AlarmData | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState({
    date: '',
    time: ''
  });

  // Function to play alarm sound using Web Audio API
  const playAlarmSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a beep pattern (like P2000 alarm)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Could not play alarm sound:', error);
    }
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Format date as DD-MM-YYYY
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const date = `${day}-${month}-${year}`;
      
      // Format time as HH:MM:SS
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const time = `${hours}:${minutes}:${seconds}`;
      
      setCurrentDateTime({ date, time });
    };

    // Update immediately
    updateDateTime();
    
    // Update every second
    const interval = setInterval(updateDateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for P2000 alarm events from GMS2
  useEffect(() => {
    const handleP2000Alarm = (event: CustomEvent) => {
      const alarmData = event.detail;
      setCurrentAlarm({
        id: alarmData.id || "1180000",
        type: alarmData.type || "ALARM",
        location: alarmData.location || "LOCATIE ONBEKEND",
        timestamp: currentDateTime.time + " " + currentDateTime.date,
        pagerText: alarmData.pagerText || ""
      });
      
      // Start blinking for new alarms
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 8000);
      
      // Play alarm sound
      playAlarmSound();
    };

    // Listen for custom P2000 alarm events
    window.addEventListener('p2000-alarm', handleP2000Alarm as EventListener);
    
    return () => {
      window.removeEventListener('p2000-alarm', handleP2000Alarm as EventListener);
    };
  }, [currentDateTime]);

  return (
    <div className={`p2000-lightboard ${className}`}>
      <div className="p2000-header">
        <span className="p2000-title">🛑 P2000</span>
      </div>
      
      {currentAlarm && (
        <div className={`p2000-content ${isBlinking ? 'blink' : ''}`}>
          <div className="p2000-alarm-time">{currentAlarm.timestamp}</div>
          {currentAlarm.pagerText ? (
            <div className="p2000-proc-text">{currentAlarm.pagerText}</div>
          ) : (
            <>
              <div className="p2000-alarm-id">{currentAlarm.id}</div>
              <div className="p2000-alarm-type">{currentAlarm.type}</div>
              <div className="p2000-alarm-location">{currentAlarm.location}</div>
            </>
          )}
        </div>
      )}
      
      {!currentAlarm && (
        <div className="p2000-content p2000-waiting">
          <div className="p2000-waiting-text">WACHTEN OP OPROEP...</div>
        </div>
      )}
    </div>
  );
}
