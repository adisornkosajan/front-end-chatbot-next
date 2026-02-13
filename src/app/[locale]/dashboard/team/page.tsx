'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export default function TeamPage() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const router = useRouter();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('USER');
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not logged in or not admin/manager
  useEffect(() => {
    if (mounted) {
      if (!token) {
        router.push(`/${locale}/auth/login`);
      } else if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'MANAGER') {
        router.push(`/${locale}/dashboard/inbox`);
      }
    }
  }, [mounted, token, currentUser, router, locale]);

  useEffect(() => {
    if (
      mounted &&
      token &&
      (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MANAGER')
    ) {
      loadData();
    }
  }, [mounted, token, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'SUPER_ADMIN' && inviteRole === 'ADMIN') {
      setInviteRole('USER');
    }
  }, [currentUser, inviteRole]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const inviteRoleOptions = currentUser?.role === 'SUPER_ADMIN'
    ? ['USER', 'MANAGER', 'ADMIN']
    : currentUser?.role === 'ADMIN'
    ? ['USER', 'MANAGER']
    : ['USER'];

  const assignableRoleOptions = currentUser?.role === 'SUPER_ADMIN'
    ? ['ADMIN', 'MANAGER', 'USER']
    : ['MANAGER', 'USER'];

  const loadData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const [members, invites] = await Promise.all([
        apiFetch(API_CONFIG.ENDPOINTS.USERS.TEAM, token),
        apiFetch(API_CONFIG.ENDPOINTS.USERS.INVITATIONS, token),
      ]);
      
      setTeamMembers(members.filter((member: TeamMember) => member.role !== 'SUPER_ADMIN'));
      setInvitations(invites);
    } catch (error: any) {
      console.error('Failed to load team data:', error);
      showToast('Failed to load team data: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!token || !inviteEmail) return;
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (currentUser?.role !== 'SUPER_ADMIN' && inviteRole === 'ADMIN') {
      showToast('Only SUPER_ADMIN can invite Admin', 'error');
      return;
    }
    
    setInviting(true);
    try {
      const result = await apiFetch(
        API_CONFIG.ENDPOINTS.USERS.INVITE,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, role: inviteRole }),
        }
      );
      
      setInviteUrl(result.inviteUrl);
      showToast('✅ Invitation sent successfully! Copy the link below and send it to them', 'success');
      
      // Reload invitations
      const invites = await apiFetch(API_CONFIG.ENDPOINTS.USERS.INVITATIONS, token);
      setInvitations(invites);
      
      // Clear form
      setInviteEmail('');
      setInviteRole('USER');
    } catch (error: any) {
      console.error('Failed to invite:', error);
      showToast('Failed to send invitation: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!token || !confirm('Cancel this invitation?')) return;
    
    try {
      await apiFetch(
        API_CONFIG.ENDPOINTS.USERS.REVOKE_INVITATION(invitationId),
        token,
        { method: 'DELETE' }
      );
      
      showToast('✅ Invitation canceled successfully', 'success');
      
      // Reload invitations
      const invites = await apiFetch(API_CONFIG.ENDPOINTS.USERS.INVITATIONS, token);
      setInvitations(invites);
    } catch (error: any) {
      console.error('Failed to revoke invitation:', error);
      showToast('Failed to cancel invitation: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('✅ Link copied to clipboard!', 'success');
  };

  const handleChangeRole = async (userId: string, newRole: 'ADMIN' | 'MANAGER' | 'USER') => {
    if (!token || !currentUser) return;
    
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      showToast('Only admins can change user roles', 'error');
      return;
    }

    if (currentUser.role !== 'SUPER_ADMIN' && newRole === 'ADMIN') {
      showToast('Only SUPER_ADMIN can assign Admin role', 'error');
      return;
    }

    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    
    try {
      setChangingRole(userId);
      await apiFetch(
        `/api/users/${userId}/role`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify({ role: newRole })
        }
      );
      
      showToast('✅ Role updated successfully', 'success');
      
      // Reload team members
      const members = await apiFetch(API_CONFIG.ENDPOINTS.USERS.TEAM, token);
      setTeamMembers(members.filter((member: TeamMember) => member.role !== 'SUPER_ADMIN'));
    } catch (error: any) {
      console.error('Failed to update role:', error);
      showToast('Failed to update role: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setChangingRole(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!token || !currentUser) return;
    
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      showToast('Only admins can delete users', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) return;
    
    try {
      await apiFetch(
        `/api/users/${userId}`,
        token,
        { method: 'DELETE' }
      );
      
      showToast('✅ User removed successfully', 'success');
      
      // Reload team members
      const members = await apiFetch(API_CONFIG.ENDPOINTS.USERS.TEAM, token);
      setTeamMembers(members.filter((member: TeamMember) => member.role !== 'SUPER_ADMIN'));
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showToast('Failed to remove user: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {toast && (
        <div className="fixed right-4 top-4 z-[80] max-w-sm animate-fadeIn">
          <div
            className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
                : toast.type === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-900'
                : 'border-blue-200 bg-blue-50/95 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-base leading-none">
                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}
              </span>
              <p className="text-sm font-medium leading-5">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="ml-auto rounded p-1 opacity-70 hover:opacity-100"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 mx-auto w-full max-w-6xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Team Management</h1>
          <p className="text-gray-600">Manage team members and invite new members</p>
        </div>

        {/* Invite Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite New Member
          </button>
        </div>

        {/* Team Members */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 mb-6 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/40 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Team Members ({teamMembers.length})</h2>
          </div>
          <div className="divide-y divide-white/30">
          {teamMembers.map((member) => (
            <div key={member.id} className="p-4 sm:p-6 hover:bg-white/60 transition-all">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg flex-shrink-0">
                  {member.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                    <span className="truncate">{member.name}</span>
                    {member.id === currentUser?.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">You</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 break-all">{member.email}</p>
                  <p className="text-xs text-gray-500">
                    Joined: {new Date(member.createdAt).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') &&
                member.id !== currentUser?.id &&
                (currentUser?.role === 'SUPER_ADMIN' || member.role !== 'ADMIN') ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value as 'ADMIN' | 'MANAGER' | 'USER')}
                      disabled={changingRole === member.id}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assignableRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0) + role.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDeleteUser(member.id, member.name)}
                      className="w-full sm:w-auto px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    member.role === 'ADMIN' 
                      ? 'bg-purple-100 text-purple-700' 
                      : member.role === 'MANAGER'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/40 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pending Invitations ({invitations.length})</h2>
          </div>
          <div className="divide-y divide-white/40">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 sm:p-6 hover:bg-white/60 transition-colors">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 break-all">{invitation.email}</h3>
                    <p className="text-sm text-gray-600">
                      Expires: {new Date(invitation.expiresAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    invitation.role === 'ADMIN' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {invitation.role === 'ADMIN' ? 'Admin' : 'Member'}
                  </span>
                  <button
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    className="w-full sm:w-auto px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Invite New Member</h2>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteUrl('');
                  }}
                  className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {inviteUrl ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Invitation Created!</span>
                    </div>
                    <p className="text-sm text-emerald-800/80">Copy the link below and send it to the person you want to invite.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invitation Link</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                      />
                      <button
                        onClick={() => copyToClipboard(inviteUrl)}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors sm:min-w-[96px]"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteUrl('');
                    }}
                    className="w-full rounded-xl bg-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-gray-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {inviteRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0) + role.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-gray-600">
                      <span className="font-semibold">User:</span> Can view and reply to messages<br/>
                      <span className="font-semibold">Manager:</span> Can manage integrations and view team<br/>
                      <span className="font-semibold">Admin:</span> Full access to all settings
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 rounded-xl bg-slate-200 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {inviting ? 'Inviting...' : 'Invite'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
