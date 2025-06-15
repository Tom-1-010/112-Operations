interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', icon: 'speedometer2', label: 'Dashboard' },
    { id: 'incidents', icon: 'exclamation-triangle', label: 'Incidenten' },
    { id: 'units', icon: 'truck', label: 'Eenheden' },
    { id: 'map', icon: 'geo-alt', label: 'Kaart' },
    { id: 'archive', icon: 'archive', label: 'Archief' },
    { id: 'reports', icon: 'file-text', label: 'Rapporten' },
    { id: 'settings', icon: 'gear', label: 'Instellingen' },
  ];

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
      </div>
    </nav>
  );
}
