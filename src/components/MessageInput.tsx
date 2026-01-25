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
    <div className="border-t bg-white">
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      <div className="flex p-4 gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && send()}
          placeholder="Type a message…"
          disabled={loading}
        />
        <button
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={send}
          disabled={loading || !text.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
