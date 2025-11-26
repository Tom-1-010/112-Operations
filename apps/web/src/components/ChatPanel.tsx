'use client';

import { useState } from 'react';
import { ChatItem, ChatRole } from '../lib/types';
import { mockChatItems } from '../lib/mock';
import { ScrollArea } from './ui/ScrollArea';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Send, Phone, MessageSquare, Terminal } from 'lucide-react';

interface ChatPanelProps {
  chatItems?: ChatItem[];
  onNewMessage?: (message: string) => void;
}

export function ChatPanel({ chatItems = mockChatItems, onNewMessage }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onNewMessage?.(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoleIcon = (role: ChatRole) => {
    switch (role) {
      case ChatRole.CALLER:
        return <Phone className="h-4 w-4" />;
      case ChatRole.DISPATCH:
        return <MessageSquare className="h-4 w-4" />;
      case ChatRole.SYSTEM:
        return <Terminal className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: ChatRole) => {
    switch (role) {
      case ChatRole.CALLER:
        return 'bg-red-500';
      case ChatRole.DISPATCH:
        return 'bg-blue-500';
      case ChatRole.SYSTEM:
        return 'bg-gray-500';
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-full flex-col bg-dark-800 border-r border-dark-700">
      {/* Header */}
      <div className="border-b border-dark-700 p-4">
        <h2 className="text-lg font-semibold text-gray-200">Meldinglogging</h2>
        <p className="text-sm text-gray-400">Gesprek met melder · Logging van eenheden</p>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {chatItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-start space-x-3 ${
                item.role === ChatRole.CALLER ? 'flex-row' : 'flex-row-reverse space-x-reverse'
              }`}
            >
              {/* Avatar */}
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getRoleColor(item.role)}`}>
                {getRoleIcon(item.role)}
              </div>

              {/* Message */}
              <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                item.role === ChatRole.CALLER
                  ? 'bg-red-900/30 border border-red-800/50'
                  : item.role === ChatRole.DISPATCH
                  ? 'bg-blue-900/30 border border-blue-800/50'
                  : 'bg-gray-900/30 border border-gray-800/50'
              }`}>
                <p className="text-sm text-gray-200">{item.text}</p>
                <p className="mt-1 text-xs text-gray-400">{formatTime(item.at)}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-dark-700 p-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Hier een chatbericht"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}









































