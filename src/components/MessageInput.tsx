'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';

export default function MessageInput({
  conversationId,
}: {
  conversationId: string;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = useAuthStore((s) => s.token);

  async function send() {
    if (!text.trim()) return;
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.SEND, token, {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          content: text,
          agentId: null, // Set to null or get from context/props if needed
        }),
      });

      setText('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Send message error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white shadow-lg">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              className="w-full border-2 border-gray-300 rounded-2xl px-4 py-3 text-gray-800 text-base placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all duration-200 bg-gray-50 hover:bg-white"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !loading) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              disabled={loading}
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
                overflow: 'auto',
              }}
            />
          </div>
          <button
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 min-w-[120px] justify-center"
            onClick={send}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>💡 Tip: Shift+Enter for new line</span>
          </div>
          <span className="text-gray-400">{text.length} characters</span>
        </div>
      </div>
    </div>
  );
}
