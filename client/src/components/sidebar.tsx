import { useState, useEffect } from 'react';
import P2000Lightboard from './p2000-lightboard';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  notificationCount?: number;
  onNotificationBadgeClick?: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, notificationCount = 0, onNotificationBadgeClick }: SidebarProps) {
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [brwSettingsExpanded, setBrwSettingsExpanded] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState({
    date: '',
    time: ''
  });
  // notificationCount komt nu als prop binnen

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

  const menuItems = [
    { id: 'dashboard', icon: 'speedometer2', label: 'Dashboard' },
    { id: 'gms-eenheden', icon: 'people', label: 'Eenheden' },
    { id: 'brw-eenheden', icon: 'fire', label: 'BRW eenheden' },
    { id: 'gms2', icon: 'window', label: 'GMS' },
    { id: 'map', icon: 'map', label: 'Map' },
    { id: 'kazernes', icon: 'building', label: 'Kazernes' },
    { id: 'inzetrollen', icon: 'people', label: 'Inzetrollen' },
  ];

  const settingsSubItems = [
    { id: 'basisteams', icon: 'table', label: 'Basisteams' },
    { id: 'classificaties', icon: 'tags', label: 'Classificaties' },
  ];

  const brwSettingsSubItems = [
    { id: 'voertuigtypes', icon: 'truck', label: 'Voertuigtypes' },
    { id: 'inzetrollen', icon: 'people', label: 'Inzetrollen' },
  ];

  const handleSettingsClick = () => {
    setSettingsExpanded(!settingsExpanded);
  };

  const handleBrwSettingsClick = () => {
    setBrwSettingsExpanded(!brwSettingsExpanded);
  };

  const isSettingsActive = activeSection === 'basisteams' || activeSection === 'classificaties';
  const isBrwSettingsActive = activeSection === 'voertuigtypes' || activeSection === 'inzetrollen';

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h2>Operationeel Centrum</h2>
          <div 
            className={`notification-badge ${notificationCount > 0 ? 'clickable' : ''}`}
            onClick={notificationCount > 0 ? onNotificationBadgeClick : undefined}
            style={{ cursor: notificationCount > 0 ? 'pointer' : 'default' }}
          >
            {notificationCount}
          </div>
        </div>
        <div className="sidebar-date-time">
          <span>{currentDateTime.date}</span>
          <span>{currentDateTime.time}</span>
        </div>
      </div>
      <div className="sidebar-nav">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onSectionChange(item.id)}
          >
            <i className={`bi bi-${item.icon}`}></i>
            <span>{item.label}</span>
          </div>
        ))}

        {/* Settings menu with dropdown */}
        <div className={`nav-item nav-dropdown ${isSettingsActive ? 'active' : ''}`}>
          <div className="nav-item-main" onClick={handleSettingsClick}>
            <i className="bi bi-gear"></i>
            <span>Instellingen</span>
            <i className={`bi bi-chevron-${settingsExpanded ? 'down' : 'right'} nav-arrow`}></i>
          </div>
          {settingsExpanded && (
            <div className="nav-submenu">
              {settingsSubItems.map((subItem) => (
                <div
                  key={subItem.id}
                  className={`nav-subitem ${activeSection === subItem.id ? 'active' : ''}`}
                  onClick={() => onSectionChange(subItem.id)}
                >
                  <i className={`bi bi-${subItem.icon}`}></i>
                  <span>{subItem.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BRW-instellingen menu with dropdown */}
        <div className={`nav-item nav-dropdown ${isBrwSettingsActive ? 'active' : ''}`}>
          <div className="nav-item-main" onClick={handleBrwSettingsClick}>
            <i className="bi bi-sliders"></i>
            <span>BRW-instellingen</span>
            <i className={`bi bi-chevron-${brwSettingsExpanded ? 'down' : 'right'} nav-arrow`}></i>
          </div>
          {brwSettingsExpanded && (
            <div className="nav-submenu">
              {brwSettingsSubItems.map((subItem) => (
                <div
                  key={subItem.id}
                  className={`nav-subitem ${activeSection === subItem.id ? 'active' : ''}`}
                  onClick={() => onSectionChange(subItem.id)}
                >
                  <i className={`bi bi-${subItem.icon}`}></i>
                  <span>{subItem.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* P2000 Lightboard at the bottom */}
      <P2000Lightboard />
    </nav>
  );
}