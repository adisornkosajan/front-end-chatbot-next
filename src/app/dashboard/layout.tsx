'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import ConversationSidebar from '@/components/ConversationSidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setConversations = useChatStore((s) => s.setConversations);
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    if (isHydrated) {
      setIsLoading(false);
    }
  }, [isHydrated]);

  // Auth guard - only redirect after hydration
  useEffect(() => {
    if (!isLoading && !token) {
      console.log('No token found, redirecting to login...');
      router.push('/auth/login');
    }
  }, [token, router, isLoading]);

  // Load conversations and setup socket
  useEffect(() => {
    if (!token || isLoading) return;

    let isMounted = true;

    // Connect socket
    const socket = connectSocket(token);

    // Load conversations
    apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST, token)
      .then((data) => {
        if (isMounted) {
          setConversations(data);
        }
      })
      .catch((error) => {
        console.error('Failed to load conversations:', error);
      });

    return () => {
      isMounted = false;
      disconnectSocket();
    };
  }, [token, setConversations, isLoading]);

  // Show loading state while hydrating
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting to login
  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <aside className="w-80 border-r border-gray-200 bg-white shadow-xl flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-2xl">💬</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Omni Chat</h1>
          </div>
          <p className="text-sm text-blue-100 font-medium">Manage all conversations</p>
        </div>
        
        {/* Navigation Menu */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <nav className="space-y-2">
            <Link
              href="/dashboard/inbox"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold ${
                pathname?.includes('/inbox') || pathname === '/dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <span className="text-2xl">💬</span>
              <span className="text-base">Inbox</span>
              {(pathname?.includes('/inbox') || pathname === '/dashboard') && (
                <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
              )}
            </Link>
            <Link
              href="/dashboard/connections"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold ${
                pathname?.includes('/connections')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <span className="text-2xl">🔌</span>
              <span className="text-base">Connections</span>
              {pathname?.includes('/connections') && (
                <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
              )}
            </Link>
          </nav>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Conversations</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1 rounded-full font-bold shadow-md">
                  {useChatStore.getState().conversations?.length || 0}
                </span>
              </div>
            </div>
            <ConversationSidebar />
          </div>
        </div>

        {/* User Info Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {useAuthStore.getState().user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {useAuthStore.getState().user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {useAuthStore.getState().user?.email || 'user@example.com'}
              </p>
            </div>
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                window.location.href = '/auth/login';
              }}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-white overflow-hidden">{children}</main>
    </div>
  );
}
