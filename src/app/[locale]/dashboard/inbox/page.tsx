'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { connectSocket, getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import ConversationSidebar from '@/components/ConversationSidebar';

export default function InboxPage() {
  const token = useAuthStore((s) => s.token);
  const setConversations = useChatStore((s) => s.setConversations);
  const conversations = useChatStore((s) => s.conversations);

  useEffect(() => {
    if (!token) {
      console.log('⚠️ Inbox: No token, skipping socket setup');
      return;
    }

    // รอให้ socket พร้อมใช้งาน (อาจต้องรอ dashboard layout สร้างก่อน)
    const setupSocketListener = () => {
      console.log('═══════════════════════════════════════');
      console.log('📱 Inbox page: Setting up socket listener');
      const socket = getSocket() ?? connectSocket(token);
      console.log('Socket object:', socket ? 'EXISTS' : 'NULL');
      console.log('Socket connected:', socket?.connected ? 'YES' : 'NO');
      console.log('Socket ID:', socket?.id || 'N/A');
      console.log('═══════════════════════════════════════');

      if (!socket) {
        console.log('⏳ Socket not ready yet, will retry...');
        return null;
      }

      // Refresh conversations when new message arrives
      const handleNewMessage = (data: any) => {
        console.log('═══════════════════════════════════════');
        console.log('📨 NEW MESSAGE EVENT RECEIVED IN INBOX!');
        console.log('Data:', JSON.stringify(data, null, 2));
        console.log('═══════════════════════════════════════');
        
        // Reload conversations to update list
        apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST, token)
          .then((conversations) => {
            console.log('✅ Conversations refreshed, count:', conversations?.length);
            setConversations(conversations);
          })
          .catch((error) => {
            console.error('❌ Failed to refresh conversations:', error);
          });
      };

      console.log('🎧 Registering message:new listener');
      socket.on('message:new', handleNewMessage);

      return () => {
        console.log('🧹 Cleaning up message:new listener');
        socket.off('message:new', handleNewMessage);
      };
    };

    let cleanupFn: (() => void) | null = null;

    // พยายามตั้งค่า socket listener
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
  }, [token, setConversations]);

  return (
    <div className="h-full flex bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>
      
      {/* Conversations List Sidebar - Hidden on mobile unless in inbox view */}
      <div className="w-full lg:w-96 border-r border-white/30 bg-white/80 backdrop-blur-xl flex flex-col relative z-10 shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Inbox</h1>
            <button className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-all">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2.5 sm:left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Conversations Count */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 text-xs sm:text-sm">
              <span className="font-bold text-gray-900">{conversations?.length || 0}</span> Conversations
            </span>
            <select className="text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded px-2 sm:px-3 py-1 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations && conversations.length > 0 ? (
            <ConversationSidebar />
          ) : (
            <div className="p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">💬</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Conversations</h3>
              <p className="text-gray-500 text-xs sm:text-sm">Conversations will appear here when customers contact you</p>
            </div>
          )}
        </div>
      </div>

      {/* Empty State - Select Conversation - Hidden on mobile */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center px-8 max-w-md">
          <div className="mb-8 relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 sm:w-40 sm:h-40 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Select a Conversation
          </h2>
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
            Choose a conversation from the list to start chatting with customers
          </p>
          <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border-2 border-blue-100">
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-blue-600">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-xs sm:text-sm font-semibold">Real-time messaging enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
