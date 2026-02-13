'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { connectSocket, getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import MessageInput from '@/components/MessageInput';
import NotesPanel from '@/components/NotesPanel';
import PromptPayQRCode from '@/components/PromptPayQRCode';
import ConversationHeader from '@/components/ConversationHeader';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type CustomerSummary = {
  id: string;
  name?: string;
  mobile?: string;
  email?: string;
  importantKey?: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  senderType?: string;
  content?: string;
  contentType?: string;
  imageUrl?: string;
  platformMessageId?: string;
  createdAt?: string;
  sentAt?: string;
  updatedAt?: string;
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
  const [showNotes, setShowNotes] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrPhoneNumber, setQRPhoneNumber] = useState('');
  const [qrAmount, setQRAmount] = useState<number | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState<CustomerSummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Get conversation at the top level (before any conditional returns)
  const conversation = conversations.find((c) => c.id === id);

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageTimestamp = (m: ChatMessage): number => {
    const candidates = [m.sentAt, m.createdAt, m.updatedAt];
    for (const value of candidates) {
      if (!value) continue;
      const ts = new Date(value).getTime();
      if (Number.isFinite(ts)) return ts;
    }
    return Date.now();
  };

  const getMessageTimeLabel = (m: ChatMessage): string => {
    const candidates = [m.sentAt, m.createdAt, m.updatedAt];
    for (const value of candidates) {
      if (!value) continue;
      const ts = new Date(value).getTime();
      if (Number.isFinite(ts)) return formatMessageTime(value);
    }
    return '';
  };

  const isLikelyDuplicateAgentMessage = (prev: ChatMessage, current: ChatMessage): boolean => {
    if (!prev || !current) return false;
    if (prev.senderType !== 'agent' || current.senderType !== 'agent') return false;

    const prevContent = (prev.content || '').trim();
    const currentContent = (current.content || '').trim();
    const prevType = (prev.contentType || 'text').toLowerCase();
    const currentType = (current.contentType || 'text').toLowerCase();
    const prevMedia = prev.imageUrl || '';
    const currentMedia = current.imageUrl || '';

    if (prevContent !== currentContent) return false;
    if (prevType !== currentType) return false;
    if (prevMedia !== currentMedia) return false;

    // If both have platform message IDs and they differ, treat as different messages.
    if (prev.platformMessageId && current.platformMessageId && prev.platformMessageId !== current.platformMessageId) {
      return false;
    }

    const prevTs = getMessageTimestamp(prev);
    const currentTs = getMessageTimestamp(current);
    return Math.abs(currentTs - prevTs) <= 15000;
  };

  const visibleMessages = useMemo(() => {
    const filtered: ChatMessage[] = [];
    for (const message of messages as ChatMessage[]) {
      const prev = filtered[filtered.length - 1];
      if (prev && isLikelyDuplicateAgentMessage(prev, message)) {
        continue;
      }
      filtered.push(message);
    }
    return filtered;
  }, [messages]);

  const getMediaUrl = (m: any): string | null => {
    if (!m?.imageUrl || typeof m.imageUrl !== 'string') return null;
    return m.imageUrl;
  };

  const isVideoMessage = (m: any): boolean => {
    const contentType = String(m?.contentType || '').toLowerCase();
    const mediaUrl = getMediaUrl(m);
    return contentType.startsWith('video') || Boolean(mediaUrl && mediaUrl.startsWith('data:video/'));
  };

  // Check if message contains payment info
  const isPaymentMessage = (content: string) => {
    const paymentKeywords = [
      'payment method',
      'scan QR Code',
      'promptpay',
      'payment',
      'pay',
      'payment',
      'QR Code',
      '0812345678'
    ];
    return paymentKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
  };

  // Extract phone number from payment message
  const extractPhoneFromMessage = (content: string): string => {
    const phoneMatch = content.match(/promptpay:\s*(\d{10})/i);
    return phoneMatch ? phoneMatch[1] : '0812345678';
  };

  const handleShowQRCode = (content: string) => {
    const phone = extractPhoneFromMessage(content);
    setQRPhoneNumber(phone);
    setQRAmount(undefined); // or extract from message if available
    setShowQRCode(true);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!token || !id) return;

    apiFetch(`/api/customer-summaries/conversation/${id}`, token)
      .then((data) => setAiSummary(data))
      .catch(() => setAiSummary(null));
  }, [id, token]);

  // Load organization users
  useEffect(() => {
    if (!token) return;
    
    // Fetch team members from API
    apiFetch(API_CONFIG.ENDPOINTS.USERS.TEAM, token)
      .then((users) => {
        console.log('✅ Team members loaded:', users);
        setOrgUsers(users);
      })
      .catch((error) => {
        console.error('❌ Failed to load team members:', error);
        // Fallback to current user only
        setOrgUsers([
          { id: currentUser?.id || '1', name: currentUser?.name || 'You', email: currentUser?.email || '', role: 'ADMIN' },
        ]);
      });
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
      
      alert(userId ? 'Conversation assigned successfully!' : 'Assignment removed successfully!');
      setShowAssignMenu(false);
      
      // Reload conversations
      const updatedConvs = await apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST, token);
      useChatStore.getState().setConversations(updatedConvs);
    } catch (err: any) {
      console.error('Failed to assign:', err);
      alert('Failed to assign: ' + (err.message || 'Unknown error'));
    } finally {
      setAssigning(false);
    }
  };

  // Resume AI auto-reply
  const handleResumeAI = async () => {
    if (!token || !id) return;
    
    const confirmed = window.confirm('Resume AI auto-reply for this conversation?\n\nAI will start responding to messages automatically again.');
    if (!confirmed) return;
    
    try {
      const updatedConv = await apiFetch(
        `/api/conversations/${id}/resume-ai`,
        token,
        {
          method: 'POST',
        }
      );
      
      console.log('✅ Resume AI response:', updatedConv);
      
      // Reload all conversations to update the list
      const updatedConvs = await apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST, token);
      useChatStore.getState().setConversations(updatedConvs);
      
      alert('✅ AI auto-reply resumed! AI will now respond to new messages automatically.');
      
      // Force re-render by reloading the page (optional but ensures clean state)
      window.location.reload();
    } catch (err: any) {
      console.error('❌ Failed to resume AI:', err);
      alert('Failed to resume AI: ' + (err.message || 'Unknown error'));
    }
  };

  const handleGenerateSummary = async () => {
    if (!token || !id) return;

    setGeneratingSummary(true);
    try {
      const summary = await apiFetch(
        `/api/customer-summaries/conversation/${id}/generate`,
        token,
        { method: 'POST' },
      );
      setAiSummary(summary);
      alert('AI summary generated');
    } catch (err: any) {
      alert('Failed to generate AI summary: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingSummary(false);
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

  // Quick resync after page opens to avoid needing manual refresh.
  useEffect(() => {
    if (!token || !id) return;

    const syncNow = () =>
      apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.MESSAGES(id as string), token)
        .then((data) => setMessages(data))
        .catch(() => undefined);

    const t1 = setTimeout(syncNow, 1200);
    const t2 = setTimeout(syncNow, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [id, token, setMessages]);

  useEffect(() => {
    if (!token) return;

    const setupSocketListener = () => {
      const socket = getSocket() ?? connectSocket(token);
      if (!socket) {
        console.warn('⏳ Socket not ready yet in conversation page, will retry...');
        return null;
      }

      const handleNewMessage = (payload: any) => {
        console.log('═══════════════════════════════════════');
        console.log('📨 NEW MESSAGE EVENT IN CONVERSATION PAGE!');
        console.log('Conversation ID from event:', payload.conversationId);
        console.log('Current conversation ID:', id);
        console.log('Message:', payload.message);
        console.log('═══════════════════════════════════════');
        
        if (payload.conversationId === id) {
          console.log('✅ Message belongs to current conversation, adding to list');
          addMessage(payload.message);
          
          // Auto-scroll to bottom
          setTimeout(() => {
            const messagesContainer = document.querySelector('.messages-container');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }, 100);
        } else {
          console.log('⏭️ Message for different conversation, ignoring');
        }
      };

      console.log('🎧 Registering message:new listener for conversation:', id);
      const handleSocketConnected = () => {
        if (!id) return;
        apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.MESSAGES(id as string), token)
          .then((data) => setMessages(data))
          .catch(() => undefined);
      };

      socket.on('message:new', handleNewMessage);
      socket.on('connect', handleSocketConnected);
      socket.on('reconnect', handleSocketConnected);

      return () => {
        console.log('🧹 Cleaning up message:new listener for conversation:', id);
        socket.off('message:new', handleNewMessage);
        socket.off('connect', handleSocketConnected);
        socket.off('reconnect', handleSocketConnected);
      };
    };

    let cleanupFn: (() => void) | null = null;

    // Try to setup listener
    cleanupFn = setupSocketListener();

    const retryInterval = !cleanupFn
      ? setInterval(() => {
          const retryCleanup = setupSocketListener();
          if (retryCleanup) {
            cleanupFn = retryCleanup;
            if (retryInterval !== null) {
              clearInterval(retryInterval);
            }
          }
        }, 500)
      : null;

    return () => {
      if (retryInterval) {
        clearInterval(retryInterval);
      }
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [id, addMessage, token]);

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
    <div className="flex h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Main Conversation Area */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        {/* Header */}
        {conversation && (
          <div className="relative z-40 bg-white/80 backdrop-blur-xl border-b border-white/20 px-3 sm:px-6 py-3 sm:py-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg flex-shrink-0">
                  {conversation.customer?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                    {conversation.customer?.name || 'Unknown Customer'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                      {conversation.platform.type.toUpperCase()}
                    </span>
                    {conversation.requestHuman && (
                      <button
                        onClick={handleResumeAI}
                        className="text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition shadow-md flex items-center gap-1"
                        title="Resume AI auto-reply"
                      >
                        🤖 <span className="hidden sm:inline">Resume AI</span><span className="sm:hidden">AI</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all shadow-md bg-white text-indigo-700 border-2 border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 text-sm sm:text-base"
                >
                  {generatingSummary ? 'Generating...' : 'AI Summary'}
                </button>

                {/* Notes Toggle Button */}
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all shadow-md flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                    showNotes
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-600 border-2 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">{showNotes ? 'Hide Notes' : 'Notes'}</span>
                </button>

                {/* Status and Assignment Controls */}
                <ConversationHeader
                  conversationId={conversation.id}
                  currentStatus={conversation.status}
                  assignedAgentId={conversation.assignedAgentId}
                  onUpdate={() => {
                    // Reload conversations
                    apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST, token ?? undefined).then((convs) => {
                      useChatStore.getState().setConversations(convs);
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-6 messages-container backdrop-blur-sm" style={{ display: 'flex', flexDirection: 'column' }}>
          {aiSummary?.importantKey && (
            <div className="mb-4 bg-white/95 border border-indigo-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">AI Insight</p>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{aiSummary.importantKey}</pre>
              <p className="text-xs text-gray-500 mt-2">
                Updated: {new Date(aiSummary.updatedAt).toLocaleString()}
              </p>
            </div>
          )}

          {visibleMessages.length === 0 ? (
            <div className="flex items-center justify-center" style={{ flex: 1 }}>
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
            <div className="mt-auto">
              {visibleMessages.map((m, index) => {
                const currentTs = getMessageTimestamp(m);
                const previousTs = index > 0 ? getMessageTimestamp(visibleMessages[index - 1] as ChatMessage) : 0;
                const sameSenderAsPrevious = index > 0 && visibleMessages[index - 1]?.senderType === m.senderType;
                const showTimestamp = index === 0 || 
                  (visibleMessages[index - 1] && currentTs - previousTs > 300000);
                
                return (
                  <div key={m.id} className={sameSenderAsPrevious && !showTimestamp ? 'mt-1.5' : 'mt-4'}>
                    {showTimestamp && (
                      <div className="text-center my-4">
                        <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                          {getMessageTimeLabel(m as ChatMessage)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${
                        m.senderType === 'customer' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-5 py-2 sm:py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                          m.senderType === 'customer'
                            ? 'bg-white/90 backdrop-blur-md text-gray-900 border-2 border-white/40'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white backdrop-blur-md'
                        }`}
                      >
                        {/* Show media attachment if exists */}
                        {getMediaUrl(m) && (
                          isVideoMessage(m) ? (
                            <div className="mb-3">
                              <video
                                controls
                                preload="metadata"
                                className="max-w-full rounded-xl shadow-lg"
                                style={{ maxHeight: '400px' }}
                                src={getMediaUrl(m) as string}
                              />
                            </div>
                          ) : (
                            <div className="mb-3 group cursor-pointer" onClick={() => window.open(getMediaUrl(m) as string, '_blank')}>
                              <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300">
                                <img
                                  src={getMediaUrl(m) as string}
                                  alt="Message attachment"
                                  className="max-w-full transform group-hover:scale-105 transition-transform duration-500"
                                  style={{ maxHeight: '400px' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="absolute bottom-3 right-3 flex items-center gap-2 text-white text-sm font-semibold bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span>View full size</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                        
                        {/* Show content only if not empty */}
                        {m.content && m.content.trim() && (
                          <div className="text-base whitespace-pre-wrap break-words leading-relaxed font-medium">
                            {m.content}
                          </div>
                        )}
                        
                        {/* Show QR Code button for payment messages */}
                        {m.senderType !== 'customer' && isPaymentMessage(m.content || '') && (
                          <button
                            onClick={() => handleShowQRCode(m.content || '')}
                            className="mt-3 w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-2 border-blue-200"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Show Payment QR Code
                          </button>
                        )}
                        
                        <div className={`text-xs mt-2 ${
                          m.senderType === 'customer' ? 'text-gray-400' : 'text-blue-100'
                        }`}>
                          {getMessageTimeLabel(m as ChatMessage)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input */}
        <MessageInput conversationId={id as string} />
      </div>

      {/* Notes Panel (Right Sidebar - Desktop) / Modal (Mobile) */}
      {showNotes && (
        <>
          {/* Desktop Sidebar */}
          <div className="hidden lg:block relative z-30 w-96 border-l-2 border-gray-200 shadow-xl bg-white">
            <NotesPanel conversationId={id as string} />
          </div>
          
          {/* Mobile Modal */}
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-t-3xl rounded-t-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Notes</h3>
                <button
                  onClick={() => setShowNotes(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <NotesPanel conversationId={id as string} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <PromptPayQRCode
          phoneNumber={qrPhoneNumber}
          amount={qrAmount}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  );
}
