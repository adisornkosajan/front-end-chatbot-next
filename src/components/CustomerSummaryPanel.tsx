'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type CustomerSummary = {
  id: string;
  name: string | null;
  mobile: string | null;
  email: string | null;
  importantKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function CustomerSummaryPanel({ conversationId }: { conversationId: string }) {
  const token = useAuthStore((s) => s.token);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [summaryForm, setSummaryForm] = useState({
    name: '',
    mobile: '',
    email: '',
    importantKey: '',
  });
  const [savingSummary, setSavingSummary] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [conversationId, token]);

  const loadSummary = async () => {
    if (!token || !conversationId) return;
    
    try {
      setLoading(true);
      const data = await apiFetch(
        `/api/customer-summaries/conversation/${conversationId}`,
        token
      );
      if (data) {
        setSummary(data);
        setSummaryForm({
          name: data.name || '',
          mobile: data.mobile || '',
          email: data.email || '',
          importantKey: data.importantKey || '',
        });
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSavingSummary(true);
      await apiFetch(
        `/api/customer-summaries/conversation/${conversationId}`,
        token,
        {
          method: 'POST',
          body: JSON.stringify(summaryForm),
        }
      );
      loadSummary();
      alert('✅ Customer summary saved successfully!');
    } catch (error) {
      console.error('Failed to save summary:', error);
      alert('❌ Failed to save summary');
    } finally {
      setSavingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="text-sm text-gray-500 mt-2">Loading summary...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">Customer Summary</h3>
        </div>
        <p className="text-xs text-gray-600">Structured customer information</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSaveSummary} className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Name
            </span>
          </label>
          <input
            type="text"
            value={summaryForm.name}
            onChange={(e) => setSummaryForm({ ...summaryForm, name: e.target.value })}
            placeholder="Enter customer name"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white text-gray-900 font-medium transition-all"
          />
        </div>

        {/* Mobile Field */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Mobile
            </span>
          </label>
          <input
            type="tel"
            value={summaryForm.mobile}
            onChange={(e) => setSummaryForm({ ...summaryForm, mobile: e.target.value })}
            placeholder="Enter mobile number"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white text-gray-900 font-medium transition-all"
          />
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </span>
          </label>
          <input
            type="email"
            value={summaryForm.email}
            onChange={(e) => setSummaryForm({ ...summaryForm, email: e.target.value })}
            placeholder="Enter email address"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white text-gray-900 font-medium transition-all"
          />
        </div>

        {/* Important Key Field */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Important Key!
            </span>
          </label>
          <textarea
            value={summaryForm.importantKey}
            onChange={(e) => setSummaryForm({ ...summaryForm, importantKey: e.target.value })}
            placeholder="Enter important information, special notes, or key details..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none bg-white text-gray-900 font-medium transition-all"
            rows={5}
          />
        </div>

        {/* Last Updated Info */}
        {summary && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
            <p className="text-xs text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last updated: {new Date(summary.updatedAt).toLocaleString()}
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={savingSummary}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {savingSummary ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              SAVE
            </>
          )}
        </button>
      </form>
    </div>
  );
}
