import { Unit } from '../types';

interface UnitsPanelProps {
  units: Unit[];
}

export default function UnitsPanel({ units }: UnitsPanelProps) {
  const unitTypes = {
    patrol: { name: "Patrouille Auto's", icon: 'truck' },
    motorcycle: { name: 'Motor Eenheden', icon: 'bicycle' },
    dog: { name: 'Honden Eenheden', icon: 'heart' },
    riot: { name: 'ME Eenheden', icon: 'shield' },
  };

  const groupedUnits = units.reduce((acc, unit) => {
    if (!acc[unit.type]) acc[unit.type] = [];
    acc[unit.type].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);

  return (
    <div className="section">
      <div className="section-header">
        <h3 className="section-title">Eenheden Status</h3>
      </div>
      <div className="units-grid">
        {Object.entries(groupedUnits).map(([type, typeUnits]) => (
          <div key={type} className="unit-type">
            <div className="unit-type-title">
              <i className={`bi bi-${unitTypes[type as keyof typeof unitTypes].icon}`}></i>
              {unitTypes[type as keyof typeof unitTypes].name}
            </div>
            <div className="unit-list">
              {typeUnits.map((unit) => (
                <div key={unit.id} className={`unit-badge unit-${unit.status}`}>
                  <span className={`status-dot status-${unit.status}`}></span>
                  {unit.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
