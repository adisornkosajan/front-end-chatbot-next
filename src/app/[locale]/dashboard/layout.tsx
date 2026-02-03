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
import { useTranslations, useLocale } from 'next-intl';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setConversations = useChatStore((s) => s.setConversations);
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canManage = isAdmin || isManager;

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
      router.push(`/${locale}/auth/login`);
    }
  }, [token, router, isLoading, locale]);

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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-200 bg-white flex flex-col shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Talk-V AI</h1>
              <p className="text-xs text-blue-100">SaaS Platform</p>
            </div>
          </div>
        </div>
        
        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2">
              Main
            </div>
            <Link
              href={`/${locale}/dashboard/inbox`}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                pathname?.includes('/inbox') || pathname?.endsWith('/dashboard')
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span>{t('inbox')}</span>
              {useChatStore.getState().conversations?.length > 0 && (
                <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {useChatStore.getState().conversations?.length}
                </span>
              )}
            </Link>

            {/* Integrations - Show for Admin and Manager */}
            {canManage && (
              <>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2 mt-6">
                  Integrations
                </div>
                <Link
                  href={`/${locale}/dashboard/connections`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    pathname?.includes('/connections')
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{t('platforms')}</span>
                </Link>

                <Link
                  href={`/${locale}/dashboard/plugins`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    pathname?.includes('/plugins')
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>{t('plugins')}</span>
                </Link>
              </>
            )}

            {/* Settings - Show for Admin and Manager */}
            {canManage && (
              <>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2 mt-6">
                  Settings
                </div>
                <Link
                  href={`/${locale}/dashboard/settings`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    pathname?.includes('/settings')
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{t('general')}</span>
                </Link>

                {/* AI Settings - Admin only */}
                {isAdmin && (
                  <Link
                    href={`/${locale}/dashboard/ai-settings`}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                      pathname?.includes('/ai-settings')
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>{t('ai_assistant')}</span>
                  </Link>
                )}

                {/* Team - Admin and Manager can view */}
                <Link
                  href={`/${locale}/dashboard/team`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    pathname?.includes('/team')
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{t('team')}</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
              {useAuthStore.getState().user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {useAuthStore.getState().user?.name || 'User'}
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                )}
                {isManager && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Manager
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {useAuthStore.getState().user?.email || ''}
              </p>
            </div>
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                window.location.href = '/auth/login';
              }}
              className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
              title="ออกจากระบบ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 overflow-hidden">{children}</main>
    </div>
  );
}
