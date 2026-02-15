'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';

interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
  category: string;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ['general', 'greeting', 'closing', 'faq', 'support', 'sales'];

export default function QuickRepliesPage() {
  const token = useAuthStore((s) => s.token);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shortcut: '',
    content: '',
    category: 'general',
  });

  useEffect(() => {
    loadQuickReplies();
  }, [token]);

  const loadQuickReplies = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/quick-replies', token);
      setQuickReplies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultReplies = useMemo(
    () => quickReplies.filter((item) => item.isDefault),
    [quickReplies],
  );
  const customReplies = useMemo(
    () => quickReplies.filter((item) => !item.isDefault),
    [quickReplies],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      if (editingId) {
        await apiFetch(`/api/quick-replies/${editingId}`, token, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/api/quick-replies', token, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ shortcut: '', content: '', category: 'general' });
      await loadQuickReplies();
    } catch (error: any) {
      alert(error.message || 'Failed to save quick reply');
    }
  };

  const handleEdit = (qr: QuickReply) => {
    if (qr.isDefault) return;
    setFormData({
      shortcut: qr.shortcut,
      content: qr.content,
      category: qr.category,
    });
    setEditingId(qr.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const target = quickReplies.find((item) => item.id === id);
    if (target?.isDefault) return;
    if (!confirm('Are you sure you want to delete this quick reply?')) return;
    if (!token) return;

    try {
      await apiFetch(`/api/quick-replies/${id}`, token, { method: 'DELETE' });
      await loadQuickReplies();
    } catch (error: any) {
      alert(error.message || 'Failed to delete quick reply');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ shortcut: '', content: '', category: 'general' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8 overflow-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Quick Replies</h1>
          <p className="text-gray-600">Manage your saved message templates for faster responses</p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Quick Reply
          </button>
        </div>

        {showForm && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border-2 border-white/40">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Quick Reply' : 'New Quick Reply'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Shortcut
                  <span className="text-gray-600 font-normal ml-2">(e.g., /hello, /thanks)</span>
                </label>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="/greeting"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Message Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  rows={4}
                  placeholder="Hello! How can I help you today?"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {defaultReplies.length > 0 && (
          <>
            <div className="mb-3 mt-2">
              <h3 className="text-lg font-bold text-gray-900">Default</h3>
              <p className="text-sm text-gray-600">System-provided templates</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {defaultReplies.map((qr) => (
                <div
                  key={qr.id}
                  className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-5 border-2 border-indigo-200/70"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <code className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-mono font-semibold">
                      {qr.shortcut}
                    </code>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                      default
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">{qr.content}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mb-3 mt-2">
          <h3 className="text-lg font-bold text-gray-900">Custom</h3>
          <p className="text-sm text-gray-600">Created by your team</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customReplies.map((qr) => (
            <div
              key={qr.id}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 p-5 border-2 border-white/40 hover:border-blue-300 transform hover:scale-105"
            >
              <div className="flex items-center gap-2 mb-2">
                <code className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-mono font-semibold">
                  {qr.shortcut}
                </code>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                  {qr.category}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">{qr.content}</p>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(qr)}
                  className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(qr.id)}
                  className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {customReplies.length === 0 && !showForm && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">QR</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Custom Quick Replies Yet</h3>
            <p className="text-gray-500 mb-6">Create your own quick reply templates for your team</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
            >
              Create Custom Quick Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
