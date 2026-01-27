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
  const conversations = useChatStore((s) => s.conversations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get conversation at the top level (before any conditional returns)
  const conversation = conversations.find((c) => c.id === id);

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

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
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      {conversation && (
        <div className="bg-white border-b-2 border-gray-200 px-6 py-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {conversation.customer?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {conversation.customer?.name || 'Unknown Customer'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  {conversation.platform.type.toUpperCase()}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  conversation.status === 'open' ? 'bg-green-100 text-green-700' :
                  conversation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {conversation.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-600">No messages yet</p>
              <p className="text-sm text-gray-400 mt-1">Start the conversation below!</p>
            </div>
          </div>
        ) : (
          messages.map((m, index) => {
            const showTimestamp = index === 0 || 
              (messages[index - 1] && new Date(m.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000);
            
            return (
              <div key={m.id}>
                {showTimestamp && (
                  <div className="text-center my-4">
                    <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                      {formatMessageTime(m.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${
                    m.senderType === 'customer' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-md ${
                      m.senderType === 'customer'
                        ? 'bg-white text-gray-900 border-2 border-gray-200'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    }`}
                  >
                    <p className="text-base whitespace-pre-wrap break-words leading-relaxed font-medium">
                      {m.content}
                    </p>
                    <div className={`text-xs mt-2 ${
                      m.senderType === 'customer' ? 'text-gray-400' : 'text-blue-100'
                    }`}>
                      {formatMessageTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <MessageInput conversationId={id as string} />
    </div>
  );
}
