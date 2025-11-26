'use client';

import { useState, useEffect } from 'react';
import { IntakeForm, ChatItem, ChatRole } from '../lib/types';
import { ChatPanel } from './ChatPanel';
import { DetailPanel } from './DetailPanel';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (form: IntakeForm) => void;
}

export function IntakeModal({ isOpen, onClose, onSubmit }: IntakeModalProps) {
  const [form, setForm] = useState<IntakeForm>({
    address: '',
    location: undefined,
    mc: [],
    priority: 3,
  });

  const [chatItems, setChatItems] = useState<ChatItem[]>([
    {
      id: '1',
      role: ChatRole.CALLER,
      text: 'Er wordt ingebroken',
      at: new Date().toISOString(),
    },
    {
      id: '2',
      role: ChatRole.DISPATCH,
      text: 'Wat is het adres?',
      at: new Date(Date.now() + 1000).toISOString(),
    },
    {
      id: '3',
      role: ChatRole.CALLER,
      text: 'Laan op Zuid 12 Rotterdam',
      at: new Date(Date.now() + 2000).toISOString(),
    },
    {
      id: '4',
      role: ChatRole.DISPATCH,
      text: 'Hoeveel inbrekers ziet u?',
      at: new Date(Date.now() + 3000).toISOString(),
    },
    {
      id: '5',
      role: ChatRole.SYSTEM,
      text: 'RT1101 gekoppeld',
      at: new Date(Date.now() + 4000).toISOString(),
    },
  ]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        address: '',
        location: undefined,
        mc: [],
        priority: 3,
      });
    }
  }, [isOpen]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll and hide overflow
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Restore body scroll
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
      document.body.style.height = 'unset';
    };
  }, [isOpen, onClose]);

  const handleNewMessage = (message: string) => {
    const newChatItem: ChatItem = {
      id: Date.now().toString(),
      role: ChatRole.DISPATCH,
      text: message,
      at: new Date().toISOString(),
    };
    setChatItems(prev => [...prev, newChatItem]);
  };

  const handleFormChange = (newForm: IntakeForm) => {
    setForm(newForm);
  };

  const handleSubmit = () => {
    if (form.address.trim() && form.mc.length > 0) {
      onSubmit?.(form);
      
      // Add system message about submission
      const systemMessage: ChatItem = {
        id: Date.now().toString(),
        role: ChatRole.SYSTEM,
        text: `Melding verstuurd: ${form.address} - Prioriteit ${form.priority}`,
        at: new Date().toISOString(),
      };
      setChatItems(prev => [...prev, systemMessage]);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-dark-900/95 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] max-w-7xl bg-dark-900 rounded-lg shadow-2xl border border-dark-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-700 bg-dark-800 px-6 py-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-200">Melding opmaken</h1>
            <span className="text-sm text-gray-400">· Instellingen · Info</span>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex h-[calc(100%-73px)] overflow-hidden">
          {/* Left Panel - Chat */}
          <div className="w-1/2">
            <ChatPanel 
              chatItems={chatItems}
              onNewMessage={handleNewMessage}
            />
          </div>
          
          {/* Right Panel - Details */}
          <div className="w-1/2">
            <DetailPanel
              form={form}
              onFormChange={handleFormChange}
              onSubmit={handleSubmit}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
