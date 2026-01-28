'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import MessageInput from '@/components/MessageInput';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function ConversationPage() {
  const { id } = useParams();
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const conversations = useChatStore((s) => s.conversations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Get conversation at the top level (before any conditional returns)
  const conversation = conversations.find((c) => c.id === id);

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Load organization users
  useEffect(() => {
    if (!token) return;
    
    // TODO: Create API endpoint to get organization users
    // For now, mock data
    setOrgUsers([
      { id: currentUser?.id || '1', name: currentUser?.name || 'You', email: currentUser?.email || '', role: 'ADMIN' },
    ]);
  }, [token, currentUser]);

  // Assign conversation to user
  const handleAssign = async (userId: string | null) => {
    if (!token || !id) return;
    
    setAssigning(true);
    try {
      await apiFetch(
        `/api/conversations/${id}/assign`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ agentId: userId }),
        }
      );
      
      alert(userId ? 'มอบหมายการสนทนาสำเร็จ!' : 'ยกเลิกการมอบหมายสำเร็จ!');
      setShowAssignMenu(false);
      
      // Reload conversations
      const updatedConvs = await apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST, token);
      useChatStore.getState().setConversations(updatedConvs);
    } catch (err: any) {
      console.error('Failed to assign:', err);
      alert('ไม่สามารถมอบหมายได้: ' + (err.message || 'Unknown error'));
    } finally {
      setAssigning(false);
    }
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
                {conversation.assignedAgentId && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    มอบหมายแล้ว
                  </span>
                )}
              </div>
            </div>

            {/* Assign Button */}
            <div className="relative">
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                มอบหมาย
              </button>

              {/* Assign Dropdown */}
              {showAssignMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">มอบหมายให้</h3>
                    <p className="text-xs text-gray-500 mt-1">เลือกสมาชิกในทีมเพื่อดูแลการสนทนานี้</p>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {orgUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAssign(user.id)}
                        disabled={assigning}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        {conversation.assignedAgentId === user.id && (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    
                    {conversation.assignedAgentId && (
                      <>
                        <div className="border-t border-gray-200 my-2"></div>
                        <button
                          onClick={() => handleAssign(null)}
                          disabled={assigning}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg transition-all disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-sm font-semibold">ยกเลิกการมอบหมาย</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
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
