'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type InvitationDetails = {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const locale = useLocale();
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [token, setInviteToken] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const formattedExpiry = invitation
    ? new Date(invitation.expiresAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('token');
    setInviteToken(inviteToken && inviteToken.trim() ? inviteToken : null);
  }, []);

  useEffect(() => {
    if (token === undefined) {
      return;
    }

    if (token === null) {
      setError('Invitation link is invalid');
      setLoading(false);
      return;
    }

    const loadInvitation = async () => {
      try {
        setError('');
        const data = await apiFetch(`/api/auth/invitation/${token}`);
        setInvitation(data);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Invitation is unavailable');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation().catch(() => {
      setError('Invitation is unavailable');
      setLoading(false);
    });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !name || !password) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setAccepting(true);
    try {
      const result = await apiFetch('/api/auth/accept-invite', undefined, {
        method: 'POST',
        body: JSON.stringify({ token, name, password }),
      });

      if (result.accessToken) {
        setToken(result.accessToken);
        if (result.user) {
          setUser(result.user);
        }

        router.push(`/${locale}/dashboard/inbox`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create account');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/30 bg-white/95 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="font-semibold text-slate-800">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white/95 p-8 shadow-2xl">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Invitation Error</h1>
          <p className="mt-2 text-slate-600">{error || 'Invitation not found'}</p>
          <p className="mt-3 text-sm text-slate-500">Please ask your administrator to send a new invitation link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/30 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl shadow-lg">
            ✉️
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Accept Invitation</h1>
          <p className="mt-2 text-sm text-slate-600">Create your account to join the workspace.</p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="text-slate-500">Organization</p>
          <p className="font-semibold text-slate-900">{invitation.organizationName}</p>
          <p className="mt-2 text-slate-500">Invited Email</p>
          <p className="font-semibold text-slate-900">{invitation.email}</p>
          <p className="mt-2 text-slate-500">Expires</p>
          <p className="font-semibold text-slate-900">{formattedExpiry}</p>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
            <input
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Create password (minimum 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
            <input
              type="password"
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={accepting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {accepting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
