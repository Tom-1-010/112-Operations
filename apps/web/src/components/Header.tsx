'use client';

import { useState } from 'react';
import { Menu, Plus, Settings, Info } from 'lucide-react';
import { IntakeModal } from './IntakeModal';
import { IntakeForm } from '../lib/types';

export default function Header() {
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);

  const handleIntakeSubmit = (form: IntakeForm) => {
    console.log('New incident created:', form);
    // Here you would typically send the data to your backend
  };

  return (
    <>
      <header className="bg-dark-800 border-b border-dark-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MS</span>
              </div>
              <h1 className="text-xl font-bold text-white">MeldkamerSpel</h1>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex items-center space-x-1">
            <button 
              onClick={() => setIsIntakeModalOpen(true)}
              className="dispatch-button flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Melding aanmaken</span>
            </button>
            
            <button className="dispatch-button flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium">
              <Settings className="w-4 h-4" />
              <span>Instellingen</span>
            </button>
            
            <button className="dispatch-button flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium">
              <Info className="w-4 h-4" />
              <span>Info</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Intake Modal */}
      <IntakeModal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        onSubmit={handleIntakeSubmit}
      />
    </>
  );
}
