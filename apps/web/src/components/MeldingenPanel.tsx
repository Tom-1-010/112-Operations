'use client';

import { AlertTriangle, Clock, MapPin, User } from 'lucide-react';

// Sample data for demonstration
const sampleMeldingen = [
  {
    id: 1,
    type: 'Verkeersongeval',
    priority: 'Hoog',
    location: 'A2, km 15.2',
    time: '14:23',
    status: 'Actief',
    description: 'Frontale aanrijding, 2 gewonden'
  },
  {
    id: 2,
    type: 'Inbraak',
    priority: 'Gemiddeld',
    location: 'Hoofdstraat 123, Amsterdam',
    time: '13:45',
    status: 'Onderweg',
    description: 'Woninginbraak gemeld door buurman'
  },
  {
    id: 3,
    type: 'Overlast',
    priority: 'Laag',
    location: 'Park Vondelpark, Amsterdam',
    time: '12:30',
    status: 'Afgehandeld',
    description: 'Luidruchtige groep jongeren'
  },
  {
    id: 4,
    type: 'Brand',
    priority: 'Hoog',
    location: 'Industrieweg 45, Rotterdam',
    time: '11:15',
    status: 'Actief',
    description: 'Brand in magazijn, rookontwikkeling'
  },
  {
    id: 5,
    type: 'Diefstal',
    priority: 'Gemiddeld',
    location: 'Centrum, Den Haag',
    time: '10:20',
    status: 'Onderweg',
    description: 'Diefstal van fiets bij station'
  }
];

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'Hoog':
      return 'text-red-400 bg-red-900/20 border-red-500/30';
    case 'Gemiddeld':
      return 'text-orange-400 bg-orange-900/20 border-orange-500/30';
    case 'Laag':
      return 'text-green-400 bg-green-900/20 border-green-500/30';
    default:
      return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Actief':
      return 'text-red-400 bg-red-900/20';
    case 'Onderweg':
      return 'text-blue-400 bg-blue-900/20';
    case 'Afgehandeld':
      return 'text-green-400 bg-green-900/20';
    default:
      return 'text-gray-400 bg-gray-900/20';
  }
}

export default function MeldingenPanel() {
  return (
    <div className="dispatch-panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-accent-red" />
          <span>Meldingen</span>
        </h2>
        <div className="text-sm text-gray-400">
          {sampleMeldingen.length} actief
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-3">
          {sampleMeldingen.map((melding) => (
            <div
              key={melding.id}
              className="bg-dark-700 border border-dark-600 rounded-lg p-4 hover:bg-dark-600 transition-colors cursor-pointer"
            >
              {/* Header with priority and time */}
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(melding.priority)}`}>
                  {melding.priority}
                </span>
                <div className="flex items-center space-x-1 text-gray-400 text-sm">
                  <Clock className="w-3 h-3" />
                  <span>{melding.time}</span>
                </div>
              </div>

              {/* Type and status */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white text-sm">{melding.type}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(melding.status)}`}>
                  {melding.status}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center space-x-1 text-gray-400 text-sm mb-2">
                <MapPin className="w-3 h-3" />
                <span>{melding.location}</span>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed">
                {melding.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
