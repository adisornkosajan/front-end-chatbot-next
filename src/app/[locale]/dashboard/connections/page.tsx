'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import { useSearchParams, useRouter } from 'next/navigation';

type Platform = 'facebook' | 'instagram' | 'whatsapp';

type ConnectedPlatform = {
  id: string;
  type: string;
  pageId: string;
  credentials?: any;
  isActive: boolean;
  createdAt: string;
};

type FacebookPage = {
  id: string;
  name: string;
  category: string;
  connected: boolean;
  platformId?: string;
  hasInstagram?: boolean;
  instagramId?: string;
};

type SyncResult = {
  success: boolean;
  synced?: {
    conversations: number;
    messages: number;
  };
};

export default function ConnectionsPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingPageId, setSyncingPageId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (mounted) {
      if (!token) {
        router.push('/auth/login');
      } else if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        router.push('/dashboard/inbox');
      }
    }
  }, [mounted, token, user, router]);

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppFormData, setWhatsAppFormData] = useState({
    phoneNumberId: '',
    accessToken: '',
    displayName: '',
    phoneNumber: '',
    wabaId: '',
    verifiedName: '',
  });

  // รอให้ component mount เสร็จก่อน (hydration)
  useEffect(() => {
    setMounted(true);
  }, []);

  // ตรวจสอบ authentication
  useEffect(() => {
    if (mounted && !token) {
      console.warn('No token found, redirecting to login');
      router.push('/auth/login');
    }
  }, [mounted, token, router]);

  // โหลด connected platforms เมื่อ component mount
  useEffect(() => {
    if (mounted && token) {
      loadConnectedPlatforms();
    }
  }, [token, mounted]);

  // ตรวจสอบ OAuth callback
  useEffect(() => {
    if (!mounted) return;

    const oauthStatus = searchParams.get('oauth');
    const errorMessage = searchParams.get('message');

    if (oauthStatus === 'success') {
      console.log('OAuth success, token:', token ? 'exists' : 'missing');
      
      // OAuth สำเร็จ - โหลดข้อมูลใหม่
      if (token) {
        loadConnectedPlatforms();
      }
      
      // ลบ query params ออกจาก URL
      window.history.replaceState({}, '', '/dashboard/connections');
    } else if (oauthStatus === 'error') {
      alert(`OAu{
      console.warn('loadConnectedPlatforms: No token available');
      return;
    }ed: ${errorMessage || 'Unknown error'}`);
      window.history.replaceState({}, '', '/dashboard/connections');
    }
  }, [searchParams, mounted, token]);

  const loadConnectedPlatforms = async () => {
    if (!token) return;

    try {
      const platforms = await apiFetch('/api/platforms', token);
      setConnectedPlatforms(platforms);
    } catch (error) {
      console.error('Error loading connected platforms:', error);
    }
  };

  const platforms = [
    {
      id: 'facebook' as Platform,
      name: 'Facebook',
      icon: '📘',
      color: 'from-blue-600 to-blue-700',
      description: 'Connect your Facebook Pages',
      onClick: () => handleConnectPlatform('facebook'),
    },
    {
      id: 'instagram' as Platform,
      name: 'Instagram',
      icon: '📷',
      color: 'from-pink-600 to-purple-600',
      description: 'Connect your Instagram Business accounts',
      onClick: () => handleConnectPlatform('instagram'),
    },
    {
      id: 'whatsapp' as Platform,
      name: 'WhatsApp',
      icon: '💬',
      color: 'from-green-600 to-green-700',
      description: 'Connect your WhatsApp Business',
      onClick: () => handleConnectPlatform('whatsapp'),
    },
  ];

  const handleConnectPlatform = async (platform: Platform) => {
    if (platform === 'whatsapp') {
      // ใช้ OAuth Flow เหมือน Facebook/Instagram
      await handleMetaConnect('whatsapp');
    } else if (platform === 'facebook') {
      await handleMetaConnect('facebook');
    } else if (platform === 'instagram') {
      await handleMetaConnect('instagram');
    }
  };

  const handleWhatsAppManualSubmit = async () => {
    try {
      setLoading(true);
      
      const result = await apiFetch(
        '/api/integrations/whatsapp/manual',
        token!,
        {
          method: 'POST',
          body: JSON.stringify(whatsAppFormData),
        },
      );

      alert(result.message || 'WhatsApp connected successfully!');
      setShowWhatsAppModal(false);
      setWhatsAppFormData({
        phoneNumberId: '',
        accessToken: '',
        displayName: '',
        phoneNumber: '',
        wabaId: '',
        verifiedName: '',
      });
      
      // โหลดข้อมูลใหม่
      await loadConnectedPlatforms();
    } catch (error: any) {
      console.error('WhatsApp manual config error:', error);
      alert(error.message || 'Failed to connect WhatsApp. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMetaConnect = async (type: 'facebook' | 'instagram' | 'whatsapp') => {
    try {
      setLoading(true);
      
      // 1. ขอ OAuth URL จาก backend
      const { url } = await apiFetch(
        API_CONFIG.ENDPOINTS.AUTH.OAUTH_URL,
        token!,
      );
      
      console.log('OAuth URL:', url);

      // 2. Redirect ไปที่ OAuth URL (เต็มหน้าจอ)
      // Backend จะ redirect กลับมาพร้อม query params ?oauth=success
      window.location.href = url;
      
    } catch (error: any) {
      console.error('OAuth error:', error);
      alert(error.message || `Failed to connect ${type}. Please try again.`);
      setLoading(false);
    }
  };

  const loadFacebookPages = async () => {
    setSelectedPlatform('facebook');
    setLoading(true);

    try {
      const pages = await apiFetch(
        '/api/integrations/facebook/pages',
        token!,
      );
      
      setFacebookPages(pages);
    } catch (error: any) {
      console.error('Error loading Facebook pages:', error);
      alert(error.message || 'Failed to load Facebook pages');
      setFacebookPages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInstagramAccounts = async () => {
    setSelectedPlatform('instagram');
    setLoading(true);

    try {
      const accounts = await apiFetch(
        '/api/integrations/instagram/accounts',
        token!,
      );
      
      // แปลงเป็น format เดียวกับ FacebookPage
      const instagramPages = accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.username || acc.name,
        category: 'Instagram Business',
        connected: acc.connected,
        platformId: acc.platformId,
      }));
      
      setFacebookPages(instagramPages);
    } catch (error: any) {
      console.error('Error loading Instagram accounts:', error);
      alert(error.message || 'Failed to load Instagram accounts');
      setFacebookPages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppNumbers = async () => {
    try {
      setLoading(true);
      setSelectedPlatform('whatsapp');
      
      const numbers = await apiFetch('/api/integrations/whatsapp/numbers', token!);
      
      console.log('WhatsApp numbers response:', numbers);
      
      // แปลงเป็น format เดียวกับ Facebook pages
      const formattedNumbers = numbers.map((num: any) => ({
        id: num.id,
        name: num.displayName || num.phoneNumber,
        category: `WABA: ${num.wabaName || num.wabaId || 'Unknown'}`,
        phoneNumber: num.phoneNumber,
        connected: num.connected,
        platformId: num.platformId,
      }));
      
      console.log('Formatted numbers:', formattedNumbers);
      
      if (formattedNumbers.length === 0) {
        alert('No WhatsApp Business Numbers found\n\nPlease use "Manual Setup" instead');
        setSelectedPlatform(null);
        setShowWhatsAppModal(true);
        return;
      }
      
      setFacebookPages(formattedNumbers);
    } catch (error: any) {
      console.error('Failed to load WhatsApp numbers:', error);
      alert('Unable to load WhatsApp Business Accounts.\n\nError: ' + (error.message || 'Unknown error') + '\n\nPlease use the "Manual Setup" option instead.');
      setSelectedPlatform(null);
      setShowWhatsAppModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnection = async (pageId: string) => {
    const page = facebookPages.find(p => p.id === pageId);
    if (!page) return;

    try {
      const action = page.connected ? 'disconnect' : 'connect';
      
      // ใช้ platform ที่เลือกอยู่ในการเรียก API
      const platformType = selectedPlatform || 'facebook';
      
      await apiFetch(
        `/api/integrations/${platformType}/${pageId}/${action}`,
        token!,
        { method: 'POST' },
      );

      // รีโหลด pages/accounts ตาม platform
      if (platformType === 'facebook') {
        await loadFacebookPages();
      } else if (platformType === 'instagram') {
        await loadInstagramAccounts();
      } else if (platformType === 'whatsapp') {
        await loadWhatsAppNumbers();
      }
      
      // อัปเดต connected platforms list
      await loadConnectedPlatforms();
    } catch (error: any) {
      console.error('Error toggling connection:', error);
      alert(error.message || 'Failed to toggle connection. Please try again.');
    }
  };

  const handleSyncConversations = async (pageId: string, platformId: string) => {
    setSyncingPageId(pageId);
    setSyncResult(null);

    try {
      const result: SyncResult = await apiFetch(
        API_CONFIG.ENDPOINTS.CONVERSATIONS.SYNC_FACEBOOK(platformId),
        token!,
        { method: 'POST' },
      );
      
      setSyncResult(result);

      if (result.success) {
        // รีโหลด conversations ใน store
        const conversations = await apiFetch(
          API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST,
          token!,
        );
        useChatStore.getState().setConversations(conversations);
      }
    } catch (error: any) {
      console.error('Error syncing conversations:', error);
      alert(error.message || 'Failed to sync conversations. Please try again.');
    } finally {
      setSyncingPageId(null);
    }
  };

  const handleDisconnectPlatform = async (platformId: string) => {
    if (!confirm('Are you sure you want to disconnect?')) return;

    try {
      await apiFetch(`/api/platforms/${platformId}`, token!, {
        method: 'DELETE',
      });

      await loadConnectedPlatforms();
      alert('Disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting platform:', error);
      alert(error.message || 'Failed to disconnect platform');
    }
  };

  const handleEditPlatform = (platform: ConnectedPlatform) => {
    setEditingPlatform(platform.id);
    setEditFormData({
      phoneNumber: platform.credentials?.phoneNumber || '',
      displayName: platform.credentials?.displayName || '',
    });
  };

  const handleSaveEdit = async (platformId: string) => {
    try {
      await apiFetch(`/api/platforms/${platformId}`, token!, {
        method: 'PUT',
        body: JSON.stringify({
          credentials: editFormData,
        }),
      });

      await loadConnectedPlatforms();
      setEditingPlatform(null);
      alert('Updated successfully');
    } catch (error: any) {
      console.error('Error updating platform:', error);
      alert(error.message || 'Failed to update platform');
    }
  };

  const getPlatformIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'facebook':
        return '📘';
      case 'instagram':
        return '📷';
      case 'whatsapp':
        return '💬';
      default:
        return '🔌';
    }
  };

  const getPlatformColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'facebook':
        return 'from-blue-600 to-blue-700';
      case 'instagram':
        return 'from-pink-600 to-purple-600';
      case 'whatsapp':
        return 'from-green-600 to-green-700';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  // แสดง loading ขณะรอ hydration หรือตรวจสอบ auth
  if (!mounted || !token) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Platform Connections</h1>
          <p className="text-gray-600">Connect and manage your social media and messaging platforms</p>
        </div>

        {/* Connected Platforms Section */}
        {connectedPlatforms.length > 0 && (
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Connected Platforms</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {connectedPlatforms.length} platform{connectedPlatforms.length > 1 ? 's' : ''} connected
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {connectedPlatforms.map((platform) => (
                  <div
                    key={platform.id}
                    className="border border-gray-200 rounded-lg hover:border-blue-300 transition-all overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-16 h-16 bg-gradient-to-br ${getPlatformColor(platform.type)} rounded-lg flex items-center justify-center text-3xl`}>
                            {getPlatformIcon(platform.type)}
                          </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-800 text-lg capitalize">
                                  {platform.type}
                                </h3>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                  Active
                                </span>
                              </div>

                              {editingPlatform === platform.id ? (
                                <div className="space-y-2 mt-2">
                                  {platform.type.toLowerCase() === 'whatsapp' && (
                                    <>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Phone Number</label>
                                        <input
                                          type="text"
                                          value={editFormData.phoneNumber || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          placeholder="+1234567890"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Display Name</label>
                                        <input
                                          type="text"
                                          value={editFormData.displayName || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          placeholder="Business Name"
                                        />
                                      </div>
                                    </>
                                  )}
                                  <div className="flex gap-2 mt-3">
                                    <button
                                      onClick={() => handleSaveEdit(platform.id)}
                                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingPlatform(null)}
                                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600 mb-1">
                                    {platform.type.toLowerCase() === 'facebook' && (
                                      <>
                                        {platform.credentials?.pageName ? (
                                          <>
                                            <span className="font-semibold text-gray-800">{platform.credentials.pageName}</span>
                                            <br />
                                            <span className="text-xs text-gray-500">ID: {platform.pageId}</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="font-medium">Page ID:</span> {platform.pageId}
                                          </>
                                        )}
                                      </>
                                    )}
                                    {platform.type.toLowerCase() === 'instagram' && (
                                      <>
                                        {platform.credentials?.username ? (
                                          <>
                                            <span className="font-semibold text-gray-800">@{platform.credentials.username}</span>
                                            {platform.credentials?.name && (
                                              <span className="text-gray-600"> • {platform.credentials.name}</span>
                                            )}
                                            <br />
                                            <span className="text-xs text-gray-500">ID: {platform.pageId}</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="font-medium">Account ID:</span> {platform.pageId}
                                          </>
                                        )}
                                      </>
                                    )}
                                    {platform.type.toLowerCase() === 'whatsapp' && (
                                      <>
                                        <span className="font-medium">Phone:</span>{' '}
                                        {platform.credentials?.phoneNumber || platform.pageId}
                                        {platform.credentials?.displayName && (
                                          <span className="ml-2">
                                            • <span className="font-medium">Name:</span> {platform.credentials.displayName}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Connected on {new Date(platform.createdAt).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </p>
                                </>
                              )}
                            </div>
                        </div>

                        {editingPlatform !== platform.id && (
                          <div className="flex items-center gap-2 ml-4">
                            {platform.type.toLowerCase() === 'whatsapp' && (
                              <button
                                onClick={() => handleEditPlatform(platform)}
                                className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-2"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDisconnectPlatform(platform.id)}
                              className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2"
                              title="Disconnect"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Disconnect
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/40 transform hover:scale-105"
            >
              <div className={`h-32 bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                <div className="text-6xl">{platform.icon}</div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{platform.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{platform.description}</p>
                <button
                  onClick={() => platform.onClick()}
                  disabled={loading}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
                  }`}
                >
                  {loading ? 'Loading...' : `Connect ${platform.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Pages/Accounts Selection */}
        {selectedPlatform && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedPlatform === 'facebook' && 'Facebook Pages'}
                  {selectedPlatform === 'instagram' && 'Instagram Accounts'}
                  {selectedPlatform === 'whatsapp' && 'WhatsApp Numbers'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {selectedPlatform === 'facebook' && 'Select pages to connect with Talk-V AI'}
                  {selectedPlatform === 'instagram' && 'Select Instagram business accounts to connect'}
                  {selectedPlatform === 'whatsapp' && 'Select WhatsApp business numbers to connect'}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlatform(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Loading...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {facebookPages.map((page) => (
                  <div
                    key={page.id}
                    className="border border-gray-200 rounded-lg hover:border-blue-300 transition-all overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {page.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{page.name}</h3>
                          <p className="text-sm text-gray-500">{page.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {page.connected && page.platformId && (
                          <button
                            onClick={() => handleSyncConversations(page.id, page.platformId!)}
                            disabled={syncingPageId === page.id}
                            className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {syncingPageId === page.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Syncing...
                              </>
                            ) : (
                              <>
                                🔄 Sync
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleConnection(page.id)}
                          className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                            page.connected
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {page.connected ? '✓ Connected' : 'Connect'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Sync Result */}
                    {syncResult && syncingPageId === null && page.platformId && (
                      <div className="px-4 pb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-700">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold">Sync Complete!</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1 ml-7">
                            Synced {syncResult.synced?.conversations || 0} conversations 
                            and {syncResult.synced?.messages || 0} messages
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* WhatsApp Manual Configuration Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                    <span className="text-3xl">💬</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Connect WhatsApp Business</h2>
                    <p className="text-green-100 text-sm">Manual Configuration (Test Mode)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="text-white hover:text-gray-200 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">📱 How to get WhatsApp credentials:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Go to <a href="https://developers.facebook.com" target="_blank" className="underline font-semibold">Meta for Developers</a></li>
                      <li>Create an app and add &quot;WhatsApp&quot; product</li>
                      <li>Get your Phone Number ID and Access Token</li>
                      <li>Set up webhook to: <code className="bg-blue-100 px-2 py-0.5 rounded">https://app.nighttime77.win/api/webhooks/whatsapp</code></li>
                    </ol>
                    <p className="mt-2"><a href="/WHATSAPP-SETUP-GUIDE.md" target="_blank" className="underline font-bold">📖 View Full Setup Guide</a></p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Phone Number ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900"
                  placeholder="123456789012345"
                  value={whatsAppFormData.phoneNumberId}
                  onChange={(e) => setWhatsAppFormData({ ...whatsAppFormData, phoneNumberId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Access Token <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-mono text-sm"
                  placeholder="EAAB..."
                  rows={3}
                  value={whatsAppFormData.accessToken}
                  onChange={(e) => setWhatsAppFormData({ ...whatsAppFormData, accessToken: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900"
                    placeholder="My Business WhatsApp"
                    value={whatsAppFormData.displayName}
                    onChange={(e) => setWhatsAppFormData({ ...whatsAppFormData, displayName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900"
                    placeholder="+66812345678"
                    value={whatsAppFormData.phoneNumber}
                    onChange={(e) => setWhatsAppFormData({ ...whatsAppFormData, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    WABA ID
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900"
                    placeholder="111222333444555"
                    value={whatsAppFormData.wabaId}
                    onChange={(e) => setWhatsAppFormData({ ...whatsAppFormData, wabaId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Verified Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900"
                    placeholder="My Business"
                    value={whatsAppFormData.verifiedName}
                    onChange={(e) => setWhatsAppFormData({ ...whatsAppFormData, verifiedName: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleWhatsAppManualSubmit}
                  disabled={loading || !whatsAppFormData.phoneNumberId || !whatsAppFormData.accessToken}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connecting...' : '✅ Connect WhatsApp'}
                </button>
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
