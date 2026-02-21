'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

interface Tag {
  id: string;
  name: string;
  color: string;
  customerCount?: number;
}

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  importantKey?: string | null;
  importantUpdatedAt?: string | null;
  externalId: string;
  platform: { id: string; type: string; pageId: string };
  tags: Tag[];
  conversationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ContactsResponse {
  data: Contact[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function ContactsPage() {
  const token = useAuthStore((s) => s.token);
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showTagForm, setShowTagForm] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<{
    name: string;
    email: string;
    phone: string;
    importantKey: string;
  } | null>(null);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const querySearch = searchParams.get('search');
    if (querySearch) {
      setSearch(querySearch);
      setPage(1);
    }
    initializedFromQuery.current = true;
  }, [searchParams]);

  useEffect(() => { loadContacts(); loadTags(); }, [token, page, search, selectedTag]);

  const loadContacts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (selectedTag) params.set('tagIds', selectedTag);
      const data: ContactsResponse = await apiFetch(`/api/contacts?${params}`, token);
      setContacts(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadTags = async () => {
    if (!token) return;
    try { setTags(await apiFetch('/api/contacts/tags', token)); } catch (e) { console.error(e); }
  };

  const createTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiFetch('/api/contacts/tags', token, { method: 'POST', body: JSON.stringify(newTag) });
      setNewTag({ name: '', color: '#3B82F6' }); setShowTagForm(false); loadTags();
    } catch (err: any) { alert(err.message); }
  };

  const deleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag?') || !token) return;
    try { await apiFetch(`/api/contacts/tags/${tagId}`, token, { method: 'DELETE' }); loadTags(); loadContacts(); } catch (err: any) { alert(err.message); }
  };

  const addTagToContact = async (contactId: string, tagId: string) => {
    if (!token) return;
    try { await apiFetch(`/api/contacts/${contactId}/tags/${tagId}`, token, { method: 'POST' }); loadContacts(); } catch (err: any) { alert(err.message); }
  };

  const removeTagFromContact = async (contactId: string, tagId: string) => {
    if (!token) return;
    try { await apiFetch(`/api/contacts/${contactId}/tags/${tagId}`, token, { method: 'DELETE' }); loadContacts(); } catch (err: any) { alert(err.message); }
  };

  const updateContact = async (contactId: string) => {
    if (!token || !editingContact) return;
    try {
      await apiFetch(`/api/contacts/${contactId}`, token, { method: 'PATCH', body: JSON.stringify(editingContact) });
      setEditingContact(null); setSelectedContact(null); loadContacts();
    } catch (err: any) { alert(err.message); }
  };

  const platformIcon = (type: string) => {
    switch(type) {
      case 'facebook': return '🔵';
      case 'instagram': return '📸';
      case 'whatsapp': return '💬';
      default: return '📱';
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 p-4 sm:p-6 lg:p-8 overflow-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-1">Contacts</h1>
            <p className="text-gray-600">{total} contacts across all platforms</p>
          </div>
          <button onClick={() => setShowTagForm(true)} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            Manage Tags
          </button>
        </div>

        {/* Tag Form Modal */}
        {showTagForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTagForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tag Management</h2>
              <form onSubmit={createTag} className="flex gap-2 mb-4">
                <input value={newTag.name} onChange={e => setNewTag({ ...newTag, name: e.target.value })} placeholder="Tag name" required className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                <input type="color" value={newTag.color} onChange={e => setNewTag({ ...newTag, color: e.target.value })} className="w-12 h-10 rounded-lg cursor-pointer border-2 border-gray-200" />
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all">Add</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></span>
                      <span className="font-medium text-gray-900">{tag.name}</span>
                      <span className="text-xs text-gray-500">({tag.customerCount || 0})</span>
                    </div>
                    <button onClick={() => deleteTag(tag.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowTagForm(false)} className="mt-4 w-full py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Close</button>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 mb-6 border border-white/40 flex flex-wrap gap-3">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="🔍 Search by name, email, phone..." className="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
          <select value={selectedTag} onChange={e => { setSelectedTag(e.target.value); setPage(1); }} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
            <option value="">All Tags</option>
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Contacts Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Contacts Found</h3>
              <p className="text-gray-500">Contacts will appear when customers message you</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-emerald-50 to-cyan-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Contact</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Platform</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Tags</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Conversations</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-emerald-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{c.name || 'Unknown'}</div>
                        {c.email && <div className="text-sm text-gray-500">{c.email}</div>}
                        {c.phone && <div className="text-sm text-gray-500">{c.phone}</div>}
                        {c.importantKey && (
                          <div className="text-sm text-purple-600 mt-1 line-clamp-2">
                            Important: {c.importantKey}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                          {platformIcon(c.platform.type)} {c.platform.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map(t => (
                            <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-80" style={{ backgroundColor: t.color }} onClick={() => removeTagFromContact(c.id, t.id)} title="Click to remove">
                              {t.name} ×
                            </span>
                          ))}
                          <div className="relative group inline-block">
                            <button className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center hover:bg-emerald-200 hover:text-emerald-700 transition-colors">+</button>
                            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-2 min-w-[150px] hidden group-hover:block z-20">
                              {tags.filter(t => !c.tags.find(ct => ct.id === t.id)).map(t => (
                                <button key={t.id} onClick={() => addTagToContact(c.id, t.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-50 rounded-lg">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{c.conversationCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => { setSelectedContact(c); setEditingContact({ name: c.name || '', email: c.email || '', phone: c.phone || '', importantKey: c.importantKey || '' }); }} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-all">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all">Previous</button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all">Next</button>
            </div>
          )}
        </div>

        {/* Edit Contact Modal */}
        {selectedContact && editingContact && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedContact(null); setEditingContact(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Contact</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input value={editingContact.name} onChange={e => setEditingContact({ ...editingContact, name: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input value={editingContact.email} onChange={e => setEditingContact({ ...editingContact, email: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                  <input value={editingContact.phone} onChange={e => setEditingContact({ ...editingContact, phone: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Important</label>
                  <textarea
                    value={editingContact.importantKey}
                    onChange={e => setEditingContact({ ...editingContact, importantKey: e.target.value })}
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    placeholder="Important customer info"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => updateContact(selectedContact.id)} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all">Save</button>
                <button onClick={() => { setSelectedContact(null); setEditingContact(null); }} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
