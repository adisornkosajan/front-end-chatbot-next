'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

type Plugin = {
  id: string;
  name: string;
  type: string;
  description?: string;
  config?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function PluginsPage() {
  const t = useTranslations('plugins');
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || 'en';
  const [mounted, setMounted] = useState(false);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'crm',
    description: '',
    apiKey: '',
    apiSecret: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!token) {
        router.push('/auth/login');
      } else if (user?.role !== 'ADMIN') {
        router.push('/dashboard/inbox');
      }
    }
  }, [mounted, token, user, router]);

  useEffect(() => {
    if (token && mounted) {
      loadPlugins();
    }
  }, [token, mounted]);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/plugins', token!);
      setPlugins(data);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse JSON config from apiKey field
      let config = null;
      if (formData.apiKey) {
        try {
          config = JSON.parse(formData.apiKey);
        } catch (e) {
          alert('❌ Config JSON ไม่ถูกต้อง กรุณาตรวจสอบรูปแบบ');
          return;
        }
      }

      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        config: config, // ส่ง config ที่ parse แล้ว
        apiSecret: formData.apiSecret || null,
      };

      if (editingPlugin) {
        await apiFetch(`/api/plugins/${editingPlugin.id}`, token!, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        alert('✅ Plugin updated successfully!');
      } else {
        await apiFetch('/api/plugins', token!, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        alert('✅ Plugin created successfully!');
      }

      setShowModal(false);
      setEditingPlugin(null);
      setFormData({ name: '', type: 'auto-reply', description: '', apiKey: '', apiSecret: '' });
      loadPlugins();
    } catch (error: any) {
      console.error('Failed to save plugin:', error);
      alert('Failed to save plugin: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (plugin: Plugin) => {
    setEditingPlugin(plugin);
    setFormData({
      name: plugin.name,
      type: plugin.type,
      description: plugin.description || '',
      apiKey: plugin.config ? JSON.stringify(plugin.config, null, 2) : '', // แปลง config กลับเป็น JSON string
      apiSecret: '',
    });
    setShowModal(true);
  };

  const handleToggleActive = async (plugin: Plugin) => {
    try {
      await apiFetch(`/api/plugins/${plugin.id}/toggle`, token!, {
        method: 'PUT',
      });
      loadPlugins();
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
      alert('Failed to toggle plugin status');
    }
  };

  const handleDelete = async (plugin: Plugin) => {
    if (!confirm(`Are you sure you want to delete "${plugin.name}"?`)) return;

    try {
      await apiFetch(`/api/plugins/${plugin.id}`, token!, {
        method: 'DELETE',
      });
      alert('✅ Plugin deleted successfully!');
      loadPlugins();
    } catch (error: any) {
      console.error('Failed to delete plugin:', error);
      alert('Failed to delete plugin: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔌 {t('title')}</h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => {
              setEditingPlugin(null);
              setFormData({ name: '', type: 'crm', description: '', apiKey: '', apiSecret: '' });
              setShowModal(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('empty.button')}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">{t('stats.total')}</p>
                <p className="text-2xl font-bold text-blue-900">{plugins.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">{t('stats.active')}</p>
                <p className="text-2xl font-bold text-green-900">{plugins.filter(p => p.isActive).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t('stats.inactive')}</p>
                <p className="text-2xl font-bold text-gray-900">{plugins.filter(p => !p.isActive).length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plugins Grid */}
      {plugins.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('empty.title')}</h3>
          <p className="text-gray-600 mb-4">{t('empty.subtitle')}</p>
          <button
            onClick={() => {
              setEditingPlugin(null);
              setFormData({ name: '', type: 'crm', description: '', apiKey: '', apiSecret: '' });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('empty.button')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plugins.map((plugin) => {
            const getPluginIcon = (type: string) => {
              switch(type) {
                case 'auto-reply': return '💬';
                case 'business-hours': return '⏰';
                case 'welcome-message': return '👋';
                case 'crm': return '👥';
                case 'analytics': return '📊';
                case 'marketing': return '📧';
                case 'support': return '🎧';
                case 'storage': return '💾';
                case 'payment': return '💳';
                default: return '🔌';
              }
            };
            
            const getPluginColor = (type: string) => {
              switch(type) {
                case 'auto-reply': return 'from-green-500 to-emerald-500';
                case 'business-hours': return 'from-orange-500 to-amber-500';
                case 'welcome-message': return 'from-pink-500 to-rose-500';
                case 'crm': return 'from-purple-500 to-pink-500';
                case 'analytics': return 'from-blue-500 to-cyan-500';
                case 'marketing': return 'from-orange-500 to-red-500';
                case 'support': return 'from-green-500 to-teal-500';
                case 'storage': return 'from-indigo-500 to-blue-500';
                case 'payment': return 'from-yellow-500 to-orange-500';
                default: return 'from-gray-500 to-gray-600';
              }
            };

            return (
              <div key={plugin.id} className={`bg-white rounded-xl shadow-md border-2 transition-all hover:shadow-xl ${
                plugin.isActive ? 'border-green-200 bg-gradient-to-br from-white to-green-50' : 'border-gray-200'
              }`}>
                <div className="p-6">
                  {/* Icon & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getPluginColor(plugin.type)} flex items-center justify-center text-3xl shadow-lg`}>
                      {getPluginIcon(plugin.type)}
                    </div>
                    <div className="flex items-center gap-2">
                      {plugin.isActive ? (
                        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          {t('card.active')}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                          {t('card.inactive')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Type */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{plugin.name}</h3>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 mb-3">
                    {plugin.type.toUpperCase()}
                  </span>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {plugin.description || 'No description provided'}
                  </p>

                  {/* Date */}
                  <p className="text-xs text-gray-400 mb-4">
                    {t('card.added')}: {new Date(plugin.createdAt).toLocaleDateString(locale as string, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleToggleActive(plugin)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        plugin.isActive
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {plugin.isActive ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('card.disable')}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('card.enable')}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(plugin)}
                      className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                      title="Configure"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(plugin)}
                      className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingPlugin ? t('modal.edit_title') : t('modal.add_title')}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlugin(null);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-2">
                {t('modal.basic_details')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('modal.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('modal.name_placeholder')}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder:text-gray-500 bg-white"
                  style={{ fontSize: '15px' }}
                />
                <p className="mt-1 text-xs text-gray-500">Choose a descriptive name for this feature</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('modal.type')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                  style={{ fontSize: '15px' }}
                >
                  <option value="auto-reply" className="py-2 text-gray-900 bg-white">💬 Auto-Reply - ตอบกลับอัตโนมัติ</option>
                  <option value="business-hours" className="py-2 text-gray-900 bg-white">⏰ Business Hours - เวลาทำการ</option>
                  <option value="welcome-message" className="py-2 text-gray-900 bg-white">👋 Welcome Message - ข้อความต้อนรับ</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.type === 'auto-reply' && '💬 ตอบกลับอัตโนมัติตามคำสำคัญที่กำหนด'}
                  {formData.type === 'business-hours' && '⏰ ตรวจสอบเวลาทำการและแจ้งเตือนลูกค้า'}
                  {formData.type === 'welcome-message' && '👋 ส่งข้อความต้อนรับลูกค้าใหม่'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('modal.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('modal.description_placeholder')}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder:text-gray-500 bg-white"
                  style={{ fontSize: '15px' }}
                />
              </div>

              {/* Plugin Config Section */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Plugin Configuration (JSON)
                </h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-800">
                    {formData.type === 'auto-reply' && '💬 ใส่ Config สำหรับ Auto-Reply: {"rules":[{"keywords":["ราคา"],"response":"ข้อความตอบกลับ"}]}'}
                    {formData.type === 'business-hours' && '⏰ ใส่ Config เวลาทำการ: {"schedule":{"monday":{"open":"09:00","close":"18:00"}}}'}
                    {formData.type === 'welcome-message' && '👋 ใส่ข้อความต้อนรับ: {"message":"สวัสดีค่ะ"}'}
                  </p>
                </div>

                <textarea
                  value={typeof formData.apiKey === 'string' ? formData.apiKey : JSON.stringify(formData.apiKey, null, 2)}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder='{"rules":[{"keywords":["ราคา","เท่าไหร่"],"matchAny":true,"response":"💰 ราคา 500 บาท","stopAfterMatch":false}]}'
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-mono text-sm placeholder:text-gray-400 bg-white"
                />
                <p className="mt-2 text-xs text-gray-600">
                  📝 ใส่ JSON config ตามตัวอย่างด้านบน (สำหรับ Auto-Reply, Business Hours, Welcome Message)
                </p>
              </div>

              {/* API Configuration Section (Optional) */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  API Credentials (สำหรับ Plugin ภายนอก - ไม่จำเป็น)
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      API Secret Key (Optional)
                    </label>
                    <input
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      placeholder="ใส่ API Secret ถ้าต้องการเชื่อมต่อกับ API ภายนอก"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder:text-gray-400 bg-white"
                      style={{ fontSize: '15px' }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      🔒 สำหรับ Plugin ที่ต้องเชื่อมต่อกับระบบภายนอก เช่น CRM, Payment Gateway
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-5 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('modal.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlugin(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  {t('modal.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
