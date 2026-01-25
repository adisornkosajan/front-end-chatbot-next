'use client';

import { useEffect } from 'react';
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
  const setConversations = useChatStore((s) => s.setConversations);
  const pathname = usePathname();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (!token) {
      router.push('/auth/login');
    }
  }, [token, router]);

  // Load conversations and setup socket
  useEffect(() => {
    if (!token) return;

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
  }, [token, setConversations]);

  if (!token) {
    return null; // Show nothing while redirecting
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-80 border-r border-gray-200 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">💬 Omni Chat</h1>
          <p className="text-sm text-gray-500">Manage all conversations</p>
        </div>
        
        {/* Navigation Menu */}
        <div className="p-4 border-b border-gray-200">
          <nav className="space-y-1">
            <Link
              href="/dashboard/inbox"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 ${
                pathname?.includes('/inbox') || pathname === '/dashboard'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">💬</span>
              <span>Inbox</span>
            </Link>
            <Link
              href="/dashboard/connections"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 ${
                pathname?.includes('/connections')
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">🔌</span>
              <span>Connections</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Conversations</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {useChatStore.getState().conversations?.length || 0}
              </span>
            </div>
            <ConversationSidebar />
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-hidden">{children}</main>
    </div>
  );
}
