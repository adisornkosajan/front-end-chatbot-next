'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import { useRouter } from 'next/navigation';

interface Note {
  id: string;
  content: string;
  type: string;
  visibility: string;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  conversationId?: string;
  customerId?: string;
  conversation?: {
    id: string;
    customer: {
      name: string;
      externalId: string;
    };
  };
  customer?: {
    name: string;
    externalId: string;
  };
}

const NOTE_TYPES = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800', icon: '📝' },
  { value: 'important', label: 'Important', color: 'bg-red-100 text-red-800', icon: '⚠️' },
  { value: 'reminder', label: 'Reminder', color: 'bg-yellow-100 text-yellow-800', icon: '⏰' },
  { value: 'follow-up', label: 'Follow-up', color: 'bg-blue-100 text-blue-800', icon: '🔄' },
];

const PRESET_TAGS = [
  'Customer Service',
  'Technical Issue',
  'Billing',
  'Feature Request',
  'Bug Report',
  'Follow-up',
  'Important',
  'Urgent',
  'Resolved',
];

export default function AllNotesPage() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  
  // Create note form
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState('general');
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  
  // Edit mode
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState('general');
  const [editTags, setEditTags] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      return;
    }
    loadNotes();
  }, [token]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchQuery, selectedType, selectedTag]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(API_CONFIG.ENDPOINTS.NOTES.LIST, token!);
      setNotes(data);
      setFilteredNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((note) =>
        note.content.toLowerCase().includes(query) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
        note.conversation?.customer.name.toLowerCase().includes(query) ||
        note.customer?.name.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((note) => note.type === selectedType);
    }

    // Filter by tag
    if (selectedTag !== 'all') {
      filtered = filtered.filter((note) => note.tags?.includes(selectedTag));
    }

    setFilteredNotes(filtered);
  };

  const createNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      await apiFetch(API_CONFIG.ENDPOINTS.NOTES.CREATE, token!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNoteContent,
          type: newNoteType,
          visibility: 'internal',
          tags: newNoteTags.length > 0 ? newNoteTags : null,
        }),
      });

      setNewNoteContent('');
      setNewNoteType('general');
      setNewNoteTags([]);
      setIsCreating(false);
      loadNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note');
    }
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditType(note.type);
    setEditTags(note.tags || []);
  };

  const saveEdit = async (noteId: string) => {
    try {
      await apiFetch(`${API_CONFIG.ENDPOINTS.NOTES.UPDATE}/${noteId}`, token!, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          type: editType,
          tags: editTags.length > 0 ? editTags : null,
        }),
      });

      setEditingNoteId(null);
      loadNotes();
    } catch (error) {
      console.error('Failed to update note:', error);
      alert('Failed to update note');
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await apiFetch(`${API_CONFIG.ENDPOINTS.NOTES.DELETE}/${noteId}`, token!, {
        method: 'DELETE',
      });
      loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note');
    }
  };

  const toggleTag = (tag: string, currentTags: string[], setTags: (tags: string[]) => void) => {
    if (currentTags.includes(tag)) {
      setTags(currentTags.filter((t) => t !== tag));
    } else {
      setTags([...currentTags, tag]);
    }
  };

  const addCustomTag = (currentTags: string[], setTags: (tags: string[]) => void) => {
    if (customTag.trim() && !currentTags.includes(customTag.trim())) {
      setTags([...currentTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const getAllTags = (): string[] => {
    const allTags = new Set<string>();
    notes.forEach((note) => {
      if (note.tags) {
        note.tags.forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/40 px-6 py-4 relative z-10 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">📝 All Notes</h1>
            <p className="text-sm text-gray-600 mt-1">
              View and manage all internal notes across conversations
            </p>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isCreating ? '✕ Cancel' : '+ New Note'}
          </button>
        </div>

        {/* Create Note Form */}
        {isCreating && (
          <div className="bg-white/90 backdrop-blur-lg border border-white/40 rounded-2xl p-4 mb-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Create New Note</h3>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Type Selection */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex gap-2 flex-wrap">
                {NOTE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setNewNoteType(type.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      newNoteType === type.value
                        ? type.color + ' ring-2 ring-offset-2 ring-blue-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Selection */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {PRESET_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag, newNoteTags, setNewNoteTags)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      newNoteTags.includes(tag)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {newNoteTags.includes(tag) ? '✓ ' : ''}
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomTag(newNoteTags, setNewNoteTags)}
                  placeholder="Add custom tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => addCustomTag(newNoteTags, setNewNoteTags)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  Add Tag
                </button>
              </div>
              {newNoteTags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {newNoteTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500 text-white rounded-full text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => setNewNoteTags(newNoteTags.filter((t) => t !== tag))}
                        className="hover:bg-purple-600 rounded-full px-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={createNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Note
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewNoteContent('');
                  setNewNoteType('general');
                  setNewNoteTags([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search notes, tags, customers..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {NOTE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tags</option>
            {getAllTags().map((tag) => (
              <option key={tag} value={tag}>
                🏷️ {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredNotes.length} of {notes.length} notes
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No notes found</h3>
            <p className="text-gray-500">
              {searchQuery || selectedType !== 'all' || selectedTag !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first note to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => {
              const noteType = NOTE_TYPES.find((t) => t.value === note.type) || NOTE_TYPES[0];
              const isEditing = editingNoteId === note.id;

              return (
                <div
                  key={note.id}
                  className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl p-4 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {isEditing ? (
                    // Edit Mode
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg mb-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      {/* Type Selection */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <div className="flex gap-2 flex-wrap">
                          {NOTE_TYPES.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setEditType(type.value)}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                editType === type.value
                                  ? type.color + ' ring-2 ring-offset-2 ring-blue-500'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {type.icon} {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tags Selection */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                        <div className="flex gap-2 flex-wrap">
                          {PRESET_TAGS.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag, editTags, setEditTags)}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                editTags.includes(tag)
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {editTags.includes(tag) ? '✓ ' : ''}
                              {tag}
                            </button>
                          ))}
                        </div>
                        {editTags.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-2">
                            {editTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500 text-white rounded-full text-xs"
                              >
                                {tag}
                                <button
                                  onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                                  className="hover:bg-purple-600 rounded-full px-1"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(note.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${noteType.color}`}>
                            {noteType.icon} {noteType.label}
                          </span>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {note.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                                >
                                  🏷️ {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(note)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-800 mb-3 whitespace-pre-wrap">{note.content}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          {note.conversation && (
                            <button
                              onClick={() => router.push(`/dashboard/conversation/${note.conversationId}`)}
                              className="flex items-center gap-1 hover:text-blue-600"
                            >
                              💬 {note.conversation.customer.name}
                            </button>
                          )}
                          {note.customer && !note.conversation && (
                            <span className="flex items-center gap-1">
                              👤 {note.customer.name}
                            </span>
                          )}
                          {!note.conversation && !note.customer && (
                            <span className="flex items-center gap-1">
                              📌 General Note
                            </span>
                          )}
                        </div>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
