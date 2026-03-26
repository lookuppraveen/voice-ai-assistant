'use client';

import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Message } from '@/types';

interface ConversationPanelProps {
  messages: Message[];
}

export const ConversationPanel = ({ messages }: ConversationPanelProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Your conversation will appear here
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full pr-1">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={clsx('flex', {
            'justify-end': msg.role === 'user',
            'justify-start': msg.role === 'assistant',
          })}
        >
          <div
            className={clsx('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed', {
              'bg-blue-600 text-white rounded-br-sm': msg.role === 'user',
              'bg-gray-100 text-gray-800 rounded-bl-sm': msg.role === 'assistant',
            })}
          >
            <p className="text-xs font-semibold mb-1 opacity-70">
              {msg.role === 'user' ? 'You' : 'Prospect'}
            </p>
            {msg.content}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
