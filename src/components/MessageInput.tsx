'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';

interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
  category: string;
}

export default function MessageInput({
  conversationId,
}: {
  conversationId: string;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      loadQuickReplies();
    }
  }, [token]);

  const loadQuickReplies = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/quick-replies', token);
      setQuickReplies(data);
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Check if user typed '/'
    if (value.startsWith('/')) {
      const query = value.slice(1).toLowerCase();
      const filtered = quickReplies.filter(
        (qr) =>
          qr.shortcut.toLowerCase().includes(query) ||
          qr.content.toLowerCase().includes(query)
      );
      setFilteredReplies(filtered);
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
  };

  const selectQuickReply = (qr: QuickReply) => {
    setText(qr.content);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function send() {
    if (!text.trim() && !selectedImage) return;
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (selectedImage) {
        // Send with image
        const formData = new FormData();
        formData.append('conversationId', conversationId);
        formData.append('content', text.trim() || '');
        formData.append('image', selectedImage);
        formData.append('agentId', 'null');

        await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.CONVERSATIONS.SEND, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }).then(res => {
          if (!res.ok) throw new Error('Failed to send message');
          return res.json();
        });
      } else {
        // Send text only
        await apiFetch(API_CONFIG.ENDPOINTS.CONVERSATIONS.SEND, token, {
          method: 'POST',
          body: JSON.stringify({
            conversationId,
            content: text,
            agentId: null,
          }),
        });
      }

      setText('');
      removeImage();
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
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4 relative inline-block animate-fadeIn">
            <div className="relative group">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-xs max-h-48 rounded-xl border-2 border-blue-400 shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-[1.02]"
              />
              <button
                onClick={removeImage}
                className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full p-2 hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95"
                type="button"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Ready to send
            </p>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          {/* Image Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={loading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group relative p-3 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-600 hover:text-blue-700 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 border border-blue-200 hover:border-blue-300"
            disabled={loading}
            type="button"
            title="Upload Image"
          >
            <svg className="w-5 h-5 transform group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {selectedImage && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white"></span>
              </span>
            )}
          </button>
          
          {/* Message Input Container */}
          <div className="flex-1 relative">
            {/* Quick Replies Dropdown */}
            {showQuickReplies && filteredReplies.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-blue-300 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50">
                <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Quick Replies ({filteredReplies.length})
                  </p>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredReplies.map((qr) => (
                    <button
                      key={qr.id}
                      onClick={() => selectQuickReply(qr)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                      type="button"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <code className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-semibold">
                          {qr.shortcut}
                        </code>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {qr.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{qr.content}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="relative flex items-center bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:border-blue-300 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-200">
              <textarea
                ref={textareaRef}
                className="flex-1 px-4 py-3 text-gray-800 text-base placeholder-gray-400 outline-none resize-none bg-transparent"
                value={text}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !loading) {
                    e.preventDefault();
                    if (!showQuickReplies) {
                      send();
                    }
                  }
                  if (e.key === 'Escape') {
                    setShowQuickReplies(false);
                  }
                }}
                placeholder="Type your message... 💬"
                disabled={loading}
                rows={1}
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                  overflow: 'auto',
                }}
              />
              {/* Character Counter / Quick Reply Indicator */}
              {text.length > 0 && !text.startsWith('/') && (
                <div className="absolute bottom-1 right-2 text-xs text-gray-400 font-medium bg-white px-1 rounded">
                  {text.length}
                </div>
              )}
              {text.startsWith('/') && (
                <div className="absolute bottom-1 right-2 text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Reply
                </div>
              )}
            </div>
          </div>
          
          {/* Send Button */}
          <button
            className="group relative px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2 min-w-[100px] justify-center overflow-hidden"
            onClick={send}
            disabled={loading || (!text.trim() && !selectedImage)}
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="relative">Sending...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="relative">Send</span>
              </>
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd> to send | <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Shift+Enter</kbd> for new line</span>
          </div>
          {(text.length > 0 || selectedImage) && (
            <div className="flex items-center gap-1.5 text-xs">
              {selectedImage && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Image ready
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
