'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import MessageInput from '@/components/MessageInput';

export default function ConversationPage() {
  const { id } = useParams();
  const token = useAuthStore((s) => s.token);
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;

    setLoading(true);
    setError('');

    apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.MESSAGES(id as string), token)
      .then((data) => {
        setMessages(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
        setError(err.message || 'Failed to load messages');
        setLoading(false);
      });
  }, [id, token, setMessages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.warn('Socket not connected yet');
      return;
    }

    const handleNewMessage = (payload: any) => {
      if (payload.conversationId === id) {
        addMessage(payload.message);
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [id, addMessage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.senderType === 'customer' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${
                  m.senderType === 'customer'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <MessageInput conversationId={id as string} />
    </div>
  );
}
