'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';

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
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingPageId, setSyncingPageId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // โหลด connected platforms เมื่อ component mount
  useEffect(() => {
    loadConnectedPlatforms();
  }, [token]);

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
    if (platform === 'facebook') {
      await handleMetaConnect('facebook');
    } else if (platform === 'instagram') {
      await handleMetaConnect('instagram');
    } else if (platform === 'whatsapp') {
      await handleMetaConnect('whatsapp');
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

      // 2. เปิด OAuth dialog
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        url,
        'MetaAuth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // 3. รอให้ OAuth เสร็จ (polling หรือใช้ localStorage)
      const checkAuth = setInterval(async () => {
        try {
          // ถ้า window ปิดแล้ว
          if (authWindow?.closed) {
            clearInterval(checkAuth);
            setLoading(false);
            
            // โหลดข้อมูลใหม่
            await loadConnectedPlatforms();
            
            // แสดงรายการ pages/accounts ตาม type
            if (type === 'facebook') {
              await loadFacebookPages();
            } else if (type === 'instagram') {
              await loadInstagramAccounts();
            } else if (type === 'whatsapp') {
              await loadWhatsAppNumbers();
            }
          }
        } catch (error) {
          console.error('Error checking auth:', error);
        }
      }, 1000);

      // หยุด polling หลัง 5 นาที
      setTimeout(() => {
        clearInterval(checkAuth);
        setLoading(false);
      }, 300000);
      
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
    setSelectedPlatform('whatsapp');
    setLoading(true);

    try {
      const numbers = await apiFetch(
        '/api/integrations/whatsapp/numbers',
        token!,
      );
      
      // แปลงเป็น format เดียวกับ FacebookPage
      const whatsappPages = numbers.map((num: any) => ({
        id: num.id,
        name: num.displayName || num.phoneNumber,
        category: 'WhatsApp Business',
        connected: num.connected,
        platformId: num.platformId,
      }));
      
      setFacebookPages(whatsappPages);
    } catch (error: any) {
      console.error('Error loading WhatsApp numbers:', error);
      alert(error.message || 'Failed to load WhatsApp numbers');
      setFacebookPages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnection = async (pageId: string) => {
    const page = facebookPages.find(p => p.id === pageId);
    if (!page) return;

    try {
      const action = page.connected ? 'disconnect' : 'connect';
      
      await apiFetch(
        `/api/integrations/facebook/${pageId}/${action}`,
        token!,
        { method: 'POST' },
      );

      // รีโหลด pages เพื่ออัพเดทสถานะที่ถูกต้อง
      await loadFacebookPages();
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
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการเชื่อมต่อ?')) return;

    try {
      await apiFetch(`/api/platforms/${platformId}`, token!, {
        method: 'DELETE',
      });

      await loadConnectedPlatforms();
      alert('ยกเลิกการเชื่อมต่อสำเร็จ');
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
      alert('อัปเดทข้อมูลสำเร็จ');
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Platform Connections</h1>
          <p className="text-gray-600">Connect and manage your social media and messaging platforms</p>
        </div>

        {/* Connected Platforms Section */}
        {connectedPlatforms.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
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
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
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
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedPlatform === 'facebook' && 'Facebook Pages'}
                  {selectedPlatform === 'instagram' && 'Instagram Accounts'}
                  {selectedPlatform === 'whatsapp' && 'WhatsApp Numbers'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {selectedPlatform === 'facebook' && 'Select pages to connect with Omni Chat'}
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
    </div>
  );
}
