'use client';

import { Car, MapPin, Clock, Radio, Users } from 'lucide-react';

// Sample data for demonstration
const sampleEenheden = [
  {
    id: 1,
    type: 'Politie',
    unit: 'P-01',
    status: 'Beschikbaar',
    location: 'Hoofdbureau Amsterdam',
    lastUpdate: '14:25',
    crew: ['Jan de Vries', 'Lisa Bakker'],
    radio: 'Kanaal 1'
  },
  {
    id: 2,
    type: 'Ambulance',
    unit: 'A-15',
    status: 'Onderweg',
    location: 'A2, km 15.2',
    lastUpdate: '14:20',
    crew: ['Mark van Dijk', 'Sarah Jansen'],
    radio: 'Kanaal 3'
  },
  {
    id: 3,
    type: 'Brandweer',
    unit: 'B-07',
    status: 'Inzet',
    location: 'Industrieweg 45, Rotterdam',
    lastUpdate: '11:15',
    crew: ['Tom Hendriks', 'Emma de Wit', 'Piet Smit'],
    radio: 'Kanaal 2'
  },
  {
    id: 4,
    type: 'Politie',
    unit: 'P-23',
    status: 'Beschikbaar',
    location: 'Bureau Centrum, Den Haag',
    lastUpdate: '14:10',
    crew: ['Anna Mulder', 'Rob van der Berg'],
    radio: 'Kanaal 1'
  },
  {
    id: 5,
    type: 'Ambulance',
    unit: 'A-08',
    status: 'Pauze',
    location: 'Ziekenhuis AMC, Amsterdam',
    lastUpdate: '13:45',
    crew: ['Lisa van Dam', 'Paul de Jong'],
    radio: 'Kanaal 3'
  }
];

function getStatusColor(status: string) {
  switch (status) {
    case 'Beschikbaar':
      return 'text-green-400 bg-green-900/20 border-green-500/30';
    case 'Onderweg':
      return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
    case 'Inzet':
      return 'text-red-400 bg-red-900/20 border-red-500/30';
    case 'Pauze':
      return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
    default:
      return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'Politie':
      return <Car className="w-4 h-4 text-blue-400" />;
    case 'Ambulance':
      return <Car className="w-4 h-4 text-red-400" />;
    case 'Brandweer':
      return <Car className="w-4 h-4 text-orange-400" />;
    default:
      return <Car className="w-4 h-4 text-gray-400" />;
  }
}

export default function EenhedenPanel() {
  return (
    <div className="dispatch-panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Users className="w-5 h-5 text-accent-blue" />
          <span>Eenheden</span>
        </h2>
        <div className="text-sm text-gray-400">
          {sampleEenheden.length} totaal
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-3">
          {sampleEenheden.map((eenheid) => (
            <div
              key={eenheid.id}
              className="bg-dark-700 border border-dark-600 rounded-lg p-4 hover:bg-dark-600 transition-colors cursor-pointer"
            >
              {/* Header with type and status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(eenheid.type)}
                  <span className="font-medium text-white text-sm">{eenheid.unit}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(eenheid.status)}`}>
                  {eenheid.status}
                </span>
              </div>

              {/* Type */}
              <div className="text-gray-300 text-sm mb-2">
                {eenheid.type}
              </div>

              {/* Location */}
              <div className="flex items-center space-x-1 text-gray-400 text-sm mb-2">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{eenheid.location}</span>
              </div>

              {/* Radio channel */}
              <div className="flex items-center space-x-1 text-gray-400 text-sm mb-3">
                <Radio className="w-3 h-3" />
                <span>{eenheid.radio}</span>
              </div>

              {/* Crew */}
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-1">Bemanning:</div>
                <div className="space-y-1">
                  {eenheid.crew.map((member, index) => (
                    <div key={index} className="text-sm text-gray-300">
                      {member}
                    </div>
                  ))}
                </div>
              </div>

              {/* Last update */}
              <div className="flex items-center space-x-1 text-gray-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>Laatste update: {eenheid.lastUpdate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
