'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface ConversationHeaderProps {
  conversationId: string;
  currentStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedAgentId: string | null;
  onUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open', color: 'bg-blue-100 text-blue-700' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-700' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-700' },
];

export default function ConversationHeader({
  conversationId,
  currentStatus,
  assignedAgentId,
  onUpdate,
}: ConversationHeaderProps) {
  const { token, user } = useAuthStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);

  useEffect(() => {
    loadAgents();
  }, [token]);

  const loadAgents = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/users/team', token);
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const changeStatus = async (status: string) => {
    if (!token || loading) return;
    
    try {
      setLoading(true);
      await apiFetch(`/api/conversations/${conversationId}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setShowStatusMenu(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to change status:', error);
      alert('Failed to change status');
    } finally {
      setLoading(false);
    }
  };

  const assignAgent = async (agentId: string) => {
    if (!token || loading) return;
    
    try {
      setLoading(true);
      await apiFetch(`/api/conversations/${conversationId}/assign`, token, {
        method: 'POST',
        body: JSON.stringify({ agentId }),
      });
      setShowAgentMenu(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to assign agent:', error);
      alert('Failed to assign agent');
    } finally {
      setLoading(false);
    }
  };

  const unassignAgent = async () => {
    if (!token || loading) return;
    
    try {
      setLoading(true);
      await apiFetch(`/api/conversations/${conversationId}/unassign`, token, {
        method: 'POST',
      });
      setShowAgentMenu(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to unassign agent:', error);
      alert('Failed to unassign agent');
    } finally {
      setLoading(false);
    }
  };

  const takeConversation = async () => {
    if (!token || !user || loading) return;
    await assignAgent(user.id);
  };

  const currentStatusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus);
  const assignedAgent = agents.find((a) => a.id === assignedAgentId);

  return (
    <div className="relative z-50 flex items-center gap-2 sm:gap-3">
      {/* Status Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          disabled={loading}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${currentStatusOption?.color} hover:opacity-80 transition-opacity flex items-center gap-1 sm:gap-2`}
        >
          <span className="hidden sm:inline">{currentStatusOption?.label}</span>
          <span className="sm:hidden">{currentStatusOption?.label.split(' ')[0]}</span>
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showStatusMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowStatusMenu(false)}
            />
            <div className="absolute top-full left-0 mt-2 w-40 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => changeStatus(status.value)}
                  className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 sm:gap-3"
                >
                  <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${status.color}`} />
                  <span className="text-xs sm:text-sm text-gray-700">{status.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Assign Agent Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowAgentMenu(!showAgentMenu)}
          disabled={loading}
          className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1 sm:gap-2 max-w-[120px] sm:max-w-none"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="truncate hidden sm:inline">{assignedAgent ? assignedAgent.name : 'Unassigned'}</span>
          <span className="truncate sm:hidden">{assignedAgent ? assignedAgent.name.split(' ')[0] : 'None'}</span>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAgentMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowAgentMenu(false)}
            />
            <div className="absolute top-full right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto">
              {!assignedAgentId && (
                <button
                  onClick={takeConversation}
                  className="w-full text-left px-3 sm:px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-blue-600">Take Conversation</div>
                      <div className="text-xs text-gray-500">Assign to yourself</div>
                    </div>
                  </div>
                </button>
              )}

              {assignedAgentId && (
                <button
                  onClick={unassignAgent}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <div>
                      <div className="text-sm font-semibold text-red-600">Unassign</div>
                      <div className="text-xs text-gray-500">Remove assignment</div>
                    </div>
                  </div>
                </button>
              )}

              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Assign to Agent</div>
              
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => assignAgent(agent.id)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                    assignedAgentId === agent.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.email}</div>
                    </div>
                    {assignedAgentId === agent.id && (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
