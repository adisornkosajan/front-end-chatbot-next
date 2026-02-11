'use client';

import { useEffect, useState } from 'react';
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

  // Get conversation at the top level (before any conditional returns)
  const conversation = conversations.find((c) => c.id === id);

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Check if message contains payment info
  const isPaymentMessage = (content: string) => {
    const paymentKeywords = [
      'ช่องทางการชำระเงิน',
      'สแกน QR Code',
      'พร้อมเพย์',
      'ชำระเงิน',
      'จ่ายเงิน',
      'payment',
      'QR Code',
      '0812345678'
    ];
    return paymentKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
  };

  // Extract phone number from payment message
  const extractPhoneFromMessage = (content: string): string => {
    const phoneMatch = content.match(/พร้อมเพย์:\s*(\d{10})/);
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
      socket.on('message:new', handleNewMessage);

      return () => {
        console.log('🧹 Cleaning up message:new listener for conversation:', id);
        socket.off('message:new', handleNewMessage);
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
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        {conversation && (
          <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 px-3 sm:px-6 py-3 sm:py-4 shadow-lg">
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 messages-container backdrop-blur-sm" style={{ display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 ? (
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
            <div className="space-y-4">
              {messages.map((m, index) => {
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
                        className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-5 py-2 sm:py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                          m.senderType === 'customer'
                            ? 'bg-white/90 backdrop-blur-md text-gray-900 border-2 border-white/40'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white backdrop-blur-md'
                        }`}
                      >
                        {/* Show image if exists */}
                        {(m as any).imageUrl && (
                          <div className="mb-3 group cursor-pointer" onClick={() => window.open((m as any).imageUrl, '_blank')}>
                            <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300">
                              <img
                                src={(m as any).imageUrl}
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
                        )}
                        
                        {/* Show content only if not empty */}
                        {m.content && m.content.trim() && (
                          <div className="text-base whitespace-pre-wrap break-words leading-relaxed font-medium">
                            {m.content}
                          </div>
                        )}
                        
                        {/* Show QR Code button for payment messages */}
                        {m.senderType !== 'customer' && isPaymentMessage(m.content) && (
                          <button
                            onClick={() => handleShowQRCode(m.content)}
                            className="mt-3 w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-2 border-blue-200"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            แสดง QR Code ชำระเงิน
                          </button>
                        )}
                        
                        <div className={`text-xs mt-2 ${
                          m.senderType === 'customer' ? 'text-gray-400' : 'text-blue-100'
                        }`}>
                          {formatMessageTime(m.createdAt)}
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
          <div className="hidden lg:block w-96 border-l-2 border-gray-200 shadow-xl flex-col">
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
