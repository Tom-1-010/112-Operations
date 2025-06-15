import { Stats } from '../types';

interface StatsGridProps {
  stats: Stats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statCards = [
    {
      value: stats.newIncidents,
      label: 'Nieuwe Meldingen',
      icon: 'bell',
    },
    {
      value: stats.activeUnits,
      label: 'Actieve Eenheden',
      icon: 'truck',
    },
    {
      value: stats.highPriority,
      label: 'Hoge Prioriteit',
      icon: 'exclamation-triangle-fill',
    },
    {
      value: stats.emergencyCalls,
      label: 'Noodoproepen',
      icon: 'telephone-fill',
    },
  ];

  return (
    <div className="stats-grid">
      {statCards.map((stat, index) => (
        <div key={index} className="stat-card">
          <i className={`bi bi-${stat.icon} stat-icon`}></i>
          <div className="stat-value">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
