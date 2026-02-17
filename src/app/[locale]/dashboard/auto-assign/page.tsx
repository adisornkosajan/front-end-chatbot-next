'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';

interface RuleConditions {
  keywords?: string[];
  platforms?: string[];
  timeRange?: { start: string; end: string };
}

interface AutoAssignRule {
  id: string;
  name: string;
  type: string;
  conditions: RuleConditions;
  assignToAgentId: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string | null;
  email: string;
}

const RULE_TYPES = [
  { value: 'keyword', label: '🔑 Keyword Match', desc: 'Assign based on message keywords' },
  { value: 'platform', label: '📱 Platform', desc: 'Assign based on messaging platform' },
  { value: 'time_based', label: '🕐 Time-Based', desc: 'Assign based on time of day' },
  { value: 'round_robin', label: '🔄 Round Robin', desc: 'Distribute evenly among agents' },
];

export default function AutoAssignPage() {
  const token = useAuthStore((s) => s.token);
  const [rules, setRules] = useState<AutoAssignRule[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoAssignRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'keyword',
    keywords: '',
    platforms: [] as string[],
    timeStart: '09:00',
    timeEnd: '17:00',
    assignToAgentId: '',
    priority: 0,
  });

  useEffect(() => { loadRules(); loadAgents(); }, [token]);

  const loadRules = async () => {
    if (!token) return;
    try { setRules(await apiFetch('/api/auto-assign-rules', token)); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAgents = async () => {
    if (!token) return;
    try { setAgents(await apiFetch('/api/users', token)); } catch (e) { console.error(e); }
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const conditions: RuleConditions = {};
      if (formData.type === 'keyword') conditions.keywords = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
      if (formData.type === 'platform') conditions.platforms = formData.platforms;
      if (formData.type === 'time_based') conditions.timeRange = { start: formData.timeStart, end: formData.timeEnd };

      const body = {
        name: formData.name,
        type: formData.type,
        conditions,
        assignToAgentId: formData.assignToAgentId || undefined,
        priority: formData.priority,
      };

      if (editingRule) {
        await apiFetch(`/api/auto-assign-rules/${editingRule.id}`, token, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/auto-assign-rules', token, { method: 'POST', body: JSON.stringify(body) });
      }
      resetForm(); loadRules();
    } catch (err: any) { alert(err.message); }
  };

  const toggleRule = async (id: string) => {
    if (!token) return;
    try { await apiFetch(`/api/auto-assign-rules/${id}/toggle`, token, { method: 'POST' }); loadRules(); } catch (err: any) { alert(err.message); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?') || !token) return;
    try { await apiFetch(`/api/auto-assign-rules/${id}`, token, { method: 'DELETE' }); loadRules(); } catch (err: any) { alert(err.message); }
  };

  const editRule = (rule: AutoAssignRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      type: rule.type,
      keywords: (rule.conditions.keywords || []).join(', '),
      platforms: rule.conditions.platforms || [],
      timeStart: rule.conditions.timeRange?.start || '09:00',
      timeEnd: rule.conditions.timeRange?.end || '17:00',
      assignToAgentId: rule.assignToAgentId || '',
      priority: rule.priority,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({ name: '', type: 'keyword', keywords: '', platforms: [], timeStart: '09:00', timeEnd: '17:00', assignToAgentId: '', priority: 0 });
  };

  const togglePlatform = (p: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
    }));
  };

  const ruleTypeIcon = (type: string) => {
    switch(type) { case 'keyword': return '🔑'; case 'platform': return '📱'; case 'time_based': return '🕐'; case 'round_robin': return '🔄'; default: return '📌'; }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-50 p-4 sm:p-6 lg:p-8 overflow-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent mb-1">Auto-Assign Rules</h1>
            <p className="text-gray-600">Automatically assign conversations to the right agents</p>
          </div>
          <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Rule
          </button>
        </div>

        {/* Rule Editor Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{editingRule ? 'Edit Rule' : 'Create Rule'}</h2>
              <form onSubmit={saveRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rule Name</label>
                  <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" placeholder="e.g. VIP Keyword Rule" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rule Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {RULE_TYPES.map(rt => (
                      <button key={rt.value} type="button" onClick={() => setFormData({ ...formData, type: rt.value })} className={`p-3 rounded-xl text-left border-2 transition-all ${formData.type === rt.value ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="font-semibold text-sm text-gray-900">{rt.label}</div>
                        <div className="text-xs text-gray-500">{rt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditions based on type */}
                {formData.type === 'keyword' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Keywords <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                    <input value={formData.keywords} onChange={e => setFormData({ ...formData, keywords: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" placeholder="urgent, vip, billing" />
                  </div>
                )}
                {formData.type === 'platform' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Platforms</label>
                    <div className="flex gap-2">
                      {['facebook', 'instagram', 'whatsapp'].map(p => (
                        <button key={p} type="button" onClick={() => togglePlatform(p)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${formData.platforms.includes(p) ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                          {p === 'facebook' ? '🔵' : p === 'instagram' ? '📸' : '💬'} {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {formData.type === 'time_based' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                      <input type="time" value={formData.timeStart} onChange={e => setFormData({ ...formData, timeStart: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                      <input type="time" value={formData.timeEnd} onChange={e => setFormData({ ...formData, timeEnd: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assign To</label>
                  <select value={formData.assignToAgentId} onChange={e => setFormData({ ...formData, assignToAgentId: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none">
                    <option value="">🔄 Round Robin (auto-distribute)</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Priority <span className="text-gray-400 font-normal">(higher = checked first)</span></label>
                  <input type="number" value={formData.priority} onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" min={0} max={100} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-sky-700 hover:to-indigo-700 transition-all">{editingRule ? 'Update' : 'Create'}</button>
                  <button type="button" onClick={resetForm} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rules List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Auto-Assign Rules Yet</h3>
            <p className="text-gray-500 mb-6">Create rules to automatically assign conversations to agents</p>
            <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md">Create Rule</button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((r, idx) => (
              <div key={r.id} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-white/40 hover:shadow-2xl transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{ruleTypeIcon(r.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{r.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Priority: {r.priority}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {r.type === 'keyword' && <span>Keywords: {(r.conditions.keywords || []).join(', ')}</span>}
                        {r.type === 'platform' && <span>Platforms: {(r.conditions.platforms || []).join(', ')}</span>}
                        {r.type === 'time_based' && <span>Time: {r.conditions.timeRange?.start} - {r.conditions.timeRange?.end}</span>}
                        {r.type === 'round_robin' && <span>Round-robin distribution</span>}
                        {r.assignToAgentId ? ` → Agent: ${agents.find(a => a.id === r.assignToAgentId)?.name || r.assignToAgentId}` : ' → Round Robin'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleRule(r.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.isActive ? '● Active' : '○ Inactive'}
                    </button>
                    <button onClick={() => editRule(r)} className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-sm font-medium transition-all">Edit</button>
                    <button onClick={() => deleteRule(r.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-all">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
