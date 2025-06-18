import { useState } from 'react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', icon: 'speedometer2', label: 'Dashboard' },
    { id: 'incidents', icon: 'exclamation-triangle', label: 'Incidenten' },
    { id: 'units', icon: 'truck', label: 'Eenheden' },
    { id: 'gms', icon: 'clipboard-check', label: 'GMS' },
    { id: 'intake', icon: 'telephone', label: 'Intake' },
    { id: 'map', icon: 'geo-alt', label: 'Kaart' },
    { id: 'archive', icon: 'archive', label: 'Archief' },
    { id: 'reports', icon: 'file-text', label: 'Rapporten' },
  ];

  const settingsSubItems = [
    { id: 'settings', icon: 'table', label: 'Basisteams' },
    { id: 'classificaties', icon: 'tags', label: 'Classificaties' },
  ];

  const handleSettingsClick = () => {
    setSettingsExpanded(!settingsExpanded);
  };

  const isSettingsActive = activeSection === 'settings' || activeSection === 'classificaties';

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <i className="bi bi-shield-check" style={{ fontSize: '32px' }}></i>
        <h2>Politie Meldkamer</h2>
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
      </div>
    </nav>
  );
}
