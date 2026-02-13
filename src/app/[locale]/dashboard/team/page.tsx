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

  const loadData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const [members, invites] = await Promise.all([
        apiFetch(API_CONFIG.ENDPOINTS.USERS.TEAM, token),
        apiFetch(API_CONFIG.ENDPOINTS.USERS.INVITATIONS, token),
      ]);
      
      setTeamMembers(members);
      setInvitations(invites);
    } catch (error: any) {
      console.error('Failed to load team data:', error);
      alert('Failed to load team data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!token || !inviteEmail) return;
    
    setInviting(true);
    try {
      const result = await apiFetch(
        API_CONFIG.ENDPOINTS.USERS.INVITE,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      );
      
      setInviteUrl(result.inviteUrl);
      alert('✅ Invitation sent successfully! Copy the link below and send it to them');
      
      // Reload invitations
      const invites = await apiFetch(API_CONFIG.ENDPOINTS.USERS.INVITATIONS, token);
      setInvitations(invites);
      
      // Clear form
      setInviteEmail('');
      setInviteRole('USER');
    } catch (error: any) {
      console.error('Failed to invite:', error);
      alert('Failed to send invitation: ' + (error.message || 'Unknown error'));
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
      
      alert('✅ Invitation canceled successfully');
      
      // Reload invitations
      const invites = await apiFetch(API_CONFIG.ENDPOINTS.USERS.INVITATIONS, token);
      setInvitations(invites);
    } catch (error: any) {
      console.error('Failed to revoke invitation:', error);
      alert('Failed to cancel invitation: ' + (error.message || 'Unknown error'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Link copied to clipboard!');
  };

  const handleChangeRole = async (userId: string, newRole: 'ADMIN' | 'MANAGER' | 'USER') => {
    if (!token || !currentUser) return;
    
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      alert('Only admins can change user roles');
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
      
      alert('✅ Role updated successfully');
      
      // Reload team members
      const members = await apiFetch(API_CONFIG.ENDPOINTS.USERS.TEAM, token);
      setTeamMembers(members);
    } catch (error: any) {
      console.error('Failed to update role:', error);
      alert('Failed to update role: ' + (error.message || 'Unknown error'));
    } finally {
      setChangingRole(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!token || !currentUser) return;
    
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      alert('Only admins can delete users');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) return;
    
    try {
      await apiFetch(
        `/api/users/${userId}`,
        token,
        { method: 'DELETE' }
      );
      
      alert('✅ User removed successfully');
      
      // Reload team members
      const members = await apiFetch(API_CONFIG.ENDPOINTS.USERS.TEAM, token);
      setTeamMembers(members);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert('Failed to remove user: ' + (error.message || 'Unknown error'));
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10">
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
            <div key={member.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-white/60 transition-all gap-4">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg flex-shrink-0">
                  {member.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                    <span className="truncate">{member.name}</span>
                    {member.id === currentUser?.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">You</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && member.id !== currentUser?.id ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value as 'ADMIN' | 'MANAGER' | 'USER')}
                      disabled={changingRole === member.id}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="USER">User</option>
                    </select>
                    <button
                      onClick={() => handleDeleteUser(member.id, member.name)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
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
                <span className="text-xs text-gray-500">
                  Joined: {new Date(member.createdAt).toLocaleDateString('en-US')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Pending Invitations ({invitations.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{invitation.email}</h3>
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
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    invitation.role === 'ADMIN' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {invitation.role === 'ADMIN' ? 'Admin' : 'Member'}
                  </span>
                  <button
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Invite New Member</h2>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteUrl('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {inviteUrl ? (
                <div>
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-green-600 mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Invitation Created!</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Copy the link below and send it to the person you want to invite:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(inviteUrl)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USER">User</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      <span className="font-semibold">User:</span> Can view and reply to messages<br/>
                      <span className="font-semibold">Manager:</span> Can manage integrations and view team<br/>
                      <span className="font-semibold">Admin:</span> Full access to all settings
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50"
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
