'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePathname, useRouter } from 'next/navigation';

type Note = {
  id: string;
  content: string;
  type: string;
  visibility: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  tags: string[] | null;
  creator?: {
    id: string;
    name: string | null;
    email: string;
  };
};

const PRESET_TAGS = [
  'Customer Service',
  'Technical Issue',
  'Billing',
  'Feature Request',
  'Follow-up',
  'Important',
  'Urgent',
];

type NoteHistory = {
  id: string;
  content: string;
  type: string;
  editedBy: string;
  editedAt: string;
  editor?: {
    id: string;
    name: string | null;
    email: string;
  };
};

type CustomerSummary = {
  id: string;
  customerId?: string | null;
  name: string | null;
  mobile: string | null;
  email: string | null;
  importantKey: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerSummaryHistory = {
  id: string;
  summaryId: string;
  name: string | null;
  mobile: string | null;
  email: string | null;
  importantKey: string | null;
  editedBy: string;
  editedAt: string;
  editor?: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function NotesPanel({ conversationId }: { conversationId: string }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  
  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [noteHistory, setNoteHistory] = useState<NoteHistory[]>([]);
  
  // Customer Summary state
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [summaryForm, setSummaryForm] = useState({
    name: '',
    mobile: '',
    email: '',
    importantKey: '',
  });
  const [savingSummary, setSavingSummary] = useState(false);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const [viewingSummaryHistory, setViewingSummaryHistory] = useState(false);
  const [summaryHistory, setSummaryHistory] = useState<CustomerSummaryHistory[]>([]);

  useEffect(() => {
    loadNotes();
    loadSummary();
  }, [conversationId, token]);

  const sortNotes = (items: Note[]) => {
    return [...items].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const loadNotes = async () => {
    if (!token || !conversationId) return;
    
    try {
      setLoading(true);
      const data = await apiFetch(
        `/api/notes?conversationId=${conversationId}`,
        token
      );
      setNotes(sortNotes(data));
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!token || !conversationId) return;
    
    try {
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
    }
  };

  const handleSaveSummary = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      alert('Customer summary saved successfully!');
    } catch (error) {
      console.error('Failed to save summary:', error);
      alert('Failed to save summary');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If customer summary type, call handleSaveSummary instead
    if (noteType === 'customer-summary') {
      await handleSaveSummary();
      setNoteType('general');
      return;
    }
    
    if (!newNote.trim() || !token) return;

    try {
      await apiFetch('/api/notes', token, {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          content: newNote,
          type: noteType,
          visibility: 'internal',
          tags: newNoteTags.length > 0 ? newNoteTags : null,
        }),
      });

      setNewNote('');
      setNoteType('general');
      setNewNoteTags([]);
      setShowAddForm(false);
      loadNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note');
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim() || !token) return;

    try {
      await apiFetch(`/api/notes/${noteId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          content: editContent,
          tags: editTags.length > 0 ? editTags : null,
        }),
      });

      setEditingNote(null);
      setEditContent('');
      setEditTags([]);
      setFocusNoteId(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Failed to update note:', error);
      alert('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    if (!token) return;

    try {
      await apiFetch(`/api/notes/${noteId}`, token, {
        method: 'DELETE',
      });
      loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note');
    }
  };

  const handleTogglePin = async (noteId: string) => {
    if (!token) return;

    const previousNotes = notes;
    setNotes((prev) =>
      sortNotes(
        prev.map((note) =>
          note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
        )
      )
    );

    try {
      const updatedNote = await apiFetch(`/api/notes/${noteId}/pin`, token, {
        method: 'PUT',
      });

      if (updatedNote?.id) {
        setNotes((prev) =>
          sortNotes(
            prev.map((note) =>
              note.id === updatedNote.id
                ? {
                    ...note,
                    isPinned: Boolean(updatedNote.isPinned),
                    updatedAt: updatedNote.updatedAt || note.updatedAt,
                  }
                : note
            )
          )
        );
      }
    } catch (error) {
      setNotes(previousNotes);
      console.error('Failed to toggle pin:', error);
      alert('Failed to pin/unpin note');
    }
  };

  const loadNoteHistory = async (noteId: string) => {
    if (!token) return;

    try {
      const data = await apiFetch(`/api/notes/${noteId}/history`, token);
      setNoteHistory(data);
      setViewingHistory(noteId);
    } catch (error) {
      console.error('Failed to load history:', error);
      alert('Failed to load note history');
    }
  };

  const loadSummaryHistory = async () => {
    if (!token || !conversationId) return;

    try {
      const data = await apiFetch(
        `/api/customer-summaries/conversation/${conversationId}/history`,
        token
      );
      setSummaryHistory(data);
      setViewingSummaryHistory(true);
    } catch (error) {
      console.error('Failed to load customer summary history:', error);
      alert('Failed to load customer summary history');
    }
  };

  const openContactFromSummary = () => {
    if (!summary) return;
    const keyword = summary.email || summary.mobile || summary.name || '';
    const segments = pathname?.split('/').filter(Boolean) || [];
    const locale = segments[0] && /^[a-z]{2}$/i.test(segments[0]) ? segments[0] : 'en';
    const basePath = `/${locale}/dashboard/contacts`;
    if (keyword) {
      router.push(`${basePath}?search=${encodeURIComponent(keyword)}`);
      return;
    }
    router.push(basePath);
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'important': return '⭐';
      case 'reminder': return '⏰';
      case 'follow-up': return '📌';
      default: return '📝';
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'important': return 'bg-red-50 border-red-200';
      case 'reminder': return 'bg-yellow-50 border-yellow-200';
      case 'follow-up': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500 mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <NotesContent
      notes={notes}
      newNote={newNote}
      setNewNote={setNewNote}
      noteType={noteType}
      setNoteType={setNoteType}
      newNoteTags={newNoteTags}
      setNewNoteTags={setNewNoteTags}
      customTag={customTag}
      setCustomTag={setCustomTag}
      showAddForm={showAddForm}
      setShowAddForm={setShowAddForm}
      editingNote={editingNote}
      setEditingNote={setEditingNote}
      editContent={editContent}
      setEditContent={setEditContent}
      editTags={editTags}
      setEditTags={setEditTags}
      viewingHistory={viewingHistory}
      setViewingHistory={setViewingHistory}
      noteHistory={noteHistory}
      handleCreateNote={handleCreateNote}
      handleUpdateNote={handleUpdateNote}
      handleDeleteNote={handleDeleteNote}
      handleTogglePin={handleTogglePin}
      loadNoteHistory={loadNoteHistory}
      getNoteIcon={getNoteIcon}
      getNoteColor={getNoteColor}
      user={user}
      summary={summary}
      summaryForm={summaryForm}
      setSummaryForm={setSummaryForm}
      handleSaveSummary={handleSaveSummary}
      savingSummary={savingSummary}
      focusNoteId={focusNoteId}
      setFocusNoteId={setFocusNoteId}
      loadSummaryHistory={loadSummaryHistory}
      viewingSummaryHistory={viewingSummaryHistory}
      setViewingSummaryHistory={setViewingSummaryHistory}
      summaryHistory={summaryHistory}
      openContactFromSummary={openContactFromSummary}
    />
  );
}

// Internal Notes Component with Customer Summary
function NotesContent({ notes, newNote, setNewNote, noteType, setNoteType, newNoteTags, setNewNoteTags, customTag, setCustomTag, showAddForm, setShowAddForm, editingNote, setEditingNote, editContent, setEditContent, editTags, setEditTags, viewingHistory, setViewingHistory, noteHistory, handleCreateNote, handleUpdateNote, handleDeleteNote, handleTogglePin, loadNoteHistory, getNoteIcon, getNoteColor, user, summary, summaryForm, setSummaryForm, handleSaveSummary, savingSummary, focusNoteId, setFocusNoteId, loadSummaryHistory, viewingSummaryHistory, setViewingSummaryHistory, summaryHistory, openContactFromSummary }: any) {
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pinnedNotes = notes.filter((note: Note) => note.isPinned);
  const regularNotes = notes.filter((note: Note) => !note.isPinned);

  const scrollToNote = (noteId: string, block: ScrollLogicalPosition = 'center') => {
    const noteElement = noteRefs.current[noteId];
    if (!noteElement) return;
    noteElement.scrollIntoView({ behavior: 'smooth', block });
  };

  useEffect(() => {
    if (!editingNote?.id) return;
    requestAnimationFrame(() => {
      scrollToNote(editingNote.id, 'center');
    });
  }, [editingNote?.id]);

  useEffect(() => {
    if (!focusNoteId) return;
    requestAnimationFrame(() => {
      scrollToNote(focusNoteId, 'center');
      setFocusNoteId(null);
    });
  }, [focusNoteId, notes, setFocusNoteId]);

  return (
    <div className="relative z-40 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">Notes</h3>
        </div>
        <p className="text-xs text-gray-600">Customer summary and internal notes</p>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Customer Summary Section */}
        {summary && (
          <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200 shadow-sm">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-base font-bold text-gray-900">Customer Summary</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSummaryCollapsed((prev: boolean) => !prev)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-700"
                  title={isSummaryCollapsed ? 'Expand customer summary' : 'Collapse customer summary'}
                >
                  {isSummaryCollapsed ? 'Expand' : 'Collapse'}
                  <svg className={`w-4 h-4 transition-transform ${isSummaryCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            {!isSummaryCollapsed ? (
              <div className="px-4 pb-4">
                <div className="bg-white rounded-lg p-3 space-y-2 shadow-sm">
                  {summary.name && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-gray-700 min-w-[80px]">Name:</span>
                      <span className="text-sm text-gray-900 font-medium">{summary.name}</span>
                    </div>
                  )}
                  {summary.mobile && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-gray-700 min-w-[80px]">Mobile:</span>
                      <span className="text-sm text-gray-900 font-medium">{summary.mobile}</span>
                    </div>
                  )}
                  {summary.email && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-gray-700 min-w-[80px]">Email:</span>
                      <span className="text-sm text-gray-900 font-medium">{summary.email}</span>
                    </div>
                  )}
                  {summary.importantKey && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-gray-700 min-w-[80px]">Important:</span>
                      <span className="text-sm text-gray-900 font-medium whitespace-pre-wrap">{summary.importantKey}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Updated: {new Date(summary.updatedAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openContactFromSummary}
                        className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-full hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                        title="Open matching contact in contacts page"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2m10 0H7m10-10a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Contact
                      </button>
                      <button
                        type="button"
                        onClick={loadSummaryHistory}
                        className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                        title="View customer summary history"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Internal Notes Section */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h4 className="text-sm font-bold text-gray-900">Internal Notes</h4>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-3 pt-3">
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">No notes yet</p>
                <p className="text-xs text-gray-500 mt-1">Add your first note below</p>
              </div>
            ) : regularNotes.length === 0 ? (
              <div className="text-center py-5 text-xs text-gray-500">
                All notes are pinned below
              </div>
            ) : (
              regularNotes.map((note: Note) => (
            <div
              key={note.id}
              ref={(element) => {
                noteRefs.current[note.id] = element;
              }}
              className={`relative border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] transform ${
                note.isPinned 
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300 shadow-md' 
                  : getNoteColor(note.type)
              }`}
            >
              {note.isPinned && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1.5 shadow-lg animate-bounce">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
              )}
              {editingNote?.id === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white text-gray-900 font-medium"
                    rows={3}
                    autoFocus
                  />
                  {/* Tags for editing */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {PRESET_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (editTags.includes(tag)) {
                              setEditTags(editTags.filter((t: string) => t !== tag));
                            } else {
                              setEditTags([...editTags, tag]);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            editTags.includes(tag)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(null);
                        setEditContent('');
                        setEditTags([]);
                      }}
                      className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getNoteIcon(note.type)}</span>
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        {note.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1 rounded transition-colors ${
                          note.isPinned 
                            ? 'text-yellow-600 hover:bg-yellow-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={note.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <svg className="w-4 h-4" fill={note.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditingNote(note);
                          setFocusNoteId(note.id);
                          setEditContent(note.content);
                          setEditTags(note.tags || []);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-3">
                    {note.content}
                  </p>
                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                      {note.creator && (
                        <p className="text-xs font-semibold flex items-center gap-1">
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                            {(note.creator.name || note.creator.email).charAt(0).toUpperCase()}
                          </span>
                          <span className="text-blue-700">{note.creator.name || note.creator.email}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => loadNoteHistory(note.id)}
                      className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                      title="View edit history"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      History
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
          </div>
        </div>
      </div>

      {/* Pinned Notes Dock (fixed above Add Note) */}
      {pinnedNotes.length > 0 && (
        <div className="relative z-40 px-4 pb-3 border-t border-gray-200 bg-gray-50">
          <div className="space-y-3 max-h-64 overflow-y-auto overflow-x-hidden pr-1 pt-3">
            {pinnedNotes.map((note: Note) => (
              <div
                key={note.id}
                className="relative border-2 border-yellow-300 rounded-xl p-4 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-sm"
              >
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1.5 shadow">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getNoteIcon(note.type)}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">
                      {note.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePin(note.id)}
                      className="p-1 rounded transition-colors text-yellow-700 hover:bg-yellow-100"
                      title="Unpin"
                    >
                      <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(note);
                        setFocusNoteId(note.id);
                        setEditContent(note.content);
                        setEditTags(note.tags || []);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {editingNote?.id === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white text-gray-900 font-medium"
                      rows={3}
                      autoFocus
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {PRESET_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (editTags.includes(tag)) {
                                setEditTags(editTags.filter((t: string) => t !== tag));
                              } else {
                                setEditTags([...editTags, tag]);
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded-full transition-colors ${
                              editTags.includes(tag)
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingNote(null);
                          setEditContent('');
                          setEditTags([]);
                        }}
                        className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-3">
                      {note.content}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {note.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                        {note.creator && (
                          <p className="text-xs font-semibold flex items-center gap-1">
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                              {(note.creator.name || note.creator.email).charAt(0).toUpperCase()}
                            </span>
                            <span className="text-blue-700">{note.creator.name || note.creator.email}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => loadNoteHistory(note.id)}
                        className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                        title="View edit history"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Note Section */}
      <div className="relative z-50 p-4 border-t-2 border-gray-300 bg-gray-50">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        ) : (
          <form onSubmit={handleCreateNote} className="space-y-3">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white text-gray-900 font-medium"
            style={{ fontSize: '14px' }}
          >
            <option value="general">📝 General Note</option>
            <option value="important">⭐ Important</option>
            <option value="reminder">⏰ Reminder</option>
            <option value="follow-up">📌 Follow-up</option>
            <option value="customer-summary">👤 Customer Summary</option>
          </select>
          
          {noteType === 'customer-summary' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={summaryForm.name}
                    onChange={(e) => setSummaryForm({ ...summaryForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 font-medium"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1.5">Mobile</label>
                  <input
                    type="tel"
                    value={summaryForm.mobile}
                    onChange={(e) => setSummaryForm({ ...summaryForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 font-medium"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">Email</label>
                <input
                  type="email"
                  value={summaryForm.email}
                  onChange={(e) => setSummaryForm({ ...summaryForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 font-medium"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">Important Key</label>
                <textarea
                  value={summaryForm.importantKey}
                  onChange={(e) => setSummaryForm({ ...summaryForm, importantKey: e.target.value })}
                  className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white text-gray-900 font-medium"
                  placeholder="Important notes, special requirements, etc."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Type your note here..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none bg-white text-gray-900 font-medium"
              style={{ fontSize: '14px' }}
              rows={3}
            />
          )}
          
          {noteType !== 'customer-summary' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Tags (optional)</label>
              <div className="flex flex-wrap gap-1">
                {PRESET_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (newNoteTags.includes(tag)) {
                        setNewNoteTags(newNoteTags.filter((t: string) => t !== tag));
                      } else {
                        setNewNoteTags([...newNoteTags, tag]);
                      }
                    }}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      newNoteTags.includes(tag)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {newNoteTags.length > 0 && (
                <div className="text-xs text-gray-600">
                  Selected: {newNoteTags.join(', ')}
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={noteType === 'customer-summary' ? savingSummary : !newNote.trim()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {noteType === 'customer-summary' 
                ? (savingSummary ? 'Saving...' : 'Save Customer Summary') 
                : 'Add Note'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewNote('');
                setNoteType('general');
                setNewNoteTags([]);
              }}
              className="px-4 py-2.5 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
        )}
      </div>

      {/* History Modal */}
      {viewingHistory && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" 
          onClick={() => setViewingHistory(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden animate-slideUp" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Edit History</h3>
              </div>
              <button
                onClick={() => setViewingHistory(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-100px)] bg-gradient-to-b from-gray-50 to-white">
              {noteHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No edit history yet</p>
                  <p className="text-sm text-gray-400 mt-1">Changes will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {noteHistory.map((history: NoteHistory, index: number) => (
                    <div key={history.id} className="relative">
                      {index !== noteHistory.length - 1 && (
                        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-purple-300 to-transparent"></div>
                      )}
                      <div className="border-2 border-purple-200 rounded-xl p-4 bg-white shadow-md hover:shadow-lg transition-all duration-300">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide bg-purple-100 px-3 py-1 rounded-full">
                                Previous Version
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(history.editedAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              {history.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full font-medium shadow-sm">
                                {history.type}
                              </span>
                              {history.editor && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Edited by</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                      {(history.editor.name || history.editor.email).charAt(0).toUpperCase()}
                                    </span>
                                    <span className="text-xs font-semibold text-blue-700">
                                      {history.editor.name || history.editor.email}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Summary History Modal */}
      {viewingSummaryHistory && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setViewingSummaryHistory(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Customer Summary History</h3>
              </div>
              <button
                onClick={() => setViewingSummaryHistory(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-100px)] bg-gradient-to-b from-gray-50 to-white">
              {summaryHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No customer summary history yet</p>
                  <p className="text-sm text-gray-400 mt-1">Changes will appear here after summary updates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {summaryHistory.map((history: CustomerSummaryHistory, index: number) => (
                    <div key={history.id} className="relative">
                      {index !== summaryHistory.length - 1 && (
                        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-purple-300 to-transparent"></div>
                      )}
                      <div className="border-2 border-purple-200 rounded-xl p-4 bg-white shadow-md hover:shadow-lg transition-all duration-300">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide bg-purple-100 px-3 py-1 rounded-full">
                                Previous Version
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(history.editedAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              {[
                                history.name ? `Name: ${history.name}` : '',
                                history.mobile ? `Mobile: ${history.mobile}` : '',
                                history.email ? `Email: ${history.email}` : '',
                                history.importantKey ? `Important: ${history.importantKey}` : '',
                              ]
                                .filter(Boolean)
                                .join('\n')}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full font-medium shadow-sm">
                                customer-summary
                              </span>
                              {history.editor && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Edited by</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                      {(history.editor.name || history.editor.email).charAt(0).toUpperCase()}
                                    </span>
                                    <span className="text-xs font-semibold text-blue-700">
                                      {history.editor.name || history.editor.email}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
